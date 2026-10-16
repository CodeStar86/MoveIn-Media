import {stripeApi,serviceHeaders,getAgent} from '../stripe-common.ts'
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(v:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,stripe=process.env.STRIPE_SECRET_KEY
 if(!base||!key||!stripe)return res.status(503).json({error:'Payments not configured'})
 try{
 const agent=await getAgent(req,base,key);if(!agent)return res.status(401).json({error:'Sign in required'})
 const b=(typeof req.body==='string'?JSON.parse(req.body):req.body) as {bookingId?:string}
 if(!b?.bookingId||!/^[0-9a-f-]{36}$/i.test(b.bookingId))return res.status(400).json({error:'Invalid booking'})
 const headers=serviceHeaders(key)
 const profile=await fetch(base+'/rest/v1/agent_profiles?select=approval_status&user_id=eq.'+agent.id,{headers})
 const profileData=await profile.json() as {approval_status:string}[]
 if(!profile.ok||profileData[0]?.approval_status!=='approved')return res.status(403).json({error:'Agent approval required'})
 const booking=await fetch(base+'/rest/v1/booking_requests?select=id,agent_id,properties(address)&id=eq.'+b.bookingId,{headers})
 const bookings=await booking.json() as {agent_id:string;properties:{address:string}|null}[]
 if(!booking.ok||bookings[0]?.agent_id!==agent.id)return res.status(404).json({error:'Booking not found'})
 const query=await fetch(base+'/rest/v1/booking_billing?select=amount_pence,billing_mode,payment_status,stripe_checkout_id&booking_id=eq.'+b.bookingId,{headers})
 const rows=await query.json() as {amount_pence:number|null;billing_mode:string;payment_status:string;stripe_checkout_id:string|null}[]
 const item=rows[0]
 if(!query.ok||!item?.amount_pence||item.billing_mode!=='per_booking'||item.payment_status!=='unpaid'||item.stripe_checkout_id)return res.status(409).json({error:'This booking is not available for individual payment'})
 const origin=process.env.BOOKING_ALLOWED_ORIGIN
 if(!origin?.startsWith('https://'))return res.status(503).json({error:'Payment redirect is not configured'})
 const params=new URLSearchParams({'mode':'payment','customer_email':agent.email,'success_url':origin+'/agent?payment=success','cancel_url':origin+'/agent?payment=cancel','line_items[0][price_data][currency]':'gbp','line_items[0][price_data][unit_amount]':String(item.amount_pence),'line_items[0][price_data][product_data][name]':'MoveIn Media property photography','line_items[0][price_data][product_data][description]':bookings[0].properties?.address||'Property booking','line_items[0][quantity]':'1','client_reference_id':b.bookingId,'metadata[booking_id]':b.bookingId,'payment_intent_data[metadata][booking_id]':b.bookingId,'invoice_creation[enabled]':'true'})
 const session=await stripeApi('checkout/sessions',params,stripe,'booking-checkout-'+b.bookingId)
 const update=await fetch(base+'/rest/v1/booking_billing?booking_id=eq.'+b.bookingId+'&stripe_checkout_id=is.null&payment_status=eq.unpaid',{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({stripe_checkout_id:session.id})})
 if(!update.ok||(await update.json() as unknown[]).length!==1)return res.status(409).json({error:'Booking payment already started; contact support'})
 return res.status(200).json({url:session.url})
 }catch(e){console.error('Stripe checkout',e instanceof Error?e.message:'unknown');return res.status(500).json({error:'Could not start secure payment'})}
}
