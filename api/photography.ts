import { createClient } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"

export const config = { api: { bodyParser: false } }

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jmsynpiuekvacnzwmuhy.supabase.co").replace(/\/$/, "")
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""

function parseCookies(req: IncomingMessage) {
  const out: Record<string, string> = {}
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=")
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(body))
}

function clientFor(token: string) {
  if (!SUPABASE_KEY) throw new Error("Missing server-side Supabase configuration")
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function jsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

function isLondonPostcode(value: string) {
  const outward = value.toUpperCase().trim().split(/\s+/)[0]
  return /^(EC|WC|E|N|NW|SE|SW|W)\d/i.test(outward) || /^(BR|CR|DA|EN|HA|IG|KT|RM|SM|TW|UB)\d/i.test(outward)
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET" && req.headers["x-movein-request"] !== "1") return sendJson(res, 403, { error: "Invalid request" })

    const token = parseCookies(req).mm_access
    if (!token) return sendJson(res, 401, { error: "Authentication required" })

    const client = clientFor(token)
    const { data: auth, error: authError } = await client.auth.getUser(token)
    if (authError || !auth.user) return sendJson(res, 401, { error: "Authentication required" })

    const user = auth.user
    const role = user.app_metadata?.role
    const path = String(req.query?.path || "")

    if (path === "bookings" && req.method === "GET") {
      const { data, error } = await client.from("photography_bookings")
        .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,price_pence,status,photographer_id,created_at,paid_at,assigned_at,completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      return error ? sendJson(res, 400, { error: error.message }) : sendJson(res, 200, { bookings: data ?? [] })
    }

    if (path === "bookings" && req.method === "POST") {
      const body = await jsonBody(req)
      const address = String(body?.address || "").trim()
      const postcode = String(body?.postcode || "").trim().toUpperCase()
      const contactName = String(body?.contact_name || "").trim()
      const phone = String(body?.phone || "").trim()
      const preferredDate = String(body?.preferred_date || "")
      const preferredTime = String(body?.preferred_time || "")
      const notes = String(body?.notes || "").trim()

      if (!address || !postcode || !contactName || !phone || !preferredDate || !["morning", "afternoon", "flexible"].includes(preferredTime)) {
        return sendJson(res, 400, { error: "Please complete all required booking details." })
      }
      if (!isLondonPostcode(postcode)) return sendJson(res, 400, { error: "Photography bookings are currently available in London only." })
      if (notes.length > 5000) return sendJson(res, 400, { error: "Notes are too long." })

      const selected = new Date(`${preferredDate}T12:00:00Z`)
      const today = new Date(); today.setUTCHours(0, 0, 0, 0)
      if (Number.isNaN(selected.getTime()) || selected < today) return sendJson(res, 400, { error: "Please choose a future booking date." })

      const { data, error } = await client.from("photography_bookings").insert({
        user_id: user.id,
        address,
        postcode,
        contact_name: contactName,
        phone,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        notes,
      }).select("id").single()
      return error ? sendJson(res, 400, { error: error.message }) : sendJson(res, 200, { id: data.id })
    }

    if (path.startsWith("checkout/") && req.method === "POST") {
      const bookingId = path.slice("checkout/".length)
      const upstream = await fetch(`${SUPABASE_URL}/functions/v1/create-photography-checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
      res.setHeader("Cache-Control", "no-store")
      return res.end(text)
    }

    if (path === "admin" && req.method === "GET") {
      if (role !== "admin") return sendJson(res, 403, { error: "Forbidden" })
      const [{ data: bookings, error: bookingError }, { data: photographers, error: peopleError }] = await Promise.all([
        client.from("photography_bookings")
          .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,price_pence,status,photographer_id,created_at,paid_at,assigned_at,completed_at")
          .in("status", ["paid", "assigned", "completed"])
          .order("preferred_date", { ascending: true }),
        client.from("staff_profiles").select("user_id,display_name,email,active").eq("role", "photographer").order("display_name"),
      ])
      return bookingError || peopleError
        ? sendJson(res, 400, { error: bookingError?.message || peopleError?.message || "Could not load bookings" })
        : sendJson(res, 200, { bookings: bookings ?? [], photographers: photographers ?? [] })
    }

    if (path.startsWith("admin/assign/") && req.method === "POST") {
      if (role !== "admin") return sendJson(res, 403, { error: "Forbidden" })
      const bookingId = path.slice("admin/assign/".length)
      const body = await jsonBody(req)
      const photographerId = body?.photographer_id ? String(body.photographer_id) : null
      const { error } = await client.from("photography_bookings").update({
        photographer_id: photographerId,
        status: photographerId ? "assigned" : "paid",
        assigned_at: photographerId ? new Date().toISOString() : null,
      }).eq("id", bookingId).in("status", ["paid", "assigned"])
      return error ? sendJson(res, 400, { error: error.message }) : sendJson(res, 200, { ok: true })
    }

    if (path === "photographer" && req.method === "GET") {
      if (role !== "photographer") return sendJson(res, 403, { error: "Forbidden" })
      const { data, error } = await client.from("photography_bookings")
        .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,status,created_at,assigned_at,completed_at")
        .eq("photographer_id", user.id)
        .in("status", ["assigned", "completed"])
        .order("preferred_date", { ascending: true })
      return error ? sendJson(res, 400, { error: error.message }) : sendJson(res, 200, { bookings: data ?? [] })
    }

    if (path.startsWith("photographer/complete/") && req.method === "POST") {
      if (role !== "photographer") return sendJson(res, 403, { error: "Forbidden" })
      const bookingId = path.slice("photographer/complete/".length)
      const { error } = await client.from("photography_bookings").update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", bookingId).eq("photographer_id", user.id).eq("status", "assigned")
      return error ? sendJson(res, 400, { error: error.message }) : sendJson(res, 200, { ok: true })
    }

    return sendJson(res, 404, { error: "Not found" })
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error" })
  }
}
