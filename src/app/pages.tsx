declare const __MOVEIN_PUBLIC_SUPABASE_URL__: string
declare const __MOVEIN_PUBLIC_SUPABASE_KEY__: string
import { useState, type FormEvent } from "react"
import {
  Aperture,
  Camera,
  CalendarCheck2,
  ShieldCheck,
  Image,
  Layers3,
  Mail,
  MoveRight,
  PenLine,
  ScanLine,
  Sparkles,
} from "lucide-react"
import {
  BeforeAfter,
  BookingForm,
  ButtonLink,
  Eyebrow,
  FaqList,
  FinalCta,
  PageHero,
  PricingCards,
  SectionHeading,
  Seo,
  images,
} from "./components"


const services = [
  [
    Aperture,
    "Professional photography",
    "Beautiful, sharp imagery composed to give every room clarity, warmth and a natural sense of space.",
  ],
  [
    ScanLine,
    "Digital decluttering",
    "Suitable distractions can be reduced after the shoot, taking pressure off cosmetic preparation.",
  ],
  [
    Layers3,
    "Virtual staging",
    "Realistic digital furnishing can help buyers understand the potential of suitable empty rooms.",
  ],
  [
    PenLine,
    "Property descriptions",
    "Clear, considered listing copy communicates the features and flow of the property.",
  ],
]

