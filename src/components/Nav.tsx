import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

const links = [
  { to: "/property-image-editing", label: "Services" },
  { to: "/estate-agents", label: "Estate Agents" },
  { to: "/airbnb", label: "Airbnb & Short-Lets" },
  { to: "/photographer-booking", label: "Book Photographer" },
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
    <header style={{ background: "var(--primary)", color: "white" }} className="sticky top-0 z-50 site-header">
      <div className="site-nav-shell flex items-center justify-between">
        <Link to="/" className="site-brand uppercase"><span style={{ color: "var(--accent)" }}>MoveIn</span><span>Media</span></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.to} to={link.to} className="desktop-nav-link uppercase" style={{ color: location.pathname === link.to ? "var(--accent)" : "rgba(245,240,234,.75)" }}>{link.label}</Link>)}
        </nav>
        <div className="desktop-actions">
          <Link to={accountLink} className="desktop-account-link uppercase">{accountLabel}</Link>
          {user && <button type="button" onClick={() => void handleSignOut()} className="desktop-account-link uppercase">Sign out</button>}
          {(!user || (!role || role === "client")) && <Link to="/upload" className="desktop-upload-link uppercase" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Upload a Property</Link>}
        </div>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="text-white mobile-menu-button" onClick={() => setOpen(!open)}><span className="mobile-menu-icon" aria-hidden="true"><span/><span/><span/></span></button>
      </div>
      {open && <nav className="mobile-nav-panel px-6 pb-5 flex flex-col gap-3" style={{ background: "var(--secondary)" }} aria-label="Mobile navigation">
        {links.map((link) => <Link onClick={() => setOpen(false)} key={link.to} to={link.to} className="py-2 text-sm uppercase text-white/80">{link.label}</Link>)}
        <Link onClick={() => setOpen(false)} to={accountLink} className="py-2 text-sm uppercase text-white/70">{accountLabel}</Link>
        {user && <button type="button" onClick={() => void handleSignOut()} className="py-2 text-left text-sm uppercase text-white/70">Sign out</button>}
        {(!user || (!role || role === "client")) && <Link onClick={() => setOpen(false)} to="/upload" className="py-3 text-center text-sm uppercase" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Upload a Property</Link>}
      </nav>}
    </header>
  )
}
