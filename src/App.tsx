import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, Protected, RoleProtected } from "./lib/auth"
import Nav from "./components/Nav"
import Footer from "./components/Footer"
import CookieConsent from "./components/CookieConsent"
import SEO from "./components/SEO"
import Home from "./pages/Home"

const EstateAgents = lazy(() => import("./pages/EstateAgents"))
const Airbnb = lazy(() => import("./pages/Airbnb"))
const AIImageUpgrade = lazy(() => import("./pages/AIImageUpgrade"))
const BeforeAfterPage = lazy(() => import("./pages/BeforeAfterPage"))
const Pricing = lazy(() => import("./pages/Pricing"))
const Contact = lazy(() => import("./pages/Contact"))
const UploadPhotos = lazy(() => import("./pages/UploadPhotos"))
const PhotographerBooking = lazy(() => import("./pages/PhotographerBooking"))
const Portal = lazy(() => import("./pages/Portal"))
const DownloadStatus = lazy(() => import("./pages/DownloadStatus"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"))
const PhotographerDashboard = lazy(() => import("./pages/PhotographerDashboard"))
const Privacy = lazy(() => import("./pages/Privacy"))
const Cookies = lazy(() => import("./pages/Cookies"))
const Refunds = lazy(() => import("./pages/Refunds"))

function RouteLoading() {
  return (
    <section className="route-loading" role="status" aria-live="polite">
      <div className="route-loading-inner">
        <span className="route-loading-brand">MoveIn Media</span>
        <div className="route-loading-bar" />
        <p>Loading page…</p>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
          <SEO />
          <Nav />
          <main className="flex-1">
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/estate-agents" element={<EstateAgents />} />
                <Route path="/airbnb" element={<Airbnb />} />
                <Route path="/property-image-editing" element={<AIImageUpgrade />} />
                <Route path="/ai-image-upgrade" element={<Navigate to="/property-image-editing" replace />} />
                <Route path="/before-after" element={<BeforeAfterPage />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/refunds-cancellations" element={<Refunds />} />
                <Route path="/upload" element={<Protected><UploadPhotos /></Protected>} />
                <Route path="/photographer-booking" element={<Protected><PhotographerBooking /></Protected>} />
                <Route path="/login" element={<Login />} />
                <Route path="/portal" element={<Protected><Portal /></Protected>} />
                <Route path="/portal/download/:orderId" element={<Protected><DownloadStatus /></Protected>} />
                <Route path="/admin" element={<RoleProtected role="admin"><AdminDashboard /></RoleProtected>} />
                <Route path="/photographer" element={<RoleProtected role="photographer"><PhotographerDashboard /></RoleProtected>} />
                <Route path="/book" element={<Navigate to="/photographer-booking" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <CookieConsent />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
