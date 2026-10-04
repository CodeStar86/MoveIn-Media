import { createClient } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jmsynpiuekvacnzwmuhy.supabase.co").replace(/\/$/, "")
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""

function sendJson(res: ServerResponse, status: number, body: unknown, cookies: string[] = []) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  if (cookies.length) res.setHeader("Set-Cookie", cookies)
  res.end(JSON.stringify(body))
}
function parseCookies(req: IncomingMessage) {
  const out: Record<string,string> = {}
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=")
    if (i > 0) out[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim())
  }
  return out
}
function sessionCookies(session:{access_token:string;refresh_token:string;expires_in?:number}) {
  const opts="; Path=/; HttpOnly; Secure; SameSite=Lax"
  return [`mm_access=${encodeURIComponent(session.access_token)}${opts}; Max-Age=${Math.max(60,session.expires_in||3600)}`,`mm_refresh=${encodeURIComponent(session.refresh_token)}${opts}; Max-Age=${60*60*24*30}`]
}
function client(token?:string){
  if(!SUPABASE_KEY) throw new Error("Missing server-side Supabase configuration")
  return createClient(SUPABASE_URL,SUPABASE_KEY,{...(token?{global:{headers:{Authorization:`Bearer ${token}`}}}:{}),auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
async function authContext(req:IncomingMessage){
  const c=parseCookies(req); const access=c.mm_access; const refresh=c.mm_refresh
  if(access){ const u=client(access); const {data,error}=await u.auth.getUser(access); if(!error&&data.user) return {client:u,user:data.user,cookies:[] as string[]} }
  if(refresh){ const pub=client(); const {data,error}=await pub.auth.refreshSession({refresh_token:refresh}); if(!error&&data.session&&data.user) return {client:client(data.session.access_token),user:data.user,cookies:sessionCookies(data.session)} }
  return null
}

export default async function handler(req:any,res:any){
  try{
    if(req.method!=="POST") return sendJson(res,405,{error:"Method not allowed"})
    if(req.headers["x-movein-request"]!=="1") return sendJson(res,403,{error:"Invalid request"})
    const ctx=await authContext(req)
    if(!ctx) return sendJson(res,401,{error:"Authentication required"})
    const orderId=String(req.query?.id||"")
    if(!/^[0-9a-f-]{36}$/i.test(orderId)) return sendJson(res,400,{error:"Invalid order"},ctx.cookies)

    const {error}=await ctx.client.rpc("submit_order",{order_id:orderId})
    if(error) return sendJson(res,400,{error:error.message},ctx.cookies)

    const {data:order,error:readError}=await ctx.client.from("orders").select("status,billing_type,subscription_charge_pence").eq("id",orderId).eq("user_id",ctx.user.id).single()
    if(readError||!order) return sendJson(res,400,{error:readError?.message||"Order could not be loaded"},ctx.cookies)

    return sendJson(res,200,{
      status:order.status,
      billing_type:order.billing_type,
      requires_payment:order.status==="awaiting_payment",
      charge_pence:order.billing_type==="payg"?null:order.subscription_charge_pence,
    },ctx.cookies)
  }catch(error){
    return sendJson(res,500,{error:error instanceof Error?error.message:"Unexpected server error"})
  }
}
