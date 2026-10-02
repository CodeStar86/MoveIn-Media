import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth"
import { services } from "../lib/services"
import { startCheckout } from "../lib/payments"
export default function UploadPhotos() {
  const { user } = useAuth(); const navigate = useNavigate()
  const [service,setService]=useState("declutter"), [files,setFiles]=useState<File[]>([]), [busy,setBusy]=useState(false), [message,setMessage]=useState(""), [address,setAddress]=useState(""), [name,setName]=useState(""), [notes,setNotes]=useState(""), [orderId,setOrderId]=useState<string|null>(null)
  const chosen=services.find(s=>s.id===service)!
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    if (
      files.length > 20 ||
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setMessage("Choose up to 20 JPG, PNG or WebP images, at most 10 MB each.")
      return
    }

    if (service !== "description" && !files.length) {
      setMessage("Choose at least one image.")
      return
    }

    setBusy(true)
    setMessage("")

    try {
      let id: string

      if (orderId) {
        id = orderId
      } else {
        const { data, error } = await supabase
          .from("orders")
          .insert({ user_id: user.id, address, customer_name: name, service, notes })
          .select("id")
          .single()

        if (error) throw error

        const createdId = data?.id
        if (typeof createdId !== "string" || !createdId) {
          throw new Error("Order could not be created. Please retry.")
        }

        id = createdId
        setOrderId(createdId)
      }

      for (let i = 0; i < files.length; i++) {
        setMessage(`Uploading ${i + 1} of ${files.length}…`)
        const file = files[i]
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"
        const { error } = await supabase.storage
          .from("property-photos")
          .upload(`${user.id}/${id}/source/${i}.${extension}`, file, {
            upsert: true,
            contentType: file.type,
          })
        if (error) throw error
      }

      const { error } = await supabase.rpc("submit_order", { order_id: id })
      if (error) throw error

      setMessage("Opening secure checkout…")
      try {
        await startCheckout(id)
      } catch (checkoutError) {
        console.error(checkoutError)
        navigate("/portal")
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : (error as { message?: string }).message || "Upload failed. Please retry.",
      )
    } finally {
      setBusy(false)
    }
  }
  return <section className="max-w-4xl mx-auto px-6 py-16"><h1 className="text-4xl mb-8">Upload a property</h1><form onSubmit={submit} className="grid md:grid-cols-2 gap-10"><fieldset disabled={busy||!!orderId}><legend className="text-xl mb-5">1. Choose a service</legend><div className="space-y-3">{services.map(s=><label key={s.id} className="block border p-4"><input type="radio" name="service" checked={service===s.id} onChange={()=>setService(s.id)}/> {s.name} — £{s.price}</label>)}</div></fieldset><div className="space-y-4"><h2 className="text-xl">2. Property & files</h2><label className="block">Property address<input disabled={busy||!!orderId} required maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} className="block w-full p-3 border"/></label><label className="block">Your name / agency<input disabled={busy||!!orderId} required maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="block w-full p-3 border"/></label><label className="block">Property photos<input disabled={busy||!!orderId} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>setFiles(Array.from(e.target.files??[]))} className="block w-full p-3 border"/></label><p className="text-sm">Up to 20 images, 10 MB each. {files.length} selected.</p><label className="block">Property facts / editing instructions<textarea disabled={busy||!!orderId} required={service.includes("description")} maxLength={5000} value={notes} onChange={e=>setNotes(e.target.value)} className="block w-full p-3 border" rows={4}/></label><p>{chosen.name}: £{chosen.price}</p><button disabled={busy} className="w-full p-4 bg-[var(--primary)] text-white">{busy?"Saving…":orderId?"Retry upload":"Submit property"}</button><p role="status">{message}</p><p className="text-sm">Your order will be saved to your account and you can track its status in the client portal.</p></div></form></section>
}
