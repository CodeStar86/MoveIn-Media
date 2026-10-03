import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { startCheckout } from "../lib/payments"
import { services } from "../lib/services"
import { apiDownloadUrl, apiJson } from "../lib/api"

type Order = {
  id: string
  address: string
  service: string
  price_pence: number | null
  status: string
  description: string | null
  created_at: string
  delivery_zip_path: string | null
}

type SubscriptionSummary = {
  plan: "portfolio5" | "portfolio10" | "portfolio20"
  status: string
  allowance: number
  used: number
  remaining: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

const serviceName = new Map(services.map((service) => [service.id, service.name]))
const statusLabels: Record<string, string> = { draft: "Draft", awaiting_payment: "Awaiting payment", paid: "Paid", processing: "Processing", ready: "Ready", cancelled: "Cancelled" }
const planLabels: Record<SubscriptionSummary["plan"], string> = { portfolio5: "Portfolio 5", portfolio10: "Portfolio 10", portfolio20: "Portfolio 20" }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
}
function formatPrice(pence: number | null) {
  if (pence == null) return "—"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100)
}

export default function Portal() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [payingId, setPayingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [ordersData, subscriptionData] = await Promise.all([
        apiJson<{ orders: Order[] }>("orders"),
        apiJson<{ subscription: SubscriptionSummary | null }>("subscription/summary"),
      ])
      setOrders(ordersData.orders)
      setSubscription(subscriptionData.subscription)
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load your properties. Please refresh and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadOrders() }, [loadOrders])

  async function pay(orderId: string) {
    setPayingId(orderId); setError("")
    try { await startCheckout(orderId) }
    catch (e) { setError(e instanceof Error ? e.message : "Checkout could not be started."); setPayingId(null) }
  }

  function downloadDelivery(order: Order) {
    if (!order.delivery_zip_path) return
    window.location.assign(apiDownloadUrl(`orders/${encodeURIComponent(order.id)}/delivery`))
  }

  const activeOrders = orders.filter((order) => !["ready", "cancelled"].includes(order.status)).length
  const readyOrders = orders.filter((order) => order.status === "ready").length
  const paymentState = searchParams.get("payment")
  const subscriptionState = searchParams.get("subscription")
  const activeSubscription = subscription && ["active", "trialing"].includes(subscription.status) ? subscription : null

  return <div>
    <section style={{ background: "var(--primary)" }} className="py-16"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>CLIENT PORTAL</p><h1 className="text-4xl text-white mt-2" style={{ fontFamily: "var(--font-display)" }}>Your properties & listings</h1><p className="text-white/60 mt-3">Track submissions, payments and completed property media in one place.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-12">
      {paymentState === "success" && <div role="status" className="border p-4 mb-6">Payment received. Your order status will update automatically.</div>}
      {paymentState === "cancelled" && <div role="status" className="border p-4 mb-6">Checkout was cancelled. Your property is saved and you can pay whenever you're ready.</div>}
      {subscriptionState === "success" && <div role="status" className="border p-4 mb-6">Your portfolio subscription has started. Your allowance refreshes automatically on each billing date.</div>}

      {!loading && activeSubscription && <div className="border p-6 mb-8" style={{background:"var(--muted)"}}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-xs uppercase tracking-widest" style={{color:"var(--accent)"}}>MONTHLY PORTFOLIO PLAN</p><h2 className="text-2xl mt-2" style={{fontFamily:"var(--font-display)"}}>{planLabels[activeSubscription.plan]}</h2><p className="text-sm text-black/60 mt-2">{activeSubscription.cancel_at_period_end ? "Ends" : "Renews"} {activeSubscription.current_period_end ? formatDate(activeSubscription.current_period_end) : "at the next billing cycle"}</p></div>
          <div className="text-right"><strong className="text-3xl">{activeSubscription.remaining}</strong><p className="text-xs uppercase tracking-widest text-black/50">properties remaining</p></div>
        </div>
        <div className="mt-5 h-2 bg-black/10 overflow-hidden"><div className="h-full" style={{background:"var(--accent)",width:`${Math.min(100,(activeSubscription.used/activeSubscription.allowance)*100)}%`}} /></div>
        <div className="flex justify-between gap-4 mt-2 text-sm text-black/60"><span>{activeSubscription.used} of {activeSubscription.allowance} used</span><span>{activeSubscription.remaining} remaining</span></div>
      </div>}

      {!loading && !activeSubscription && <div className="border p-5 mb-8 flex flex-wrap gap-4 items-center justify-between"><div><strong>Need regular monthly capacity?</strong><p className="text-sm text-black/60 mt-1">Portfolio plans include 5, 10 or 20 properties and refresh on your billing date.</p></div><Link to="/pricing" className="px-5 py-3 text-xs uppercase tracking-widest" style={{background:"var(--primary)",color:"white"}}>View plans</Link></div>}

      <div className="grid sm:grid-cols-3 gap-4 mb-10"><div className="p-5 border"><small>TOTAL ORDERS</small><h3 className="mt-2 text-2xl">{orders.length}</h3></div><div className="p-5 border"><small>IN PROGRESS</small><h3 className="mt-2 text-2xl">{activeOrders}</h3></div><div className="p-5 border"><small>READY</small><h3 className="mt-2 text-2xl">{readyOrders}</h3></div></div>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-5"><div><h2 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>Recent properties</h2><p className="text-sm text-black/50 mt-1">Your latest submissions and their current status.</p></div><Link to="/upload" className="px-5 py-3 text-xs uppercase tracking-widest" style={{ background: "var(--accent)" }}>+ Upload property</Link></div>
      {loading && <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Loading your properties…</span></div></section>}
      {error && <div role="alert" className="border p-5 mb-5"><p>{error}</p><button className="underline mt-3" onClick={() => void loadOrders()}>Try again</button></div>}
      {!loading && !error && orders.length === 0 && <div className="border p-8 text-center"><h3 className="text-xl">No properties yet</h3><p className="text-black/60 mt-2 mb-5">Submit your first property and it will appear here.</p><Link to="/upload" className="inline-block px-5 py-3 text-sm" style={{ background: "var(--primary)", color: "white" }}>Upload a property</Link></div>}
      {!loading && orders.length > 0 && <div className="space-y-3">{orders.map((order) => <article key={order.id} className="p-5 border flex flex-wrap gap-4 justify-between items-start"><div><small style={{ color: "var(--accent)" }}>{formatDate(order.created_at)}</small><div className="font-medium mt-1">{order.address}</div><small className="text-black/50">{serviceName.get(order.service) ?? order.service} · standard {formatPrice(order.price_pence)}</small>{order.status === "ready" && order.description && <p className="mt-3 text-sm max-w-3xl whitespace-pre-wrap">{order.description}</p>}</div><div className="flex items-center gap-3"><span className="text-sm border px-3 py-1">{statusLabels[order.status] ?? order.status}</span>{order.status === "awaiting_payment" && <button type="button" disabled={payingId === order.id} onClick={() => void pay(order.id)} className="px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>{payingId === order.id ? "Opening…" : "Pay now"}</button>}{order.status === "ready" && order.delivery_zip_path && <button type="button" onClick={() => downloadDelivery(order)} className="px-4 py-2 text-xs uppercase tracking-widest text-white" style={{ background: "var(--primary)" }}>Download edited ZIP</button>}</div></article>)}</div>}
    </section>
  </div>
}
