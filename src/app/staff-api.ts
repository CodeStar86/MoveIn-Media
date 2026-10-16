declare const __MOVEIN_PUBLIC_SUPABASE_URL__: string
declare const __MOVEIN_PUBLIC_SUPABASE_KEY__: string
const url = __MOVEIN_PUBLIC_SUPABASE_URL__
const key = __MOVEIN_PUBLIC_SUPABASE_KEY__
const storageKey = 'movein_staff_session'
export type Session = { access_token: string; refresh_token: string; expires_at: number }
export const getSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Session | null } catch { return null }
}
export const saveSession = (session: Session | null) => {
  if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
  else sessionStorage.removeItem(storageKey)
}
export function recoverInviteSession() {
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const access_token = fragment.get('access_token')
  const refresh_token = fragment.get('refresh_token')
  const expires_in = Number(fragment.get('expires_in') || 3600)
  if (access_token && refresh_token) {
    saveSession({ access_token, refresh_token, expires_at: Date.now()+expires_in*1000 })
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
export async function setStaffPassword(password: string) {
  const session = getSession()
  if (!session || !url || !key) throw Error('Please sign in')
  if (password.length < 12) throw Error('Use a password of at least 12 characters')
  const response = await fetch(url+'/auth/v1/user',{method:'PUT',headers:{
    apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',
  },body:JSON.stringify({password})})
  if (!response.ok) throw Error('Could not update password')
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
  // PostgREST often returns 201/200 with an empty body for writes using Prefer: return=minimal.
  // Treat that as success rather than attempting to parse non-existent JSON.
  if (r.status === 204 || r.status === 205) return null
  const body = await r.text()
  if (!body.trim()) return null
  try { return JSON.parse(body) }
  catch { throw Error('The server returned an invalid response. Please refresh and check the job status.') }
}
