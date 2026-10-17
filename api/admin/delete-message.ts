type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store")
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"})
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:"Database unavailable"})
 const auth=req.headers.authorization
 const header=Array.isArray(auth)?auth[0]:auth||""
 if(!header.startsWith("Bearer "))return res.status(401).json({error:"Sign in required"})
 const token=header.slice(7)
 const data=req.body
 if(!data||typeof data!=="object"||Array.isArray(data))return res.status(400).json({error:"Invalid request"})
 const id=(data as {id?:unknown}).id
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return res.status(400).json({error:"Invalid message id"})
 try{
  const headers={apikey:key,Authorization:"Bearer "+key}
  const userResponse=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}})
  if(!userResponse.ok)return res.status(401).json({error:"Invalid session"})
  const user=await userResponse.json() as {id?:string}
  if(!user.id)return res.status(401).json({error:"Invalid session"})
  const profile=await fetch(url+"/rest/v1/staff_profiles?select=user_id&user_id=eq."+encodeURIComponent(user.id)+"&role=eq.admin&active=eq.true&limit=1",{headers})
  if(!profile.ok)return res.status(503).json({error:"Unable to verify admin permissions"})
  const admins=await profile.json() as unknown[]
  if(admins.length===0)return res.status(403).json({error:"Administrator access required"})
  const result=await fetch(url+"/rest/v1/contact_messages?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:{...headers,Prefer:"return=representation"}})
  if(!result.ok)return res.status(503).json({error:"Unable to delete message"})
  const deleted=await result.json() as unknown[]
  if(deleted.length===0)return res.status(404).json({error:"Message not found"})
  return res.status(200).json({ok:true})
 }catch(e){console.error("Delete inbox message error",e instanceof Error?e.message:"unknown");return res.status(503).json({error:"Unable to delete message"})}
}
