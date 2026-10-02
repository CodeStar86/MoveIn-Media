import { useCallback, useEffect, useState, type FormEvent } from "react"
import { supabase } from "../lib/supabase"

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
    const [{ data: people, error: peopleError }, { data: jobs, error: jobsError }] = await Promise.all([
      supabase.from("staff_profiles").select("user_id,display_name,email,active").eq("role", "photographer").order("display_name"),
      supabase.from("orders").select("id,customer_name,address,service,status,created_at,photographer_id").in("status", ["paid", "processing", "ready"]).order("created_at", { ascending: false }),
    ])
    if (peopleError || jobsError) setMessage(peopleError?.message || jobsError?.message || "Could not load dashboard")
    setPhotographers((people ?? []) as Photographer[])
    setOrders((jobs ?? []) as Order[])
  }, [])

  useEffect(() => { void load() }, [load])

  async function addPhotographer(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("")
    const { data, error } = await supabase.functions.invoke("admin-add-photographer", { body: { email, display_name: name, password } })
    setBusy(false)
    if (error || data?.error) {
      let detail = data?.error || error?.message || "Could not add photographer"
      if (error && "context" in error && error.context instanceof Response) {
        const response = await error.context.clone().json().catch(() => null)
        if (typeof response?.error === "string") detail = response.error
      }
      setMessage(/email.*rate.*limit/i.test(detail)
        ? "Email sending limit reached. Wait before trying again, or configure custom SMTP in Supabase Authentication to send more invitations."
        : detail)
      return
    }
    setName(""); setEmail(""); setPassword(""); setMessage("Photographer account created. Share the initial password securely; the photographer can change it after signing in."); await load()
  }

  async function assign(orderId: string, photographerId: string) {
    setMessage("")
    const { error } = await supabase.from("orders").update({ photographer_id: photographerId || null }).eq("id", orderId)
    if (error) setMessage(error.message)
    else { setMessage(photographerId ? "Job allocated." : "Job unassigned."); await load() }
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
      <div>
        <h2 className="text-2xl mb-4">Paid jobs</h2>
        <div className="space-y-3">{orders.map(order => <article key={order.id} className="border p-5 grid md:grid-cols-[1fr_280px] gap-5 items-center">
          <div><small>{new Date(order.created_at).toLocaleDateString("en-GB")}</small><h3 className="text-lg mt-1">{order.address}</h3><p className="text-sm text-black/60">{order.customer_name} · {order.service} · {order.status}</p></div>
          <label className="text-sm">Allocate photographer<select value={order.photographer_id ?? ""} onChange={e=>void assign(order.id,e.target.value)} className="block w-full border p-3 mt-1"><option value="">Unassigned</option>{photographers.filter(p=>p.active).map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label>
        </article>)}</div>
      </div>
    </section>
  </div>
}
