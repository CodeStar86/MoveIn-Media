import { adminBooking, customerReceipt } from './email-templates.ts'
/** Booking enquiry endpoint. Requires Supabase, Cloudflare Turnstile and Resend configuration in production. */
type RequestLike = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type ResponseLike = { status: (code: number) => ResponseLike; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const required = ['name','email','phone','address','postcode','propertyType','size','purpose','date','time','package'] as const
const maxLength: Record<string, number> = { name: 120, email: 254, phone: 40, address: 300, postcode: 12, agency: 150, propertyType: 40, size: 120, purpose: 50, date: 10, time: 20, package: 120, instructions: 3000, website: 100, turnstileToken: 2048 }
const choices: Record<string, string[]> = {
  propertyType: ['Flat','House','Maisonette','Commercial / other'],
  purpose: ['New listing','Refresh existing listing','Rental or Airbnb'],
  time: ['Morning','Afternoon','Flexible'],
  package: ['All-Inclusive Property Marketing — £199 standard','Not sure — please advise'],
}
const safeText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c))
const header = (req: RequestLike, name: string) => { const value=req.headers[name] ?? req.headers[name.toLowerCase()]; return Array.isArray(value) ? value[0] : value }
const londontoday = () => new Intl.DateTimeFormat('en-CA',{ timeZone:'Europe/London', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())

/** Verify short-lived Turnstile token server-side before accepting a booking. */
async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) throw new Error('Turnstile is not configured')
  if (!token || token.length > 2048) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ip && ip !== 'unknown') body.set('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(), signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error('Turnstile verification unavailable')
  const result = await response.json() as { success?: boolean; hostname?: string }
  if (result.success !== true) return false
  const allowed = process.env.BOOKING_ALLOWED_ORIGIN ?? 'https://www.movein-media.co.uk'
  // Cloudflare test keys and localhost still need an explicit development environment.
  if (process.env.NODE_ENV === 'production') {
    const expectedHost = new URL(allowed).hostname
    if (result.hostname !== expectedHost) return false
  }
  return true
}

