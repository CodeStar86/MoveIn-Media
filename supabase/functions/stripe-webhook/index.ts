import Stripe from "npm:stripe@22.6.2"
import { withSupabase } from "npm:@supabase/server@1.9.0"

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")
const cryptoProvider = Stripe.createSubtleCryptoProvider()

function allowance(plan?: string | null) {
  return plan === "portfolio5" ? 5 : plan === "portfolio10" ? 10 : plan === "portfolio20" ? 20 : null
}

async function syncSubscription(ctx: any, subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const plan = subscription.metadata?.plan || null
  const max = allowance(plan)
  const userId = subscription.metadata?.user_id || fallbackUserId || null
  if (!plan || !max || !userId) return

  await ctx.supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    allowance: max,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })
}

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
        const { data: order } = await ctx.supabaseAdmin.from("orders").select("id,price_pence,status,billing_type,subscription_charge_pence").eq("id", orderId).single()
        const expected = order?.billing_type === "payg" ? order?.price_pence : order?.subscription_charge_pence
        if (order && expected === session.amount_total && order.status === "awaiting_payment") {
          await ctx.supabaseAdmin.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", orderId).eq("status", "awaiting_payment")
        }
      }

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
        await syncSubscription(ctx, subscription, session.client_reference_id || session.metadata?.user_id || null)
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncSubscription(ctx, event.data.object as Stripe.Subscription)
    }

    return Response.json({ received: true })
  }),
}
