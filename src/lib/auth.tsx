import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { apiJson, type AppUser } from "./api"

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Context = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const data = await apiJson<{ user: AppUser }>("auth/session")
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    try {
      await apiJson<{ ok: boolean }>("auth/logout", { method: "POST" })
    } finally {
      setUser(null)
    }
  }

  useEffect(() => { void refresh() }, [])

  return <Context.Provider value={{ user, loading, refresh, signOut }}>{children}</Context.Provider>
}

export const useAuth = () => useContext(Context)

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Checking your account…</span></div></section>
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RoleProtected({ role, children }: { role: "admin" | "photographer"; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Checking your account…</span></div></section>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return user.app_metadata?.role === role ? <>{children}</> : <Navigate to="/portal" replace />
}