/** Supabase REST requests use a server-only key. Never bundle this module into the browser. */
async function db(table: string, method: 'POST'|'PATCH', data: Record<string,unknown>, filter = ''): Promise<Record<string,unknown> | null> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !/^https:\/\//.test(url)) throw new Error('Supabase backend not configured')
  const response = await fetch(`${url.replace(/\/$/,'')}/rest/v1/${table}${filter}`, {
    method, headers: {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type':'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Database ${table} operation failed (${response.status})`)
  if (method === 'PATCH') return null
  const result = await response.json() as Record<string,unknown>[]
  if (!Array.isArray(result) || typeof result[0]?.id !== 'string') throw new Error(`Database ${table} returned invalid record`)
  return result[0]
}

async function recordBooking(payload: Record<string,unknown>, email: string, date: string) {
  const customer = await db('customers','POST', {
    full_name: safeText(payload.name), email, phone: safeText(payload.phone),
    agency_name: safeText(payload.agency) || null,
  })
  const property = await db('properties','POST', {
    customer_id: customer!.id, address: safeText(payload.address),postcode: safeText(payload.postcode),
    property_type: safeText(payload.propertyType),property_size: safeText(payload.size),
  })
  const booking = await db('booking_requests','POST', {
    customer_id: customer!.id,property_id: property!.id,purpose: safeText(payload.purpose),
    preferred_date: date,preferred_time:safeText(payload.time),package_selection:safeText(payload.package),
    instructions:safeText(payload.instructions) || null,
  })
  await db('booking_events','POST',{booking_id:booking!.id,event_type:'created'})
  return String(booking!.id)
}

async function updateDelivery(bookingId: string, status:'sent'|'failed', recipient: string, providerId?: string) {
  try {
    await db('email_deliveries','POST', {
      booking_id:bookingId,recipient_email:recipient, delivery_status:status,
      attempts:1,last_attempt_at:new Date().toISOString(),provider_message_id:providerId || null,
      last_error:status === 'failed' ? 'Email provider rejected or unavailable' : null,
    })
    await db('booking_events','POST',{booking_id:bookingId,event_type:status === 'sent' ? 'email_sent' : 'email_failed'})
  } catch (err) { console.error('Unable to record email result',err instanceof Error ? err.message : 'unknown') }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control','no-store')
  res.setHeader('Allow','POST')
  res.setHeader('X-Content-Type-Options','nosniff')
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  if (!/^application\/json(?:\s*;|\s*$)/i.test(header(req,'content-type') ?? '')) return res.status(415).json({error:'JSON requests only'})
  const rawLength=Number(header(req,'content-length') || 0)
  if (rawLength > 12_000) return res.status(413).json({error:'Request too large'})
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({error:'Invalid request'})
  const payload=req.body as Record<string,unknown>
  if (JSON.stringify(payload).length > 12_000) return res.status(413).json({error:'Request too large'})
  if (safeText(payload.website)) return res.status(200).json({ok:true})
  if (Object.keys(payload).some(k => !(k in maxLength))) return res.status(400).json({error:'Invalid fields'})
  if (Object.entries(payload).some(([k,v]) => typeof v !== 'string' || v.length > maxLength[k] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v as string))) return res.status(400).json({error:'Invalid field value or length'})
  if (required.some(k => !safeText(payload[k]))) return res.status(400).json({error:'Please complete all required fields'})
  if (Object.entries(choices).some(([k,options]) => !options.includes(safeText(payload[k])))) return res.status(400).json({error:'Invalid selection'})
  const email=safeText(payload.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email)) return res.status(400).json({error:'Invalid email'})
  if (!/^[+()\d\s.-]{7,40}$/.test(safeText(payload.phone))) return res.status(400).json({error:'Invalid phone number'})
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(safeText(payload.postcode))) return res.status(400).json({error:'Invalid UK postcode'})
  const date=safeText(payload.date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date || date < londontoday()) return res.status(400).json({error:'Choose a valid future date'})
  const origin=header(req,'origin')
  const allowedOrigin=process.env.BOOKING_ALLOWED_ORIGIN ?? 'https://www.movein-media.co.uk'
  if (origin && origin !== allowedOrigin && !(process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))) return res.status(403).json({error:'Forbidden origin'})
  const ip=header(req,'x-vercel-forwarded-for')?.split(',')[0]?.trim() || header(req,'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try { if (!await verifyTurnstile(safeText(payload.turnstileToken),ip)) return res.status(403).json({error:'Security verification failed. Please try again.'}) }
  catch (err) { console.error('Turnstile unavailable',err instanceof Error ? err.message : 'unknown'); return res.status(503).json({error:'Security verification unavailable. Please try again.'}) }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({error:'Booking database not configured'})
  let bookingId: string
  try { bookingId = await recordBooking(payload,email,date) }
  catch (err) { console.error('Booking persistence failed',err instanceof Error ? err.message : 'unknown'); return res.status(503).json({error:'Unable to save enquiry. Please try again.'}) }
  // Once persisted, acknowledge receipt even if notifications are temporarily unavailable.
  if (!process.env.RESEND_API_KEY || !process.env.BOOKING_FROM_EMAIL || !process.env.BOOKING_TO_EMAIL) {
    await updateDelivery(bookingId,'failed',process.env.BOOKING_TO_EMAIL || 'not-configured@example.invalid')
    return res.status(202).json({ok:true,reference:bookingId,notification:'pending'})
  }
  const fields:[string,string][] = [
    ['Name',safeText(payload.name)],['Email',email],['Phone',safeText(payload.phone)],['Agency',safeText(payload.agency)||'—'],
    ['Address',safeText(payload.address)],['Postcode',safeText(payload.postcode)],['Property type',safeText(payload.propertyType)],
    ['Size',safeText(payload.size)],['Purpose',safeText(payload.purpose)],['Preferred date',date],['Preferred time',safeText(payload.time)],
    ['Package',safeText(payload.package)],['Instructions',safeText(payload.instructions)||'—']]
  // Save the booking first, then deliver independently to the office and customer.
  // A failed email never rolls back an accepted enquiry.
  const messages=[
    {recipient:process.env.BOOKING_TO_EMAIL!, content:adminBooking(bookingId,fields),replyTo:email,kind:'admin'},
    ...(process.env.BOOKING_TO_EMAIL?.trim().toLowerCase()==='rdpassiveincome@gmail.com'?[]:[{recipient:'rdpassiveincome@gmail.com',content:adminBooking(bookingId,fields),replyTo:email,kind:'additional-admin'}]),
    {recipient:email, content:customerReceipt(safeText(payload.name),bookingId,fields.filter(([k])=>['Address','Postcode','Preferred date','Preferred time','Package'].includes(k))),replyTo:process.env.BOOKING_FROM_EMAIL!,kind:'customer'},
  ]
  let failures=0
  for(const message of messages){
    try {
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`movein-${bookingId}-${message.kind}-v1`},
        signal:AbortSignal.timeout(8000),
        body:JSON.stringify({
          from:process.env.BOOKING_FROM_EMAIL,
          to:[message.recipient],
          reply_to:message.replyTo,
          subject:message.content.subject,
          html:message.content.html,
          text:message.content.text,
        }),
      })
      if(!response.ok)throw Error('Resend rejected email '+response.status)
      const receipt=await response.json() as {id?:string}
      await updateDelivery(bookingId,'sent',message.recipient,receipt.id)
    }catch(err){
      failures++
      console.error('Transactional email delivery failed',message.kind,err instanceof Error?err.name:'unknown')
      await updateDelivery(bookingId,'failed',message.recipient)
    }
  }
  return res.status(failures?202:200).json({ok:true,reference:bookingId,...(failures?{notification:'pending'}:{})})
}
