import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { apiJson, type AppUser } from "../lib/api"
import { useAuth } from "../lib/auth"

function destinationFor(user: AppUser | null | undefined, requested?: string) {
  const role = user?.app_metadata?.role
  if (role === "photographer") return "/photographer"
  if (role === "admin") return "/admin"
  return requested && ["/portal", "/upload", "/pricing"].includes(requested) ? requested : "/portal"
}

export default function Login() {
  const route = useLocation()
  const params = new URLSearchParams(route.search)
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "update">(params.get("mode") === "update" ? "update" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState(params.get("auth_error") ? "The sign-in link could not be completed. Please try again." : "")
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { refresh, user } = useAuth()

  useEffect(() => {
    if (user && mode === "login") navigate(destinationFor(user, route.state?.from), { replace: true })
  }, [user, mode, navigate, route.state])

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("")
    try {
      if (mode === "reset") {
        await apiJson("auth/reset", { method: "POST", body: JSON.stringify({ email }) })
        setMessage("If the account exists, a reset link has been sent.")
      } else if (mode === "update") {
        await apiJson("auth/password", { method: "POST", body: JSON.stringify({ password }) })
        await refresh(); navigate("/portal", { replace: true })
      } else if (mode === "signup") {
        const data = await apiJson<{ user: AppUser | null; hasSession: boolean }>("auth/signup", { method: "POST", body: JSON.stringify({ email, password }) })
        if (data.hasSession) { await refresh(); navigate(destinationFor(data.user, route.state?.from), { replace: true }) }
        else setMessage("Check your email to confirm your account before signing in.")
      } else {
        const data = await apiJson<{ user: AppUser }>("auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
        await refresh(); navigate(destinationFor(data.user, route.state?.from), { replace: true })
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to sign in.") }
    finally { setBusy(false) }
  }

  return <section className="max-w-xl mx-auto px-6 py-16"><h1 className="text-3xl mb-6">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : mode === "update" ? "Choose a new password" : "Client login"}</h1><form onSubmit={submit} className="space-y-5">{mode !== "update" && <label className="block">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border p-3 mt-2"/></label>}{mode !== "reset" && <label className="block">Password<input required type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border p-3 mt-2"/></label>}<button disabled={busy} className="w-full p-4 bg-[var(--primary)] text-white">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Save password" : "Sign in"}</button><p role="status">{message}</p></form><div className="flex gap-6 mt-6"><button onClick={()=>{setMode(mode === "signup" ? "login" : "signup");setMessage("")}}>{mode === "signup" ? "Sign in" : "Create an account"}</button><button onClick={()=>{setMode("reset");setMessage("")}}>Forgot password?</button></div></section>
}
