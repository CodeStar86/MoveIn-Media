import { useCallback, useEffect, useState, type FormEvent } from "react"
import { apiJson } from "../lib/api"

type Photographer = { user_id:string; display_name:string; email:string; active:boolean }
type Order = { id:string; customer_name:string; address:string; service:string; status:string; created_at:string; photographer_id:string|null }
type PhotographyBooking = { id:string; address:string; postcode:string; contact_name:string; phone:string; preferred_date:string; preferred_time:string; notes:string; price_pence:number; status:string; photographer_id:string|null; created_at:string }

export default function AdminDashboard(){
  const [photographers,setPhotographers]=useState<Photographer[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [bookings,setBookings]=useState<PhotographyBooking[]>([])
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("")
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("")

  const load=useCallback(async()=>{
    try{
      const [jobsData,photographyData]=await Promise.all([
        apiJson<{photographers:Photographer[];orders:Order[]}>("admin/dashboard"),
        apiJson<{photographers:Photographer[];bookings:PhotographyBooking[]}>("photography/admin"),
      ])
      setPhotographers(photographyData.photographers.length?photographyData.photographers:jobsData.photographers)
      setOrders(jobsData.orders); setBookings(photographyData.bookings)
    }catch(e){setMessage(e instanceof Error?e.message:"Could not load dashboard")}
  },[])

  useEffect(()=>{void load()},[load])

  async function addPhotographer(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("")
    try{await apiJson("admin/photographers",{method:"POST",body:JSON.stringify({email,display_name:name,password})});setName("");setEmail("");setPassword("");setMessage("Photographer account created.");await load()}
    catch(e){setMessage(e instanceof Error?e.message:"Could not add photographer")}
    finally{setBusy(false)}
  }

  async function assignOrder(orderId:string,photographerId:string){setMessage("");try{await apiJson(`admin/orders/${encodeURIComponent(orderId)}/assign`,{method:"POST",body:JSON.stringify({photographer_id:photographerId||null})});setMessage(photographerId?"Job allocated.":"Job unassigned.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Could not update job")}}
  async function assignBooking(bookingId:string,photographerId:string){setMessage("");try{await apiJson(`photography/admin/assign/${encodeURIComponent(bookingId)}`,{method:"POST",body:JSON.stringify({photographer_id:photographerId||null})});setMessage(photographerId?"Photography booking allocated.":"Photography booking returned to the allocation queue.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Could not allocate photographer")}}

  const activePhotographers=photographers.filter(p=>p.active)

  return <div>
    <section style={{background:"var(--primary)"}} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>ADMIN</p><h1 className="text-4xl text-white mt-2">Photographers & job allocation</h1><p className="text-white/60 mt-2">Allocate paid London photography bookings and uploaded-property jobs.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {message&&<div className="border p-4" role="status">{message}</div>}

      <form onSubmit={addPhotographer} className="border p-6 grid md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
        <label>Photographer name<input required value={name} onChange={e=>setName(e.target.value)} className="block w-full border p-3 mt-1"/></label>
        <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border p-3 mt-1"/></label>
        <label>Initial password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border p-3 mt-1"/></label>
        <button disabled={busy} className="px-5 py-3 text-white" style={{background:"var(--primary)"}}>{busy?"Creating…":"Add photographer"}</button>
      </form>

      <section>
        <div className="flex flex-wrap justify-between gap-4 items-end mb-5"><div><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>LONDON PHOTOGRAPHY</p><h2 className="text-3xl mt-1" style={{fontFamily:"var(--font-display)"}}>Paid photographer bookings</h2><p className="text-sm text-black/55 mt-1">Assign an available photographer once the £150 booking has been paid.</p></div><div className="border px-4 py-2 text-sm">{bookings.filter(b=>b.status==="paid").length} awaiting allocation</div></div>
        {!bookings.length&&<div className="border p-8 text-center text-black/55">No paid photography bookings yet.</div>}
        <div className="space-y-4">{bookings.map(booking=><article key={booking.id} className="border p-5 grid lg:grid-cols-[1fr_300px] gap-6 items-center" style={{background:booking.status==="paid"?"var(--muted)":"transparent"}}><div><div className="flex flex-wrap gap-2 items-center"><span className="text-xs uppercase tracking-widest" style={{color:"var(--accent)"}}>{booking.status}</span><span className="text-xs text-black/45">£150 paid booking</span></div><h3 className="text-xl mt-2">{booking.address}</h3><p className="text-sm text-black/60 mt-1">{booking.postcode} · {new Date(`${booking.preferred_date}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · {booking.preferred_time}</p><p className="text-sm mt-3"><strong>{booking.contact_name}</strong> · {booking.phone}</p>{booking.notes&&<p className="text-sm text-black/55 mt-2 whitespace-pre-wrap">{booking.notes}</p>}</div><label className="text-sm">Allocate photographer<select disabled={booking.status==="completed"} value={booking.photographer_id??""} onChange={e=>void assignBooking(booking.id,e.target.value)} className="block w-full border p-3 mt-2 bg-white"><option value="">{booking.status==="paid"?"Choose photographer":"Unassign"}</option>{activePhotographers.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select>{booking.status==="completed"&&<span className="block text-xs text-black/45 mt-2">Completed by photographer</span>}</label></article>)}</div>
      </section>

      <section><h2 className="text-2xl mb-4">Uploaded-property jobs</h2><div className="space-y-3">{orders.map(order=><article key={order.id} className="border p-5 grid md:grid-cols-[1fr_280px] gap-5 items-center"><div><small>{new Date(order.created_at).toLocaleDateString("en-GB")}</small><h3 className="text-lg mt-1">{order.address}</h3><p className="text-sm text-black/60">{order.customer_name} · {order.service} · {order.status}</p></div><label className="text-sm">Allocate photographer<select value={order.photographer_id??""} onChange={e=>void assignOrder(order.id,e.target.value)} className="block w-full border p-3 mt-1"><option value="">Unassigned</option>{activePhotographers.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label></article>)}</div></section>
    </section>
  </div>
}
