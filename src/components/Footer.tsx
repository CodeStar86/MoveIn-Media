import { Link } from 'react-router-dom'
import { openCookieSettings } from './CookieConsent'

export default function Footer(){
  return <footer style={{background:'var(--primary)',color:'white'}}>
    <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">
      <div><div className="text-xl tracking-widest uppercase mb-4"><span style={{color:'var(--accent)'}}>MoveIn</span> Media</div><p className="text-sm text-white/60">Remote property presentation for agents, hosts and property professionals. Upload your existing photos; we return listing-ready assets.</p></div>
      <div><h4 className="text-xs tracking-widest uppercase mb-4" style={{color:'var(--accent)'}}>Services</h4><div className="flex flex-col gap-2 text-sm text-white/60"><a href="/property-image-editing#decluttering">Digital Decluttering</a><a href="/property-image-editing#staging">Virtual Staging</a><a href="/property-image-editing#descriptions">Property Descriptions</a><Link to="/pricing">Pricing</Link></div></div>
      <div><h4 className="text-xs tracking-widest uppercase mb-4" style={{color:'var(--accent)'}}>Ready?</h4><Link to="/upload" className="inline-block px-6 py-3 text-xs uppercase tracking-widest" style={{background:'var(--accent)',color:'var(--accent-foreground)'}}>Upload a Property</Link></div>
    </div>
    <div className="max-w-7xl mx-auto px-6 py-6 border-t border-white/10 text-xs text-white/50 footer-legal">
      <span>© {new Date().getFullYear()} MoveIn Media. Virtual staging should be identified where used.</span>
      <Link to="/privacy">Privacy</Link>
      <Link to="/cookies">Cookies</Link>
      <Link to="/refunds-cancellations">Refunds & cancellations</Link>
      <button type="button" className="footer-cookie-button" onClick={openCookieSettings}>Cookie settings</button>
    </div>
  </footer>
}
