import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { apiJson } from "../lib/api"

type Booking = {
  id: string
  address: string
  postcode: string
  preferred_date: string
  preferred_time: "morning" | "afternoon" | "flexible"
  price_pence: number
  status: string
  photographer_id: string | null
  created_at: string
}

const timeLabels = {
  morning: "Morning (9am–12pm)",
  afternoon: "Afternoon (12pm–5pm)",
  flexible: "Flexible",
}

export default function PhotographerBooking() {
  const [address, setAddress] = useState("")
  const [postcode, setPostcode] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [preferredTime, setPreferredTime] = useState<keyof typeof timeLabels>("morning")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const booking = await apiJson<{ id: string }>("photography/bookings", {
        method: "POST",
        body: JSON.stringify({
          address,
          postcode,
          contact_name: contactName,
          phone,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          notes,
        }),
      })

      const checkout = await apiJson<{ url: string }>(`photography/checkout/${encodeURIComponent(booking.id)}`, { method: "POST" })
      window.location.assign(checkout.url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't create your photography booking.")
      setBusy(false)
    }
  }

  return (
    <div>
      <section style={{ background: "var(--primary)" }} className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div>
            <p className="text-xs tracking-[0.22em] uppercase" style={{ color: "var(--accent)" }}>LONDON PROPERTY PHOTOGRAPHY</p>
            <h1 className="text-5xl md:text-6xl text-white mt-4 leading-[1.02]" style={{ fontFamily: "var(--font-display)" }}>Book the photographer. We handle the marketing.</h1>
            <p className="text-white/65 text-lg mt-6 max-w-2xl">A professional MoveIn Media photographer visits your London property, captures the full photo set and handles the marketing-ready image workflow for you.</p>
            <div className="flex flex-wrap gap-3 mt-8 text-sm text-white/75">
              <span className="border border-white/20 px-4 py-2">London only</span>
              <span className="border border-white/20 px-4 py-2">£150 per property</span>
              <span className="border border-white/20 px-4 py-2">Admin-assigned photographer</span>
            </div>
          </div>
          <div className="border border-white/15 p-8 text-white" style={{ background: "rgba(255,255,255,.05)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent)" }}>WHAT'S INCLUDED</p>
            <ul className="mt-5 space-y-4 text-sm text-white/75">
              <li>✓ Professional property photography</li>
              <li>✓ Photographer travels to the property</li>
              <li>✓ Full marketing-ready image set</li>
              <li>✓ Editing and delivery workflow handled for you</li>
              <li>✓ Booking managed through your client account</li>
            </ul>
            <div className="mt-8 pt-6 border-t border-white/15">
              <span className="text-5xl" style={{ fontFamily: "var(--font-display)" }}>£150</span>
              <span className="text-white/55 ml-2">per property</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <form onSubmit={submit} className="border p-6 md:p-8 space-y-6" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>BOOK YOUR VISIT</p>
            <h2 className="text-3xl mt-2" style={{ fontFamily: "var(--font-display)" }}>Property details</h2>
            <p className="text-sm text-black/55 mt-2">Choose your preferred date and time. After payment, the admin team will allocate an available photographer.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <label className="block md:col-span-2">Property address<input required maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} className="block w-full border p-3 mt-2" /></label>
            <label className="block">London postcode<input required maxLength={16} value={postcode} onChange={e=>setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" className="block w-full border p-3 mt-2 uppercase" /></label>
            <label className="block">Contact name<input required maxLength={200} value={contactName} onChange={e=>setContactName(e.target.value)} className="block w-full border p-3 mt-2" /></label>
            <label className="block">Phone number<input required type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} className="block w-full border p-3 mt-2" /></label>
            <label className="block">Preferred date<input required type="date" min={new Date().toISOString().slice(0,10)} value={preferredDate} onChange={e=>setPreferredDate(e.target.value)} className="block w-full border p-3 mt-2" /></label>
            <label className="block md:col-span-2">Preferred time<select value={preferredTime} onChange={e=>setPreferredTime(e.target.value as keyof typeof timeLabels)} className="block w-full border p-3 mt-2"><option value="morning">{timeLabels.morning}</option><option value="afternoon">{timeLabels.afternoon}</option><option value="flexible">{timeLabels.flexible}</option></select></label>
            <label className="block md:col-span-2">Access details or special instructions<textarea maxLength={5000} rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Parking, keys, access contact, property notes…" className="block w-full border p-3 mt-2" /></label>
          </div>

          {message && <div role="alert" className="border p-4 text-sm">{message}</div>}

          <button disabled={busy} className="w-full py-4 px-6 text-white uppercase tracking-widest text-sm disabled:opacity-50" style={{ background: "var(--primary)" }}>{busy ? "Opening secure checkout…" : "Book photographer — £150"}</button>
          <p className="text-xs text-black/45 text-center">Your booking is confirmed for allocation after successful payment.</p>
        </form>

        <aside className="space-y-5">
          <div className="border p-6" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
            <p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>HOW IT WORKS</p>
            <ol className="mt-5 space-y-5 text-sm">
              <li><strong className="block">1. Request your visit</strong><span className="text-black/55">Enter the London property and your preferred date.</span></li>
              <li><strong className="block">2. Pay £150 securely</strong><span className="text-black/55">Payment reserves the booking for allocation.</span></li>
              <li><strong className="block">3. We assign the photographer</strong><span className="text-black/55">Your admin team allocates an available photographer.</span></li>
              <li><strong className="block">4. Photographer attends</strong><span className="text-black/55">They capture the property and handle the marketing image workflow.</span></li>
            </ol>
          </div>
          <div className="border p-6" style={{ borderColor: "var(--border)" }}><strong>Outside London?</strong><p className="text-sm text-black/55 mt-2">The photography service is currently London-based only. You can still use the standard upload services anywhere.</p><Link to="/upload" className="inline-block mt-4 text-sm underline">Upload your own photos instead</Link></div>
        </aside>
      </section>
    </div>
  )
}
