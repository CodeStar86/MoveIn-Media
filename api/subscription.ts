import { createClient } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jmsynpiuekvacnzwmuhy.supabase.co").replace(/\/$/, "")
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
const ACCESS_COOKIE = "mm_access"
const REFRESH_COOKIE = "mm_refresh"

function sendJson(res: ServerResponse, status: number, body: unknown, cookies: string[] = []) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  if (cookies.length) res.setHeader("Set-Cookie", cookies)
  res.end(JSON.stringify(body))
}

function parseCookies(req: IncomingMessage) {
  const out: Record<string, string> = {}
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=")
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function sessionCookies(session: { access_token: string; refresh_token: string; expires_in?: number }) {
  const opts = "; Path=/; HttpOnly; Secure; SameSite=Lax"
  return [
    `mm_access=${encodeURIComponent(session.access_token)}${opts}; Max-Age=${Math.max(60, session.expires_in || 3600)}`,
    `mm_refresh=${encodeURIComponent(session.refresh_token)}${opts}; Max-Age=${60 * 60 * 24 * 30}`,
  ]
}

function publicClient() {
  if (!SUPABASE_KEY) throw new Error("Missing server-side Supabase configuration")
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

function userClient(token: string) {
  if (!SUPABASE_KEY) throw new Error("Missing server-side Supabase configuration")
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function authContext(req: IncomingMessage) {
  const cookies = parseCookies(req)
  const access = cookies[ACCESS_COOKIE]
  const refresh = cookies[REFRESH_COOKIE]

  if (access) {
    const client = userClient(access)
    const { data, error } = await client.auth.getUser(access)
    if (!error && data.user) return { client, user: data.user, accessToken: access, setCookies: [] as string[] }
  }

  if (refresh) {
    const { data, error } = await publicClient().auth.refreshSession({ refresh_token: refresh })
    if (!error && data.session && data.user) {
      return {
        client: userClient(data.session.access_token),
        user: data.user,
        accessToken: data.session.access_token,
        setCookies: sessionCookies(data.session),
      }
    }
  }

  return null
}

async function jsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

async function invokeSubscriptionCheckout(token: string, plan: string) {
  return fetch(`${SUPABASE_URL}/functions/v1/create-subscription-checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  })
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET" && req.headers["x-movein-request"] !== "1") return sendJson(res, 403, { error: "Invalid request" })
    const path = String(req.query?.path || "")
    const ctx = await authContext(req)
    if (!ctx) return sendJson(res, 401, { error: "Authentication required" })

    if (path === "start" && req.method === "POST") {
      const body = await jsonBody(req)
      const plan = String(body?.plan || "")
      if (!["portfolio5", "portfolio10", "portfolio20"].includes(plan)) return sendJson(res, 400, { error: "Invalid plan" })

      const upstream = await invokeSubscriptionCheckout(ctx.accessToken, plan)
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
      res.setHeader("Cache-Control", "no-store")
      if (ctx.setCookies.length) res.setHeader("Set-Cookie", ctx.setCookies)
      return res.end(text)
    }

    if (path === "summary" && req.method === "GET") {
      const { data, error } = await ctx.client.rpc("subscription_summary")
      if (error) return sendJson(res, 400, { error: error.message }, ctx.setCookies)
      return sendJson(res, 200, { subscription: Array.isArray(data) && data.length ? data[0] : null }, ctx.setCookies)
    }

    return sendJson(res, 404, { error: "Not found" })
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error" })
  }
}
