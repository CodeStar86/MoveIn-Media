import { openCookieSettings } from "../components/CookieConsent"

export default function Cookies() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">Legal</p>
        <h1>Cookie policy</h1>
        <p className="legal-page__updated">Last updated: 4 October 2026</p>

        <h2>What this policy covers</h2>
        <p>This policy explains how MoveIn Media uses cookies and similar browser storage technologies on this website and customer portal.</p>

        <h2>Strictly necessary storage</h2>
        <p>Some storage is essential for services you request, such as secure sign-in, account sessions, security checks and remembering your privacy choices. These technologies are used without optional consent where the law permits because the service cannot work correctly without them.</p>
        <ul>
          <li><strong>mm_access</strong> — secure, HttpOnly authentication cookie used for an active account session.</li>
          <li><strong>mm_refresh</strong> — secure, HttpOnly authentication cookie used to refresh an account session.</li>
          <li><strong>mm_pkce</strong> — short-lived secure cookie used during signup or password recovery.</li>
          <li><strong>mm_cookie_consent</strong> — local browser storage used to remember your cookie choices.</li>
        </ul>

        <h2>Optional analytics</h2>
        <p>Analytics technologies are optional. They remain disabled unless you actively choose to allow analytics. At the date of this policy, the website does not load an optional third-party analytics script by default.</p>

        <h2>Optional marketing</h2>
        <p>Advertising and campaign-measurement technologies are optional. They remain disabled unless you actively choose to allow marketing. At the date of this policy, the website does not load an optional third-party marketing script by default.</p>

        <h2>Your choices</h2>
        <p>You can accept all optional technologies, reject all optional technologies, or make individual choices. Rejecting optional technologies does not stop strictly necessary account and security functionality.</p>
        <p><button type="button" className="legal-page__button" onClick={openCookieSettings}>Open cookie settings</button></p>

        <h2>Changes to this policy</h2>
        <p>We will update this policy if we add or materially change cookies, browser storage, analytics, advertising or other tracking technologies.</p>
      </div>
    </section>
  )
}
