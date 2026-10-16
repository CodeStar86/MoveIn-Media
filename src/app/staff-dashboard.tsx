import "./agent-portal.css"
declare const __MOVEIN_PUBLIC_SUPABASE_URL__:string
declare const __MOVEIN_PUBLIC_SUPABASE_KEY__:string
import { FormEvent, useEffect, useState } from "react"
import { uploadPropertyZip } from "./tus-upload"
import { getSession, saveSession, staffAuth, staffRequest, recoverInviteSession, setStaffPassword } from "./staff-api"

type Profile = {user_id:string;full_name:string;role:"admin"|"photographer";active:boolean;phone:string|null}
type Booking = {id:string;status:string;preferred_date:string;preferred_time:string;package_selection:string;purpose:string;instructions:string|null;customers:{full_name:string;email:string;phone:string}|null;properties:{address:string;postcode:string}|null}
type Assignment = {id:string;booking_id:string;photographer_id:string;status:string;scheduled_at:string|null;notes:string|null}
const date=(d:string|null)=>d?new Date(d).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"Not scheduled"
const card:React.CSSProperties={background:"#fff",border:"1px solid #dfe5e9",borderRadius:14,padding:22,marginBottom:16}
const field:React.CSSProperties={padding:12,border:"1px solid #c9d2d9",borderRadius:8,maxWidth:"100%",width:"100%"}
const action:React.CSSProperties={padding:"11px 18px",border:0,borderRadius:8,background:"#133d39",color:"#fff",cursor:"pointer",fontWeight:600}
export function StaffDashboard() {
 const [profile,setProfile]=useState<Profile|null>(null)
 const [email,setEmail]=useState("")
 const [password,setPassword]=useState("")
 const [bookings,setBookings]=useState<Booking[]>([])
 const [staff,setStaff]=useState<Profile[]>([])
 const [jobs,setJobs]=useState<Assignment[]>([])
 const [error,setError]=useState("")
 const [busy,setBusy]=useState(false)
 const [loaded,setLoaded]=useState(false)
 const [newName,setNewName]=useState("")
 const [newEmail,setNewEmail]=useState("")
 const [newPhone,setNewPhone]=useState("")
 const [notice,setNotice]=useState("")
 const [agents,setAgents]=useState<{user_id:string;full_name:string;agency_name:string;approval_status:string}[]>([])
 const [descriptions,setDescriptions]=useState<Record<string,string>>({})
 const [uploads,setUploads]=useState<Record<string,File|null>>({})
 const [newPassword,setNewPassword]=useState("")
 const load=async()=>{
   try {
     const me=await staffRequest("staff_profiles?select=*&user_id=eq."+encodeURIComponent((await getUserId())))
     const p=(me as Profile[])[0]
     if(!p||!p.active) throw Error("Your account is not an active staff account")
     setProfile(p)
     const [b,j,s]=await Promise.all([
       staffRequest("booking_requests?select=id,status,preferred_date,preferred_time,package_selection,purpose,instructions,customers(full_name,email,phone),properties(address,postcode)&order=submitted_at.desc"),
       staffRequest("job_assignments?select=*&order=assigned_at.desc"),
       p.role==="admin"?staffRequest("staff_profiles?select=*&order=full_name.asc"):Promise.resolve([p]),
     ])
     setBookings(b as Booking[]);setJobs(j as Assignment[]);setStaff(s as Profile[])
     if(p.role==="admin")setAgents(await staffRequest("agent_profiles?select=user_id,full_name,agency_name,approval_status&order=created_at.desc") as typeof agents)
   }catch(e){setError((e as Error).message);setProfile(null)}
   finally{setLoaded(true)}
 }
 const getUserId=async()=>{
   const data=await staffRequest("staff_profiles?select=user_id,role,active")
   const rows=data as Profile[]
   if(rows.length===1)return rows[0].user_id
   const s=getSession()
   if(!s)throw Error("Not signed in")
   const payload=JSON.parse(atob(s.access_token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))
   return payload.sub as string
 }
 useEffect(()=>{recoverInviteSession();if(getSession())void load();else setLoaded(true)},[])
 const login=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{await staffAuth(email,password);await load()}catch(err){setError((err as Error).message)}finally{setBusy(false)}}
 const run=async(task:()=>Promise<unknown>,success:string)=>{setBusy(true);setError("");setNotice("");try{await task();setNotice(success);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const assign=(bookingId:string,photographerId:string)=>{
  const current=jobs.find(j=>j.booking_id===bookingId)
  if(!photographerId)return
  const body=current?{photographer_id:photographerId,status:"assigned"}:{booking_id:bookingId,photographer_id:photographerId,assigned_by:profile!.user_id,status:"assigned"}
  return run(()=>staffRequest("job_assignments"+(current?"?id=eq."+current.id:""),{method:current?"PATCH":"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(body)}),"Job assigned")
 }
 const updateJob=(j:Assignment,status:string)=>run(()=>staffRequest("rpc/movein_update_job",{method:"POST",body:JSON.stringify({p_id:j.id,p_status:status})}),"Job updated")
 const invite=async(e:FormEvent)=>{e.preventDefault();await run(async()=>{
  const s=getSession()
  if(!s)throw Error("Please sign in")
  const resp=await fetch("/api/staff/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token},body:JSON.stringify({name:newName,email:newEmail,phone:newPhone})})
  const json=await resp.json()
  if(!resp.ok)throw Error(json.error||"Could not invite photographer")
  setNewName("");setNewEmail("");setNewPhone("")
 },"Photographer invitation sent")}
 const approve=(userId:string,approved:boolean)=>run(()=>staffRequest("rpc/movein_approve_agent",{method:"POST",body:JSON.stringify({p_user_id:userId,p_approve:approved})}),approved?"Agent approved":"Agent declined")
 const publish=async(bookingId:string)=>{
   const file=uploads[bookingId];let path:string|null=null
   if(file){if(!file.name.toLowerCase().endsWith(".zip")||file.size>200*1024*1024)throw Error("Choose a ZIP no larger than 200 MB")
     const session=getSession();if(!session)throw Error("Please sign in")
     path=bookingId+"/photos.zip"
     await uploadPropertyZip({baseUrl:__MOVEIN_PUBLIC_SUPABASE_URL__,apiKey:__MOVEIN_PUBLIC_SUPABASE_KEY__,accessToken:session.access_token,path,file,onProgress:percent=>setNotice("Uploading photo ZIP: "+percent+"%")})
   }
   await staffRequest("rpc/movein_publish_deliverables",{method:"POST",body:JSON.stringify({p_booking:bookingId,p_description:descriptions[bookingId]||"",p_zip_path:path})})
   setUploads(old=>({...old,[bookingId]:null}))
 }
 return <main className="agent-portal"><div className="agent-shell">
  <header className="agent-header"><a className="agent-logo" href="/">MOVEIN MEDIA</a><span className="agent-header-note">Staff &amp; administration · <a href="/agent" style={{color:"#17483e"}}>Agent portal</a></span></header>
  {error?<p role="alert" className="agent-message error">{error}</p>:null}
  {notice?<p role="status" className="agent-message success">{notice}</p>:null}
  {!loaded?<p>Loading your workspace…</p>:null}
  {!profile&&loaded?<div className="agent-auth">
    <section className="agent-promo"><div><small>MOVEIN MEDIA · PRIVATE WORKSPACE</small><h1>Everything in its place.</h1><p>A dedicated workspace for the people behind exceptional property listings.</p></div><ul><li>Manage bookings and agent approvals</li><li>Allocate property photography jobs</li><li>Deliver finished marketing materials</li></ul></section>
    <section className="agent-auth-card"><h2>Welcome back.</h2><p>Sign in to your secure staff portal. Access is available to authorised administrators and photographers only.</p><form className="agent-form" onSubmit={login}>
    <label>Email address<input type="email" required autoComplete="username" placeholder="you@movein-media.co.uk" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Password<input type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <button className="agent-submit" disabled={busy}>{busy?"Signing in…":"Sign in to staff portal →"}</button></form><p className="agent-auth-tip">Staff accounts are invitation only. Need access? Contact your administrator.</p></section>
  </div>:null}
   {profile?<div className="agent-workspace"><div className="workspace-heading"><div><div className="workspace-eyebrow">MOVEIN MEDIA OPERATIONS</div><h1>{profile.role==="admin"?"Your administration hub.":"Your photography jobs."}</h1><p>{profile.role==="admin"?"Review agent accounts, allocate shoots and oversee your team.":"Manage your assigned shoots and deliver finished property media."}</p></div><button className="workspace-signout" onClick={()=>{saveSession(null);setProfile(null);setError("");setJobs([]);setBookings([])}}>Sign out ↗</button></div><div className="workspace-stats"><div><span>Signed in as</span><strong>{profile.full_name}</strong></div><div><span>Bookings</span><strong>{bookings.length}</strong></div><div><span>{profile.role==="admin"?"To allocate":"My assignments"}</span><strong>{profile.role==="admin"?bookings.filter(b=>!jobs.some(j=>j.booking_id===b.id)).length:jobs.filter(j=>j.photographer_id===profile.user_id).length}</strong></div></div><div className="staff-workspace-grid"><div className="staff-workspace-main"><section className="workspace-card"><div className="workspace-section-kicker">SECURITY</div><h2>Account security</h2><form onSubmit={e=>{e.preventDefault();void run(()=>setStaffPassword(newPassword),"Password updated")}} style={{display:"flex",gap:10,flexWrap:"wrap"}}><input style={{...field,maxWidth:280}} type="password" autoComplete="new-password" minLength={12} required aria-label="New password" placeholder="Set or change password (12+ characters)" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><button style={action} disabled={busy}>Save password</button></form></section>
   {profile.role==="admin"?<>
    <section className="workspace-card"><div className="workspace-section-kicker">ACCESS MANAGEMENT</div><h2>Agent approvals</h2>{agents.length===0?<p>No agent registrations yet.</p>:agents.map(a=><div key={a.user_id} style={{borderTop:"1px solid #ddd",padding:"12px 0"}}><strong>{a.full_name}</strong> · {a.agency_name} · {a.approval_status} {a.approval_status!=="approved"&&<button style={{...action,marginLeft:12}} disabled={busy} onClick={()=>void approve(a.user_id,true)}>Approve</button>}{a.approval_status==="pending"&&<button style={{...action,marginLeft:8}} disabled={busy} onClick={()=>void approve(a.user_id,false)}>Reject</button>}</div>)}</section>
    <section className="workspace-card"><div className="workspace-section-kicker">AT A GLANCE</div><h2>Overview</h2><p>{bookings.length} bookings · {bookings.filter(b=>!jobs.some(j=>j.booking_id===b.id)).length} unallocated · {staff.filter(p=>p.role==="photographer"&&p.active).length} active photographers</p></section>
    <section className="workspace-card"><div className="workspace-section-kicker">TEAM MANAGEMENT</div><h2>Add photographer</h2><p>Send a secure account invitation by email. Only the administrator can create photographers.</p>
     <form onSubmit={invite} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
      <input style={field} placeholder="Full name" aria-label="Full name" value={newName} required onChange={e=>setNewName(e.target.value)}/>
      <input style={field} placeholder="Email" aria-label="Email" type="email" value={newEmail} required onChange={e=>setNewEmail(e.target.value)}/>
      <input style={field} placeholder="Phone (optional)" aria-label="Phone" value={newPhone} onChange={e=>setNewPhone(e.target.value)}/>
      <button style={action} disabled={busy}>Invite photographer</button>
     </form>
     {staff.filter(p=>p.role==="photographer").map(p=><p key={p.user_id}>{p.full_name} · {p.active?"Active":"Inactive"}</p>)}
    </section>
   </>:null}
   <section className="workspace-card"><div className="workspace-section-kicker">SCHEDULE & DELIVERY</div><h2>{profile.role==="admin"?"Bookings and allocations":"My allocated jobs"}</h2>
    {bookings.filter(b=>profile.role==="admin"||jobs.some(j=>j.booking_id===b.id&&j.photographer_id===profile.user_id)).length===0?<p>No bookings to display yet.</p>:null}
    {bookings.filter(b=>profile.role==="admin"||jobs.some(j=>j.booking_id===b.id&&j.photographer_id===profile.user_id)).map(b=>{
     const j=jobs.find(x=>x.booking_id===b.id)
     return <article className="workspace-booking-item" key={b.id}>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"space-between"}}>
       <div><h3 style={{margin:"0 0 8px"}}>{b.properties?.address||"Property"} · {b.properties?.postcode}</h3>
        <p>{b.customers?.full_name} · {b.customers?.email} · {b.customers?.phone}</p>
        <p>{b.preferred_date} · {b.preferred_time} · {b.package_selection}</p>
        {b.instructions?<p>Instructions: {b.instructions}</p>:null}
       </div><div><strong>{j?.status||"Unallocated"}</strong><div style={{fontSize:13}}>Scheduled: {date(j?.scheduled_at||null)}</div></div>
      </div>
      {profile.role==="photographer"&&j&&<section style={{marginTop:12}}><h4>Deliver photos and property description</h4><label>Photo ZIP (maximum 200 MB)<input type="file" accept=".zip,application/zip" onChange={e=>setUploads(old=>({...old,[b.id]:e.target.files?.[0]||null}))}/></label><textarea style={{...field,marginTop:10}} rows={7} placeholder="Property description for the agent to copy" value={descriptions[b.id]||""} onChange={e=>setDescriptions(old=>({...old,[b.id]:e.target.value}))}/><button style={action} disabled={busy} onClick={()=>void run(()=>publish(b.id),"Deliverables sent to agent dashboard")}>Publish to agent</button></section>}
      {profile.role==="admin"?<label>Assign photographer
        <select style={{...field,maxWidth:350,margin:"6px 0"}} disabled={busy} value={j?.photographer_id||""} onChange={e=>void assign(b.id,e.target.value)}>
         <option value="">Select photographer</option>
         {staff.filter(p=>p.role==="photographer"&&p.active).map(p=><option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
        </select>
      </label>:j?<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        {(j.status==="assigned"?["accepted","declined"]:j.status==="accepted"?["in_progress"]:j.status==="in_progress"?["completed"]:[]).map(s=><button style={action} disabled={busy} key={s} onClick={()=>void updateJob(j,s)}>{s.replace("_"," ")}</button>)}
      </div>:null}
     </article>
    })}
   </section></div></div>
   </div>:null}
  </div></main>
}
