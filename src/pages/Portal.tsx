import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "../lib/auth"
import { startCheckout } from "../lib/payments"
import { services } from "../lib/services"
import { supabase } from "../lib/supabase"

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

const serviceName = new Map(services.map((service) => [service.id, service.name]))
const statusLabels: Record<string, string> = { draft: "Draft", awaiting_payment: "Awaiting payment", paid: "Paid", processing: "Processing", ready: "Ready", cancelled: "Cancelled" }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
}
function formatPrice(pence: number | null) {
  if (pence == null) return "—"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100)
}

export default function Portal() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [payingId, setPayingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!user) return
    setLoading(true); setError("")
    const { data, error: queryError } = await supabase.from("orders").select("id,address,service,price_pence,status,description,created_at,delivery_zip_path").eq("user_id", user.id).order("created_at", { ascending: false })
    if (queryError) { setError("We couldn't load your properties. Please refresh and try again."); console.error(queryError) }
    else setOrders((data ?? []) as Order[])
    setLoading(false)
  }, [user])

  useEffect(() => { void loadOrders() }, [loadOrders])

  async function pay(orderId: string) {
    setPayingId(orderId); setError("")
    try { await startCheckout(orderId) }
    catch (e) { setError(e instanceof Error ? e.message : "Checkout could not be started."); setPayingId(null) }
  }


  async function downloadDelivery(order: Order) {
    if (!order.delivery_zip_path) return
    setError("")
    const { data, error } = await supabase.storage.from("property-photos").createSignedUrl(order.delivery_zip_path, 300, { download: `movein-media-${order.id}.zip` })
    if (error || !data?.signedUrl) { setError(error?.message || "Could not prepare the ZIP download."); return }
    window.location.assign(data.signedUrl)
  }

  const activeOrders = orders.filter((order) => !["ready", "cancelled"].includes(order.status)).length
  const readyOrders = orders.filter((order) => order.status === "ready").length
  const paymentState = searchParams.get("payment")

  return <div>
    <section style={{ background: "var(--primary)" }} className="py-16"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>CLIENT PORTAL</p><h1 className="text-4xl text-white mt-2" style={{ fontFamily: "var(--font-display)" }}>Your properties & listings</h1><p className="text-white/60 mt-3">Track submissions, payments and completed property media in one place.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-12">
      {paymentState === "success" && <div role="status" className="border p-4 mb-6">Payment received. Your order status will update automatically.</div>}
      {paymentState === "cancelled" && <div role="status" className="border p-4 mb-6">Checkout was cancelled. Your property is saved and you can pay whenever you're ready.</div>}
      <div className="grid sm:grid-cols-3 gap-4 mb-10"><div className="p-5 border"><small>TOTAL ORDERS</small><h3 className="mt-2 text-2xl">{orders.length}</h3></div><div className="p-5 border"><small>IN PROGRESS</small><h3 className="mt-2 text-2xl">{activeOrders}</h3></div><div className="p-5 border"><small>READY</small><h3 className="mt-2 text-2xl">{readyOrders}</h3></div></div>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-5"><div><h2 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>Recent properties</h2><p className="text-sm text-black/50 mt-1">Your latest submissions and their current status.</p></div><Link to="/upload" className="px-5 py-3 text-xs uppercase tracking-widest" style={{ background: "var(--accent)" }}>+ Upload property</Link></div>
      {loading && <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Loading your properties…</span></div></section>}
      {error && <div role="alert" className="border p-5 mb-5"><p>{error}</p><button className="underline mt-3" onClick={() => void loadOrders()}>Try again</button></div>}
      {!loading && !error && orders.length === 0 && <div className="border p-8 text-center"><h3 className="text-xl">No properties yet</h3><p className="text-black/60 mt-2 mb-5">Submit your first property and it will appear here.</p><Link to="/upload" className="inline-block px-5 py-3 text-sm" style={{ background: "var(--primary)", color: "white" }}>Upload a property</Link></div>}
      {!loading && orders.length > 0 && <div className="space-y-3">{orders.map((order) => <article key={order.id} className="p-5 border flex flex-wrap gap-4 justify-between items-start"><div><small style={{ color: "var(--accent)" }}>{formatDate(order.created_at)}</small><div className="font-medium mt-1">{order.address}</div><small className="text-black/50">{serviceName.get(order.service) ?? order.service} · {formatPrice(order.price_pence)}</small>{order.status === "ready" && order.description && <p className="mt-3 text-sm max-w-3xl whitespace-pre-wrap">{order.description}</p>}</div><div className="flex items-center gap-3"><span className="text-sm border px-3 py-1">{statusLabels[order.status] ?? order.status}</span>{order.status === "awaiting_payment" && <button type="button" disabled={payingId === order.id} onClick={() => void pay(order.id)} className="px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>{payingId === order.id ? "Opening…" : `Pay ${formatPrice(order.price_pence)}`}</button>}{order.status === "ready" && order.delivery_zip_path && <button type="button" onClick={() => void downloadDelivery(order)} className="px-4 py-2 text-xs uppercase tracking-widest text-white" style={{ background: "var(--primary)" }}>Download edited ZIP</button>}</div></article>)}</div>}
    </section>
  </div>
}
