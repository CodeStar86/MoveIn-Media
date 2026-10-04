import Stripe from "npm:stripe@22.6.2"
import { withSupabase } from "npm:@supabase/server@1.9.0"

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
const configuredSiteUrl = Deno.env.get("SITE_URL")

function normaliseOrigin(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const url = new URL(value)
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) return null
    return url.origin
  } catch {
    return null
  }
}

function checkoutOrigin(req: Request, requestedOrigin: unknown) {
  const browserOrigin = normaliseOrigin(req.headers.get("origin"))
  const requested = normaliseOrigin(requestedOrigin)
  if (browserOrigin && requested === browserOrigin) return browserOrigin
  if (requested) return requested
  if (browserOrigin) return browserOrigin
  return normaliseOrigin(configuredSiteUrl)
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (!stripeKey) return Response.json({ error: "Payments are not configured." }, { status: 503 })
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

    const body = await req.json().catch(() => null)
    const orderId = typeof body?.orderId === "string" ? body.orderId : ""
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return Response.json({ error: "Invalid order." }, { status: 400 })

    const origin = checkoutOrigin(req, body?.returnOrigin)
    if (!origin) return Response.json({ error: "The checkout return URL is not configured." }, { status: 503 })

    const { data: order, error } = await ctx.supabase
      .from("orders")
      .select("id,user_id,address,service,price_pence,status,billing_type,subscription_charge_pence")
      .eq("id", orderId)
      .single()

    if (error || !order) return Response.json({ error: "Order not found." }, { status: 404 })
    if (order.status !== "awaiting_payment") return Response.json({ error: "This order is not awaiting payment." }, { status: 409 })

    const amount = order.billing_type === "payg" ? order.price_pence : order.subscription_charge_pence
    if (!Number.isInteger(amount) || amount < 50) return Response.json({ error: "Invalid order price." }, { status: 409 })

    const stripe = new Stripe(stripeKey)
    const label = order.billing_type === "subscription_overage"
      ? "Portfolio plan overage"
      : order.billing_type === "subscription_included"
        ? "Portfolio plan add-on"
        : order.service

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: ctx.userClaims?.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id, user_id: order.user_id, service: order.service, billing_type: order.billing_type },
      payment_intent_data: { metadata: { order_id: order.id, user_id: order.user_id, billing_type: order.billing_type } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: amount,
          product_data: { name: `MoveIn Media — ${label}`, description: order.address },
        },
      }],
      success_url: `${origin}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/portal?payment=cancelled`,
    })

    return Response.json({ url: session.url })
  }),
}
