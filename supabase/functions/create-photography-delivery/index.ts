import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.57.4"
import JSZip from "npm:jszip@3.10.1"

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
    const body = await req.json().catch(() => null)
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : ""
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 })

    const { data: booking, error: bookingError } = await admin.from("photography_bookings")
      .select("id,user_id,address,photographer_id,status,media_deleted_at").eq("id", bookingId).single()
    if (bookingError || !booking) return Response.json({ error: "Booking not found" }, { status: 404 })
    if (booking.photographer_id !== caller.id) return Response.json({ error: "You are not assigned to this booking" }, { status: 403 })
    if (booking.status !== "assigned") return Response.json({ error: "This booking is not ready to send" }, { status: 409 })
    if (booking.media_deleted_at) return Response.json({ error: "This booking has already been delivered and deleted" }, { status: 409 })

    const bucket = admin.storage.from("property-photos")
    const prefix = `${booking.user_id}/${booking.id}/photo-output`
    const { data: files, error: listError } = await bucket.list(prefix, { limit: 100, sortBy: { column: "name", order: "asc" } })
    if (listError) throw listError
    const output = (files || []).filter(file => file.name && !file.name.endsWith("/"))
    if (!output.length) return Response.json({ error: "Upload at least one completed photo before sending." }, { status: 400 })

    const zip = new JSZip()
    for (const file of output) {
      const path = `${prefix}/${file.name}`
      const { data, error } = await bucket.download(path)
      if (error || !data) throw error || new Error(`Could not read ${file.name}`)
      zip.file(file.name, await data.arrayBuffer())
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } })
    const zipPath = `${booking.user_id}/${booking.id}/photo-delivery/completed-photos.zip`
    const { error: uploadError } = await bucket.upload(zipPath, new Blob([zipBytes], { type: "application/zip" }), { upsert: true, contentType: "application/zip", cacheControl: "0" })
    if (uploadError) throw uploadError

    const now = new Date().toISOString()
    const { error: updateError } = await admin.from("photography_bookings").update({ delivery_zip_path: zipPath, delivered_at: now, completed_at: now, status: "completed", photo_count: output.length }).eq("id", booking.id)
    if (updateError) throw updateError
    return Response.json({ ok: true, file_count: output.length })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create delivery" }, { status: 400 })
  }
})
