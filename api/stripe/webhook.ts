import {verifyStripe,serviceHeaders} from '../stripe-common.ts'
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown;[Symbol.asyncIterator]?:()=>AsyncIterator<Uint8Array>}
type Res={status:(n:number)=>Res;json:(v:unknown)=>void;setHeader:(k:string,v:string)=>void}
export const config={api:{bodyParser:false}}
export default async function handler(req:Req,res:Res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,secret=process.env.STRIPE_WEBHOOK_SECRET
 if(!base||!key||!secret)return res.status(503).json({error:'Webhook not configured'})
 const chunks:Uint8Array[]=[]
 for await(const chunk of req as AsyncIterable<Uint8Array>){chunks.push(chunk)}
 const body=Buffer.concat(chunks).toString('utf8')
 const h=req.headers['stripe-signature'],signature=Array.isArray(h)?h[0]:h||''
 if(!verifyStripe(body,signature,secret))return res.status(400).json({error:'Invalid signature'})
 const event=JSON.parse(body) as {id:string;type:string;data:{object:Record<string,any>}}
 const obj=event.data.object
 const headers=serviceHeaders(key)
 try{
  if(event.type==='checkout.session.completed'&&obj.payment_status==='paid'){
   const bookingId=obj.metadata?.booking_id as string|undefined
   if(bookingId&&/^[0-9a-f-]{36}$/i.test(bookingId)){
    const update=await fetch(base+'/rest/v1/booking_billing?booking_id=eq.'+bookingId+'&stripe_checkout_id=eq.'+encodeURIComponent(obj.id),{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({payment_status:'paid',stripe_payment_intent_id:obj.payment_intent||null,paid_at:new Date().toISOString()})})
    if(!update.ok)throw Error('Booking payment update failed')
   }
  }
  if(event.type==='invoice.paid'){
   const invoiceId=obj.id as string
   const update=await fetch(base+'/rest/v1/booking_billing?stripe_invoice_id=eq.'+encodeURIComponent(invoiceId),{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({payment_status:'paid',receipt_url:obj.hosted_invoice_url||null,paid_at:new Date().toISOString()})})
   if(!update.ok)throw Error('Invoice update failed')
  }
  return res.status(200).json({received:true})
 }catch(e){console.error('Webhook processing failed',e instanceof Error?e.message:'unknown');return res.status(500).json({error:'Processing failed'})}
}
