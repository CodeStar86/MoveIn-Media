import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"
import { createHash, randomBytes } from "node:crypto"

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jmsynpiuekvacnzwmuhy.supabase.co").replace(/\/$/, "")
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
const ACCESS_COOKIE = "mm_access"
const REFRESH_COOKIE = "mm_refresh"
const PKCE_COOKIE = "mm_pkce"

function requireConfig() {
  if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in the server environment")
}
function parseCookies(req: IncomingMessage) {
  const out: Record<string,string> = {}
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=")
    if (i > 0) out[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim())
  }
  return out
}
function cookie(name:string,value:string,maxAge:number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}
function clearCookie(name:string){ return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` }
function addCookies(res:ServerResponse, values:string[]) {
  if (values.length) res.setHeader("Set-Cookie", values)
}
function sessionCookies(session:{access_token:string;refresh_token:string;expires_in?:number}) {
  return [cookie(ACCESS_COOKIE,session.access_token,Math.max(60,session.expires_in||3600)),cookie(REFRESH_COOKIE,session.refresh_token,60*60*24*30)]
}
function sendJson(res:ServerResponse,status:number,body:unknown,cookies:string[]=[]){
  res.statusCode=status; res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff"); addCookies(res,cookies); res.end(JSON.stringify(body))
}
async function rawBody(req:IncomingMessage,limit=5*1024*1024){
  const chunks:Buffer[]=[]; let size=0
  for await (const chunk of req){ const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk); size+=b.length; if(size>limit) throw new Error("Request too large"); chunks.push(b) }
  return Buffer.concat(chunks)
}
async function jsonBody(req:IncomingMessage){ const b=await rawBody(req,1024*1024); return b.length?JSON.parse(b.toString("utf8")):{} }
function publicClient(storage?:any){ requireConfig(); return createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:"pkce",...(storage?{storage}:{})}}) }
function userClient(token:string){ requireConfig(); return createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) }
function safeUser(user:User){ return {id:user.id,email:user.email??null,app_metadata:user.app_metadata??{},user_metadata:user.user_metadata??{}} }
function roleOf(user:User){ return user.app_metadata?.role as string|undefined }
function origin(req:IncomingMessage){ const proto=(req.headers["x-forwarded-proto"] as string)||"https"; const host=(req.headers["x-forwarded-host"] as string)||req.headers.host; return host?`${proto}://${host}`:"" }
function route(req:any){ const p=req.query?.path; return Array.isArray(p)?p.map(String):(p?[String(p)]:[]) }
function requireMutationHeader(req:IncomingMessage){ return req.method==="GET"||req.method==="HEAD"||req.headers["x-movein-request"]==="1" }

type Ctx={client:SupabaseClient;user:User;accessToken:string;cookies:string[]}
async function authContext(req:IncomingMessage):Promise<Ctx|null>{
  const c=parseCookies(req); const access=c[ACCESS_COOKIE]; const refresh=c[REFRESH_COOKIE]
  if(access){ const client=userClient(access); const {data,error}=await client.auth.getUser(access); if(!error&&data.user) return {client,user:data.user,accessToken:access,cookies:[]} }
  if(refresh){ const client=publicClient(); const {data,error}=await client.auth.refreshSession({refresh_token:refresh}); if(!error&&data.session&&data.user) return {client:userClient(data.session.access_token),user:data.user,accessToken:data.session.access_token,cookies:sessionCookies(data.session)} }
  return null
}
function requireRole(ctx:Ctx,role:"admin"|"photographer"){ return roleOf(ctx.user)===role }
async function invokeFunction(name:string,token:string,body:unknown){ requireConfig(); return fetch(`${SUPABASE_URL}/functions/v1/${name}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)}) }

export default async function handler(req:any,res:any){
  try{
    requireConfig()
    if(!requireMutationHeader(req)) return sendJson(res,403,{error:"Invalid request"})
    const p=route(req)

    if(p[0]==="auth"&&p[1]==="login"&&req.method==="POST"){
      const {email,password}=await jsonBody(req); const {data,error}=await publicClient().auth.signInWithPassword({email,password})
      if(error||!data.session||!data.user) return sendJson(res,400,{error:error?.message||"Unable to sign in"})
      return sendJson(res,200,{user:safeUser(data.user)},sessionCookies(data.session))
    }
    if(p[0]==="auth"&&p[1]==="signup"&&req.method==="POST"){
      const {email,password}=await jsonBody(req); const verifier=randomBytes(32).toString("base64url"); const challenge=createHash("sha256").update(verifier).digest("base64url"); const redirect=`${origin(req)}/api/auth/callback?mode=signup`
      const r=await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=s256`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})}); const data=await r.json()
      if(!r.ok) return sendJson(res,400,{error:data?.msg||data?.message||"Unable to create account"})
      const cookies=[cookie(PKCE_COOKIE,verifier,900)]; if(data.access_token&&data.refresh_token) cookies.push(...sessionCookies(data))
      return sendJson(res,200,{user:data.user?safeUser(data.user):null,hasSession:!!data.access_token},cookies)
    }
    if(p[0]==="auth"&&p[1]==="reset"&&req.method==="POST"){
      const {email}=await jsonBody(req); const verifier=randomBytes(32).toString("base64url"); const challenge=createHash("sha256").update(verifier).digest("base64url"); const redirect=`${origin(req)}/api/auth/callback?mode=recovery`
      const r=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=s256`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email})}); if(!r.ok){const d=await r.json().catch(()=>({})); return sendJson(res,400,{error:d?.msg||d?.message||"Unable to send reset email"})}
      return sendJson(res,200,{ok:true},[cookie(PKCE_COOKIE,verifier,900)])
    }
    if(p[0]==="auth"&&p[1]==="callback"&&req.method==="GET"){
      const code=String(req.query.code||""); const mode=String(req.query.mode||"signup"); const verifier=parseCookies(req)[PKCE_COOKIE]; const base=origin(req)
      if(!code||!verifier){ res.statusCode=303; res.setHeader("Location",`${base}/login?auth_error=invalid_callback`); return res.end() }
      const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({auth_code:code,code_verifier:verifier})}); const data=await r.json()
      if(!r.ok||!data.access_token){ res.statusCode=303; res.setHeader("Location",`${base}/login?auth_error=callback_failed`); return res.end() }
      addCookies(res,[...sessionCookies(data),clearCookie(PKCE_COOKIE)]); res.statusCode=303; res.setHeader("Location",mode==="recovery"?`${base}/login?mode=update`:`${base}/portal`); return res.end()
    }
    if(p[0]==="auth"&&p[1]==="session"&&req.method==="GET"){
      const ctx=await authContext(req); if(!ctx) return sendJson(res,401,{error:"Authentication required"},[clearCookie(ACCESS_COOKIE),clearCookie(REFRESH_COOKIE)])
      return sendJson(res,200,{user:safeUser(ctx.user)},ctx.cookies)
    }
    if(p[0]==="auth"&&p[1]==="logout"&&req.method==="POST") return sendJson(res,200,{ok:true},[clearCookie(ACCESS_COOKIE),clearCookie(REFRESH_COOKIE),clearCookie(PKCE_COOKIE)])
    if(p[0]==="auth"&&p[1]==="password"&&req.method==="POST"){
      const ctx=await authContext(req); if(!ctx) return sendJson(res,401,{error:"Authentication required"}); const {password}=await jsonBody(req); if(typeof password!=="string"||password.length<8) return sendJson(res,400,{error:"Password must be at least 8 characters."})
      const {error}=await ctx.client.auth.updateUser({password,data:{must_change_password:false}}); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{ok:true},ctx.cookies)
    }

    const ctx=await authContext(req); if(!ctx) return sendJson(res,401,{error:"Authentication required"},[clearCookie(ACCESS_COOKIE),clearCookie(REFRESH_COOKIE)])

    if(p[0]==="checkout"&&p[1]&&req.method==="POST"){
      const up=await invokeFunction("create-checkout-session",ctx.accessToken,{orderId:p[1],returnOrigin:origin(req)}); const text=await up.text(); addCookies(res,ctx.cookies); res.statusCode=up.status; res.setHeader("Content-Type",up.headers.get("content-type")||"application/json"); res.setHeader("Cache-Control","no-store"); return res.end(text)
    }
    if(p[0]==="orders"&&p.length===1&&req.method==="GET"){
      const {data,error}=await ctx.client.from("orders").select("id,address,service,price_pence,status,description,created_at,delivery_zip_path").eq("user_id",ctx.user.id).order("created_at",{ascending:false}); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{orders:data??[]},ctx.cookies)
    }
    if(p[0]==="orders"&&p.length===1&&req.method==="POST"){
      const {address,customer_name,service,notes}=await jsonBody(req); const {data,error}=await ctx.client.from("orders").insert({user_id:ctx.user.id,address,customer_name,service,notes}).select("id").single(); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{id:data.id},ctx.cookies)
    }
    if(p[0]==="orders"&&p[1]&&p[2]==="upload"&&req.method==="POST"){
      const i=Number(req.headers["x-file-index"]||"0"); const type=String(req.headers["content-type"]||""); if(!Number.isInteger(i)||i<0||i>99||!["image/jpeg","image/png","image/webp"].includes(type)) return sendJson(res,400,{error:"Invalid image upload"}); const body=await rawBody(req,4*1024*1024); const ext=type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp"; const {error}=await ctx.client.storage.from("property-photos").upload(`${ctx.user.id}/${p[1]}/source/${i}.${ext}`,body,{upsert:true,contentType:type}); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{ok:true},ctx.cookies)
    }
    if(p[0]==="orders"&&p[1]&&p[2]==="submit"&&req.method==="POST"){
      const {error}=await ctx.client.rpc("submit_order",{order_id:p[1]}); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{ok:true},ctx.cookies)
    }
    if(p[0]==="orders"&&p[1]&&p[2]==="delivery"&&req.method==="GET"){
      const {data:order,error}=await ctx.client.from("orders").select("delivery_zip_path").eq("id",p[1]).eq("user_id",ctx.user.id).single(); if(error||!order?.delivery_zip_path) return sendJson(res,404,{error:"Delivery not available"}); const dl=await ctx.client.storage.from("property-photos").download(order.delivery_zip_path); if(dl.error||!dl.data) return sendJson(res,400,{error:dl.error?.message||"Download failed"}); addCookies(res,ctx.cookies); res.statusCode=200; res.setHeader("Content-Type","application/zip"); res.setHeader("Content-Disposition",`attachment; filename=\"movein-media-${p[1]}.zip\"`); res.setHeader("Cache-Control","private, no-store"); return res.end(Buffer.from(await dl.data.arrayBuffer()))
    }

    if(p[0]==="admin"&&p[1]==="dashboard"&&req.method==="GET"){
      if(!requireRole(ctx,"admin")) return sendJson(res,403,{error:"Forbidden"}); const [{data:people,error:pe},{data:jobs,error:je}]=await Promise.all([ctx.client.from("staff_profiles").select("user_id,display_name,email,active").eq("role","photographer").order("display_name"),ctx.client.from("orders").select("id,customer_name,address,service,status,created_at,photographer_id").in("status",["paid","processing","ready"]).order("created_at",{ascending:false})]); return pe||je?sendJson(res,400,{error:pe?.message||je?.message||"Could not load dashboard"}):sendJson(res,200,{photographers:people??[],orders:jobs??[]},ctx.cookies)
    }
    if(p[0]==="admin"&&p[1]==="photographers"&&req.method==="POST"){
      if(!requireRole(ctx,"admin")) return sendJson(res,403,{error:"Forbidden"}); const body=await jsonBody(req); const up=await invokeFunction("admin-add-photographer",ctx.accessToken,body); const text=await up.text(); addCookies(res,ctx.cookies); res.statusCode=up.status; res.setHeader("Content-Type",up.headers.get("content-type")||"application/json"); return res.end(text)
    }
    if(p[0]==="admin"&&p[1]==="orders"&&p[2]&&p[3]==="assign"&&req.method==="POST"){
      if(!requireRole(ctx,"admin")) return sendJson(res,403,{error:"Forbidden"}); const {photographer_id}=await jsonBody(req); const {error}=await ctx.client.from("orders").update({photographer_id:photographer_id||null}).eq("id",p[2]); return error?sendJson(res,400,{error:error.message}):sendJson(res,200,{ok:true},ctx.cookies)
    }

    if(p[0]==="photographer"&&p[1]==="jobs"&&p.length===2&&req.method==="GET"){
      if(!requireRole(ctx,"photographer")) return sendJson(res,403,{error:"Forbidden"}); const {data,error}=await ctx.client.from("orders").select("id,user_id,address,customer_name,service,notes,status,created_at").eq("photographer_id",ctx.user.id).in("status",["processing","ready"]).order("created_at",{ascending:false}); if(error) return sendJson(res,400,{error:error.message}); const jobs=data??[]; const files:Record<string,{source:string[];output:string[]}>={}; for(const job of jobs){const a=`${job.user_id}/${job.id}/source`,b=`${job.user_id}/${job.id}/output`; const [{data:s},{data:o}]=await Promise.all([ctx.client.storage.from("property-photos").list(a,{limit:100,sortBy:{column:"name",order:"asc"}}),ctx.client.storage.from("property-photos").list(b,{limit:100,sortBy:{column:"name",order:"asc"}})]); files[job.id]={source:(s??[]).filter(x=>x.name).map(x=>x.name),output:(o??[]).filter(x=>x.name).map(x=>x.name)}} return sendJson(res,200,{jobs,files},ctx.cookies)
    }
    if(p[0]==="photographer"&&p[1]==="jobs"&&p[2]&&p[3]==="source"&&p[4]&&req.method==="GET"){
      if(!requireRole(ctx,"photographer")) return sendJson(res,403,{error:"Forbidden"}); const {data:job,error}=await ctx.client.from("orders").select("user_id").eq("id",p[2]).eq("photographer_id",ctx.user.id).single(); if(error||!job) return sendJson(res,404,{error:"Job not found"}); const dl=await ctx.client.storage.from("property-photos").download(`${job.user_id}/${p[2]}/source/${p[4]}`); if(dl.error||!dl.data) return sendJson(res,404,{error:dl.error?.message||"File not found"}); addCookies(res,ctx.cookies); res.statusCode=200; res.setHeader("Content-Type",dl.data.type||"application/octet-stream"); res.setHeader("Cache-Control","private, max-age=300"); return res.end(Buffer.from(await dl.data.arrayBuffer()))
    }
    if(p[0]==="photographer"&&p[1]==="jobs"&&p[2]&&p[3]==="source-zip"&&req.method==="GET"){
      if(!requireRole(ctx,"photographer")) return sendJson(res,403,{error:"Forbidden"}); const up=await invokeFunction("create-source-zip",ctx.accessToken,{order_id:p[2]}); addCookies(res,ctx.cookies); res.statusCode=up.status; res.setHeader("Content-Type",up.headers.get("content-type")||"application/zip"); res.setHeader("Content-Disposition",up.headers.get("content-disposition")||"attachment; filename=property-source-photos.zip"); return res.end(Buffer.from(await up.arrayBuffer()))
    }
    if(p[0]==="photographer"&&p[1]==="jobs"&&p[2]&&p[3]==="upload"&&req.method==="POST"){
      if(!requireRole(ctx,"photographer")) return sendJson(res,403,{error:"Forbidden"}); const {data:job,error}=await ctx.client.from("orders").select("user_id,status").eq("id",p[2]).eq("photographer_id",ctx.user.id).single(); if(error||!job) return sendJson(res,404,{error:"Job not found"}); if(job.status==="ready") return sendJson(res,400,{error:"This job is already ready"}); const i=Number(req.headers["x-file-index"]||"0"),name=String(req.headers["x-file-name"]||"edited.jpg").replace(/[^a-zA-Z0-9._-]/g,"-"),type=String(req.headers["content-type"]||""); if(!type.startsWith("image/")) return sendJson(res,400,{error:"Edited files must be images"}); const body=await rawBody(req,4*1024*1024); const {error:upErr}=await ctx.client.storage.from("property-photos").upload(`${job.user_id}/${p[2]}/output/${String(i+1).padStart(2,"0")}-${name}`,body,{upsert:true,contentType:type}); return upErr?sendJson(res,400,{error:upErr.message}):sendJson(res,200,{ok:true},ctx.cookies)
    }
    if(p[0]==="photographer"&&p[1]==="jobs"&&p[2]&&p[3]==="deliver"&&req.method==="POST"){
      if(!requireRole(ctx,"photographer")) return sendJson(res,403,{error:"Forbidden"}); const up=await invokeFunction("create-delivery-zip",ctx.accessToken,{order_id:p[2]}); const text=await up.text(); addCookies(res,ctx.cookies); res.statusCode=up.status; res.setHeader("Content-Type",up.headers.get("content-type")||"application/json"); return res.end(text)
    }

    return sendJson(res,404,{error:"Not found"})
  }catch(error){ console.error(error); return sendJson(res,error instanceof Error&&error.message==="Request too large"?413:500,{error:error instanceof Error?error.message:"Unexpected server error"}) }
}
