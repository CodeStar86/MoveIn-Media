import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://www.movein-media.co.uk'
const SITE_NAME = 'MoveIn Media'
const DEFAULT_IMAGE = `${SITE_URL}/portfolio/hero-kitchen.webp`

type SeoEntry = {
  title: string
  description: string
  index?: boolean
}

const seo: Record<string, SeoEntry> = {
  '/': {
    title: 'Property Photo Editing & Photography London | MoveIn Media',
    description: 'Property photo editing, digital decluttering, virtual staging and listing copy from MoveIn Media. London property photography also available for £150 per property.',
  },
  '/estate-agents': {
    title: 'Property Marketing for Estate Agents | MoveIn Media',
    description: 'Remote property photo editing for estate agents, including digital decluttering, virtual staging and listing descriptions, plus London property photography.',
  },
  '/airbnb': {
    title: 'Airbnb Photo Editing & Listing Presentation | MoveIn Media',
    description: 'Refresh Airbnb and short-let listings with professional photo editing, digital decluttering, virtual staging and listing descriptions.',
  },
  '/property-image-editing': {
    title: 'Property Image Editing & Virtual Staging | MoveIn Media',
    description: 'Professional property image editing from £20, including digital decluttering, realistic virtual staging and listing-ready presentation.',
  },
  '/before-after': {
    title: 'Property Photo Editing Before & After | MoveIn Media',
    description: 'See before-and-after examples of MoveIn Media digital decluttering and virtual staging for property marketing images.',
  },
  '/pricing': {
    title: 'Property Photo Editing & Photography Pricing | MoveIn Media',
    description: 'See MoveIn Media pricing for digital decluttering, virtual staging, property descriptions, monthly portfolio plans and London property photography.',
  },
  '/privacy': { title: 'Privacy Policy | MoveIn Media', description: 'MoveIn Media privacy policy.', index: false },
  '/cookies': { title: 'Cookie Policy | MoveIn Media', description: 'MoveIn Media cookie policy.', index: false },
  '/refunds-cancellations': { title: 'Refunds & Cancellations | MoveIn Media', description: 'MoveIn Media refunds and cancellations policy.', index: false },
  '/login': { title: 'Sign In | MoveIn Media', description: 'Sign in to your MoveIn Media account.', index: false },
  '/upload': { title: 'Upload Property | MoveIn Media', description: 'Upload property photos to MoveIn Media.', index: false },
  '/photographer-booking': { title: 'Book a Photographer | MoveIn Media', description: 'Book your MoveIn Media property photographer.', index: false },
  '/portal': { title: 'Client Portal | MoveIn Media', description: 'MoveIn Media client portal.', index: false },
  '/admin': { title: 'Admin Dashboard | MoveIn Media', description: 'MoveIn Media administration.', index: false },
  '/photographer': { title: 'Photographer Dashboard | MoveIn Media', description: 'MoveIn Media photographer dashboard.', index: false },
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value))
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export default function SEO() {
  const location = useLocation()

  useEffect(() => {
    const isDownload = location.pathname.startsWith('/portal/download/')
    const entry = seo[location.pathname] ?? {
      title: `Page Not Found | ${SITE_NAME}`,
      description: 'The requested page could not be found.',
      index: false,
    }
    const indexable = entry.index !== false && !isDownload
    const canonicalPath = location.pathname === '/ai-image-upgrade' ? '/property-image-editing' : location.pathname
    const canonical = `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`

    document.title = entry.title
    upsertMeta('meta[name="description"]', { name: 'description', content: entry.description })
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: indexable ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow',
    })
    upsertLink('canonical', canonical)

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: entry.title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: entry.description })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE })
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'MoveIn Media property presentation before and after' })

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: entry.title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: entry.description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE })
  }, [location.pathname])

  return null
}
