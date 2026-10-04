import { useMemo, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { apiJson } from "../lib/api"

const services = [
  ["general", "General enquiry"],
  ["digital-decluttering", "Digital decluttering"],
  ["virtual-staging", "Virtual staging"],
  ["property-descriptions", "Property descriptions"],
  ["property-photography", "Property photography"],
  ["estate-agents", "Estate agent services"],
  ["airbnb-short-lets", "Airbnb & short-let services"],
  ["other", "Other service"],
] as const

export default function Contact(){
  const location=useLocation()
  const requestedService=useMemo(()=>new URLSearchParams(location.search).get("service")||"general",[location.search])
  const initialService=services.some(([value])=>value===requestedService)?requestedService:"general"
  const [name,setName]=useState("")
  const [email,setEmail]=useState("")
  const [phone,setPhone]=useState("")
  const [service,setService]=useState(initialService)
  const [message,setMessage]=useState("")
  const [website,setWebsite]=useState("")
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState("")
  const [sent,setSent]=useState(false)

  async function submit(e:FormEvent){
    e.preventDefault()
    setBusy(true)
    setError("")
    try{
      await apiJson<{ok:boolean}>("enquiries",{method:"POST",body:JSON.stringify({name,email,phone,service,message,website,source_path:`${location.pathname}${location.search}`})})
      setSent(true)
    }catch(e){
      setError(e instanceof Error?e.message:"Your enquiry could not be sent. Please try again.")
    }finally{
      setBusy(false)
    }
  }

  return <div>
    <section style={{background:"var(--primary)"}} className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-xs tracking-[0.2em] uppercase" style={{color:"var(--accent)"}}>CONTACT MOVEIN MEDIA</p>
        <h1 className="text-4xl md:text-6xl text-white mt-3" style={{fontFamily:"var(--font-display)"}}>Tell us what you need.</h1>
        <p className="text-white/65 mt-5 max-w-2xl text-lg">Ask about any service, a property, a portfolio or a custom requirement. Your message goes directly into the MoveIn Media admin inbox.</p>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
      <aside>
        <p className="text-xs tracking-[0.18em] uppercase" style={{color:"var(--accent)"}}>ENQUIRE ABOUT</p>
        <h2 className="text-3xl mt-2" style={{fontFamily:"var(--font-display)"}}>Any MoveIn Media service</h2>
        <div className="mt-6 space-y-3 text-sm text-black/65">
          {services.slice(1,-1).map(([,label])=><div key={label} className="border-b pb-3">{label}</div>)}
        </div>
        <p className="mt-6 text-sm text-black/55">Already ready to send property photos? <Link to="/upload" className="underline">Upload a property here</Link>.</p>
      </aside>

      <div className="border p-6 md:p-8" style={{background:"var(--muted)"}}>
        {sent ? <div role="status" className="py-10 text-center">
          <p className="text-xs tracking-[0.18em] uppercase" style={{color:"var(--accent)"}}>MESSAGE SENT</p>
          <h2 className="text-3xl mt-3" style={{fontFamily:"var(--font-display)"}}>Thanks, {name}.</h2>
          <p className="mt-4 text-black/60">Your enquiry is now in the admin inbox. We’ll reply to <strong>{email}</strong>.</p>
          <button type="button" className="mt-7 px-6 py-3 text-white text-sm uppercase tracking-widest" style={{background:"var(--primary)"}} onClick={()=>{setSent(false);setMessage("")}}>Send another enquiry</button>
        </div> : <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="text-sm">Your name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="block w-full border bg-white p-3 mt-2"/></label>
            <label className="text-sm">Email address<input required type="email" maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="block w-full border bg-white p-3 mt-2"/></label>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <label className="text-sm">Phone <span className="text-black/45">(optional)</span><input maxLength={50} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" className="block w-full border bg-white p-3 mt-2"/></label>
            <label className="text-sm">Service<select required value={service} onChange={e=>setService(e.target.value)} className="block w-full border bg-white p-3 mt-2">{services.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="text-sm block">How can we help?<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} className="block w-full border bg-white p-3 mt-2 resize-y" placeholder="Tell us about the property, service or result you’re looking for."/></label>
          <label aria-hidden="true" style={{position:"absolute",left:"-10000px",width:"1px",height:"1px",overflow:"hidden"}}>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
          {error&&<div className="border p-3 text-sm" role="alert">{error}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-black/50 max-w-md">By sending this form, you agree that we can use these details to answer your enquiry. See our <Link to="/privacy" className="underline">privacy policy</Link>.</p>
            <button disabled={busy} className="px-7 py-3.5 text-white text-sm uppercase tracking-widest disabled:opacity-60" style={{background:"var(--primary)"}}>{busy?"Sending…":"Send enquiry"}</button>
          </div>
        </form>}
      </div>
    </section>
  </div>
}
