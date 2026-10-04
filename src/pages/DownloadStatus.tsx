import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { apiJson } from "../lib/api"

type Order = {
  id: string
  address: string
  status: string
  created_at: string
  delivery_zip_path: string | null
  media_deleted_at?: string | null
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function DownloadStatus() {
  const { orderId = "" } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    async function load() {
      try {
        const data = await apiJson<{ orders: Order[] }>("orders")
        if (cancelled) return
        const found = data.orders.find((item) => item.id === orderId) ?? null
        setOrder(found)
        setError(found ? "" : "We couldn't find that property in your account.")
        setLoading(false)

        if (found && !found.media_deleted_at && attempts < 8) {
          attempts += 1
          window.setTimeout(load, 900)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "We couldn't load the download status.")
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [orderId])

  const deleted = Boolean(order?.media_deleted_at)
  const shortRef = useMemo(() => orderId ? orderId.slice(0, 8).toUpperCase() : "—", [orderId])

  return (
    <div className="min-h-[72vh]" style={{ background: "linear-gradient(180deg, var(--primary) 0, var(--primary) 38%, var(--background) 38%)" }}>
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center text-white mb-10">
          <p className="text-xs tracking-[0.22em] uppercase" style={{ color: "var(--accent)" }}>PRIVATE DELIVERY</p>
          <h1 className="text-4xl md:text-5xl mt-3" style={{ fontFamily: "var(--font-display)" }}>
            {deleted ? "This download has already been collected" : "Finishing your private download"}
          </h1>
          <p className="text-white/65 mt-4 max-w-2xl mx-auto">
            {deleted
              ? "For privacy, the original property photos, edited files and delivery ZIP were permanently deleted after the first download."
              : "Your download has started. We're now removing the stored property media from our system."}
          </p>
        </div>

        <div className="bg-white border shadow-sm max-w-3xl mx-auto overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="p-8 md:p-10">
            <div className="flex items-start gap-5">
              <div className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center border" style={{ borderColor: deleted ? "var(--accent)" : "var(--border)", background: deleted ? "var(--muted)" : "white" }} aria-hidden="true">
                {deleted ? (
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m5 12 4 4L19 6" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 12a8 8 0 1 1-2.34-5.66" /></svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>{deleted ? "FILES REMOVED" : "PRIVACY CLEANUP IN PROGRESS"}</p>
                <h2 className="text-2xl mt-2" style={{ fontFamily: "var(--font-display)" }}>
                  {order?.address || (loading ? "Checking your property…" : "Property delivery")}
                </h2>
                <p className="text-sm text-black/55 mt-2">Reference {shortRef}</p>
              </div>
            </div>

            {error && <div role="alert" className="mt-7 border p-4 text-sm">{error}</div>}

            {!error && <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] uppercase tracking-widest text-black/45">Download status</p>
                <p className="mt-2 font-medium">{deleted ? "Collected" : "Started"}</p>
              </div>
              <div className="border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] uppercase tracking-widest text-black/45">Stored media</p>
                <p className="mt-2 font-medium">{deleted ? "Permanently deleted" : "Being deleted now"}</p>
              </div>
            </div>}

            {deleted && order?.media_deleted_at && (
              <div className="mt-5 p-5" style={{ background: "var(--muted)" }}>
                <p className="text-sm"><strong>Deleted:</strong> {formatDateTime(order.media_deleted_at)}</p>
                <p className="text-sm text-black/60 mt-2">This delivery cannot be downloaded again because MoveIn Media no longer retains a copy of the property media.</p>
              </div>
            )}

            {!deleted && !error && (
              <div className="mt-5 p-5" style={{ background: "var(--muted)" }}>
                <p className="text-sm text-black/65">This page will update automatically when deletion is complete. You can safely leave it open while your ZIP finishes downloading.</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/portal" className="px-6 py-3 text-center text-xs uppercase tracking-widest text-white" style={{ background: "var(--primary)" }}>Back to portal</Link>
              <Link to="/upload" className="px-6 py-3 text-center text-xs uppercase tracking-widest border" style={{ borderColor: "var(--border)" }}>Upload another property</Link>
            </div>
          </div>

          <div className="border-t px-8 md:px-10 py-5 flex items-center gap-3 text-sm text-black/55" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="10" rx="2"/></svg>
            <span>One-time delivery: property media is removed from storage after the first successful download request.</span>
          </div>
        </div>
      </section>
    </div>
  )
}
