import {createHmac,timingSafeEqual} from 'node:crypto'
export const stripeApi=async(path:string,params:URLSearchParams,key:string,idempotency?:string)=>{
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded',...(idempotency?{'Idempotency-Key':idempotency}:{})},body:params.toString(),signal:AbortSignal.timeout(15000)})
 const data=await response.json() as Record<string,any>
 if(!response.ok)throw Error(typeof data.error?.message==='string'?data.error.message:'Stripe request failed')
 return data
}
export function verifyStripe(body:string,header:string,secret:string){
 const parts=Object.fromEntries(header.split(',').map(s=>s.split('=',2)))
 const timestamp=Number(parts.t)
 if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false
 const expected=createHmac('sha256',secret).update(parts.t+'.'+body).digest('hex')
 return header.split(',').some(part=>{if(!part.startsWith('v1='))return false;const hex=part.slice(3);if(!/^[0-9a-f]{64}$/i.test(hex))return false;return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(hex,'hex'))})
}
export const serviceHeaders=(key:string)=>({apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'})
export const getAgent=async(req:{headers:Record<string,string|string[]|undefined>},base:string,key:string)=>{
 const raw=req.headers.authorization,token=Array.isArray(raw)?raw[0]:raw
 if(!token?.startsWith('Bearer '))return null
 const response=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:token}})
 if(!response.ok)return null
 const user=await response.json() as {id?:string;email?:string}
 return user.id&&user.email?{id:user.id,email:user.email}:null
}
