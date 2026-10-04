import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jmsynpiuekvacnzwmuhy.supabase.co").replace(/\/$/, "")
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
const ENQUIRY_FROM_EMAIL = process.env.ENQUIRY_FROM_EMAIL || "MoveIn Media <hello@movein-media.co.uk>"
const ACCESS_COOKIE = "mm_access"
const REFRESH_COOKIE = "mm_refresh"

const SERVICES = new Set([
  "general",
  "digital-decluttering",
  "virtual-staging",
  "property-descriptions",
  "property-photography",
  "estate-agents",
  "airbnb-short-lets",
  "other",
])

const SERVICE_LABELS: Record<string,string> = {
  general: "General enquiry",
  "digital-decluttering": "Digital decluttering",
  "virtual-staging": "Virtual staging",
  "property-descriptions": "Property descriptions",
  "property-photography": "Property photography",
  "estate-agents": "Estate agent services",
  "airbnb-short-lets": "Airbnb & short-let services",
  other: "Other service",
}

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
function sessionCookies(session:{access_token:string;refresh_token:string;expires_in?:number}) {
  return [cookie(ACCESS_COOKIE,session.access_token,Math.max(60,session.expires_in||3600)),cookie(REFRESH_COOKIE,session.refresh_token,60*60*24*30)]
}
function sendJson(res:ServerResponse,status:number,body:unknown,cookies:string[]=[]){
  res.statusCode=status
  res.setHeader("Content-Type","application/json; charset=utf-8")
  res.setHeader("Cache-Control","no-store")
  res.setHeader("X-Content-Type-Options","nosniff")
  if(cookies.length) res.setHeader("Set-Cookie",cookies)
  res.end(JSON.stringify(body))
}
async function rawBody(req:IncomingMessage,limit=1024*1024){
  const chunks:Buffer[]=[]
  let size=0
  for await (const chunk of req){
    const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)
    size+=b.length
    if(size>limit) throw new Error("Request too large")
    chunks.push(b)
  }
  return Buffer.concat(chunks)
}
async function jsonBody(req:IncomingMessage){
  const b=await rawBody(req)
  return b.length?JSON.parse(b.toString("utf8")):{}
}
function publicClient(){
  requireConfig()
  return createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
function userClient(token:string){
  requireConfig()
  return createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
function route(req:any){
  const p=req.query?.path
  if(Array.isArray(p)) return p.flatMap((part:string)=>String(part).split("/").filter(Boolean))
  return p ? String(p).split("/").filter(Boolean) : []
}
function requireMutationHeader(req:IncomingMessage){
  return req.method==="GET"||req.method==="HEAD"||req.headers["x-movein-request"]==="1"
}
function roleOf(user:User){ return user.app_metadata?.role as string|undefined }
function clean(value:unknown,max:number){ return typeof value==="string"?value.trim().slice(0,max):"" }
function validEmail(value:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }

type Ctx={client:SupabaseClient;user:User;cookies:string[]}
async function authContext(req:IncomingMessage):Promise<Ctx|null>{
  const c=parseCookies(req)
  const access=c[ACCESS_COOKIE]
  const refresh=c[REFRESH_COOKIE]
  if(access){
    const client=userClient(access)
    const {data,error}=await client.auth.getUser(access)
    if(!error&&data.user) return {client,user:data.user,cookies:[]}
  }
  if(refresh){
    const client=publicClient()
    const {data,error}=await client.auth.refreshSession({refresh_token:refresh})
    if(!error&&data.session&&data.user) return {client:userClient(data.session.access_token),user:data.user,cookies:sessionCookies(data.session)}
  }
  return null
}

async function sendReplyEmail(to:string,name:string,service:string,message:string){
  if(!RESEND_API_KEY) throw new Error("Email replies are not configured yet. Add RESEND_API_KEY to the Vercel project environment.")
  const subject=`Re: ${SERVICE_LABELS[service] || "MoveIn Media"} enquiry`
  const text=`Hi ${name},\n\n${message}\n\nKind regards,\nMoveIn Media`
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({from:ENQUIRY_FROM_EMAIL,to:[to],subject,text}),
  })
  if(!response.ok){
    const data=await response.json().catch(()=>null)
    throw new Error(data?.message || `Email delivery failed (${response.status})`)
  }
}

export default async function handler(req:any,res:any){
  try{
    requireConfig()
    if(!requireMutationHeader(req)) return sendJson(res,403,{error:"Invalid request"})
    const p=route(req)

    if(p.length===0&&req.method==="POST"){
      const body=await jsonBody(req)
      if(clean(body.website,200)) return sendJson(res,200,{ok:true})

      const name=clean(body.name,120)
      const email=clean(body.email,320).toLowerCase()
      const phone=clean(body.phone,50)
      const service=clean(body.service,80)
      const message=clean(body.message,5000)
      const source_path=clean(body.source_path,500)

      if(name.length<2) return sendJson(res,400,{error:"Please enter your name."})
      if(!validEmail(email)) return sendJson(res,400,{error:"Please enter a valid email address."})
      if(!SERVICES.has(service)) return sendJson(res,400,{error:"Please choose a valid service."})
      if(message.length<10) return sendJson(res,400,{error:"Please add a little more detail to your enquiry."})

      const {error}=await publicClient().from("service_enquiries").insert({name,email,phone,service,message,source_path})
      if(error) return sendJson(res,400,{error:error.message})
      return sendJson(res,200,{ok:true})
    }

    const ctx=await authContext(req)
    if(!ctx) return sendJson(res,401,{error:"Authentication required"})
    if(roleOf(ctx.user)!=="admin") return sendJson(res,403,{error:"Forbidden"},ctx.cookies)

    if(p[0]==="admin"&&p.length===1&&req.method==="GET"){
      const {data,error}=await ctx.client.from("service_enquiries").select("id,name,email,phone,service,message,source_path,status,reply_message,read_at,replied_at,created_at").order("created_at",{ascending:false}).limit(200)
      return error?sendJson(res,400,{error:error.message},ctx.cookies):sendJson(res,200,{enquiries:data??[]},ctx.cookies)
    }

    if(p[0]==="admin"&&p[1]&&p[2]==="read"&&req.method==="POST"){
      const now=new Date().toISOString()
      const {error}=await ctx.client.from("service_enquiries").update({status:"read",read_at:now}).eq("id",p[1]).eq("status","new")
      return error?sendJson(res,400,{error:error.message},ctx.cookies):sendJson(res,200,{ok:true},ctx.cookies)
    }

    if(p[0]==="admin"&&p[1]&&p[2]==="reply"&&req.method==="POST"){
      const body=await jsonBody(req)
      const reply=clean(body.message,10000)
      if(reply.length<2) return sendJson(res,400,{error:"Please enter a reply."},ctx.cookies)

      const {data:enquiry,error:loadError}=await ctx.client.from("service_enquiries").select("id,name,email,service").eq("id",p[1]).single()
      if(loadError||!enquiry) return sendJson(res,404,{error:"Enquiry not found"},ctx.cookies)

      await sendReplyEmail(enquiry.email,enquiry.name,enquiry.service,reply)
      const now=new Date().toISOString()
      const {error:updateError}=await ctx.client.from("service_enquiries").update({status:"replied",reply_message:reply,read_at:now,replied_at:now}).eq("id",p[1])
      return updateError?sendJson(res,400,{error:updateError.message},ctx.cookies):sendJson(res,200,{ok:true},ctx.cookies)
    }

    return sendJson(res,404,{error:"Not found"},ctx.cookies)
  }catch(error){
    return sendJson(res,500,{error:error instanceof Error?error.message:"Server error"})
  }
}
