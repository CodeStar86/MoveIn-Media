import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.57.4"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } })

  const url = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  const caller = callerData.user
  if (callerError || !caller || caller.app_metadata?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } })
  }

  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const displayName = String(body?.display_name || "").trim()
    const password = String(body?.password || "")
    if (!email || !displayName || !password) throw new Error("Email, display name and password are required")
    if (password.length < 8) throw new Error("Password must be at least 8 characters")

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (createError) throw createError
    if (!created.user) throw new Error("Photographer account could not be created")

    const photographerId = created.user.id
    const { error: roleError } = await admin.auth.admin.updateUserById(photographerId, {
      app_metadata: { ...(created.user.app_metadata || {}), role: "photographer" },
    })
    if (roleError) {
      await admin.auth.admin.deleteUser(photographerId).catch(() => undefined)
      throw roleError
    }

    const { error: profileError } = await admin.from("staff_profiles").upsert({
      user_id: photographerId,
      role: "photographer",
      display_name: displayName,
      email,
      active: true,
      created_by: caller.id,
      updated_at: new Date().toISOString(),
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(photographerId).catch(() => undefined)
      throw profileError
    }

    return new Response(JSON.stringify({ user_id: photographerId, email, display_name: displayName }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add photographer"
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
  }
})