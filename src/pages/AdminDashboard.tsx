import { useCallback, useEffect, useState, type FormEvent } from "react"
import { apiJson } from "../lib/api"

type Photographer = { user_id:string; display_name:string; email:string; active:boolean }
type Order = { id:string; customer_name:string; address:string; service:string; status:string; created_at:string; photographer_id:string|null }
type PhotographyBooking = { id:string; address:string; postcode:string; contact_name:string; phone:string; preferred_date:string; preferred_time:string; notes:string; price_pence:number; status:string; photographer_id:string|null; created_at:string }
type Enquiry = { id:string; name:string; email:string; phone:string; service:string; message:string; source_path:string; status:"new"|"read"|"replied"|"closed"; reply_message:string|null; read_at:string|null; replied_at:string|null; created_at:string }

const serviceLabels:Record<string,string>={
  general:"General enquiry",
  "digital-decluttering":"Digital decluttering",
  "virtual-staging":"Virtual staging",
  "property-descriptions":"Property descriptions",
  "property-photography":"Property photography",
  "estate-agents":"Estate agent services",
  "airbnb-short-lets":"Airbnb & short-let services",
  other:"Other service",
}

export default function AdminDashboard(){
  const [photographers,setPhotographers]=useState<Photographer[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [bookings,setBookings]=useState<PhotographyBooking[]>([])
  const [enquiries,setEnquiries]=useState<Enquiry[]>([])
  const [replyDrafts,setReplyDrafts]=useState<Record<string,string>>({})
  const [replyingId,setReplyingId]=useState<string|null>(null)
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("")
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("")

  const load=useCallback(async()=>{
    try{
      const [jobsData,photographyData,enquiryData]=await Promise.all([
        apiJson<{photographers:Photographer[];orders:Order[]}>("admin/dashboard"),
        apiJson<{photographers:Photographer[];bookings:PhotographyBooking[]}>("photography/admin"),
        apiJson<{enquiries:Enquiry[]}>("enquiries/admin"),
      ])
      setPhotographers(photographyData.photographers.length?photographyData.photographers:jobsData.photographers)
      setOrders(jobsData.orders); setBookings(photographyData.bookings); setEnquiries(enquiryData.enquiries)
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
  async function markEnquiryRead(enquiry:Enquiry){
    if(enquiry.status!=="new") return
    setEnquiries(current=>current.map(item=>item.id===enquiry.id?{...item,status:"read"}:item))
    try{await apiJson(`enquiries/admin/${encodeURIComponent(enquiry.id)}/read`,{method:"POST"})}
    catch{await load()}
  }
  async function replyToEnquiry(e:FormEvent,enquiry:Enquiry){
    e.preventDefault()
    const reply=(replyDrafts[enquiry.id]||"").trim()
    if(!reply){setMessage("Please enter a reply before sending.");return}
    setReplyingId(enquiry.id);setMessage("")
    try{
      await apiJson(`enquiries/admin/${encodeURIComponent(enquiry.id)}/reply`,{method:"POST",body:JSON.stringify({message:reply})})
      setReplyDrafts(current=>({...current,[enquiry.id]:""}))
      setMessage(`Reply sent to ${enquiry.name}.`)
      await load()
    }catch(e){setMessage(e instanceof Error?e.message:"Could not send reply")}
    finally{setReplyingId(null)}
  }

  const activePhotographers=photographers.filter(p=>p.active)
  const newEnquiries=enquiries.filter(e=>e.status==="new").length

  return <div>
    <section style={{background:"var(--primary)"}} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>ADMIN</p><h1 className="text-4xl text-white mt-2">Inbox, photographers & job allocation</h1><p className="text-white/60 mt-2">Reply to customer enquiries and manage photography work from one dashboard.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {message&&<div className="border p-4" role="status">{message}</div>}

      <section>
        <div className="flex flex-wrap justify-between gap-4 items-end mb-5"><div><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>CUSTOMER INBOX</p><h2 className="text-3xl mt-1" style={{fontFamily:"var(--font-display)"}}>Service enquiries</h2><p className="text-sm text-black/55 mt-1">Messages submitted through the public enquiry form appear here.</p></div><div className="border px-4 py-2 text-sm">{newEnquiries} new · {enquiries.length} total</div></div>
        {!enquiries.length&&<div className="border p-8 text-center text-black/55">No service enquiries yet.</div>}
        <div className="space-y-4">{enquiries.map(enquiry=><article key={enquiry.id} className="border p-5 md:p-6" style={{background:enquiry.status==="new"?"var(--muted)":"transparent"}} onMouseEnter={()=>void markEnquiryRead(enquiry)}>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div>
              <div className="flex flex-wrap gap-2 items-center"><span className="text-xs uppercase tracking-widest" style={{color:"var(--accent)"}}>{enquiry.status}</span><span className="text-xs text-black/45">{new Date(enquiry.created_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</span></div>
              <h3 className="text-xl mt-2">{enquiry.name}</h3>
              <p className="text-sm text-black/60 mt-1"><a className="underline" href={`mailto:${enquiry.email}`}>{enquiry.email}</a>{enquiry.phone?` · ${enquiry.phone}`:""}</p>
              <p className="text-xs uppercase tracking-widest mt-4" style={{color:"var(--accent)"}}>{serviceLabels[enquiry.service]||enquiry.service}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{enquiry.message}</p>
              {enquiry.source_path&&<p className="text-xs text-black/40 mt-3">Submitted from {enquiry.source_path}</p>}
              {enquiry.reply_message&&<div className="mt-5 border-l-2 pl-4"><p className="text-xs uppercase tracking-widest text-black/45">Last admin reply</p><p className="text-sm mt-2 whitespace-pre-wrap text-black/65">{enquiry.reply_message}</p></div>}
            </div>
            <form onSubmit={e=>void replyToEnquiry(e,enquiry)} className="border p-4 self-start" onFocus={()=>void markEnquiryRead(enquiry)}>
              <label className="text-sm">Reply by email<textarea required rows={6} maxLength={10000} value={replyDrafts[enquiry.id]||""} onChange={e=>setReplyDrafts(current=>({...current,[enquiry.id]:e.target.value}))} className="block w-full border p-3 mt-2 resize-y" placeholder={`Reply to ${enquiry.name}…`}/></label>
              <button disabled={replyingId===enquiry.id} className="w-full mt-3 px-5 py-3 text-white text-sm uppercase tracking-widest disabled:opacity-60" style={{background:"var(--primary)"}}>{replyingId===enquiry.id?"Sending…":"Send reply"}</button>
              <p className="text-xs text-black/45 mt-2">Sent from the MoveIn Media email domain.</p>
            </form>
          </div>
        </article>)}</div>
      </section>

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
