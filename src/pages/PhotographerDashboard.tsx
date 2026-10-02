import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../lib/auth"
import { supabase } from "../lib/supabase"

type Order = { id: string; user_id: string; address: string; customer_name: string; service: string; notes: string; status: string; created_at: string }
type JobFiles = Record<string, { source: { name: string; url: string }[]; output: string[] }>

export default function PhotographerDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [files, setFiles] = useState<JobFiles>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [showPasswordSetup, setShowPasswordSetup] = useState(user?.user_metadata?.must_change_password === true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from("orders").select("id,user_id,address,customer_name,service,notes,status,created_at").eq("photographer_id", user.id).in("status", ["processing", "ready"]).order("created_at", { ascending: false })
    if (error) { setMessage(error.message); return }
    const jobs = (data ?? []) as Order[]
    setOrders(jobs)
    const next: JobFiles = {}
    for (const job of jobs) {
      const sourcePrefix = `${job.user_id}/${job.id}/source`
      const outputPrefix = `${job.user_id}/${job.id}/output`
      const [{ data: source }, { data: output }] = await Promise.all([
        supabase.storage.from("property-photos").list(sourcePrefix, { limit: 100, sortBy: { column: "name", order: "asc" } }),
        supabase.storage.from("property-photos").list(outputPrefix, { limit: 100, sortBy: { column: "name", order: "asc" } }),
      ])
      const signed = await Promise.all((source ?? []).filter(f=>f.name).map(async f => {
        const path = `${sourcePrefix}/${f.name}`
        const { data: signedData } = await supabase.storage.from("property-photos").createSignedUrl(path, 3600)
        return { name: f.name, url: signedData?.signedUrl ?? "" }
      }))
      next[job.id] = { source: signed.filter(f=>f.url), output: (output ?? []).filter(f=>f.name).map(f=>f.name) }
    }
    setFiles(next)
  }, [user])

  useEffect(() => { void load() }, [load])

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setMessage("")
    if (newPassword.length < 8) { setMessage("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setMessage("Passwords do not match."); return }
    setPasswordBusy(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    })
    setPasswordBusy(false)
    if (error) { setMessage(error.message); return }
    setNewPassword(""); setConfirmPassword("")
    setShowPasswordSetup(false)
    setMessage("Password changed successfully.")
  }

  async function downloadSources(job: Order) {
    setBusy(job.id); setMessage("")
    const { data, error } = await supabase.functions.invoke("create-source-zip", { body: { order_id: job.id } })
    setBusy(null)
    if (error) {
      setMessage(error.message || "Could not prepare source ZIP")
      return
    }
    if (data instanceof Blob) {
      const url = URL.createObjectURL(data)
      window.open(url, "_self")
      return
    }
    setMessage("Could not prepare source ZIP")
  }

  async function uploadEdited(job: Order, selected: FileList | null) {
    if (!selected?.length) return
    setBusy(job.id); setMessage("")
    try {
      for (let i=0;i<selected.length;i++) {
        const file=selected[i]
        if (!file.type.startsWith("image/")) throw new Error("Edited files must be images.")
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
        const { error } = await supabase.storage.from("property-photos").upload(`${job.user_id}/${job.id}/output/${String(i+1).padStart(2,"0")}-${safeName}`, file, { upsert: true, contentType: file.type })
        if (error) throw error
      }
      setMessage("Edited photos uploaded."); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed") }
    finally { setBusy(null) }
  }

  async function sendToClient(job: Order) {
    setBusy(job.id); setMessage("")
    const { data, error } = await supabase.functions.invoke("create-delivery-zip", { body: { order_id: job.id } })
    setBusy(null)
    if (error || data?.error) setMessage(data?.error || error?.message || "Could not create delivery ZIP")
    else { setMessage(`Sent ${data.file_count} edited photo${data.file_count === 1 ? "" : "s"} to the client as a ZIP.`); await load() }
  }

  return <div>
    <section style={{ background: "var(--primary)" }} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>PHOTOGRAPHER</p><h1 className="text-4xl text-white mt-2">Assigned jobs</h1><p className="text-white/60 mt-2">Download source photos, upload edits, then send one ZIP back to the client.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10">
      {message && <div className="border p-4 mb-6" role="status">{message}</div>}
      {showPasswordSetup && <form onSubmit={changePassword} className="border p-6 mb-8">
        <h2 className="text-2xl mb-2">Account security</h2>
        <p className="text-sm text-black/60 mb-4">Change the temporary password your administrator gave you.</p>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label className="block">New password<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block w-full border p-3 mt-1" /></label>
          <label className="block">Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="block w-full border p-3 mt-1" /></label>
          <button disabled={passwordBusy} className="px-5 py-3 text-white" style={{ background: "var(--primary)" }}>{passwordBusy ? "Saving…" : "Change password"}</button>
        </div>
      </form>}
      <div className="space-y-6">{orders.map(job=><article key={job.id} className="border p-6">
        <div className="flex flex-wrap justify-between gap-3"><div><small>{new Date(job.created_at).toLocaleDateString("en-GB")}</small><h2 className="text-2xl mt-1">{job.address}</h2><p className="text-sm text-black/60">{job.customer_name} · {job.service} · {job.status}</p></div><span className="border px-3 py-2 h-fit text-sm">{files[job.id]?.output.length ?? 0} edited uploaded</span></div>
        {job.notes && <div className="bg-white/60 p-4 mt-5"><strong className="text-sm">Client instructions</strong><p className="text-sm mt-1 whitespace-pre-wrap">{job.notes}</p></div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">{(files[job.id]?.source ?? []).map(photo=><a key={photo.name} href={photo.url} target="_blank" rel="noreferrer" className="border bg-white block"><img src={photo.url} alt="Client source" className="w-full aspect-[4/3] object-cover"/><span className="block p-2 text-xs truncate">{photo.name}</span></a>)}</div>
        <div className="flex flex-wrap gap-3 items-center mt-6">
          <button type="button" disabled={busy===job.id || !(files[job.id]?.source.length)} onClick={()=>void downloadSources(job)} className="px-4 py-3 border text-sm disabled:opacity-40">{busy===job.id ? "Preparing ZIP…" : "Download originals ZIP"}</button>
          <label className="px-4 py-3 border cursor-pointer text-sm">Upload edited photos<input className="hidden" type="file" multiple accept="image/*" disabled={busy===job.id || job.status==="ready"} onChange={e=>void uploadEdited(job,e.target.files)} /></label>
          <button type="button" disabled={busy===job.id || !(files[job.id]?.output.length)} onClick={()=>void sendToClient(job)} className="px-5 py-3 text-white disabled:opacity-40" style={{background:"var(--primary)"}}>{busy===job.id ? "Working…" : job.status==="ready" ? "Resend edited ZIP" : "Send edited ZIP to client"}</button>
        </div>
      </article>)}</div>
      {!orders.length && <div className="border p-8 text-center">No assigned jobs yet.</div>}
    </section>
  </div>
}
