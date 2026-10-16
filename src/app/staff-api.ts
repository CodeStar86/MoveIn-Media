const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const storageKey = 'movein_staff_session'
export type Session = { access_token: string; refresh_token: string; expires_at: number }
export const getSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Session | null } catch { return null }
}
export const saveSession = (session: Session | null) => {
  if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
  else sessionStorage.removeItem(storageKey)
}
export async function staffAuth(email: string, password: string) {
  if (!url || !key) throw Error('Staff authentication is not configured')
  const response = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await response.json()
  if (!response.ok) throw Error(data.error_description || data.msg || 'Login failed')
  saveSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000})
}
export async function staffRequest(path: string, options: RequestInit = {}) {
  if (!url || !key) throw Error('Staff API is not configured')
  let session = getSession()
  if (!session) throw Error('Please sign in')
  if (session.expires_at < Date.now() + 60000) {
    const r = await fetch(url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',headers:{apikey:key,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token}),
    })
    if (!r.ok) { saveSession(null);throw Error('Session expired. Sign in again.') }
    const data=await r.json()
    session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000}
    saveSession(session)
  }
  const r=await fetch(url + '/rest/v1/' + path,{
    ...options,headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...options.headers},
  })
  if (!r.ok) { const e=await r.json().catch(()=>({}));throw Error(e.message||e.error||'Request failed') }
  if (r.status === 204) return null
  return r.json()
}
