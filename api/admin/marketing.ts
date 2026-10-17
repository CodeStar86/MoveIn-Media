type Req={method?:string;headers:Record<string,string|string[]|undefined>}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store")
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"})
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:"Database unavailable"})
 const bearer=req.headers.authorization;const token=(Array.isArray(bearer)?bearer[0]:bearer||"").replace(/^Bearer /,"")
 if(!token)return res.status(401).json({error:"Sign in required"})
 const userResp=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}})
 if(!userResp.ok)return res.status(401).json({error:"Session expired"})
 const user=await userResp.json() as {id?:string}
 if(!user.id)return res.status(401).json({error:"Sign in required"})
 const headers={apikey:key,Authorization:"Bearer "+key}
 const profile=await fetch(url+"/rest/v1/staff_profiles?user_id=eq."+encodeURIComponent(user.id)+"&active=eq.true&role=eq.admin&select=user_id&limit=1",{headers})
 if(!profile.ok||(await profile.json() as unknown[]).length===0)return res.status(403).json({error:"Admins only"})
 const report=await fetch(url+"/rest/v1/rpc/movein_marketing_summary",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:"{}"})
 if(!report.ok)return res.status(503).json({error:"Analytics query failed"})
 const sources=await report.json()
 return res.status(200).json({periodDays:30,sources,limits:"Summarised in PostgreSQL; no raw event records transferred."})
}
