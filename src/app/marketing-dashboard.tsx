import { useEffect, useState } from "react"
import { Copy, Check, ArrowLeft, ArrowUpRight, MousePointerClick, CalendarCheck2, Link2, ChartNoAxesColumnIncreasing, Globe2, RefreshCw } from "lucide-react"
import { getSession, staffRequest } from "./staff-api"
import "./marketing-dashboard.css"

type SourceRow = {source:string;landings:number;shares:number;bookings:number}
const channels = ["facebook","instagram","linkedin","email","whatsapp","other"]
const label = (source:string) => source.charAt(0).toUpperCase()+source.slice(1).replace(/_/g," ")
export function MarketingDashboard() {
  const [rows,setRows] = useState<SourceRow[]>([])
  const [error,setError] = useState("")
  const [loading,setLoading] = useState(true)
  const [source,setSource] = useState("facebook")
  const [campaign,setCampaign] = useState("autumn")
  const [copied,setCopied] = useState(false)
  const [refresh,setRefresh] = useState(0)
  const cacheKey="movein_marketing_summary_v1"
  const cacheTtl=10*60*1000
  useEffect(()=>{
    let active=true
    setLoading(true);setError("")
    if(!getSession()){sessionStorage.removeItem(cacheKey);setError("Please sign in through your staff dashboard first.");setLoading(false);return}
    if(refresh===0) {
      try {
        const cached=JSON.parse(sessionStorage.getItem(cacheKey)||"null") as {at:number;sources:SourceRow[]}|null
        if(cached&&Date.now()-cached.at<cacheTtl){setRows(cached.sources);setLoading(false);return}
      }catch{/* Missing or invalid session cache; fetch normally. */}
    }
    staffRequest("staff_profiles?select=user_id&limit=1").then(async()=>{
      const token=getSession()?.access_token
      if(!token)throw Error("Please sign in again.")
      const response=await fetch("/api/admin/marketing",{headers:{Authorization:"Bearer "+token},cache:"no-store"})
      const data=await response.json()
      if(!response.ok)throw Error(data.error||"Unable to load analytics")
      if(active){setRows(data.sources||[]);sessionStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),sources:data.sources||[]}))}
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load analytics")})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[refresh])
  const link="https://www.movein-media.co.uk/?"+new URLSearchParams({utm_source:source,utm_medium:source==="email"?"email":"social",utm_campaign:campaign.trim().slice(0,120)}).toString()
  const total=(key:"landings"|"shares"|"bookings")=>rows.reduce((sum,row)=>sum+row[key],0)
  const metrics=[
    {name:"Tracked visits",value:total("landings"),icon:Globe2,helper:"Visits from campaign links"},
    {name:"Booking enquiries",value:total("bookings"),icon:CalendarCheck2,helper:"Enquiries in the last 30 days"},
    {name:"Share clicks",value:total("shares"),icon:MousePointerClick,helper:"Tracked share-button clicks"},
    {name:"Visit-to-booking rate",value:total("landings")?((total("bookings")/total("landings"))*100).toFixed(1)+"%":"—",icon:ChartNoAxesColumnIncreasing,helper:"Indicative, not unique visitors"},
  ]
  async function copyLink(){
    try{await navigator.clipboard.writeText(link);setCopied(true)}
    catch{setCopied(false)}
  }
  return <main className="marketing-page">
    <div className="marketing-shell">
      <div className="marketing-nav"><a href="/staff"><ArrowLeft size={16}/> Back to staff dashboard</a><a className="marketing-brand" href="/">MOVEIN <span>MEDIA</span></a></div>
      <header className="marketing-hero">
        <div><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot"/> MARKETING OVERVIEW</div><h1>Marketing analytics<span>.</span></h1><p>Understand where your visitors come from and which channels generate enquiries.</p></div>
        <div className="marketing-date"><span>REPORTING PERIOD</span><strong>Last 30 days</strong><button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
      </header>
      {error&&<div className="marketing-alert" role="alert">{error} <a href="/staff">Go to staff dashboard</a></div>}
      <section className="marketing-metrics" aria-label="Marketing performance">
        {metrics.map(({name,value,icon:Icon,helper})=><article className="marketing-metric" key={name}><div className="marketing-metric-head"><span>{name}</span><span className="marketing-metric-icon"><Icon size={19}/></span></div><strong>{loading?"—":error?"—":value}</strong><small>{helper}</small></article>)}
      </section>
      <div className="marketing-panels">
        <section className="marketing-card marketing-campaign">
          <div className="marketing-card-head"><div className="marketing-panel-icon"><Link2 size={20}/></div><div><h2>Create a trackable link</h2><p>Use a unique link for each social platform or email campaign.</p></div></div>
          <div className="marketing-fields"><label>Sharing channel<select value={source} onChange={e=>{setSource(e.target.value);setCopied(false)}}>{channels.map(c=><option key={c} value={c}>{label(c)}</option>)}</select></label><label>Campaign name<input value={campaign} maxLength={120} placeholder="e.g. autumn-offer" onChange={e=>{setCampaign(e.target.value);setCopied(false)}}/></label></div>
          <div className="marketing-link-label">YOUR TRACKABLE LINK</div><div className="marketing-link-box"><span>{link}</span><button type="button" onClick={()=>void copyLink()} aria-label="Copy campaign link">{copied?<Check size={18}/>:<Copy size={18}/>}</button></div>
          <div className="marketing-link-actions"><button className="marketing-primary" type="button" onClick={()=>void copyLink()}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?"Copied to clipboard":"Copy campaign link"}</button><a href={link} target="_blank" rel="noreferrer">Preview link <ArrowUpRight size={16}/></a></div>
        </section>
        <aside className="marketing-card marketing-tips"><div className="marketing-panel-icon"><ChartNoAxesColumnIncreasing size={20}/></div><h2>Make every share count.</h2><p>Generate a dedicated link for each platform. That way, visits and resulting enquiries can be grouped by their original source.</p><div className="marketing-tip-divider"/><div className="marketing-tip"><span>01</span><p>Select where you're sharing.</p></div><div className="marketing-tip"><span>02</span><p>Name your campaign and copy the link.</p></div><div className="marketing-tip"><span>03</span><p>Use it in your post or email and track visits here.</p></div></aside>
      </div>
      <section className="marketing-card marketing-sources"><div className="marketing-sources-heading"><div><div className="marketing-eyebrow">PERFORMANCE BREAKDOWN</div><h2>Traffic by source</h2><p>Campaign-tagged traffic and booking enquiries over the last 30 days.</p></div><span className="marketing-period">Last 30 days</span></div>
      {loading?<div className="marketing-empty" role="status">Loading analytics…</div>:error?<div className="marketing-empty">Analytics data is currently unavailable.</div>:rows.length===0?<div className="marketing-empty"><span className="marketing-empty-icon"><Globe2 size={26}/></span><h3>No campaign traffic yet</h3><p>Your dashboard is ready. Create a campaign link above and share it to start tracking visits.</p></div>:<div className="marketing-table-wrap"><table><thead><tr><th>Source</th><th>Tracked visits</th><th>Share clicks</th><th>Bookings</th></tr></thead><tbody>{rows.map(row=><tr key={row.source}><td><span className="marketing-source-dot"/>{label(row.source)}</td><td>{row.landings.toLocaleString("en-GB")}</td><td>{row.shares.toLocaleString("en-GB")}</td><td>{row.bookings.toLocaleString("en-GB")}</td></tr>)}</tbody></table></div>}
      </section>
      <p className="marketing-footnote">Only tagged campaign visits are counted, not all website traffic. Private forwards may retain the original source. Share-click tracking requires an instrumented share button.</p>
    </div>
  </main>
}
