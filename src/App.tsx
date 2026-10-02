import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, Protected, RoleProtected } from "./lib/auth"
import Nav from "./components/Nav"
import Footer from "./components/Footer"
import Home from "./pages/Home"

const EstateAgents = lazy(() => import("./pages/EstateAgents"))
const Airbnb = lazy(() => import("./pages/Airbnb"))
const AIImageUpgrade = lazy(() => import("./pages/AIImageUpgrade"))
const BeforeAfterPage = lazy(() => import("./pages/BeforeAfterPage"))
const Pricing = lazy(() => import("./pages/Pricing"))
const UploadPhotos = lazy(() => import("./pages/UploadPhotos"))
const Portal = lazy(() => import("./pages/Portal"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"))
const PhotographerDashboard = lazy(() => import("./pages/PhotographerDashboard"))

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
                <Route path="/upload" element={<Protected><UploadPhotos /></Protected>} />
                <Route path="/login" element={<Login />} />
                <Route path="/portal" element={<Protected><Portal /></Protected>} />
                <Route path="/admin" element={<RoleProtected role="admin"><AdminDashboard /></RoleProtected>} />
                <Route path="/photographer" element={<RoleProtected role="photographer"><PhotographerDashboard /></RoleProtected>} />
                <Route path="/book" element={<Navigate to="/upload" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
