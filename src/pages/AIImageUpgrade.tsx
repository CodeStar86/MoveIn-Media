import { Link } from 'react-router-dom'

const services = [
  {
    id: 'decluttering',
    number: '01',
    name: 'Digital decluttering',
    price: '£20',
    image: '/portfolio/declutter-living.png',
    intro: 'Make an already-photographed room feel calmer, cleaner and easier to market — without arranging another visit.',
    includes: [
      'Removal of appropriate movable clutter and everyday distractions',
      'Careful preservation of walls, floors, windows, fixtures and room proportions',
      'Up to 20 supplied images reviewed for the property',
      'Listing-ready image files returned online',
    ],
    note: 'Best for occupied homes, tenanted properties and rooms that were photographed before final preparation.',
  },
  {
    id: 'staging',
    number: '02',
    name: 'Virtual staging',
    price: '£50',
    image: '/portfolio/stage-living.png',
    intro: 'Show the potential of suitable empty rooms with realistic furniture while keeping the underlying property unchanged.',
    includes: [
      'Virtual furniture added to suitable vacant or substantially empty rooms',
      'Styling chosen to suit the room and broad property character',
      'Architecture, permanent fixtures and room layout kept intact',
      'Finished files supplied for use in your listing',
    ],
    note: 'Best for empty reception rooms, bedrooms and other spaces where buyers or guests may struggle to judge scale or use.',
  },
  {
    id: 'descriptions',
    number: '03',
    name: 'Property descriptions',
    price: '£20',
    image: '/portfolio/declutter-dining.png',
    intro: 'Turn verified property details into clear, polished listing copy that is ready to review and publish.',
    includes: [
      'A concise marketing description based on the facts you provide',
      'Language adapted for sales, lettings or short-let presentation',
      'Clear structure that highlights useful features without inventing claims',
      'Copy delivered alongside your other property assets',
    ],
    note: 'Best for teams who already have the facts but want to reduce repetitive copywriting and keep presentation consistent.',
  },
]


const descriptionExamples = [
  {
    type: 'Victorian terrace',
    location: 'Clapham, London',
    use: 'Sales listing',
    facts: ['3 bedrooms', 'Period terrace', 'Open-plan kitchen / dining room', 'Private rear garden', 'Near Clapham Common'],
    copy: 'A well-presented three-bedroom Victorian terrace in Clapham, combining period character with a practical open-plan kitchen and dining space. The ground floor opens onto a private rear garden, while three bedrooms provide flexible space for families, guests or home working. Positioned within easy reach of Clapham Common and local amenities, the property offers a strong balance of residential setting and convenient access to the wider area.',
  },
  {
    type: 'Modern apartment',
    location: 'Ancoats, Manchester',
    use: 'Lettings listing',
    facts: ['2 bedrooms', '2 bathrooms', 'Open-plan living space', 'Balcony', 'Contemporary development'],
    copy: 'A contemporary two-bedroom, two-bathroom apartment in Ancoats, arranged around a bright open-plan living, dining and kitchen area. A private balcony adds useful outdoor space, while the second bedroom works equally well for guests or a home office. Set within a modern development close to the neighbourhood’s cafés, restaurants and city-centre connections, the apartment is suited to tenants looking for a well-connected urban base.',
  },
  {
    type: 'Coastal short-let',
    location: 'Kemptown, Brighton',
    use: 'Airbnb / short-let',
    facts: ['1 bedroom', 'Sleeps 2', 'Sea-view living room', 'Walkable to the seafront', 'Restaurants and cafés nearby'],
    copy: 'A relaxed one-bedroom stay in Kemptown, ideal for two guests looking to be close to Brighton’s seafront and local food scene. The living room provides a comfortable place to unwind with a sea view, while the separate bedroom keeps the sleeping space calm and private. Step outside for an easy walk to the beach, independent cafés and neighbourhood restaurants, with central Brighton within straightforward reach.',
  },
]

