import { createHash } from "node:crypto"
type Headers = Record<string,string|string[]|undefined>
const get=(h:Headers,k:string)=>{const v=h[k]??h[k.toLowerCase()];return Array.isArray(v)?v[0]:v}
export async function allowRequest(headers:Headers,scope:"analytics"|"booking",max:number,seconds:number):Promise<boolean>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw Error("Rate limiter unavailable")
 const ip=get(headers,"x-vercel-forwarded-for")?.split(",")[0]?.trim()||get(headers,"x-forwarded-for")?.split(",")[0]?.trim()||"unidentified"
 const hash=createHash("sha256").update(scope+":"+ip+":"+(process.env.RATE_LIMIT_SALT||key)).digest("hex")
 const response=await fetch(url+"/rest/v1/rpc/movein_allow_request",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_scope:scope,p_hash:hash,p_max:max,p_window_seconds:seconds})})
 if(!response.ok)throw Error("Rate limiter unavailable")
 return await response.json()===true
}
