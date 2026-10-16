type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const base=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!base||!secret)return res.status(503).json({error:'Download service is not configured'})
 const rawAuth=req.headers.authorization
 const authorization=Array.isArray(rawAuth)?rawAuth[0]:rawAuth
 if(!authorization?.startsWith('Bearer '))return res.status(401).json({error:'Sign in required'})
 let bookingId=''
 try{const v=typeof req.body==='string'?JSON.parse(req.body):req.body as {bookingId?:unknown};bookingId=typeof v?.bookingId==='string'?v.bookingId:''}catch{return res.status(400).json({error:'Invalid request'})}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId))return res.status(400).json({error:'Invalid booking'})
 const headers={apikey:secret,Authorization:'Bearer '+secret}
 try{
   const who=await fetch(base+'/auth/v1/user',{headers:{apikey:secret,Authorization:authorization},signal:AbortSignal.timeout(7000)})
   if(!who.ok)return res.status(401).json({error:'Please sign in again'})
   const user=await who.json() as {id?:string}
   if(!user.id)return res.status(401).json({error:'Invalid account'})
   const agent=await fetch(base+'/rest/v1/agent_profiles?select=approval_status&user_id=eq.'+encodeURIComponent(user.id),{headers,signal:AbortSignal.timeout(7000)})
   if(!agent.ok)throw Error('Could not verify agent')
   const agentRows=await agent.json() as {approval_status:string}[]
   if(agentRows[0]?.approval_status!=='approved')return res.status(403).json({error:'Agent approval required'})
   const owned=await fetch(base+'/rest/v1/booking_requests?select=id&agent_id=eq.'+encodeURIComponent(user.id)+'&id=eq.'+encodeURIComponent(bookingId),{headers,signal:AbortSignal.timeout(7000)})
   if(!owned.ok)throw Error('Could not verify booking')
   const ownedRows=await owned.json() as {id:string}[]
   if(ownedRows.length!==1)return res.status(404).json({error:'Booking not found'})
   const delivery=await fetch(base+'/rest/v1/booking_deliverables?select=zip_path&booking_id=eq.'+encodeURIComponent(bookingId),{headers,signal:AbortSignal.timeout(7000)})
   if(!delivery.ok)throw Error('Could not load delivery')
   const rows=await delivery.json() as {zip_path:string|null}[]
   const path=rows[0]?.zip_path
   if(path!==bookingId+'/photos.zip')return res.status(404).json({error:'No photo ZIP has been published for this booking'})
   const signed=await fetch(base+'/storage/v1/object/sign/property-deliverables/'+bookingId+'/photos.zip',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600}),signal:AbortSignal.timeout(8000)})
   const result=await signed.json().catch(()=>({})) as {signedURL?:string;signedUrl?:string;message?:string;error?:string}
   if(!signed.ok||!(result.signedURL||result.signedUrl))return res.status(502).json({error:'Could not prepare stored ZIP download'})
   const signedPath=result.signedURL||result.signedUrl!
   const downloadUrl=signedPath.startsWith('https://')?signedPath:new URL(signedPath.replace(/^\/+/,''),base+'/storage/v1/').toString()
   return res.status(200).json({url:downloadUrl,expiresIn:600})
 }catch(err){console.error('Agent ZIP signing failed',err instanceof Error?err.message:'unknown');return res.status(500).json({error:'Unable to prepare ZIP. Please try again.'})}
}
