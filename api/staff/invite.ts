type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const url=process.env.SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:'Staff provisioning unavailable'})
 const auth=req.headers.authorization
 const bearer=Array.isArray(auth)?auth[0]:auth
 if(!bearer?.startsWith('Bearer '))return res.status(401).json({error:'Sign in required'})
 const serviceHeaders={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
 try {
  const userResp=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}})
  if(!userResp.ok)return res.status(401).json({error:'Invalid or expired session'})
  const user=await userResp.json() as {id?:string}
  if(!user.id)return res.status(401).json({error:'Invalid account'})
  const permission=await fetch(url+'/rest/v1/staff_profiles?select=role,active&user_id=eq.'+encodeURIComponent(user.id),{headers:serviceHeaders})
  if(!permission.ok)throw Error('Could not verify administrator')
  const profiles=await permission.json() as {role:string;active:boolean}[]
  if(profiles[0]?.role!=='admin'||profiles[0]?.active!==true)return res.status(403).json({error:'Administrator only'})
  const input=(typeof req.body==='string'?JSON.parse(req.body):req.body) as Record<string,unknown>
  const name=typeof input?.name==='string'?input.name.trim():''
  const email=typeof input?.email==='string'?input.email.trim().toLowerCase():''
  const phone=typeof input?.phone==='string'?input.phone.trim():''
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||phone.length>40)return res.status(400).json({error:'Invalid photographer details'})
  const origin=process.env.BOOKING_ALLOWED_ORIGIN
  if(!origin)return res.status(503).json({error:'Website origin is not configured'})
  const invite=await fetch(url+'/auth/v1/invite',{method:'POST',headers:serviceHeaders,body:JSON.stringify({email,data:{full_name:name},redirect_to:origin+'/staff'})})
  const invited=await invite.json() as {id?:string;msg?:string;message?:string}
  if(!invite.ok||!invited.id)return res.status(400).json({error:invited.msg||invited.message||'Could not invite photographer'})
  const saved=await fetch(url+'/rest/v1/staff_profiles',{method:'POST',headers:{...serviceHeaders,Prefer:'return=minimal'},body:JSON.stringify({user_id:invited.id,full_name:name,role:'photographer',phone:phone||null,active:true})})
  if(!saved.ok){console.error('Staff profile provisioning failed',saved.status);return res.status(500).json({error:'Invitation sent but staff profile needs administrator review'})}
  return res.status(201).json({ok:true})
 }catch(e){console.error('Staff invitation failed',e instanceof Error?e.name:'unknown');return res.status(500).json({error:'Could not create photographer'})}
}
