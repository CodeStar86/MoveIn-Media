import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { apiJson } from '../lib/api'

const payg=[['Digital Decluttering','£20','per property','Existing photos professionally decluttered.'],['Virtual Staging','£50','per property','Suitable empty rooms virtually furnished.'],['Property Description','£20','per property','Listing copy from verified property details.'],['Decluttering + Description','£35','per property','Save £5 when ordered together.'],['Virtual Staging + Description','£65','per property','Save £5 when ordered together.']]
const plans=[
  {id:'portfolio5',name:'Portfolio 5',price:'£90',qty:'5 properties',effective:'£18/property'},
  {id:'portfolio10',name:'Portfolio 10',price:'£160',qty:'10 properties',effective:'£16/property'},
  {id:'portfolio20',name:'Portfolio 20',price:'£280',qty:'20 properties',effective:'£14/property'},
]

export default function Pricing(){
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busyPlan,setBusyPlan]=useState<string|null>(null)
  const [message,setMessage]=useState('')

  async function subscribe(plan:string){
    if(!user){ navigate('/login',{state:{from:'/pricing'}}); return }
    setBusyPlan(plan); setMessage('')
    try{
      const data=await apiJson<{url:string}>('subscription/start',{method:'POST',body:JSON.stringify({plan})})
      if(!data.url?.startsWith('https://')) throw new Error('Subscription checkout could not be started.')
      window.location.assign(data.url)
    }catch(e){ setMessage(e instanceof Error?e.message:'Subscription checkout could not be started.'); setBusyPlan(null) }
  }

  return <div>
    <section style={{background:'var(--primary)'}} className="py-24"><div className="max-w-7xl mx-auto px-6 text-center"><p className="text-xs tracking-widest uppercase mb-4" style={{color:'var(--accent)'}}>PRICING</p><h1 className="text-5xl text-white mb-4" style={{fontFamily:'var(--font-display)'}}>Simple pricing per property.</h1><p className="text-white/60">Upload your existing images, or book a London photographer and let us handle the shoot.</p></div></section>

    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="border p-8 md:p-10 mb-20 grid lg:grid-cols-[1fr_auto] gap-8 items-center" style={{background:'var(--primary)',color:'white',borderColor:'var(--primary)'}}><div><p className="text-xs tracking-widest uppercase" style={{color:'var(--accent)'}}>LONDON PROPERTY PHOTOGRAPHY</p><h2 className="text-4xl mt-3" style={{fontFamily:'var(--font-display)'}}>Professional photographer — £150/property</h2><p className="text-white/65 mt-3 max-w-3xl">A MoveIn Media photographer visits the property, captures the full photo set and handles the marketing-ready image workflow. London bookings only. After payment, admin allocates an available photographer.</p></div><Link to="/photographer-booking" className="px-6 py-4 text-center text-xs uppercase tracking-widest whitespace-nowrap" style={{background:'var(--accent)',color:'var(--accent-foreground)'}}>Book photographer</Link></div>

      <h2 className="text-3xl mb-8" style={{fontFamily:'var(--font-display)'}}>Pay as you go</h2><div className="grid md:grid-cols-3 gap-5">{payg.map(([n,p,u,d])=><div key={n} className="p-8 border flex flex-col" style={{borderColor:'var(--border)'}}><p className="text-xs uppercase tracking-widest mb-3" style={{color:'var(--accent)'}}>{n}</p><div className="text-4xl mb-1" style={{fontFamily:'var(--font-display)'}}>{p}</div><p className="text-xs mb-5 text-black/50">{u}</p><p className="text-sm text-black/60 flex-1">{d}</p><Link to="/upload" className="mt-7 py-3 px-4 text-center text-xs uppercase tracking-widest" style={{background:'var(--primary)',color:'white'}}>Upload a property</Link></div>)}</div>
      <div className="mt-20 mb-8"><p className="text-xs tracking-widest uppercase" style={{color:'var(--accent)'}}>MONTHLY PORTFOLIO PLANS</p><h2 className="text-3xl mt-2" style={{fontFamily:'var(--font-display)'}}>The more properties you send, the lower your rate.</h2><p className="text-sm mt-3 text-black/60 max-w-2xl">For estate agencies, professional hosts and short-let operators. Plans include digital decluttering + property description. Your included property allowance refreshes on your Stripe billing date each month. Virtual staging remains a £35 subscriber add-on per property.</p></div>
      {message&&<div role="alert" className="border p-4 mb-5">{message}</div>}
      <div className="grid md:grid-cols-3 gap-5">{plans.map(plan=><div key={plan.id} className="p-8 border" style={{borderColor:'var(--border)',background:plan.id==='portfolio10'?'var(--muted)':'transparent'}}><p className="text-xs uppercase tracking-widest" style={{color:'var(--accent)'}}>{plan.name}</p><div className="text-4xl mt-4" style={{fontFamily:'var(--font-display)'}}>{plan.price}<span className="text-sm">/month</span></div><p className="mt-3 text-sm">{plan.qty}</p><p className="text-sm text-black/50">{plan.effective}</p><ul className="text-sm mt-6 space-y-2 text-black/60"><li>✓ Digital decluttering</li><li>✓ Property description</li><li>✓ Up to 20 images/property</li><li>✓ Monthly allowance refresh</li><li>✓ Client dashboard & downloads</li><li>+ Virtual staging £35/property</li></ul><button type="button" disabled={busyPlan===plan.id} onClick={()=>void subscribe(plan.id)} className="block w-full mt-7 py-3 text-center text-xs uppercase tracking-widest disabled:opacity-50" style={{background:'var(--primary)',color:'white'}}>{busyPlan===plan.id?'Opening checkout…':'Choose plan'}</button></div>)}</div>
      <div className="mt-8 grid md:grid-cols-2 gap-5"><div className="p-8 border" style={{borderColor:'var(--border)',background:'var(--primary)',color:'white'}}><p className="text-xs uppercase tracking-widest" style={{color:'var(--accent)'}}>MORE THAN 20 PROPERTIES?</p><h3 className="text-3xl mt-4" style={{fontFamily:'var(--font-display)'}}>Volume Account</h3><p className="text-lg mt-2">21+ properties / month · Custom pricing</p><p className="text-sm text-white/60 mt-4">For larger estate agencies, Airbnb management companies and short-let portfolios with consistent monthly volume.</p><Link to="/upload" className="inline-block mt-7 py-3 px-5 text-center text-xs uppercase tracking-widest" style={{background:'var(--accent)',color:'var(--accent-foreground)'}}>Talk to us about volume</Link></div><div className="p-8 border" style={{borderColor:'var(--border)'}}><p className="text-xs uppercase tracking-widest" style={{color:'var(--accent)'}}>NEED A FEW EXTRA?</p><h3 className="text-3xl mt-4" style={{fontFamily:'var(--font-display)'}}>Go over your allowance.</h3><p className="text-sm text-black/60 mt-4">Portfolio 20 clients can submit additional standard included-service properties at £14 each rather than being blocked when they reach 20. Your normal monthly allowance resets at the next billing cycle.</p><p className="text-sm text-black/60 mt-4">Portfolio 5 and 10 pause included submissions when their allowance is used, until the next billing date.</p></div></div>
    </section>
  </div>}
