import { createBrowserRouter } from "react-router"
import { Layout } from "./components"
import { MarketingDashboard } from "./marketing-dashboard"
import { StaffDashboard } from "./staff-dashboard"
import { AgentPortal } from "./agent-portal"
import {
  About,
  BeforeAfterPage,
  Booking,
  Contact,
  EstateAgents,
  Faqs,
  Home,
  HowItWorks,
  LegalPage,
  NotFound,
  Portfolio,
  Pricing,
  RefreshListing,
  WhatsIncluded,
} from "./pages"

export const router = createBrowserRouter([
  { path: "/staff", Component: StaffDashboard },
  { path: "/staff/marketing", Component: MarketingDashboard },
  { path: "/agent", Component: AgentPortal },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "whats-included", Component: WhatsIncluded },
      { path: "packages", Component: Pricing },
      { path: "refresh-listing", Component: RefreshListing },
      { path: "estate-agents", Component: EstateAgents },
      { path: "before-after", Component: BeforeAfterPage },
      { path: "our-work", Component: Portfolio },
      { path: "how-it-works", Component: HowItWorks },
      { path: "about", Component: About },
      { path: "book", Component: Booking },
      { path: "contact", Component: Contact },
      { path: "faqs", Component: Faqs },
      { path: "privacy", element: <LegalPage type="privacy" /> },
      { path: "terms", element: <LegalPage type="terms" /> },
      { path: "cookies", element: <LegalPage type="cookies" /> },
      { path: "cancellations", element: <LegalPage type="cancellations" /> },
      { path: "*", Component: NotFound },
    ],
  },
])
