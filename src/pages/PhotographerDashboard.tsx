import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../lib/auth"
import { apiDownloadUrl, apiJson, apiUpload } from "../lib/api"

type Order = { id: string; user_id: string; address: string; customer_name: string; service: string; notes: string; status: string; created_at: string }
type JobFiles = Record<string, { source: string[]; output: string[] }>

export default function PhotographerDashboard() {
  const { user, refresh } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [files, setFiles] = useState<JobFiles>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [showPasswordSetup, setShowPasswordSetup] = useState(user?.user_metadata?.must_change_password === true)

  const load = useCallback(async () => {
    try {
      const data = await apiJson<{ jobs: Order[]; files: JobFiles }>("photographer/jobs")
      setOrders(data.jobs); setFiles(data.files)
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not load jobs") }
  }, [])

  useEffect(() => { void load() }, [load])

  async function changePassword(e: FormEvent) {
    e.preventDefault(); setMessage("")
    if (newPassword.length < 8) { setMessage("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setMessage("Passwords do not match."); return }
    setPasswordBusy(true)
    try {
      await apiJson("auth/password", { method: "POST", body: JSON.stringify({ password: newPassword }) })
      await refresh(); setNewPassword(""); setConfirmPassword(""); setShowPasswordSetup(false); setMessage("Password changed successfully.")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not change password") }
    finally { setPasswordBusy(false) }
  }

  function downloadSources(job: Order) {
    window.location.assign(apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source-zip`))
  }

  async function uploadEdited(job: Order, selected: FileList | null) {
    if (!selected?.length) return
    setBusy(job.id); setMessage("")
    try {
      for (let i=0;i<selected.length;i++) {
        const file=selected[i]
        if (!file.type.startsWith("image/")) throw new Error("Edited files must be images.")
        if (file.size > 4 * 1024 * 1024) throw new Error("Each edited image must be 4 MB or smaller.")
        await apiUpload(`photographer/jobs/${encodeURIComponent(job.id)}/upload`, file, i)
      }
      setMessage("Edited photos uploaded."); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed") }
    finally { setBusy(null) }
  }

  async function sendToClient(job: Order) {
    setBusy(job.id); setMessage("")
    try {
      const data = await apiJson<{ file_count?: number }>(`photographer/jobs/${encodeURIComponent(job.id)}/deliver`, { method: "POST" })
      setMessage(`Sent ${data.file_count ?? 0} edited photo${data.file_count === 1 ? "" : "s"} to the client as a ZIP.`); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create delivery ZIP") }
    finally { setBusy(null) }
  }

  return <div>
    <section style={{ background: "var(--primary)" }} className="py-14"><div className="max-w-6xl mx-auto px-6"><p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>PHOTOGRAPHER</p><h1 className="text-4xl text-white mt-2">Assigned jobs</h1><p className="text-white/60 mt-2">Download source photos, upload edits, then send one ZIP back to the client.</p></div></section>
    <section className="max-w-6xl mx-auto px-6 py-10">
      {message && <div className="border p-4 mb-6" role="status">{message}</div>}
      {showPasswordSetup && <form onSubmit={changePassword} className="border p-6 mb-8"><h2 className="text-2xl mb-2">Account security</h2><p className="text-sm text-black/60 mb-4">Change the temporary password your administrator gave you.</p><div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end"><label className="block">New password<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block w-full border p-3 mt-1" /></label><label className="block">Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="block w-full border p-3 mt-1" /></label><button disabled={passwordBusy} className="px-5 py-3 text-white" style={{ background: "var(--primary)" }}>{passwordBusy ? "Saving…" : "Change password"}</button></div></form>}
      <div className="space-y-6">{orders.map(job=><article key={job.id} className="border p-6"><div className="flex flex-wrap justify-between gap-3"><div><small>{new Date(job.created_at).toLocaleDateString("en-GB")}</small><h2 className="text-2xl mt-1">{job.address}</h2><p className="text-sm text-black/60">{job.customer_name} · {job.service} · {job.status}</p></div><span className="border px-3 py-2 h-fit text-sm">{files[job.id]?.output.length ?? 0} edited uploaded</span></div>{job.notes && <div className="bg-white/60 p-4 mt-5"><strong className="text-sm">Client instructions</strong><p className="text-sm mt-1 whitespace-pre-wrap">{job.notes}</p></div>}<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">{(files[job.id]?.source ?? []).map(name=><a key={name} href={apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source/${encodeURIComponent(name)}`)} target="_blank" rel="noreferrer" className="border bg-white block"><img src={apiDownloadUrl(`photographer/jobs/${encodeURIComponent(job.id)}/source/${encodeURIComponent(name)}`)} alt="Client source" className="w-full aspect-[4/3] object-cover"/><span className="block p-2 text-xs truncate">{name}</span></a>)}</div><div className="flex flex-wrap gap-3 items-center mt-6"><button type="button" disabled={busy===job.id || !(files[job.id]?.source.length)} onClick={()=>downloadSources(job)} className="px-4 py-3 border text-sm disabled:opacity-40">Download originals ZIP</button><label className="px-4 py-3 border cursor-pointer text-sm">Upload edited photos<input className="hidden" type="file" multiple accept="image/*" disabled={busy===job.id || job.status==="ready"} onChange={e=>void uploadEdited(job,e.target.files)} /></label><button type="button" disabled={busy===job.id || !(files[job.id]?.output.length)} onClick={()=>void sendToClient(job)} className="px-5 py-3 text-white disabled:opacity-40" style={{background:"var(--primary)"}}>{busy===job.id ? "Working…" : job.status==="ready" ? "Resend edited ZIP" : "Send edited ZIP to client"}</button></div></article>)}</div>
      {!orders.length && <div className="border p-8 text-center">No assigned jobs yet.</div>}
    </section>
  </div>
}
