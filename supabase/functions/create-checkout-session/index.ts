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

  // A browser-supplied returnOrigin is accepted only when it matches the
  // request Origin header. This makes checkout follow the deployment the user
  // is currently on without turning the function into an arbitrary redirect.
  if (browserOrigin && requested === browserOrigin) return browserOrigin
  if (browserOrigin) return browserOrigin

  // Keep SITE_URL as a fallback for non-browser callers and older clients.
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
    if (!origin) {
      return Response.json(
        { error: "The checkout return URL is not configured." },
        { status: 503 },
      )
    }

    const { data: order, error } = await ctx.supabase
      .from("orders")
      .select("id,user_id,address,service,price_pence,status")
      .eq("id", orderId)
      .single()

    if (error || !order) return Response.json({ error: "Order not found." }, { status: 404 })
    if (order.status !== "awaiting_payment") return Response.json({ error: "This order is not awaiting payment." }, { status: 409 })
    if (!Number.isInteger(order.price_pence) || order.price_pence < 50) return Response.json({ error: "Invalid order price." }, { status: 409 })

    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: ctx.userClaims?.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id, user_id: order.user_id, service: order.service },
      payment_intent_data: { metadata: { order_id: order.id, user_id: order.user_id } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: order.price_pence,
          product_data: { name: `MoveIn Media — ${order.service}`, description: order.address },
        },
      }],
      success_url: `${origin}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/portal?payment=cancelled`,
    })

    return Response.json({ url: session.url })
  }),
}