const faqs = [
  ['Do I need new photography?', 'No. MoveIn Media is designed for properties where you already have usable photographs. Upload the existing files and choose the service the property needs.'],
  ['What can be removed when decluttering?', 'Appropriate movable clutter and visual distractions can be removed. We do not use decluttering to misrepresent permanent features, damage, room dimensions or the condition of the property.'],
  ['Which rooms can be virtually staged?', 'Virtual staging works best in rooms that are empty or substantially empty, with the space and architecture clearly visible. If an image is not suitable, it should not be forced into a staged result.'],
  ['Can I order more than one service?', 'Yes. Decluttering + description is £35 per property, and virtual staging + description is £65 per property. Portfolio plans are also available for repeat monthly volume.'],
]

export default function AIImageUpgrade() {
  return (
    <div className="services-page">
      <section className="services-hero">
        <div className="shell services-hero-grid">
          <div>
            <p className="eyebrow light">PROPERTY PRESENTATION SERVICES</p>
            <h1>Already have the photos?<br/><em>Make more of them.</em></h1>
            <p className="services-hero-copy">Send us the property images you already have. We can remove appropriate clutter, furnish suitable empty rooms, write the listing description, or combine services into one simple online order.</p>
            <div className="services-hero-actions">
              <Link className="btn-gold" to="/upload">Upload a property</Link>
              <Link className="btn-outline-light" to="/before-after">See before & after</Link>
            </div>
          </div>
          <div className="services-hero-summary" aria-label="Services at a glance">
            <div><span>01</span><p>Digital decluttering</p><strong>£20</strong></div>
            <div><span>02</span><p>Virtual staging</p><strong>£50</strong></div>
            <div><span>03</span><p>Property description</p><strong>£20</strong></div>
          </div>
        </div>
      </section>

      <nav className="services-jump" aria-label="Jump to a service">
        <div className="shell">
          <a href="#decluttering">Digital decluttering</a>
          <a href="#staging">Virtual staging</a>
          <a href="#descriptions">Property descriptions</a>
          <a href="#description-examples">Description examples</a>
          <a href="#packages">Packages</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <section className="services-intro">
        <div className="shell services-intro-grid">
          <div>
            <p className="eyebrow">CHOOSE WHAT THE PROPERTY NEEDS</p>
            <h2>One upload. A more useful set of marketing assets.</h2>
          </div>
          <p>Not every listing needs a full reshoot. Sometimes the photography is sound but the room is cluttered, empty, or the copy still needs writing. MoveIn Media focuses on those practical gaps so you can keep the original photography workflow moving.</p>
        </div>
      </section>

      <section className="services-detail shell">
        {services.map((service, index) => (
          <article className={`service-detail ${index % 2 ? 'reverse' : ''}`} id={service.id} key={service.id}>
            <div className="service-detail-visual">
              <img src={service.image} alt={`${service.name} example`} />
              <span>Example · {service.name}</span>
            </div>
            <div className="service-detail-copy">
              <div className="service-detail-topline"><span>{service.number}</span><b>{service.price} / property</b></div>
              <h2>{service.name}</h2>
              <p className="service-detail-intro">{service.intro}</p>
              <h3>What’s included</h3>
              <ul>{service.includes.map(item => <li key={item}>{item}</li>)}</ul>
              <div className="service-suitable"><small>SUITABLE FOR</small><p>{service.note}</p></div>
              <Link to="/upload" className="service-order-link">Order {service.name.toLowerCase()} →</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="description-examples" id="description-examples">
        <div className="shell">
          <div className="section-head split description-examples-head">
            <div>
              <p className="eyebrow">PROPERTY DESCRIPTION EXAMPLES</p>
              <h2>Copy shaped around the property, location and listing type.</h2>
            </div>
            <p>These are illustrative examples showing how the same service can adapt to different homes and audiences. Final copy is written from the verified details you provide — we do not invent features, distances or local claims.</p>
          </div>
          <div className="description-example-grid">
            {descriptionExamples.map((example, index) => (
              <article className="description-example-card" key={`${example.location}-${example.type}`}>
                <div className="description-example-meta">
                  <span>0{index + 1}</span>
                  <small>{example.use}</small>
                </div>
                <h3>{example.type}</h3>
                <p className="description-example-location">{example.location}</p>
                <div className="description-example-facts">
                  <b>Example supplied details</b>
                  <div>{example.facts.map(fact => <span key={fact}>{fact}</span>)}</div>
                </div>
                <div className="description-example-copy">
                  <b>Example finished description</b>
                  <p>“{example.copy}”</p>
                </div>
              </article>
            ))}
          </div>
          <div className="description-examples-note">
            <p><b>Your listing, not a template.</b> Tone and emphasis can be adjusted for sales, lettings and short-lets, with location detail used only where you have supplied or approved it.</p>
            <Link to="/upload">Order a property description →</Link>
          </div>
        </div>
      </section>

      <section className="packages-section" id="packages">
        <div className="shell">
          <div className="section-head split packages-head">
            <div><p className="eyebrow">COMBINE SERVICES</p><h2>Need the images and the words?</h2></div>
            <p>Choose a package when you want the visual work and listing description handled together.</p>
          </div>
          <div className="package-grid">
            <article>
              <span>PACKAGE 01</span>
              <h3>Decluttering + description</h3>
              <p>Clean up appropriate visual clutter in your existing photographs and receive listing-ready property copy in the same order.</p>
              <div><strong>£35</strong><small>per property · save £5</small></div>
              <Link to="/upload">Choose this package →</Link>
            </article>
            <article className="featured-package">
              <span>PACKAGE 02</span>
              <h3>Virtual staging + description</h3>
              <p>Show suitable empty rooms at their best and pair the finished imagery with a polished description based on your verified details.</p>
              <div><strong>£65</strong><small>per property · save £5</small></div>
              <Link to="/upload">Choose this package →</Link>
            </article>
          </div>
          <div className="package-volume">
            <p><b>Sending properties regularly?</b> Monthly portfolio plans include digital decluttering + property description from £14 per included property, with virtual staging available as an add-on.</p>
            <Link to="/pricing">View monthly pricing →</Link>
          </div>
        </div>
      </section>

      <section className="services-process" id="how-it-works">
        <div className="shell">
          <div className="section-head split">
            <div><p className="eyebrow light">HOW IT WORKS</p><h2 className="white">From existing photos to finished assets.</h2></div>
            <p className="process-lead">Everything is handled online, so there is no new photography appointment to coordinate.</p>
          </div>
          <div className="process-grid">
            <article><span>01</span><h3>Upload the property</h3><p>Send the existing images and the basic property information we need to work accurately.</p></article>
            <article><span>02</span><h3>Choose your service</h3><p>Select decluttering, staging, a description, or one of the combined packages.</p></article>
            <article><span>03</span><h3>We prepare the assets</h3><p>Your supplied material is reviewed and the selected presentation work is completed remotely.</p></article>
            <article><span>04</span><h3>Download and list</h3><p>Receive the finished files online, ready for your normal review and publishing workflow.</p></article>
          </div>
        </div>
      </section>

      <section className="service-standards">
        <div className="shell service-standards-grid">
          <div>
            <p className="eyebrow">PRESENTATION, NOT MISREPRESENTATION</p>
            <h2>The property still has to be the property.</h2>
          </div>
          <div>
            <p>Our editing is intended to improve presentation while preserving the underlying space. Permanent architectural features, room proportions and material property characteristics should remain truthful to the source photography.</p>
            <p>Virtual staging should be clearly identified wherever required by your portal, platform, client or local advertising standards.</p>
            <Link to="/before-after">See examples of our approach →</Link>
          </div>
        </div>
      </section>

      <section className="services-faq shell" id="faq">
        <div className="faq-title"><p className="eyebrow">COMMON QUESTIONS</p><h2>Before you upload.</h2></div>
        <div className="faq-list">
          {faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="cta-new services-cta">
        <div className="shell">
          <div><div className="eyebrow light">READY WHEN YOU ARE</div><h2>Send us the property you already photographed.</h2><p className="text-white/60 mt-3">Choose a service from £20, or use a package if you want us to handle more of the listing.</p></div>
          <div className="cta-actions"><Link className="btn-gold" to="/upload">Upload a property</Link><Link className="btn-outline-light" to="/pricing">View pricing</Link></div>
        </div>
      </section>
    </div>
  )
}