export function Home() {
  return (
    <>
      <Seo
        title="Property Photography North London"
        description="All-inclusive property photography, digital decluttering, virtual staging and listing descriptions for North London properties."
      />
      <section className="hero">
        <img
          className="hero__image"
          src={images.hero}
          alt="Bright, professionally presented living room"
        />
        <div className="hero__shade" />
        <div className="hero__content">
          <Eyebrow light>
            All-inclusive property marketing · North London
          </Eyebrow>
          <h1>
            Property marketing,
            <br />
            <span className="hero__headline-accent">beautifully handled.</span>
          </h1>
          <span className="hero__subheading">Everything included. One clear price.</span>
          <p>
            Professional property photography, digital decluttering, virtual
            staging and compelling descriptions — one complete package for North
            London agents and property owners.
          </p>
          <div className="button-row">
            <ButtonLink to="/book" variant="light">
              Book your property
            </ButtonLink>
            <ButtonLink to="/before-after" variant="secondary">
              See before & after
            </ButtonLink>
          </div>
        </div>
        <div className="hero__credit">Photo by Zac Gudakov / Unsplash</div>
      </section>
      <div className="trust-strip">
        <span>All-inclusive pricing</span>
        <span>Less preparation pressure</span>
        <span>Consistent listing presentation</span>
      </div>

      <section className="section service-section">
        <SectionHeading
          eyebrow="The complete picture"
          title="One booking. Every detail handled."
          text="From the first shutter click to the final listing copy, every element is included in your booking price."
        />
        <div className="service-grid">
          {services.map(([Icon, title, text], i) => {
            const ServiceIcon = Icon as typeof Aperture
            return (
              <article className="service-card" key={String(title)}>
                <span>0{i + 1}</span>
                <ServiceIcon />
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </article>
            )
          })}
        </div>
        <p className="included-note">
          <Sparkles size={17} /> All four service categories are included in
          every appointment.
        </p>
      </section>

      <section className="section section--sage">
        <SectionHeading
          eyebrow="See the difference"
          title="Presentation changes perception."
          text="Explore illustrative examples of how thoughtful enhancement can create a clearer, more considered first impression."
        />
        <div className="comparison-feature">
          <BeforeAfter
            before={images.living}
            after={images.fireplace}
            title="From cluttered to camera-ready"
            description="See how digital decluttering creates a calmer bedroom presentation while retaining the room’s layout and permanent features."
          />
          <div className="comparison-aside">
            <span className="large-index">01 / 04</span>
            <blockquote>
              “The goal isn’t to make a property something it’s not. It’s to
              present what’s there with care.”
            </blockquote>
            <ButtonLink to="/before-after" variant="text">
              Explore all comparisons
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="split-feature">
        <div className="split-feature__image">
          <img
            src={images.blueLiving}
            alt="Comfortable, polished living room"
          />
          <span>Illustrative presentation</span>
        </div>
        <div className="split-feature__copy">
          <Eyebrow>Less preparation pressure</Eyebrow>
          <h2>You don’t need a picture-perfect property to get started.</h2>
          <p>
            Your home does not need to feel like a showroom before we arrive.
            Professional composition and suitable cosmetic enhancements can
            create a cleaner, calmer listing presentation.
          </p>
          <p className="small-print">
            The property should still be safe, accessible and reasonably ready.
            Digital decluttering does not replace essential cleaning, repairs or
            physical access.
          </p>
          <ButtonLink to="/book">Book without the stress</ButtonLink>
        </div>
      </section>

      <section className="section refresh-panel">
        <div>
          <Eyebrow light>Refresh your listing</Eyebrow>
          <h2>Not getting the enquiries you expected?</h2>
          <p>
            Sometimes a listing needs a fresh first impression. New photography
            and a more polished presentation may help it stand out to
            prospective buyers and tenants.
          </p>
          <ButtonLink to="/refresh-listing" variant="light">
            Refresh my property listing
          </ButtonLink>
        </div>
        <img
          src={images.exterior}
          alt="Traditional North London brick townhouse"
        />
      </section>

      <section className="section agency-section">
        <div className="agency-copy">
          <SectionHeading
            eyebrow="For estate agents"
            title="Make every listing look like it belongs to your agency."
            text="A repeatable photographic style, thoughtful editing and consistent descriptions help create a cohesive portfolio — from studio flats to family homes."
          />
          <ButtonLink to="/estate-agents">
            Enquire about agency bookings
          </ButtonLink>
        </div>
        <div className="property-grid">
          <img src={images.bedroom} alt="Neutral bedroom" />
          <img src={images.fireplace} alt="Living room with fireplace" />
          <img src={images.greenBedroom} alt="Green bedroom" />
          <img src={images.blueLiving} alt="Blue and white living room" />
        </div>
      </section>

      <section className="section section--cream">
        <SectionHeading
          eyebrow="Simple, honest pricing"
          title="One package. Everything included."
          text="Professional property marketing, with preferential rates for estate agents."
          centered
        />
        <PricingCards />
        <p className="pricing-disclaimer">
          Standard scope covers local residential properties up to four bedrooms. Every empty room can be virtually furnished and suitable images digitally decluttered, without per-image caps. Larger properties or journeys outside our local area require a bespoke quote. Prices exclude VAT if applicable. Final scope and availability are confirmed before booking.
        </p>
      </section>

      <section className="section process-section">
        <SectionHeading
          eyebrow="How it works"
          title="From property to listing-ready, in three steps."
        />
        <div className="steps">
          {[
            [
              "01",
              "Book your property",
              "Tell us about the property, its location and your preferred date.",
            ],
            [
              "02",
              "We photograph & enhance",
              "We capture the space and apply suitable editing, decluttering and virtual staging.",
            ],
            [
              "03",
              "Receive your complete package",
              "Your finished images and professionally written description arrive digitally.",
            ],
          ].map(([num, title, text]) => (
            <article key={num}>
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section faq-section">
        <SectionHeading
          eyebrow="Questions, answered"
          title="Everything you need to know before booking."
        />
        <FaqList limit={5} />
        <div className="faq-more">
          <ButtonLink to="/faqs" variant="text">
            View all frequently asked questions
          </ButtonLink>
        </div>
      </section>
      <FinalCta />
    </>
  )
}

export function WhatsIncluded() {
  return (
    <>
      <Seo
        title="What's Included"
        description="One complete property marketing service including photography, editing, digital decluttering, virtual staging and property descriptions."
      />
      <PageHero
        eyebrow="One complete service"
        title="From the first photograph to the final full stop."
        text="Every booking brings the core disciplines of property presentation together — managed as one coherent service, not a list of extras."
        image={images.living}
      />
      <section className="section">
        <div className="service-detail-grid">
          {services.map(([Icon, title, text], i) => {
            const ItemIcon = Icon as typeof Aperture
            return (
              <article key={String(title)}>
                <div>
                  <span>0{i + 1}</span>
                  <ItemIcon />
                </div>
                <h2>{String(title)}</h2>
                <p>{String(text)}</p>
                {i === 1 && (
                  <small>
                    Cosmetic enhancement is not a replacement for cleaning,
                    repairs or access.
                  </small>
                )}
                {i === 2 && (
                  <small>
                    Staged images are clearly labelled wherever required.
                  </small>
                )}
              </article>
            )
          })}
        </div>
      </section>
      <section className="manifesto">
        <Eyebrow light>The MoveIn approach</Eyebrow>
        <h2>
          No supplier juggling.
          <br />
          No fragmented presentation.
          <br />
          <em>Just one complete result.</em>
        </h2>
        <p>
          We manage the journey from the photography appointment through to your
          organised, listing-ready digital files.
        </p>
        <ButtonLink to="/book" variant="light">
          Book the complete service
        </ButtonLink>
      </section>
      <FinalCta />
    </>
  )
}

export function Pricing() {
  return (
    <>
      <Seo
        title="Packages & Pricing"
        description="All-inclusive property marketing for £199 per standard property, with monthly volume pricing for estate agents in North London."
      />
      <PageHero
        eyebrow="Packages & pricing"
        title="All-inclusive for every property."
        text="£199 per standard residential appointment, including photography, editing, suitable digital enhancements and listing copy. Estate agents can earn better per-property rates as completed monthly volume grows."
      />
      <section className="section section--cream">
        <PricingCards />
        <p className="pricing-disclaimer">Prices exclude VAT if applicable. Larger properties, commercial work and travel outside our local area are quoted separately. Final scope, eligibility and availability are confirmed before booking.</p>
      </section>
      <FinalCta />
    </>
  )
}

export function BeforeAfterPage() {
  return (
    <>
      <Seo
        title="Before & After Property Photography"
        description="Explore illustrative property photography, virtual staging and image enhancement comparisons."
      />
      <PageHero
        eyebrow="Before & after"
        title="Thoughtful enhancement. Honest presentation."
        text="Drag the line across each illustrative example to explore the kind of presentation change a complete MoveIn Media booking can support."
      />
      <section className="section">
        <div className="comparison-grid">
          <BeforeAfter
            before={images.living}
            after={images.fireplace}
            title="Digital decluttering: a clearer bedroom"
            description="Everyday clutter is removed from the image so viewers can focus on the space. The room’s structure and permanent features remain unchanged."
          />
          <BeforeAfter
            before={images.virtualBefore}
            after={images.virtualAfter}
            title="Virtual staging: an empty room, reimagined"
            description="Digital furniture and styling help viewers imagine how the empty living room could be used. The staged result is illustrative, not the property’s current furnishing."
          />
          <BeforeAfter
            before={images.living}
            after={images.fireplace}
            title="Image presentation: a more inviting first impression"
            description="The same bedroom pair shows how thoughtful presentation can bring attention back to the room itself. No structural alterations are depicted."
          />
        </div>
        <article className="copy-comparison">
          <div>
            <span>Before</span>
            <p>
              Spacious 3 bed house with garden in a good area. Close to shops
              and transport. Call to view.
            </p>
          </div>
          <MoveRight />
          <div>
            <span>After</span>
            <p>
              A well-proportioned three-bedroom home combining bright living
              space with a private rear garden, positioned within easy reach of
              everyday amenities and convenient transport links.
            </p>
          </div>
          <footer>
            <strong>Improved listing description</strong>
            <small>
              Illustrative example — specific claims are always based on
              verified property details.
            </small>
          </footer>
        </article>
      </section>
      <section className="ethics-strip">
        <Image />
        <div>
          <h2>Enhanced, never misrepresented.</h2>
          <p>
            We do not alter physical structure, dimensions or condition. Virtual
            staging and relevant enhanced imagery are clearly labelled for
            transparent marketing.
          </p>
        </div>
      </section>
      <FinalCta />
    </>
  )
}

export function Portfolio() {
  const photos = [
    [
      images.hero,
      "Open-plan living",
      "Natural light and architectural clarity",
    ],
    [images.bedroom, "Quiet bedroom", "Soft, balanced interior colour"],
    [images.exterior, "North London exterior", "A clear sense of place"],
    [
      images.blueLiving,
      "Family living room",
      "Comfortable, inviting presentation",
    ],
    [
      images.greenBedroom,
      "Statement bedroom",
      "Character without visual noise",
    ],
    [
      images.fireplace,
      "Period details",
      "Composition that prioritises features",
    ],
  ]
  return (
    <>
      <Seo
        title="Our Work"
        description="Explore the visual style of MoveIn Media property marketing and photography."
      />
      <PageHero
        eyebrow="Our work"
        title="Property imagery with an editorial point of view."
        text="A curated visual direction showing how we approach light, space, detail and consistent listing presentation. Images below are style references, not claimed client projects."
      />
      <section className="portfolio-grid">
        {photos.map(([src, title, text], i) => (
          <figure
            key={src}
            className={i === 0 || i === 3 ? "portfolio-item--wide" : ""}
          >
            <img src={src} alt={title} />
            <figcaption>
              <span>0{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <small>{text} · Unsplash reference</small>
              </div>
            </figcaption>
          </figure>
        ))}
      </section>
      <FinalCta />
    </>
  )
}

export function RefreshListing() {
  return (
    <>
      <Seo
        title="Refresh Your Property Listing"
        description="Refresh an underperforming North London property listing with new photography, enhanced imagery and stronger copy."
      />
      <PageHero
        eyebrow="A fresh first impression"
        title="Your property is still on the market. Your photos shouldn’t be."
        text="If a listing has been online for weeks without attracting the attention you expected, its photography and presentation could be part of the problem."
        image={images.exterior}
      />
      <section className="section editorial-split">
        <div>
          <SectionHeading
            eyebrow="Reframe the listing"
            title="Sometimes the right next step is a fresh start."
          />
          <p>
            We create a new, cohesive presentation: professional photography,
            enhanced images and more considered property copy, all included in
            one booking.
          </p>
          <p>
            New photography cannot guarantee more enquiries or a faster
            transaction. It can give prospective buyers and tenants a clearer,
            more polished way to understand what the property offers.
          </p>
          <ButtonLink to="/book">Refresh my listing</ButtonLink>
        </div>
        <BeforeAfter
          before={images.living}
          after={images.fireplace}
          title="A refreshed listing, without the distractions"
          description="Compare a lived-in bedroom with a clearer, listing-ready presentation that keeps the property’s permanent features intact."
        />
      </section>
      <FinalCta />
    </>
  )
}

export function EstateAgents() {
  return (
    <>
      <Seo
        title="Estate Agent Property Photography North London"
        description="Consistent property photography and listing marketing for estate agents across North London."
      />
      <PageHero
        eyebrow="For estate agents"
        title="Every property deserves the same professional standard."
        text="Build a recognisable, repeatable visual identity across your agency portfolio — from studio flats to family homes."
        image={images.fireplace}
      />
      <section className="section agent-benefits">
        <div className="agent-benefits__intro">
          <Eyebrow>Built for estate agents</Eyebrow>
          <h2>Consistent quality. Less to manage.</h2>
          <p>One trusted partner for photography, digital enhancements and listing copy across your properties.</p>
        </div>
        <div className="agent-benefits__grid">
          {[
            [Camera, "Consistent photography", "A cohesive look across every listing."],
            [Layers3, "Everything in one booking", "Photography, editing, staging and copy handled together."],
            [CalendarCheck2, "Made for repeat work", "Straightforward bookings and better rates for regular agents."],
            [ShieldCheck, "Honest presentation", "Thoughtful enhancements with clear, responsible labelling."],
          ].map(([Icon, title, description]) => (
            <article key={String(title)}>
              <Icon aria-hidden="true" />
              <h3>{String(title)}</h3>
              <p>{String(description)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section section--sage">
        <div className="property-grid property-grid--large">
          <img src={images.bedroom} alt="Consistently photographed bedroom" />
          <img
            src={images.living}
            alt="Consistently photographed living room"
          />
          <img
            src={images.greenBedroom}
            alt="Consistently photographed green bedroom"
          />
          <img
            src={images.blueLiving}
            alt="Consistently photographed family room"
          />
        </div>
        <div className="agency-cta">
          <Eyebrow>For estate agents</Eyebrow>
          <h2>Better listings. Less work for your team.</h2>
          <p>Consistent photography, digital staging and property descriptions, all managed through one service. Preferential rates for regular bookings.</p>
          <ButtonLink to="/agent">Agent portal — register or sign in</ButtonLink>
          <p><a href="/contact">Questions about an agency account? Contact us</a></p>
        </div>
      </section>
      <FinalCta />
    </>
  )
}

export function HowItWorks() {
  return (
    <>
      <Seo
        title="How It Works"
        description="The simple three-step MoveIn Media property photography and marketing process."
      />
      <PageHero
        eyebrow="How it works"
        title="Simple to arrange. Complete when delivered."
        text="One point of contact and one clear process, from your initial request to the finished listing-ready package."
      />
      <section className="section timeline">
        {[
          [
            "01",
            "Request your date",
            "Tell us about the property, location and purpose. We’ll confirm the scope, price and availability directly.",
          ],
          [
            "02",
            "Prepare reasonably, not perfectly",
            "Make sure the property is safe and accessible. We’ll guide you on useful preparation without expecting showroom perfection.",
          ],
          [
            "03",
            "Photography appointment",
            "We photograph the key rooms, details and exterior with a consistent, natural visual approach.",
          ],
          [
            "04",
            "Enhancement & writing",
            "Your photographs are edited, suitable distractions addressed, appropriate staging prepared and the listing description written.",
          ],
          [
            "05",
            "Digital delivery",
            "Receive an organised package of finished media ready for your listing, with relevant enhanced images clearly labelled.",
          ],
        ].map(([num, title, text]) => (
          <article key={num}>
            <span>{num}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
      <FinalCta />
    </>
  )
}

export function About() {
  return (
    <>
      <Seo
        title="About MoveIn Media"
        description="Meet MoveIn Media, the all-inclusive North London property marketing studio."
      />
      <PageHero
        eyebrow="About MoveIn Media"
        title="Better property presentation should feel simple."
        text="MoveIn Media was built around one clear idea: property professionals should not need to coordinate four suppliers to create one polished listing."
        image={images.blueLiving}
      />
      <section className="section editorial-split about-story">
        <div>
          <SectionHeading
            eyebrow="Our point of view"
            title="One team, one standard, one finished presentation."
          />
          <p>
            We bring photography, image preparation, suitable digital
            enhancement and listing copy into one considered workflow. That
            means less administration for you and a more consistent result for
            the person viewing the listing.
          </p>
          <p>
            Initially serving N, NW and EN postcodes, we work with estate
            agents, landlords and property professionals who value clarity,
            honesty and a strong visual standard.
          </p>
        </div>
        <div className="value-card">
          <Sparkles />
          <h2>Presentation with integrity.</h2>
          <p>
            Enhancement should help people understand a property — never
            misrepresent its structure, scale or condition.
          </p>
        </div>
      </section>
      <FinalCta />
    </>
  )
}

export function Booking() {
  return (
    <>
      <Seo
        title="Book Property Photography | Agent Account Required"
        description="Register or sign in to your MoveIn Media estate agent account to request property photography. New agent accounts require administrator approval."
      />
      <PageHero
        eyebrow="Agent bookings"
        title="Your bookings, all in one place."
        text="Create a free estate agent account to manage property photography bookings, see progress and download completed photos. New accounts are reviewed by our administrator before booking access is enabled."
      />
      <section className="section">
        <div className="agency-cta">
          <Eyebrow>First time here?</Eyebrow>
          <h2>Register your agency before booking</h2>
          <p>Register with your name, agency, email and password. Confirm your email, then wait for approval. Once approved, you can submit booking requests from your own dashboard.</p>
          <ButtonLink to="/agent">Register or sign in to book</ButtonLink>
          <p>Already approved? Sign in to the same agent portal to manage bookings and download completed property media.</p>
          <p>Need assistance? <a href="/contact">our contact form</a></p>
        </div>
      </section>
    </>
  )
}

export function Contact() {
 const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle")
 const [error,setError]=useState("")
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(state==="sending")return
  setState("sending");setError("")
  const form=e.currentTarget
  const values=Object.fromEntries(new FormData(form))
  try {
   const response=await fetch(__MOVEIN_PUBLIC_SUPABASE_URL__+"/functions/v1/contact-submit",{method:"POST",headers:{"content-type":"application/json",apikey:__MOVEIN_PUBLIC_SUPABASE_KEY__},body:JSON.stringify(values)})
   const data=await response.json().catch(()=>({})) as {error?:string}
   if(!response.ok)throw new Error(data.error||"Unable to send your message")
   form.reset();setState("sent")
  }catch(err){setState("error");setError((err as Error).message)}
 }
 return <>
  <Seo title="Contact" description="Send MoveIn Media an enquiry through our contact form."/>
  <PageHero eyebrow="Get in touch" title="How can we help?" text="Send a message about bookings, photography or agency services. Our team will reply by email."/>
  <section className="section" style={{maxWidth:850,margin:"0 auto"}}>
   <div style={{padding:"clamp(20px,4vw,45px)",borderRadius:14,border:"1px solid var(--line)"}}>
    <h2>Contact MoveIn Media</h2>
    <form onSubmit={send} style={{display:"grid",gap:15,marginTop:24}}>
      <label>Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" style={{display:"block",width:"100%",padding:13,marginTop:7}}/></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" style={{display:"block",width:"100%",padding:13,marginTop:7}}/></label>
      <label>Subject<input name="subject" required minLength={2} maxLength={180} style={{display:"block",width:"100%",padding:13,marginTop:7}}/></label>
      <label>Message<textarea name="message" required minLength={10} maxLength={5000} rows={6} style={{display:"block",width:"100%",padding:13,marginTop:7}}/></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:"absolute",left:"-10000px",height:1,width:1}}/>
      {state==="sent"&&<p role="status">Thank you — your message has been sent. We'll reply by email.</p>}
      {state==="error"&&<p role="alert" style={{color:"#a52a2a"}}>{error}</p>}
      <button type="submit" disabled={state==="sending"} style={{background:"#153f39",color:"#fff",padding:"14px 22px",border:0,borderRadius:8,fontWeight:700}}>{state==="sending"?"Sending…":"Send message"}</button>
    </form>
   </div>
  </section>
 </>
}

export function Faqs() {
  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Answers about MoveIn Media property photography, digital decluttering, virtual staging and bookings."
      />
      <PageHero
        eyebrow="Frequently asked questions"
        title="Clear answers before we arrive."
        text="From preparation and enhancements to coverage and delivery, here’s what you need to know."
      />
      <section className="section faq-page">
        <FaqList />
      </section>
      <FinalCta />
    </>
  )
}

const legal: Record<string, {
  title: string
  intro: string
  sections: [string, string][]
}> = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "How MoveIn Media handles information submitted through this website.",
    sections: [
      [
        "Information we collect",
        "We collect the details you submit in booking and contact enquiries, including your name, contact details and property information.",
      ],
      [
        "How we use it",
        "We use this information to respond to enquiries, assess requested work, arrange appointments and deliver agreed services.",
      ],
      [
        "Storage and sharing",
        "Information is retained only as reasonably necessary and shared only with service providers needed to operate our website, communications and booked services.",
      ],
      [
        "Your rights",
        "You may ask to access, correct or delete your personal information by emailing hello@movein-media.co.uk.",
      ],
      [
        "Contact and complaints",
        "For privacy requests or complaints, email hello@movein-media.co.uk. You may also complain to the UK Information Commissioner’s Office (ico.org.uk).",
      ],
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro:
      "The basis on which MoveIn Media provides property marketing services.",
    sections: [
      [
        "Bookings",
        "A request is not a confirmed appointment. Scope, availability, price and timing are confirmed directly in writing.",
      ],
      [
        "Property access",
        "The customer is responsible for safe, lawful and timely access, and for ensuring the property is reasonably ready for photography.",
      ],
      [
        "Enhancements",
        "Digital decluttering and virtual staging are applied only where suitable and within the agreed scope. We do not alter structural features, dimensions or known condition.",
      ],
      [
        "Delivery and usage",
        "Delivery timing and permitted image usage will be confirmed with each booking.",
      ],
      [
        "Questions about a booking",
        "Please contact hello@movein-media.co.uk before confirming if you need clarity on pricing, delivery or licensing. Any agreed changes will be set out in writing.",
      ],
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "Our approach to cookies and similar technologies.",
    sections: [
      [
        "Essential technology",
        "The website may use strictly necessary storage required for basic security and functionality.",
      ],
      [
        "Analytics",
        "No non-essential analytics or advertising cookies are enabled in this build. If introduced, consent controls and this policy should be updated first.",
      ],
      [
        "Managing cookies",
        "You can manage or delete cookies using your browser settings.",
      ],

    ],
  },
  cancellations: {
    title: "Cancellations",
    intro:
      "A fair framework for changing or cancelling a property appointment.",
    sections: [
      [
        "Changing a date",
        "Contact us as early as possible if access or circumstances change. We will try to rearrange subject to availability.",
      ],
      [
        "Late cancellations",
        "Any cancellation window or fee will be clearly disclosed and agreed when the appointment is confirmed.",
      ],
      [
        "Unsafe or inaccessible properties",
        "We may pause or reschedule work if safe and reasonable access is not available.",
      ],

    ],
  },
}

export function LegalPage({ type }: { type: keyof typeof legal }) {
  const page = legal[type]
  return (
    <>
      <Seo
        title={page.title}
        description={`${page.title} for the MoveIn Media website and property marketing service.`}
      />
      <PageHero eyebrow="Legal" title={page.title} text={page.intro} />
      <article className="legal-content">
        <p className="legal-date">Last updated: 15 October 2026</p>
        {page.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </article>
    </>
  )
}

export function NotFound() {
  return (
    <section className="not-found">
      <span>404</span>
      <h1>This room seems to be missing.</h1>
      <p>The page you’re looking for may have moved.</p>
      <ButtonLink to="/">Return home</ButtonLink>
    </section>
  )
}
