import Stripe from "npm:stripe@22.6.2"
import { withSupabase } from "npm:@supabase/server@1.9.0"

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")
const cryptoProvider = Stripe.createSubtleCryptoProvider()

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (!stripeKey || !webhookSecret) return Response.json({ error: "Payments are not configured." }, { status: 503 })
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

    const signature = req.headers.get("stripe-signature") ?? ""
    const body = await req.text()
    const stripe = new Stripe(stripeKey)
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider)
    } catch {
      return Response.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      if (orderId && session.payment_status === "paid" && typeof session.amount_total === "number") {
        const { data: order } = await ctx.supabaseAdmin.from("orders").select("id,price_pence,status").eq("id", orderId).single()
        if (order && order.price_pence === session.amount_total && order.status === "awaiting_payment") {
          await ctx.supabaseAdmin.from("orders").update({
            status: "paid",
            paid_at: new Date().toISOString(),
          }).eq("id", orderId).eq("status", "awaiting_payment")
        }
      }
    }

    return Response.json({ received: true })
  }),
}
