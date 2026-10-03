import Stripe from "npm:stripe@22.6.2"
import { withSupabase } from "npm:@supabase/server@1.9.0"

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
const siteUrl = Deno.env.get("SITE_URL")

const plans = {
  portfolio5: { name: "Portfolio 5", amount: 9000, allowance: 5 },
  portfolio10: { name: "Portfolio 10", amount: 16000, allowance: 10 },
  portfolio20: { name: "Portfolio 20", amount: 28000, allowance: 20 },
} as const

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (!stripeKey || !siteUrl) return Response.json({ error: "Subscriptions are not configured." }, { status: 503 })
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

    const body = await req.json().catch(() => null)
    const planId = typeof body?.plan === "string" ? body.plan : ""
    const plan = plans[planId as keyof typeof plans]
    if (!plan) return Response.json({ error: "Invalid plan." }, { status: 400 })

    const stripe = new Stripe(stripeKey)
    const origin = siteUrl.replace(/\/$/, "")
    const userId = String(ctx.userClaims?.sub || "")
    if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 })

    const { data: existing } = await ctx.supabase
      .from("subscriptions")
      .select("stripe_customer_id,stripe_subscription_id,status")
      .eq("user_id", userId)
      .maybeSingle()

    if (existing?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(existing.status)) {
      return Response.json({ error: "You already have a subscription. Contact support to change plans." }, { status: 409 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existing?.stripe_customer_id || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : (ctx.userClaims?.email ?? undefined),
      client_reference_id: userId,
      metadata: { user_id: userId, plan: planId },
      subscription_data: { metadata: { user_id: userId, plan: planId, allowance: String(plan.allowance) } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: plan.amount,
          recurring: { interval: "month" },
          product_data: { name: `MoveIn Media — ${plan.name}`, description: `${plan.allowance} included properties per billing month` },
        },
      }],
      success_url: `${origin}/portal?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
    })

    return Response.json({ url: session.url })
  }),
}
