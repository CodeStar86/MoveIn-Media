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

function clientFor(token: string) {
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
    const client = clientFor(access)
    const { data, error } = await client.auth.getUser(access)
    if (!error && data.user) return { client, user: data.user, accessToken: access, setCookies: [] as string[] }
  }

  if (refresh) {
    const { data, error } = await publicClient().auth.refreshSession({ refresh_token: refresh })
    if (!error && data.session && data.user) {
      return {
        client: clientFor(data.session.access_token),
        user: data.user,
        accessToken: data.session.access_token,
        setCookies: sessionCookies(data.session),
      }
    }
  }

  return null
}

async function rawBody(req: IncomingMessage, limit = 11 * 1024 * 1024) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error("Request too large")
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

async function jsonBody(req: IncomingMessage) {
  const raw = await rawBody(req, 1024 * 1024)
  return raw.length ? JSON.parse(raw.toString("utf8")) : {}
}

function isLondonPostcode(value: string) {
  const outward = value.toUpperCase().trim().split(/\s+/)[0]
  return /^(EC|WC|E|N|NW|SE|SW|W)\d/i.test(outward) || /^(BR|CR|DA|EN|HA|IG|KT|RM|SM|TW|UB)\d/i.test(outward)
}

async function invoke(name: string, token: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
      ...extraHeaders,
    },
    body: body instanceof Buffer ? body : JSON.stringify(body),
  })
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET" && req.headers["x-movein-request"] !== "1") return sendJson(res, 403, { error: "Invalid request" })

    const ctx = await authContext(req)
    if (!ctx) return sendJson(res, 401, { error: "Authentication required" })

    const user = ctx.user
    const role = user.app_metadata?.role
    const path = String(req.query?.path || "")

    if (path === "bookings" && req.method === "GET") {
      const { data, error } = await ctx.client.from("photography_bookings")
        .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,price_pence,status,photographer_id,created_at,paid_at,assigned_at,completed_at,delivered_at,delivery_zip_path,media_deleted_at,photo_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      return error ? sendJson(res, 400, { error: error.message }, ctx.setCookies) : sendJson(res, 200, { bookings: data ?? [] }, ctx.setCookies)
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
        return sendJson(res, 400, { error: "Please complete all required booking details." }, ctx.setCookies)
      }
      if (!isLondonPostcode(postcode)) return sendJson(res, 400, { error: "Photography bookings are currently available in London only." }, ctx.setCookies)
      if (notes.length > 5000) return sendJson(res, 400, { error: "Notes are too long." }, ctx.setCookies)

      const selected = new Date(`${preferredDate}T12:00:00Z`)
      const today = new Date(); today.setUTCHours(0, 0, 0, 0)
      if (Number.isNaN(selected.getTime()) || selected < today) return sendJson(res, 400, { error: "Please choose a future booking date." }, ctx.setCookies)

      const { data, error } = await ctx.client.from("photography_bookings").insert({
        user_id: user.id,
        address,
        postcode,
        contact_name: contactName,
        phone,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        notes,
      }).select("id").single()
      return error ? sendJson(res, 400, { error: error.message }, ctx.setCookies) : sendJson(res, 200, { id: data.id }, ctx.setCookies)
    }

    if (path.startsWith("checkout/") && req.method === "POST") {
      const bookingId = path.slice("checkout/".length)
      const upstream = await invoke("create-photography-checkout", ctx.accessToken, { bookingId }, { "Content-Type": "application/json" })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
      res.setHeader("Cache-Control", "no-store")
      if (ctx.setCookies.length) res.setHeader("Set-Cookie", ctx.setCookies)
      return res.end(text)
    }

    if (path.startsWith("delivery/") && req.method === "GET") {
      const bookingId = path.slice("delivery/".length)
      const { data: booking, error } = await ctx.client.from("photography_bookings")
        .select("id,user_id,delivery_zip_path,media_deleted_at,status")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single()
      if (error || !booking) return sendJson(res, 404, { error: "Photography delivery not found" }, ctx.setCookies)
      if (booking.media_deleted_at || !booking.delivery_zip_path) return sendJson(res, 410, { error: "This photography ZIP has already been downloaded and the stored photos have been deleted." }, ctx.setCookies)
      if (booking.status !== "completed") return sendJson(res, 409, { error: "Photography delivery is not ready yet." }, ctx.setCookies)

      const download = await ctx.client.storage.from("property-photos").download(booking.delivery_zip_path)
      if (download.error || !download.data) return sendJson(res, 404, { error: download.error?.message || "Photography ZIP not found" }, ctx.setCookies)
      const bytes = Buffer.from(await download.data.arrayBuffer())

      const purge = await invoke("purge-photography-media", ctx.accessToken, { booking_id: booking.id }, { "Content-Type": "application/json" })
      if (!purge.ok) {
        const detail = await purge.json().catch(() => null)
        return sendJson(res, 500, { error: detail?.error || "The ZIP was prepared, but stored photos could not be deleted. Please retry." }, ctx.setCookies)
      }

      if (ctx.setCookies.length) res.setHeader("Set-Cookie", ctx.setCookies)
      res.statusCode = 200
      res.setHeader("Content-Type", "application/zip")
      res.setHeader("Content-Disposition", `attachment; filename=\"movein-media-photography-${booking.id}.zip\"`)
      res.setHeader("Cache-Control", "private, no-store, max-age=0")
      res.setHeader("Pragma", "no-cache")
      res.setHeader("X-Content-Type-Options", "nosniff")
      return res.end(bytes)
    }

    if (path === "admin" && req.method === "GET") {
      if (role !== "admin") return sendJson(res, 403, { error: "Forbidden" }, ctx.setCookies)
      const [{ data: bookings, error: bookingError }, { data: photographers, error: peopleError }] = await Promise.all([
        ctx.client.from("photography_bookings")
          .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,price_pence,status,photographer_id,created_at,paid_at,assigned_at,completed_at,delivered_at,photo_count")
          .in("status", ["paid", "assigned", "completed"])
          .order("preferred_date", { ascending: true }),
        ctx.client.from("staff_profiles").select("user_id,display_name,email,active").eq("role", "photographer").order("display_name"),
      ])
      return bookingError || peopleError
        ? sendJson(res, 400, { error: bookingError?.message || peopleError?.message || "Could not load bookings" }, ctx.setCookies)
        : sendJson(res, 200, { bookings: bookings ?? [], photographers: photographers ?? [] }, ctx.setCookies)
    }

    if (path.startsWith("admin/assign/") && req.method === "POST") {
      if (role !== "admin") return sendJson(res, 403, { error: "Forbidden" }, ctx.setCookies)
      const bookingId = path.slice("admin/assign/".length)
      const body = await jsonBody(req)
      const photographerId = body?.photographer_id ? String(body.photographer_id) : null
      const { error } = await ctx.client.from("photography_bookings").update({
        photographer_id: photographerId,
        status: photographerId ? "assigned" : "paid",
        assigned_at: photographerId ? new Date().toISOString() : null,
      }).eq("id", bookingId).in("status", ["paid", "assigned"])
      return error ? sendJson(res, 400, { error: error.message }, ctx.setCookies) : sendJson(res, 200, { ok: true }, ctx.setCookies)
    }

    if (path === "photographer" && req.method === "GET") {
      if (role !== "photographer") return sendJson(res, 403, { error: "Forbidden" }, ctx.setCookies)
      const { data, error } = await ctx.client.from("photography_bookings")
        .select("id,address,postcode,contact_name,phone,preferred_date,preferred_time,notes,status,created_at,assigned_at,completed_at,delivered_at,photo_count,media_deleted_at")
        .eq("photographer_id", user.id)
        .in("status", ["assigned", "completed"])
        .order("preferred_date", { ascending: true })
      return error ? sendJson(res, 400, { error: error.message }, ctx.setCookies) : sendJson(res, 200, { bookings: data ?? [] }, ctx.setCookies)
    }

    if (path.startsWith("photographer/upload/") && req.method === "POST") {
      if (role !== "photographer") return sendJson(res, 403, { error: "Forbidden" }, ctx.setCookies)
      const bookingId = path.slice("photographer/upload/".length)
      const fileIndex = String(req.headers["x-file-index"] || "0")
      const contentType = String(req.headers["content-type"] || "")
      const body = await rawBody(req)
      const upstream = await invoke("upload-photography-photo", ctx.accessToken, body, {
        "Content-Type": contentType,
        "x-booking-id": bookingId,
        "x-file-index": fileIndex,
      })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
      res.setHeader("Cache-Control", "no-store")
      if (ctx.setCookies.length) res.setHeader("Set-Cookie", ctx.setCookies)
      return res.end(text)
    }

    if (path.startsWith("photographer/deliver/") && req.method === "POST") {
      if (role !== "photographer") return sendJson(res, 403, { error: "Forbidden" }, ctx.setCookies)
      const bookingId = path.slice("photographer/deliver/".length)
      const upstream = await invoke("create-photography-delivery", ctx.accessToken, { booking_id: bookingId }, { "Content-Type": "application/json" })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
      res.setHeader("Cache-Control", "no-store")
      if (ctx.setCookies.length) res.setHeader("Set-Cookie", ctx.setCookies)
      return res.end(text)
    }

    return sendJson(res, 404, { error: "Not found" }, ctx.setCookies)
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error" })
  }
}
