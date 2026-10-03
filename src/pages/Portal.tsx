import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { startCheckout } from "../lib/payments"
import { services } from "../lib/services"
import { apiDownloadUrl, apiJson } from "../lib/api"

type Order = { id:string; address:string; service:string; price_pence:number|null; status:string; description:string|null; created_at:string; delivery_zip_path:string|null; media_deleted_at:string|null }
type Booking = { id:string; address:string; postcode:string; preferred_date:string; preferred_time:"morning"|"afternoon"|"flexible"; price_pence:number; status:string; photographer_id:string|null; created_at:string; delivered_at:string|null; delivery_zip_path:string|null; media_deleted_at:string|null; photo_count:number }
type SubscriptionSummary = { plan:"portfolio5"|"portfolio10"|"portfolio20"; status:string; allowance:number; used:number; remaining:number; current_period_start:string|null; current_period_end:string|null; cancel_at_period_end:boolean }

const serviceName = new Map(services.map(service => [service.id, service.name]))
const statusLabels: Record<string,string> = { draft:"Draft", awaiting_payment:"Awaiting payment", paid:"Paid", processing:"Processing", ready:"Ready", cancelled:"Cancelled" }
const bookingStatus: Record<string,string> = { awaiting_payment:"Awaiting payment", paid:"Paid · awaiting photographer", assigned:"Photographer assigned", completed:"Photos ready", cancelled:"Cancelled" }
const planLabels: Record<SubscriptionSummary["plan"],string> = { portfolio5:"Portfolio 5", portfolio10:"Portfolio 10", portfolio20:"Portfolio 20" }

function formatDate(value:string) { return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value)) }
function formatPrice(pence:number|null) { return pence==null?"—":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(pence/100) }

