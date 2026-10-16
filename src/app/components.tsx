import { FormEvent, ReactNode, useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  Menu,
  MoveRight,
  X,
} from "lucide-react"
import { agencyRates, faqs, images, included, packages } from "./data"

export function Seo({
  title,
  description,
}: {
  title: string
  description: string
}) {
  useEffect(() => {
    document.title = `${title} | MoveIn Media`
    const canonical = `${window.location.origin}${window.location.pathname}`
    const setMeta = (selector: string, attr: string, value: string) => {
      let element = document.head.querySelector(
        selector,
      ) as HTMLMetaElement | HTMLLinkElement | null
      if (!element) {
        element = document.createElement(
          selector.startsWith("link") ? "link" : "meta",
        )
        if (selector.includes("description"))
          element.setAttribute("name", "description")
        if (selector.includes("canonical"))
          element.setAttribute("rel", "canonical")
        document.head.appendChild(element)
      }
      element.setAttribute(attr, value)
    }
    setMeta('meta[name="description"]', "content", description)
    setMeta('link[rel="canonical"]', "href", canonical)
  }, [title, description])
  return null
}

export function ButtonLink({
  to,
  children,
  variant = "primary",
}: {
  to: string
  children: ReactNode
  variant?: "primary" | "secondary" | "light" | "text"
}) {
  return (
    <Link className={`button button--${variant}`} to={to}>
      <span>{children}</span>
      <ArrowRight size={16} strokeWidth={1.8} />
    </Link>
  )
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      aria-label="MoveIn Media home"
      className={`logo ${light ? "logo--light" : ""}`}
      to="/"
    >
      <span className="logo__wordmark">MOVE<span className="logo__in">IN</span><small>MEDIA</small></span>
    </Link>
  )
}

const nav = [
  ["Services", "/whats-included"],
  ["Pricing", "/packages"],
  ["Our Work", "/our-work"],
  ["For Agents", "/estate-agents"],
]

const extraMobileNav = [
  ["Before & After", "/before-after"],
  ["How it works", "/how-it-works"],
  ["About", "/about"],
  ["FAQs", "/faqs"],
  ["Contact", "/contact"],
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [open])

  return (
    <div className="site-shell">
      <header className="site-header">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, path]) => (
            <NavLink key={path} to={path}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="header-book" to="/book">
            Book a property <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <button
          className="menu-button"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
      </header>
      {open && (
        <div className="mobile-menu" id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-menu__head">
            <Logo light />
            <button aria-label="Close menu" onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
          <nav>
            {[
              ...nav,
              ...extraMobileNav,
            ].map(([label, path]) => (
              <NavLink key={path} to={path}>
                {label}
                <ArrowRight />
              </NavLink>
            ))}
          </nav>
          <ButtonLink to="/book" variant="light">
            Book a property
          </ButtonLink>
        </div>
      )}
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div>
          <Logo light />
          <p>
            All-inclusive property marketing for considered North London
            listings.
          </p>
        </div>
        <div>
          <span className="footer__label">Explore</span>
          <Link to="/whats-included">What's included</Link>
          <Link to="/packages">Packages & pricing</Link>
          <Link to="/our-work">Our work</Link>
          <Link to="/before-after">Before & after</Link>
        </div>
        <div>
          <span className="footer__label">Company</span>
          <Link to="/about">About</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/faqs">FAQs</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <span className="footer__label">Start a booking</span>
          <a href="mailto:hello@movein-media.co.uk">
            <Mail size={16} /> hello@movein-media.co.uk
          </a>
          <p>
            N, NW & EN postcodes
            <br />
            North London
          </p>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} MoveIn Media</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/cancellations">Cancellations</Link>
        </div>
      </div>
    </footer>
  )
}

export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode
  light?: boolean
}) {
  return (
    <span className={`eyebrow ${light ? "eyebrow--light" : ""}`}>
      <i />
      {children}
    </span>
  )
}

