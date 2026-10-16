type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!base||!key)return res.status(503).json({error:'Deletion service unavailable'})
 const raw=req.headers.authorization
 const auth=Array.isArray(raw)?raw[0]:raw
 if(!auth?.startsWith('Bearer '))return res.status(401).json({error:'Please sign in'})
 let bookingId=''
 try{const v=(typeof req.body==='string'?JSON.parse(req.body):req.body) as {bookingId?:unknown;downloadComplete?:unknown};if(v?.downloadComplete!==true)return res.status(400).json({error:'Completed download confirmation required'});bookingId=typeof v?.bookingId==='string'?v.bookingId:''}catch{return res.status(400).json({error:'Invalid request'})}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId))return res.status(400).json({error:'Invalid booking'})
 const headers={apikey:key,Authorization:'Bearer '+key}
 try{
  const who=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:auth},signal:AbortSignal.timeout(8000)})
  if(!who.ok)return res.status(401).json({error:'Session expired'})
  const user=await who.json() as {id?:string}
  if(!user.id)return res.status(401).json({error:'Invalid account'})
  const a=await fetch(base+'/rest/v1/agent_profiles?select=approval_status&user_id=eq.'+encodeURIComponent(user.id),{headers})
  if(!a.ok)throw Error('Agent lookup failed')
  const profiles=await a.json() as {approval_status:string}[]
  if(profiles[0]?.approval_status!=='approved')return res.status(403).json({error:'Agent account is not approved'})
  const owner=await fetch(base+'/rest/v1/booking_requests?select=id&agent_id=eq.'+encodeURIComponent(user.id)+'&id=eq.'+bookingId,{headers})
  if(!owner.ok)throw Error('Booking lookup failed')
  if((await owner.json() as {id:string}[]).length!==1)return res.status(404).json({error:'Booking not found'})
  const delivery=await fetch(base+'/rest/v1/booking_deliverables?select=zip_path&booking_id=eq.'+bookingId,{headers})
  if(!delivery.ok)throw Error('Delivery lookup failed')
  const rows=await delivery.json() as {zip_path:string|null}[]
  const path=bookingId+'/photos.zip'
  if(rows[0]?.zip_path!==path)return res.status(409).json({error:'No ZIP is currently available for deletion'})
  // Delete via the Storage API, not by modifying storage.objects directly.
  const removed=await fetch(base+'/storage/v1/object/property-deliverables/'+path,{method:'DELETE',headers,signal:AbortSignal.timeout(15000)})
  if(!removed.ok){console.error('ZIP Storage deletion failed',removed.status);return res.status(502).json({error:'Could not remove ZIP from Storage'})}
  // Clear only the ZIP reference, preserving the property description.
  const updated=await fetch(base+'/rest/v1/booking_deliverables?booking_id=eq.'+bookingId,{method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({zip_path:null,zip_downloaded_at:new Date().toISOString(),updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(8000)})
  if(!updated.ok){console.error('ZIP metadata cleanup failed',updated.status);return res.status(502).json({error:'ZIP deleted, but delivery status needs administrator review'})}
  return res.status(200).json({ok:true,deleted:true})
 }catch(err){console.error('Agent ZIP deletion failed',err instanceof Error?err.message:'unknown');return res.status(500).json({error:'Unable to remove ZIP from Storage'})}
}
