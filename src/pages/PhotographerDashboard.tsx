import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../lib/auth"
import { apiDownloadUrl, apiJson, apiUpload } from "../lib/api"

type Order = { id:string; user_id:string; address:string; customer_name:string; service:string; notes:string; status:string; created_at:string }
type JobFiles = Record<string,{source:string[];output:string[]}>
type Booking = { id:string; address:string; postcode:string; contact_name:string; phone:string; preferred_date:string; preferred_time:string; notes:string; status:string; created_at:string; assigned_at:string|null; completed_at:string|null; delivered_at:string|null; photo_count:number; media_deleted_at:string|null }

export default function PhotographerDashboard(){
  const {user,refresh}=useAuth()
  const [orders,setOrders]=useState<Order[]>([]),[files,setFiles]=useState<JobFiles>({}),[bookings,setBookings]=useState<Booking[]>([])
  const [busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState("")
  const [newPassword,setNewPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[passwordBusy,setPasswordBusy]=useState(false)
  const [showPasswordSetup,setShowPasswordSetup]=useState(user?.user_metadata?.must_change_password===true)

  const load=useCallback(async()=>{
    try{
      const [jobs,visits]=await Promise.all([
        apiJson<{jobs:Order[];files:JobFiles}>("photographer/jobs"),
        apiJson<{bookings:Booking[]}>("photography/photographer"),
      ])
      setOrders(jobs.jobs);setFiles(jobs.files);setBookings(visits.bookings)
    }catch(e){setMessage(e instanceof Error?e.message:"Could not load jobs")}
  },[])

  useEffect(()=>{void load()},[load])

  async function changePassword(e:FormEvent){e.preventDefault();setMessage("");if(newPassword.length<8){setMessage("Password must be at least 8 characters.");return}if(newPassword!==confirmPassword){setMessage("Passwords do not match.");return}setPasswordBusy(true);try{await apiJson("auth/password",{method:"POST",body:JSON.stringify({password:newPassword})});await refresh();setNewPassword("");setConfirmPassword("");setShowPasswordSetup(false);setMessage("Password changed successfully.")}catch(e){setMessage(e instanceof Error?e.message:"Could not change password")}finally{setPasswordBusy(false)}}

  async function uploadShoot(booking:Booking,selected:FileList|null){
    if(!selected?.length)return
    if(selected.length>100){setMessage("Upload up to 100 completed photos per booking.");return}
    setBusy(booking.id);setMessage("")
    try{
      for(let i=0;i<selected.length;i++){
        const file=selected[i]
        if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Completed photos must be JPG, PNG or WebP.")
        if(file.size>10*1024*1024)throw new Error("Each completed photo must be 10 MB or smaller.")
        setMessage(`Uploading completed photo ${i+1} of ${selected.length}…`)
        await apiUpload(`photography/photographer/upload/${encodeURIComponent(booking.id)}`,file,i)
      }
      setMessage(`${selected.length} completed photo${selected.length===1?"":"s"} uploaded. Review the count, then send the ZIP to the client.`)
      await load()
    }catch(e){setMessage(e instanceof Error?e.message:"Photo upload failed")}
    finally{setBusy(null)}
  }

  async function deliverShoot(booking:Booking){
    setBusy(booking.id);setMessage("")
    try{
      const data=await apiJson<{file_count:number}>(`photography/photographer/deliver/${encodeURIComponent(booking.id)}`,{method:"POST"})
      setMessage(`Sent ${data.file_count} completed photo${data.file_count===1?"":"s"} to the client as a ZIP.`)
      await load()
    }catch(e){setMessage(e instanceof Error?e.message:"Could not create photography delivery ZIP")}
    finally{setBusy(null)}
  }

  function downloadSources(job:Order){window.location.assign(apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source-zip`))}
  async function uploadEdited(job:Order,selected:FileList|null){if(!selected?.length)return;setBusy(job.id);setMessage("");try{for(let i=0;i<selected.length;i++){const file=selected[i];if(!file.type.startsWith("image/"))throw new Error("Edited files must be images.");if(file.size>4*1024*1024)throw new Error("Each edited image must be 4 MB or smaller.");await apiUpload(`photographer/jobs/${encodeURIComponent(job.id)}/upload`,file,i)}setMessage("Edited photos uploaded.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Upload failed")}finally{setBusy(null)}}
  async function sendToClient(job:Order){setBusy(job.id);setMessage("");try{const data=await apiJson<{file_count?:number}>(`photographer/jobs/${encodeURIComponent(job.id)}/deliver`,{method:"POST"});setMessage(`Sent ${data.file_count??0} edited photo${data.file_count===1?"":"s"} to the client as a ZIP.`);await load()}catch(e){setMessage(e instanceof Error?e.message:"Could not create delivery ZIP")}finally{setBusy(null)}}

  return <div>
    <section style={{background:"var(--primary)"}} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>PHOTOGRAPHER</p><h1 className="text-4xl text-white mt-2">Assigned jobs & visits</h1><p className="text-white/60 mt-2">Upload completed London shoots and send the final ZIP directly to the client.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10">
      {message&&<div className="border p-4 mb-6" role="status">{message}</div>}
      {showPasswordSetup&&<form onSubmit={changePassword} className="border p-6 mb-8"><h2 className="text-2xl mb-2">Account security</h2><p className="text-sm text-black/60 mb-4">Change the temporary password your administrator gave you.</p><div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end"><label>New password<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block w-full border p-3 mt-1"/></label><label>Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="block w-full border p-3 mt-1"/></label><button disabled={passwordBusy} className="px-5 py-3 text-white" style={{background:"var(--primary)"}}>{passwordBusy?"Saving…":"Change password"}</button></div></form>}

      <section className="mb-12"><div className="mb-5"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>LONDON PHOTOGRAPHY</p><h2 className="text-3xl mt-1" style={{fontFamily:"var(--font-display)"}}>Your property visits</h2><p className="text-sm text-black/55 mt-1">Upload the finished shoot here. Sending creates a private ZIP for the client.</p></div>{!bookings.length&&<div className="border p-8 text-center text-black/55">No photography visits assigned yet.</div>}<div className="space-y-4">{bookings.map(booking=><article key={booking.id} className="border p-6" style={{background:booking.status==="assigned"?"var(--muted)":"transparent"}}><div className="flex flex-wrap justify-between gap-4"><div><small style={{color:"var(--accent)"}}>{new Date(`${booking.preferred_date}T12:00:00`).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {booking.preferred_time}</small><h3 className="text-2xl mt-1">{booking.address}</h3><p className="text-sm text-black/60">{booking.postcode}</p></div><div className="text-right"><span className="border px-3 py-2 h-fit text-sm inline-block">{booking.status==="completed"?"Sent to client":"Assigned"}</span><p className="text-xs text-black/45 mt-2">{booking.photo_count||0} completed photos</p></div></div><div className="grid md:grid-cols-2 gap-4 mt-5"><div className="border p-4 bg-white"><p className="text-xs uppercase tracking-widest text-black/45">Client contact</p><p className="mt-2 font-medium">{booking.contact_name}</p><a className="text-sm underline" href={`tel:${booking.phone}`}>{booking.phone}</a></div><div className="border p-4 bg-white"><p className="text-xs uppercase tracking-widest text-black/45">Visit notes</p><p className="mt-2 text-sm whitespace-pre-wrap">{booking.notes||"No special access notes."}</p></div></div>{booking.status==="assigned"&&<div className="mt-5 border-t pt-5"><p className="text-sm font-medium">Completed photography</p><p className="text-xs text-black/50 mt-1">JPG, PNG or WebP · up to 100 photos · 10 MB each.</p><div className="flex flex-wrap gap-3 mt-4"><label className="px-5 py-3 border bg-white cursor-pointer text-sm">{busy===booking.id?"Uploading…":"Upload completed photos"}<input className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy===booking.id} onChange={e=>void uploadShoot(booking,e.target.files)}/></label><button disabled={busy===booking.id||!booking.photo_count} onClick={()=>void deliverShoot(booking)} className="px-5 py-3 text-white disabled:opacity-40" style={{background:"var(--primary)"}}>{busy===booking.id?"Working…":"Send ZIP to client"}</button></div></div>}{booking.status==="completed"&&<div className="mt-5 p-4" style={{background:"var(--muted)"}}><strong className="text-sm">Delivery sent</strong><p className="text-sm text-black/55 mt-1">The client can download the ZIP once. After download, the completed photos and ZIP are permanently deleted from storage.</p>{booking.media_deleted_at&&<p className="text-xs text-black/45 mt-2">Client downloaded · stored media deleted.</p>}</div>}</article>)}</div></section>

      <section><div className="mb-5"><p className="text-xs tracking-widest uppercase" style={{color:"var(--accent)"}}>EDITING WORKFLOW</p><h2 className="text-3xl mt-1" style={{fontFamily:"var(--font-display)"}}>Uploaded-property jobs</h2></div><div className="space-y-6">{orders.map(job=><article key={job.id} className="border p-6"><div className="flex flex-wrap justify-between gap-3"><div><small>{new Date(job.created_at).toLocaleDateString("en-GB")}</small><h2 className="text-2xl mt-1">{job.address}</h2><p className="text-sm text-black/60">{job.customer_name} · {job.service} · {job.status}</p></div><span className="border px-3 py-2 h-fit text-sm">{files[job.id]?.output.length??0} edited uploaded</span></div>{job.notes&&<div className="bg-white/60 p-4 mt-5"><strong className="text-sm">Client instructions</strong><p className="text-sm mt-1 whitespace-pre-wrap">{job.notes}</p></div>}<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">{(files[job.id]?.source??[]).map(name=><a key={name} href={apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source/${encodeURIComponent(name)}`)} target="_blank" rel="noreferrer" className="border bg-white block"><img src={apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source/${encodeURIComponent(name)}`)} alt="Client source" className="w-full aspect-[4/3] object-cover"/><span className="block p-2 text-xs truncate">{name}</span></a>)}</div><div className="flex flex-wrap gap-3 items-center mt-6"><button disabled={busy===job.id||!(files[job.id]?.source.length)} onClick={()=>downloadSources(job)} className="px-4 py-3 border text-sm disabled:opacity-40">Download originals ZIP</button><label className="px-4 py-3 border cursor-pointer text-sm">Upload edited photos<input className="hidden" type="file" multiple accept="image/*" disabled={busy===job.id||job.status==="ready"} onChange={e=>void uploadEdited(job,e.target.files)}/></label><button disabled={busy===job.id||!(files[job.id]?.output.length)} onClick={()=>void sendToClient(job)} className="px-5 py-3 text-white disabled:opacity-40" style={{background:"var(--primary)"}}>{busy===job.id?"Working…":job.status==="ready"?"Resend edited ZIP":"Send edited ZIP to client"}</button></div></article>)}</div>{!orders.length&&<div className="border p-8 text-center">No uploaded-property jobs assigned yet.</div>}</section>
    </section>
  </div>
}
