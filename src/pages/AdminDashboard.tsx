import { useCallback, useEffect, useState, type FormEvent } from "react"
import { apiJson } from "../lib/api"

type Photographer = { user_id: string; display_name: string; email: string; active: boolean }
type Order = { id: string; customer_name: string; address: string; service: string; status: string; created_at: string; photographer_id: string | null }

export default function AdminDashboard() {
  const [photographers, setPhotographers] = useState<Photographer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await apiJson<{ photographers: Photographer[]; orders: Order[] }>("admin/dashboard")
      setPhotographers(data.photographers); setOrders(data.orders)
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not load dashboard") }
  }, [])

  useEffect(() => { void load() }, [load])

  async function addPhotographer(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("")
    try {
      await apiJson("admin/photographers", { method: "POST", body: JSON.stringify({ email, display_name: name, password }) })
      setName(""); setEmail(""); setPassword("")
      setMessage("Photographer account created. Share the initial password securely; the photographer can change it after signing in.")
      await load()
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Could not add photographer"
      setMessage(/email.*rate.*limit/i.test(detail)
        ? "Email sending limit reached. Wait before trying again, or configure custom SMTP in Supabase Authentication to send more invitations."
        : detail)
    } finally { setBusy(false) }
  }

  async function assign(orderId: string, photographerId: string) {
    setMessage("")
    try {
      await apiJson(`admin/orders/${encodeURIComponent(orderId)}/assign`, { method: "POST", body: JSON.stringify({ photographer_id: photographerId || null }) })
      setMessage(photographerId ? "Job allocated." : "Job unassigned."); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not update job") }
  }

  return <div>
    <section style={{ background: "var(--primary)" }} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>ADMIN</p><h1 className="text-4xl text-white mt-2">Photographers & job allocation</h1></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {message && <div className="border p-4" role="status">{message}</div>}
      <form onSubmit={addPhotographer} className="border p-6 grid md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
        <label className="block">Photographer name<input required value={name} onChange={e=>setName(e.target.value)} className="block w-full border p-3 mt-1" /></label>
        <label className="block">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border p-3 mt-1" /></label>
        <label className="block">Initial password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border p-3 mt-1" /></label>
        <button disabled={busy} className="px-5 py-3 text-white" style={{ background: "var(--primary)" }}>{busy ? "Creating…" : "Add photographer"}</button>
      </form>
      <div><h2 className="text-2xl mb-4">Paid jobs</h2><div className="space-y-3">{orders.map(order => <article key={order.id} className="border p-5 grid md:grid-cols-[1fr_280px] gap-5 items-center"><div><small>{new Date(order.created_at).toLocaleDateString("en-GB")}</small><h3 className="text-lg mt-1">{order.address}</h3><p className="text-sm text-black/60">{order.customer_name} · {order.service} · {order.status}</p></div><label className="text-sm">Allocate photographer<select value={order.photographer_id ?? ""} onChange={e=>void assign(order.id,e.target.value)} className="block w-full border p-3 mt-1"><option value="">Unassigned</option>{photographers.filter(p=>p.active).map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label></article>)}</div></div>
    </section>
  </div>
}
