import { Link } from "react-router-dom"

export default function Privacy() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">Legal</p>
        <h1>Privacy notice</h1>
        <p className="legal-page__updated">Last updated: 4 October 2026</p>

        <h2>Who we are</h2>
        <p>MoveIn Media provides property marketing and image services. For the personal data processed through this website and customer portal, MoveIn Media is the controller unless we tell you otherwise.</p>

        <h2>What we collect</h2>
        <p>Depending on how you use the service, we may process your name, email address, account details, property address, order details, service notes, uploaded property images, payment and transaction references, support communications, photographer or staff profile information, and technical security information needed to operate the service.</p>

        <h2>Why we use your data</h2>
        <ul>
          <li>To create and manage your account and provide the services you request.</li>
          <li>To process orders, uploads, bookings, deliveries and payments.</li>
          <li>To communicate with you about your account, purchases and service delivery.</li>
          <li>To secure the service, prevent misuse and maintain reliable operations.</li>
          <li>To meet legal, accounting, tax and regulatory obligations.</li>
          <li>Where you have chosen to allow it, to use optional analytics or marketing technologies.</li>
        </ul>

        <h2>Our legal bases</h2>
        <p>We generally rely on performance of a contract when handling data needed to provide a purchased or requested service, legitimate interests for proportionate service security and administration, legal obligation where record keeping or other law requires it, and consent for optional cookies or similar technologies where consent is required.</p>

        <h2>Who receives your data</h2>
        <p>We use service providers to host and operate the platform, authenticate users, store files and data, process payments, and deliver the service. This includes Supabase for application infrastructure and Stripe for payment processing where checkout is used. We only disclose personal data where needed for those purposes, to professional advisers, or where required by law.</p>

        <h2>International transfers</h2>
        <p>Some service providers may process personal data outside the UK. Where UK data protection law requires safeguards for an international transfer, we expect the relevant provider or transfer arrangement to use an approved safeguard or another lawful transfer mechanism.</p>

        <h2>How long we keep data</h2>
        <p>We keep personal data only for as long as needed for the purpose it was collected for, including providing the service, resolving disputes, maintaining security, and meeting legal, tax or accounting requirements. Different records may therefore have different retention periods.</p>

        <h2>Your UK data protection rights</h2>
        <p>Depending on the circumstances, you may have rights to access, correct, erase, restrict or object to processing of your personal data, and to receive certain data in a portable format. Where processing is based on consent, you can withdraw that consent at any time without affecting earlier lawful processing.</p>

        <h2>Complaints</h2>
        <p>If you have concerns about how we use your personal data, contact us first so we can try to resolve them. You also have the right to complain to the UK Information Commissioner’s Office.</p>

        <h2>Cookies and similar technologies</h2>
        <p>We use strictly necessary storage for authentication, security and privacy preferences. Optional analytics or marketing storage is not enabled unless you choose to allow it. See our <Link to="/cookies">cookie policy</Link> and use the Cookie settings link in the footer to change your choices.</p>

        <h2>Changes to this notice</h2>
        <p>We may update this notice when our services, providers or legal requirements change. We will publish the current version on this page and update the date above.</p>
      </div>
    </section>
  )
}
