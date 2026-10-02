import { Link } from "react-router-dom"

export default function NotFound() {
  return <section className="max-w-3xl mx-auto px-6 py-24 text-center">
    <p className="text-xs tracking-widest uppercase" style={{ color: "var(--accent)" }}>404</p>
    <h1 className="text-4xl mt-3 mb-4">Page not found</h1>
    <p className="text-black/60 mb-8">The page you requested doesn’t exist or has moved.</p>
    <Link to="/" className="inline-block px-5 py-3" style={{ background: "var(--primary)", color: "white" }}>Back to home</Link>
  </section>
}
