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
  if (callerError || !caller) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => null)
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : ""
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 })

    const { data: booking, error: bookingError } = await admin.from("photography_bookings")
      .select("id,user_id,delivery_zip_path").eq("id", bookingId).single()
    if (bookingError || !booking) return Response.json({ error: "Booking not found" }, { status: 404 })
    if (caller.id !== booking.user_id && caller.app_metadata?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

    const bucket = admin.storage.from("property-photos")
    const prefixes = [`${booking.user_id}/${booking.id}/photo-output`, `${booking.user_id}/${booking.id}/photo-delivery`]
    const paths: string[] = []
    for (const prefix of prefixes) {
      const { data, error } = await bucket.list(prefix, { limit: 1000 })
      if (error) throw error
      for (const file of data || []) if (file.name && !file.name.endsWith("/")) paths.push(`${prefix}/${file.name}`)
    }
    if (booking.delivery_zip_path && !paths.includes(booking.delivery_zip_path)) paths.push(booking.delivery_zip_path)
    if (paths.length) {
      const { error } = await bucket.remove(paths)
      if (error) throw error
    }

    const { error: updateError } = await admin.from("photography_bookings").update({ delivery_zip_path: null, media_deleted_at: new Date().toISOString() }).eq("id", booking.id)
    if (updateError) throw updateError
    return Response.json({ ok: true, deleted_files: paths.length })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to purge media" }, { status: 400 })
  }
})
