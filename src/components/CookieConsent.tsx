import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

export type ConsentPreferences = {
  necessary: true
  analytics: boolean
  marketing: boolean
  updatedAt: string
  version: 1
}

const STORAGE_KEY = "mm_cookie_consent"
const OPEN_EVENT = "movein:open-cookie-settings"
const CHANGE_EVENT = "movein:consent"

function readConsent(): ConsentPreferences | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentPreferences
    return parsed?.version === 1 ? parsed : null
  } catch {
    return null
  }
}

export function getConsentPreferences() {
  if (typeof window === "undefined") return null
  return readConsent()
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const value: ConsentPreferences = {
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }))
  return value
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = readConsent()
    if (!existing) setVisible(true)
    else {
      setAnalytics(existing.analytics)
      setMarketing(existing.marketing)
    }

    const open = () => {
      const current = readConsent()
      setAnalytics(current?.analytics ?? false)
      setMarketing(current?.marketing ?? false)
      setExpanded(true)
      setVisible(true)
    }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])

  const choose = (nextAnalytics: boolean, nextMarketing: boolean) => {
    saveConsent(nextAnalytics, nextMarketing)
    setVisible(false)
    setExpanded(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-description">
      <div className="cookie-consent__panel">
        <div className="cookie-consent__copy">
          <p className="cookie-consent__eyebrow">Your privacy choices</p>
          <h2 id="cookie-title">Cookies and similar storage</h2>
          <p id="cookie-description">
            We use strictly necessary storage for sign-in, security and remembering your privacy choice. Optional analytics and marketing storage stays off unless you choose to allow it.
          </p>
          <p className="cookie-consent__links"><Link to="/cookies">Cookie policy</Link> · <Link to="/privacy">Privacy notice</Link></p>
        </div>

        {expanded && (
          <div className="cookie-consent__preferences" aria-label="Cookie preferences">
            <label className="cookie-consent__row">
              <span><strong>Strictly necessary</strong><small>Required for account security, authentication and consent preferences.</small></span>
              <input type="checkbox" checked disabled aria-label="Strictly necessary storage is always on" />
            </label>
            <label className="cookie-consent__row">
              <span><strong>Analytics</strong><small>Helps us understand site use. No optional analytics is currently loaded before consent.</small></span>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </label>
            <label className="cookie-consent__row">
              <span><strong>Marketing</strong><small>Allows advertising or campaign measurement tools if we add them in future.</small></span>
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            </label>
          </div>
        )}

        <div className="cookie-consent__actions">
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={() => choose(true, true)}>Accept all</button>
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={() => choose(false, false)}>Reject all</button>
          {expanded ? (
            <button type="button" className="cookie-btn cookie-btn--secondary" onClick={() => choose(analytics, marketing)}>Save choices</button>
          ) : (
            <button type="button" className="cookie-btn cookie-btn--secondary" onClick={() => setExpanded(true)}>Manage preferences</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}
