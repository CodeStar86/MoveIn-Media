import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { Navigate, useLocation } from "react-router-dom"
import { supabase } from "./supabase"
const Context = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => { if (error) console.error(error.message); setUser(data.session?.user ?? null); setLoading(false) }).catch(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false) })
    return () => data.subscription.unsubscribe()
  }, [])
  return <Context.Provider value={{ user, loading }}>{children}</Context.Provider>
}
export const useAuth = () => useContext(Context)
export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation()
  if (loading) return <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Checking your account…</span></div></section>
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RoleProtected({ role, children }: { role: "admin" | "photographer"; children: ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation()
  if (loading) return <section className="account-loading" role="status"><div><strong>MoveIn Media</strong><span>Checking your account…</span></div></section>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return user.app_metadata?.role === role ? <>{children}</> : <Navigate to="/portal" replace />
}
