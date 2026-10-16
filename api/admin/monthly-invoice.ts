import {stripeApi,serviceHeaders,getAgent} from '../stripe-common.ts'
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(v:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,stripe=process.env.STRIPE_SECRET_KEY
 if(!base||!key||!stripe)return res.status(503).json({error:'Stripe billing not configured'})
 try{
  const user=await getAgent(req,base,key);if(!user)return res.status(401).json({error:'Sign in required'})
  const headers=serviceHeaders(key)
  const permissions=await fetch(base+'/rest/v1/staff_profiles?select=role,active&user_id=eq.'+user.id,{headers})
  const staff=await permissions.json() as {role:string;active:boolean}[]
  if(!permissions.ok||staff[0]?.role!=='admin'||!staff[0]?.active)return res.status(403).json({error:'Administrator only'})
  const input=(typeof req.body==='string'?JSON.parse(req.body):req.body) as {agentId?:string}
  if(!input?.agentId||!/^[0-9a-f-]{36}$/i.test(input.agentId))return res.status(400).json({error:'Invalid agent'})
  const profile=await fetch(base+'/rest/v1/agent_profiles?select=user_id,approval_status,agency_name&user_id=eq.'+input.agentId,{headers})
  const profiles=await profile.json() as {approval_status:string;agency_name:string}[]
  if(!profile.ok||profiles[0]?.approval_status!=='approved')return res.status(400).json({error:'Agent is not approved'})
  const authUser=await fetch(base+'/auth/v1/admin/users/'+input.agentId,{headers})
  if(!authUser.ok)throw Error('Could not find invoice recipient')
  const agent=await authUser.json() as {email?:string}
  if(!agent.email)return res.status(400).json({error:'Agent has no email'})
  const query=await fetch(base+'/rest/v1/booking_requests?select=id,properties(address),booking_billing(amount_pence,billing_mode,payment_status,stripe_invoice_id)&agent_id=eq.'+input.agentId,{headers})
  if(!query.ok)throw Error('Unable to list billable bookings')
  const all=await query.json() as {id:string;properties:{address:string}|null;booking_billing:{amount_pence:number;billing_mode:string;payment_status:string;stripe_invoice_id:string|null}|null}[]
  const items=all.filter(v=>v.booking_billing?.billing_mode==='monthly'&&v.booking_billing.payment_status==='unpaid'&&v.booking_billing.amount_pence>0&&!v.booking_billing.stripe_invoice_id)
  if(!items.length)return res.status(409).json({error:'No uninvoiced monthly bookings'})
  const customer=await stripeApi('customers',new URLSearchParams({email:agent.email,name:profiles[0].agency_name,'metadata[agent_id]':input.agentId}),stripe,'monthly-customer-'+input.agentId)
  const invoice=await stripeApi('invoices',new URLSearchParams({customer:customer.id,collection_method:'send_invoice',days_until_due:'14','auto_advance':'false','metadata[agent_id]':input.agentId}),stripe,'monthly-invoice-'+input.agentId+'-'+items.map(x=>x.id).sort().join('-'))
  for(const item of items){
   await stripeApi('invoiceitems',new URLSearchParams({customer:customer.id,invoice:invoice.id,currency:'gbp',amount:String(item.booking_billing!.amount_pence),description:'Property photography – '+(item.properties?.address||item.id),'metadata[booking_id]':item.id}),stripe,'invoice-line-'+invoice.id+'-'+item.id)
  }
  // Commit local associations before Stripe finalisation, so webhook updates reconcile correctly.
  for(const item of items){
   const update=await fetch(base+'/rest/v1/booking_billing?booking_id=eq.'+item.id+'&stripe_invoice_id=is.null&payment_status=eq.unpaid',{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({stripe_invoice_id:invoice.id,payment_status:'invoiced'})})
   if(!update.ok||(await update.json() as unknown[]).length!==1)throw Error('Invoice association failed; review invoice '+invoice.id)
  }
  await stripeApi('invoices/'+invoice.id+'/finalize',new URLSearchParams(),stripe,'finalize-'+invoice.id)
  const sent=await stripeApi('invoices/'+invoice.id+'/send',new URLSearchParams(),stripe,'send-'+invoice.id)
  return res.status(200).json({ok:true,invoiceId:invoice.id,url:sent.hosted_invoice_url||null,count:items.length})
 }catch(e){console.error('Monthly invoice failed',e instanceof Error?e.message:'unknown');return res.status(500).json({error:'Invoice creation failed. Check Stripe before retrying to avoid duplicates.'})}
}