export function PageHero({
  eyebrow,
  title,
  text,
  image,
}: {
  eyebrow: string
  title: string
  text: string
  image?: string
}) {
  return (
    <section className={`page-hero ${image ? "page-hero--image" : ""}`}>
      <div className="page-hero__copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {image && <img src={image} alt="" />}
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  centered = false,
}: {
  eyebrow: string
  title: string
  text?: string
  centered?: boolean
}) {
  return (
    <div
      className={`section-heading ${
        centered ? "section-heading--centered" : ""
      }`}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

export function BeforeAfter({
  before,
  after,
  title,
  description,
}: {
  before: string
  after: string
  title: string
  description: string
}) {
  const [position, setPosition] = useState(50)
  return (
    <article className="comparison-card">
      <div className="comparison">
        <img src={after} alt={`After: ${title}`} />
        <div className="comparison__before" style={{ width: `${position}%` }}>
          <img src={before} alt={`Before: ${title}`} />
        </div>
        <div className="comparison__line" style={{ left: `${position}%` }}>
          <span>
            <MoveRight size={17} />
          </span>
        </div>
        <input
          aria-label={`Compare before and after for ${title}`}
          type="range"
          min="8"
          max="92"
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
        />
        <span className="comparison__label comparison__label--before">
          Before
        </span>
        <span className="comparison__label comparison__label--after">
          After
        </span>
      </div>
      <div className="comparison-card__copy">
        <span>Illustrative example</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  )
}

export function PricingCards() {
  const pack = packages[0]
  return (
    <div className="pricing-offer">
      <article className="pricing-offer__card">
        <div className="pricing-offer__heading">
          <div>
            <span className="pricing-offer__eyebrow">All-inclusive · One clear price</span>
            <h3>{pack.name}</h3>
            <p>Everything you need for a confident property listing.</p>
          </div>
          <div className="pricing-offer__price">
            <strong>{pack.price}</strong>
            <span>per property</span>
          </div>
        </div>
        <ul className="pricing-offer__benefits">
          {pack.details.slice(0, 5).map((item) => (
            <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
        <ButtonLink to="/book" variant="primary">Book a property</ButtonLink>
        <p className="pricing-offer__scope">Standard residential properties up to four bedrooms in our local service area.</p>
      </article>
      <section className="partner-rates" aria-labelledby="partner-rates-title">
        <div className="partner-rates__intro">
          <h3 id="partner-rates-title">Estate agent partner rates</h3>
          <p>The same complete service. Better prices for regular bookings.</p>
        </div>
        <div className="partner-rates__grid">
          {agencyRates.map((tier) => (
            <div className="partner-rates__tier" key={tier.appointments}>
              <span>{tier.appointments} / month</span>
              <strong>{tier.price}</strong>
              <small>per property</small>
            </div>
          ))}
        </div>
        <p className="partner-rates__terms">Rates are based on completed, paid appointments each calendar month. Discounts are applied retrospectively by agreed credit or refund.</p>
      </section>
    </div>
  )
}

export function FaqList({ limit }: { limit?: number }) {
  return (
    <div className="faq-list">
      {faqs.slice(0, limit).map(([question, answer], i) => (
        <details key={question} open={i === 0}>
          <summary>
            {question}
            <ChevronDown />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  )
}

export function FinalCta() {
  return (
    <section className="final-cta">
      <div>
        <Eyebrow light>Start your listing</Eyebrow>
        <h2>
          One booking.
          <br />
          <em>A better-presented property.</em>
        </h2>
      </div>
      <ButtonLink to="/book" variant="light">
        Request your photography booking
      </ButtonLink>
    </section>
  )
}

function TurnstileWidget() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  useEffect(() => {
    if (!siteKey) return
    const id = 'movein-turnstile-script'
    if (document.getElementById(id)) return
    const script = document.createElement('script')
    script.id = id
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [siteKey])
  if (!siteKey) return <p className="form-error">Booking verification has not been configured.</p>
  return <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
}

export function BookingForm() {
  const [status, setStatus] =
    useState<"idle" | "sending" | "success" | "error">("idle")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === "sending") return
    setStatus("sending")
    const form = event.currentTarget
    const body = Object.fromEntries(new FormData(form))
    const token = String(body['cf-turnstile-response'] ?? '')
    if (!token) { setStatus('error'); return }
    delete body['cf-turnstile-response']
    body.turnstileToken = token
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error("Unable to send")
      setStatus("success")
      form.reset()
    } catch {
      setStatus("error")
      const turnstile = (window as Window & { turnstile?: { reset: () => void } }).turnstile
      turnstile?.reset()
    }
  }
  if (status === "success")
    return (
      <div className="form-success">
        <Check />
        <h2>Request received.</h2>
        <p>
          Thank you. We’ll review the property details and contact you to
          confirm availability, scope and the final price. Your appointment is
          not confirmed until you hear from us.
        </p>
        <ButtonLink to="/">Return home</ButtonLink>
      </div>
    )
  return (
    <form className="booking-form" onSubmit={submit}>
      <div className="form-intro">
        <span>01</span>
        <div>
          <h2>Your details</h2>
          <p>So we can follow up about the appointment.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Full name *<input name="name" autoComplete="name" required />
        </label>
        <label>
          Email address *
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Phone number *
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        <label>
          Agency name <input name="agency" autoComplete="organization" />
        </label>
      </div>
      <div className="form-intro">
        <span>02</span>
        <div>
          <h2>Property details</h2>
          <p>Tell us what and where we’ll be photographing.</p>
        </div>
      </div>
      <div className="form-grid">
        <label className="form-grid__wide">
          Property address *
          <input name="address" autoComplete="street-address" required />
        </label>
        <label>
          Postcode *
          <input name="postcode" autoComplete="postal-code" required />
        </label>
        <label>
          Property type *
          <select name="propertyType" required defaultValue="">
            <option value="" disabled>
              Select type
            </option>
            <option>Flat</option>
            <option>House</option>
            <option>Maisonette</option>
            <option>Commercial / other</option>
          </select>
        </label>
        <label>
          Bedrooms / size *
          <input name="size" placeholder="e.g. 3 bedrooms" required />
        </label>
        <label>
          Booking purpose *
          <select name="purpose" required defaultValue="">
            <option value="" disabled>
              Select purpose
            </option>
            <option>New listing</option>
            <option>Refresh existing listing</option>
            <option>Rental or Airbnb</option>
          </select>
        </label>
      </div>
      <div className="form-intro">
        <span>03</span>
        <div>
          <h2>Appointment preference</h2>
          <p>Dates are requests until we confirm directly.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Preferred date *<input name="date" type="date" min={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} required />
        </label>
        <label>
          Preferred time *
          <select name="time" required defaultValue="">
            <option value="" disabled>
              Select time
            </option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Flexible</option>
          </select>
        </label>
        <label className="form-grid__wide">
          Service *
          <select name="package" required defaultValue="">
            <option value="" disabled>
              Select service
            </option>
            <option value="All-Inclusive Property Marketing — £299 standard">All-Inclusive Property Marketing — £299 standard (agency rates subject to monthly volume)</option>
            <option>Not sure — please advise</option>
          </select>
        </label>
        <label className="form-grid__wide">
          Additional instructions
          <textarea
            name="instructions"
            rows={5}
            placeholder="Access notes, current listing URL, areas of concern or anything else we should know."
          />
        </label>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <TurnstileWidget />
      <label className="consent">
        <input type="checkbox" required />{" "}
        <span>
          I understand my details will be used to respond to this booking request as described in the <Link to="/privacy">Privacy Policy</Link>. *
        </span>
      </label>
      <button
        className="button button--primary submit-button"
        disabled={status === "sending" || !import.meta.env.VITE_TURNSTILE_SITE_KEY}
        type="submit"
      >
        {status === "sending" ? "Sending request…" : "Send booking request"}
        <ArrowRight size={16} />
      </button>
      {status === "error" && (
        <p className="form-error">
          We couldn’t send this request. Please email hello@movein-media.co.uk
          and we’ll help directly.
        </p>
      )}
      <p className="form-note">
        Submitting does not confirm an appointment or final price. We’ll confirm
        both with you directly.
      </p>
    </form>
  )
}

export { images }