export default function Portal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders,setOrders] = useState<Order[]>([])
  const [bookings,setBookings] = useState<Booking[]>([])
  const [subscription,setSubscription] = useState<SubscriptionSummary|null>(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState("")
  const [payingId,setPayingId] = useState<string|null>(null)

  const loadOrders = useCallback(async()=>{
    setLoading(true); setError("")
    try {
      const [ordersData,subscriptionData,bookingData] = await Promise.all([
        apiJson<{orders:Order[]}>("orders"),
        apiJson<{subscription:SubscriptionSummary|null}>("subscription/summary"),
        apiJson<{bookings:Booking[]}>("photography/bookings"),
      ])
      setOrders(ordersData.orders); setSubscription(subscriptionData.subscription); setBookings(bookingData.bookings)
    } catch(e) { setError(e instanceof Error?e.message:"We couldn't load your account. Please refresh and try again.") }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ void loadOrders() },[loadOrders])

  async function pay(orderId:string){ setPayingId(orderId); setError(""); try{ await startCheckout(orderId) }catch(e){ setError(e instanceof Error?e.message:"Checkout could not be started."); setPayingId(null) } }
  async function payBooking(bookingId:string){ setPayingId(bookingId); setError(""); try{ const data=await apiJson<{url:string}>(`photography/checkout/${encodeURIComponent(bookingId)}`,{method:"POST"}); window.location.assign(data.url) }catch(e){ setError(e instanceof Error?e.message:"Checkout could not be started."); setPayingId(null) } }

  function downloadDelivery(order:Order){
    if(!order.delivery_zip_path)return
    const link=document.createElement("a"); link.href=apiDownloadUrl(`orders/${encodeURIComponent(order.id)}/delivery`); link.target="_blank"; link.rel="noopener"; document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(()=>navigate(`/portal/download/${encodeURIComponent(order.id)}`),250)
  }

  function downloadPhotography(booking:Booking){
    if(!booking.delivery_zip_path||booking.media_deleted_at)return
    const link=document.createElement("a")
    link.href=apiDownloadUrl(`photography/delivery/${encodeURIComponent(booking.id)}`)
    link.target="_blank"
    link.rel="noopener"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(()=>void loadOrders(),1200)
  }

  const activeOrders=orders.filter(order=>!["ready","cancelled"].includes(order.status)).length
  const readyOrders=orders.filter(order=>order.status==="ready").length
  const activeSubscription=subscription&&["active","trialing"].includes(subscription.status)?subscription:null
  const paymentState=searchParams.get("payment"), subscriptionState=searchParams.get("subscription"), photographyState=searchParams.get("photography")

  return <div>
    <section style={{background:"var(--primary)"}} className="py-16"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>CLIENT PORTAL</p><h1 className="text-4xl text-white mt-2" style={{fontFamily:"var(--font-display)"}}>Your properties & bookings</h1><p className="text-white/60 mt-3">Track uploads, photographer visits, payments and completed property media in one place.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-12">
      {paymentState==="success"&&<div role="status" className="border p-4 mb-6">Payment received. Your order status will update automatically.</div>}
      {paymentState==="cancelled"&&<div role="status" className="border p-4 mb-6">Checkout was cancelled. Your property is saved and you can pay whenever you're ready.</div>}
      {subscriptionState==="success"&&<div role="status" className="border p-4 mb-6">Your portfolio subscription has started. Your allowance refreshes automatically on each billing date.</div>}
      {photographyState==="success"&&<div role="status" className="border p-4 mb-6">Photography booking paid. The admin team will allocate a London photographer for your requested visit.</div>}

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <Link to="/upload" className="border p-6 block" style={{borderColor:"var(--border)"}}><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>UPLOAD YOUR PHOTOS</p><h2 className="text-2xl mt-2" style={{fontFamily:"var(--font-display)"}}>Send us an existing property shoot</h2><p className="text-sm text-black/55 mt-2">Use decluttering, staging and description services with your own images.</p></Link>
        <Link to="/photographer-booking" className="border p-6 block text-white" style={{background:"var(--primary)",borderColor:"var(--primary)"}}><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>LONDON ONLY · £150</p><h2 className="text-2xl mt-2" style={{fontFamily:"var(--font-display)"}}>Book a property photographer</h2><p className="text-sm text-white/60 mt-2">We photograph the property and handle the marketing image workflow.</p></Link>
      </div>

      {!loading&&activeSubscription&&<div className="border p-6 mb-8" style={{background:"var(--muted)"}}><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs uppercase tracking-widest" style={{color:"var(--accent)"}}>MONTHLY PORTFOLIO PLAN</p><h2 className="text-2xl mt-2" style={{fontFamily:"var(--font-display)"}}>{planLabels[activeSubscription.plan]}</h2><p className="text-sm text-black/60 mt-2">{activeSubscription.cancel_at_period_end?"Ends":"Renews"} {activeSubscription.current_period_end?formatDate(activeSubscription.current_period_end):"at the next billing cycle"}</p></div><div className="text-right"><strong className="text-3xl">{activeSubscription.remaining}</strong><p className="text-xs uppercase tracking-widest text-black/50">properties remaining</p></div></div></div>}

      {loading&&<section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Loading your account…</span></div></section>}
      {error&&<div role="alert" className="border p-5 mb-5"><p>{error}</p><button className="underline mt-3" onClick={()=>void loadOrders()}>Try again</button></div>}

      {!loading&&bookings.length>0&&<section className="mb-12"><div className="flex flex-wrap items-end justify-between gap-4 mb-5"><div><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>PHOTOGRAPHY</p><h2 className="text-2xl mt-1" style={{fontFamily:"var(--font-display)"}}>Photographer bookings</h2></div><Link to="/photographer-booking" className="px-5 py-3 text-xs uppercase tracking-widest text-white" style={{background:"var(--primary)"}}>+ Book photographer</Link></div><div className="space-y-3">{bookings.map(booking=><article key={booking.id} className="border p-5 flex flex-wrap justify-between gap-5"><div><small style={{color:"var(--accent)"}}>{formatDate(booking.preferred_date)} · {booking.preferred_time}</small><h3 className="text-lg mt-1">{booking.address}</h3><p className="text-sm text-black/50">{booking.postcode} · £150 property photography</p>{booking.status==="completed"&&!booking.media_deleted_at&&<p className="text-xs text-black/50 mt-2">{booking.photo_count} completed photo{booking.photo_count===1?"":"s"} ready in your private ZIP.</p>}{booking.media_deleted_at&&<p className="text-xs text-black/50 mt-2">Downloaded · completed photos and ZIP permanently deleted from storage.</p>}</div><div className="flex flex-wrap items-center gap-3"><span className="border px-3 py-2 text-sm">{booking.media_deleted_at?"Downloaded · deleted":bookingStatus[booking.status]??booking.status}</span>{booking.status==="awaiting_payment"&&<button disabled={payingId===booking.id} onClick={()=>void payBooking(booking.id)} className="px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-50" style={{background:"var(--primary)"}}>{payingId===booking.id?"Opening…":"Pay £150"}</button>}{booking.status==="completed"&&booking.delivery_zip_path&&!booking.media_deleted_at&&<button onClick={()=>downloadPhotography(booking)} className="px-4 py-2 text-xs uppercase tracking-widest text-white" style={{background:"var(--primary)"}}>Download photos ZIP</button>}</div></article>)}</div></section>}

      <div className="grid sm:grid-cols-3 gap-4 mb-10"><div className="p-5 border"><small>TOTAL ORDERS</small><h3 className="mt-2 text-2xl">{orders.length}</h3></div><div className="p-5 border"><small>IN PROGRESS</small><h3 className="mt-2 text-2xl">{activeOrders}</h3></div><div className="p-5 border"><small>READY</small><h3 className="mt-2 text-2xl">{readyOrders}</h3></div></div>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-5"><div><h2 className="text-2xl" style={{fontFamily:"var(--font-display)"}}>Recent properties</h2><p className="text-sm text-black/50 mt-1">Your latest submissions and their current status.</p></div><Link to="/upload" className="px-5 py-3 text-xs uppercase tracking-widest" style={{background:"var(--accent)"}}>+ Upload property</Link></div>
      {!loading&&!error&&orders.length===0&&<div className="border p-8 text-center"><h3 className="text-xl">No uploaded properties yet</h3><p className="text-black/60 mt-2 mb-5">Upload existing photos or book a London photographer.</p></div>}
      {!loading&&orders.length>0&&<div className="space-y-3">{orders.map(order=><article key={order.id} className="p-5 border flex flex-wrap gap-4 justify-between items-start"><div><small style={{color:"var(--accent)"}}>{formatDate(order.created_at)}</small><div className="font-medium mt-1">{order.address}</div><small className="text-black/50">{serviceName.get(order.service)??order.service} · standard {formatPrice(order.price_pence)}</small>{order.status==="ready"&&order.description&&<p className="mt-3 text-sm max-w-3xl whitespace-pre-wrap">{order.description}</p>}{order.media_deleted_at&&<p className="mt-3 text-xs text-black/50">Downloaded {formatDate(order.media_deleted_at)} · stored property photos and delivery ZIP deleted.</p>}</div><div className="flex flex-wrap items-center gap-3"><span className="text-sm border px-3 py-1">{statusLabels[order.status]??order.status}</span>{order.status==="awaiting_payment"&&<button disabled={payingId===order.id} onClick={()=>void pay(order.id)} className="px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-50" style={{background:"var(--primary)"}}>{payingId===order.id?"Opening…":"Pay now"}</button>}{order.status==="ready"&&order.delivery_zip_path&&!order.media_deleted_at&&<button onClick={()=>downloadDelivery(order)} className="px-4 py-2 text-xs uppercase tracking-widest text-white" style={{background:"var(--primary)"}}>Download edited ZIP</button>}{order.status==="ready"&&order.media_deleted_at&&<Link to={`/portal/download/${encodeURIComponent(order.id)}`} className="px-4 py-2 text-xs uppercase tracking-widest border">View download status</Link>}</div></article>)}</div>}
    </section>
  </div>
}
