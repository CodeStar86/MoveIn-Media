import { adminBooking } from '../email-templates.ts'
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(v:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY,sendKey=process.env.RESEND_API_KEY,from=process.env.BOOKING_FROM_EMAIL
 if(!base||!secret||!sendKey||!from)return res.status(503).json({error:'Notification service unavailable'})
 const authorization=Array.isArray(req.headers.authorization)?req.headers.authorization[0]:req.headers.authorization
 if(!authorization?.startsWith('Bearer '))return res.status(401).json({error:'Sign in required'})
 let bookingId=''
 try{const body=(typeof req.body==='string'?JSON.parse(req.body):req.body) as {bookingId?:unknown};bookingId=typeof body?.bookingId==='string'?body.bookingId:''}catch{return res.status(400).json({error:'Invalid request'})}
 if(!/^[0-9a-f-]{36}$/i.test(bookingId))return res.status(400).json({error:'Invalid booking'})
 const headers={apikey:secret,Authorization:'Bearer '+secret}
 try{
  const who=await fetch(base+'/auth/v1/user',{headers:{apikey:secret,Authorization:authorization}})
  if(!who.ok)return res.status(401).json({error:'Session expired'})
  const user=await who.json() as {id?:string}
  if(!user.id)return res.status(401).json({error:'Invalid account'})
  const bookingResponse=await fetch(base+'/rest/v1/booking_requests?select=id,agent_id,purpose,preferred_date,preferred_time,package_selection,properties(address,postcode),customers(full_name,email,phone,agency_name)&id=eq.'+encodeURIComponent(bookingId),{headers})
  if(!bookingResponse.ok)throw Error('Booking lookup failed')
  const rows=await bookingResponse.json() as Array<{agent_id:string;purpose:string;preferred_date:string;preferred_time:string;package_selection:string;properties:{address:string;postcode:string}|null;customers:{full_name:string;email:string;phone:string;agency_name:string|null}|null}>
  const b=rows[0]
  if(!b||b.agent_id!==user.id)return res.status(403).json({error:'Booking not accessible'})
  const fields:[string,string][]=[['Name',b.customers?.full_name||''],['Email',b.customers?.email||''],['Phone',b.customers?.phone||''],['Agency',b.customers?.agency_name||''],['Address',b.properties?.address||''],['Postcode',b.properties?.postcode||''],['Purpose',b.purpose],['Preferred date',b.preferred_date],['Preferred time',b.preferred_time],['Package',b.package_selection]]
  const notice=adminBooking(bookingId,fields)
  const recipients=[...new Set([process.env.BOOKING_TO_EMAIL,'rdpassiveincome@gmail.com'].filter((v):v is string=>Boolean(v?.trim())).map(v=>v.trim().toLowerCase()))]
  let failed=false
  for(const to of recipients){
   // Idempotency prevents duplicate emails from an agent retrying after a slow request.
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+sendKey,'Content-Type':'application/json','Idempotency-Key':'agent-booking-'+bookingId+'-'+to},body:JSON.stringify({from,to:[to],subject:notice.subject,html:notice.html,text:notice.text,reply_to:b.customers?.email}),signal:AbortSignal.timeout(9000)})
   if(!response.ok){failed=true;console.error('Agent booking notification failed',response.status)}
  }
  return res.status(failed?202:200).json({ok:!failed,notification:failed?'pending':'sent'})
 }catch(e){console.error('Agent booking notification unavailable',e instanceof Error?e.message:'unknown');return res.status(500).json({error:'Notification temporarily unavailable'})}
}