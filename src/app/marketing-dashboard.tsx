import {useEffect,useState} from "react"
import {getSession,staffRequest} from "./staff-api"
type Row={source:string;landings:number;shares:number;bookings:number}
export function MarketingDashboard(){
 const [rows,setRows]=useState<Row[]>([])
 const [error,setError]=useState("")
 const [loading,setLoading]=useState(true)
 const [source,setSource]=useState("facebook")
 const [campaign,setCampaign]=useState("autumn")
 const sources=["facebook","instagram","linkedin","email","whatsapp","other"]
 useEffect(()=>{const s=getSession();if(!s){setError("Please sign in at /staff first.");setLoading(false);return}
 // Refresh via existing authenticated REST helper before using the session token.
 staffRequest("staff_profiles?select=user_id&limit=1").then(async()=>{
 const token=getSession()?.access_token
 const response=await fetch("/api/admin/marketing",{headers:{Authorization:"Bearer "+token}})
 const data=await response.json()
 if(!response.ok)throw Error(data.error||"Unable to load analytics")
 setRows(data.sources||[])
 }).catch(e=>setError(e.message)).finally(()=>setLoading(false))
 },[])
 const link="https://www.movein-media.co.uk/?"+new URLSearchParams({utm_source:source,utm_medium:source==="email"?"email":"social",utm_campaign:campaign.slice(0,120)}).toString()
 return <main style={{maxWidth:960,margin:"55px auto",padding:24,fontFamily:"Arial,sans-serif"}}>
 <p><a href="/staff">← Staff dashboard</a></p><h1>Marketing analytics</h1>
 <p>Last 30 days · Campaign-tagged visits and booking enquiries. Counts are anonymous; privately forwarded links may show the original source.</p>
 <section style={{padding:22,border:"1px solid #ddd",borderRadius:12,marginBottom:24}}>
 <h2>Generate a campaign link</h2>
 <label>Channel <select value={source} onChange={e=>setSource(e.target.value)}>{sources.map(s=><option key={s}>{s}</option>)}</select></label>{" "}
 <label>Campaign <input value={campaign} maxLength={120} onChange={e=>setCampaign(e.target.value)} /></label>
 <p style={{overflowWrap:"anywhere"}}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
 <button onClick={()=>void navigator.clipboard.writeText(link)}>Copy link</button>
 </section>
 {loading?<p>Loading…</p>:error?<p role="alert">{error}</p>:<>
 <section style={{display:"flex",gap:24,flexWrap:"wrap"}}><div><strong>{rows.reduce((n,r)=>n+r.landings,0)}</strong><p>Tracked landings</p></div><div><strong>{rows.reduce((n,r)=>n+r.bookings,0)}</strong><p>Booking enquiries</p></div><div><strong>{rows.reduce((n,r)=>n+r.shares,0)}</strong><p>Share clicks</p></div></section>
 <table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th>Source</th><th>Landings</th><th>Shares</th><th>Bookings</th></tr></thead><tbody>{rows.map(r=><tr key={r.source}><td>{r.source}</td><td>{r.landings}</td><td>{r.shares}</td><td>{r.bookings}</td></tr>)}</tbody></table>
 {rows.length===0&&<p>No campaign traffic recorded yet. Use a generated link above to get started.</p>}
 </>}
 </main>
}