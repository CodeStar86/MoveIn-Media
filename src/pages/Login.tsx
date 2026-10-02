import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

function destinationFor(user: { app_metadata?: Record<string, unknown> } | null | undefined, requested?: string) {
  const role = user?.app_metadata?.role
  if (role === "photographer") return "/photographer"
  if (role === "admin") return "/admin"
  return requested && ["/portal", "/upload"].includes(requested) ? requested : "/portal"
}

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "update">((location.hash.includes("type=recovery") || location.hash.includes("type=invite")) ? "update" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const route = useLocation()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || location.hash.includes("type=invite")) setMode("update")
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/login" })
        if (error) throw error
        setMessage("If the account exists, a reset link has been sent.")
      } else if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        const { data: current } = await supabase.auth.getUser()
        navigate(destinationFor(current.user), { replace: true })
      } else {
        const { data, error } = mode === "signup"
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + "/portal" } })
          : await supabase.auth.signInWithPassword({ email, password })

        if (error) throw error
        if (data.session) {
          navigate(destinationFor(data.user, route.state?.from), { replace: true })
        } else {
          setMessage("Check your email to confirm your account before signing in.")
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to sign in.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="max-w-xl mx-auto px-6 py-16"><h1 className="text-3xl mb-6">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : mode === "update" ? "Choose a new password" : "Client login"}</h1><form onSubmit={submit} className="space-y-5">{mode !== "update" && <label className="block">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border p-3 mt-2"/></label>}{mode !== "reset" && <label className="block">Password<input required type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border p-3 mt-2"/></label>}<button disabled={busy} className="w-full p-4 bg-[var(--primary)] text-white">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Save password" : "Sign in"}</button><p role="status">{message}</p></form><div className="flex gap-6 mt-6"><button onClick={()=>{setMode(mode === "signup" ? "login" : "signup");setMessage("")}}>{mode === "signup" ? "Sign in" : "Create an account"}</button><button onClick={()=>{setMode("reset");setMessage("")}}>Forgot password?</button></div></section>
}
