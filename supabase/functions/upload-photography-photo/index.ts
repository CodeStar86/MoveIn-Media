import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.57.4"

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })
  const url = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  const caller = callerData.user
  if (callerError || !caller || caller.app_metadata?.role !== "photographer") return Response.json({ error: "Forbidden" }, { status: 403 })

  try {
    const bookingId = req.headers.get("x-booking-id") || ""
    const index = Number(req.headers.get("x-file-index") || "0")
    const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 })
    if (!Number.isInteger(index) || index < 0 || index > 99) return Response.json({ error: "Invalid file index" }, { status: 400 })
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return Response.json({ error: "Photos must be JPG, PNG or WebP." }, { status: 400 })

    const { data: booking, error: bookingError } = await admin.from("photography_bookings")
      .select("id,user_id,photographer_id,status,media_deleted_at").eq("id", bookingId).single()
    if (bookingError || !booking) return Response.json({ error: "Booking not found" }, { status: 404 })
    if (booking.photographer_id !== caller.id) return Response.json({ error: "You are not assigned to this booking" }, { status: 403 })
    if (booking.status !== "assigned") return Response.json({ error: "This booking is not open for photo uploads" }, { status: 409 })
    if (booking.media_deleted_at) return Response.json({ error: "This booking has already been delivered and deleted" }, { status: 409 })

    const bytes = new Uint8Array(await req.arrayBuffer())
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) return Response.json({ error: "Each photo must be 10 MB or smaller." }, { status: 413 })

    const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp"
    const prefix = `${booking.user_id}/${booking.id}/photo-output`
    const path = `${prefix}/${String(index).padStart(3, "0")}.${ext}`
    const bucket = admin.storage.from("property-photos")
    const { error: uploadError } = await bucket.upload(path, bytes, { upsert: true, contentType: type, cacheControl: "3600" })
    if (uploadError) throw uploadError
    const { data: files, error: listError } = await bucket.list(prefix, { limit: 100 })
    if (listError) throw listError
    const count = (files || []).filter(file => file.name && !file.name.endsWith("/")).length
    const { error: updateError } = await admin.from("photography_bookings").update({ photo_count: count }).eq("id", booking.id)
    if (updateError) throw updateError
    return Response.json({ ok: true, photo_count: count })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 })
  }
})
