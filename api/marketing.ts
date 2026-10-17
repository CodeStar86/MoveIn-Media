type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
const string=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):""
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store")
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"})
 const b=req.body
 if(!b||typeof b!=="object"||Array.isArray(b))return res.status(400).json({error:"Bad request"})
 const data=b as Record<string,unknown>
 if(JSON.stringify(data).length>1200)return res.status(413).json({error:"Too large"})
 if(!["landing","share_click"].includes(String(data.event_type)))return res.status(400).json({error:"Invalid event"})
 const source=string(data.source,80).toLowerCase().replace(/[^a-z0-9 _.-]/g,"")
 if(!source)return res.status(400).json({error:"Source required"})
 const origin=req.headers.origin
 const o=Array.isArray(origin)?origin[0]:origin
 if(o&&o!=="https://www.movein-media.co.uk"&&o!=="https://movein-media.co.uk"&&!(process.env.NODE_ENV!=="production"&&/^http:\/\/localhost:\d+$/.test(o)))return res.status(403).json({error:"Origin not allowed"})
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:"Analytics unavailable"})
 const response=await fetch(url+"/rest/v1/marketing_events",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({event_type:data.event_type,source,medium:string(data.medium,80),campaign:string(data.campaign,120),path:string(data.path,180)||"/"})})
 if(!response.ok){console.error("Marketing event failed",response.status);return res.status(503).json({error:"Analytics unavailable"})}
 return res.status(202).json({ok:true})
}