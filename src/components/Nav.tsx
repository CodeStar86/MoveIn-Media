import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

const links = [
  { to: "/property-image-editing", label: "Services" },
  { to: "/estate-agents", label: "Estate Agents" },
  { to: "/airbnb", label: "Airbnb & Short-Lets" },
  { to: "/before-after", label: "Before & After" },
  { to: "/pricing", label: "Pricing" },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    setOpen(false)
    navigate("/")
  }

  const role = user?.app_metadata?.role
  const accountLink = !user ? "/login" : role === "admin" ? "/admin" : role === "photographer" ? "/photographer" : "/portal"
  const accountLabel = !user ? "Client Login" : role === "admin" ? "Admin" : role === "photographer" ? "Photographer" : "Portal"

  return (
    <header style={{ background: "var(--primary)", color: "white" }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="text-lg tracking-widest uppercase"><span style={{ color: "var(--accent)" }}>MoveIn</span> Media</Link>
        <nav className="hidden lg:flex gap-6" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.to} to={link.to} className="text-xs tracking-widest uppercase" style={{ color: location.pathname === link.to ? "var(--accent)" : "rgba(245,240,234,.75)" }}>{link.label}</Link>)}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <Link to={accountLink} className="text-xs tracking-widest uppercase px-4 py-2 text-white/60">{accountLabel}</Link>
          {user && <button type="button" onClick={() => void handleSignOut()} className="text-xs tracking-widest uppercase px-2 py-2 text-white/60">Sign out</button>}
          {(!user || (!role || role === "client")) && <Link to="/upload" className="text-xs tracking-widest uppercase px-5 py-2 font-500" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Upload a Property</Link>}
        </div>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="lg:hidden text-white mobile-menu-button" onClick={() => setOpen(!open)}><span className="mobile-menu-icon" aria-hidden="true"><span/><span/><span/></span></button>
      </div>
      {open && <nav className="lg:hidden px-6 pb-5 flex flex-col gap-3 mobile-nav-panel" style={{ background: "var(--secondary)" }} aria-label="Mobile navigation">
        {links.map((link) => <Link onClick={() => setOpen(false)} key={link.to} to={link.to} className="py-2 text-sm uppercase text-white/80">{link.label}</Link>)}
        <Link onClick={() => setOpen(false)} to={accountLink} className="py-2 text-sm uppercase text-white/70">{accountLabel}</Link>
        {user && <button type="button" onClick={() => void handleSignOut()} className="py-2 text-left text-sm uppercase text-white/70">Sign out</button>}
        {(!user || (!role || role === "client")) && <Link onClick={() => setOpen(false)} to="/upload" className="py-3 text-center text-sm uppercase" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Upload a Property</Link>}
      </nav>}
    </header>
  )
}
