import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/book.ts'

const oldFetch = globalThis.fetch
const env = { ...process.env }
after(() => { globalThis.fetch = oldFetch; process.env = env })
const payload = {name:'Alex Example',email:'alex@example.com',phone:'07123456789',address:'1 High Street',postcode:'SW1A 1AA',propertyType:'Flat',size:'2 bedroom',purpose:'New listing',date:'2099-01-20',time:'Morning',package:'Not sure — please advise',website:'',turnstileToken:'test-turnstile-token'}
function call(body, method = 'POST') {
  let statusCode = 200; let result
  const res = {status(code){statusCode=code;return this},json(value){result=value},setHeader(){}}
  return handler({method,headers:{'content-type':'application/json',origin:'https://www.movein-media.co.uk','x-forwarded-for':'127.0.0.1'},body},res).then(()=>({code:statusCode,body:result}))
}
test('rejects invalid booking without calling external services',async()=>{
  globalThis.fetch = async()=>{throw Error('Unexpected fetch')}
  assert.equal((await call({...payload,email:'invalid'})).code,400)
  assert.equal((await call({...payload,date:'2001-01-01'})).code,400)
  assert.equal((await call({...payload,package:'free'})).code,400)
  assert.equal((await call({...payload,extra:'x'})).code,400)
  assert.equal((await call(payload,'GET')).code,405)
})
test('stores booking before sending email and records success',async()=>{
  Object.assign(process.env,{TURNSTILE_SECRET_KEY:'test',SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'server-only',RESEND_API_KEY:'test',BOOKING_FROM_EMAIL:'from@example.com',BOOKING_TO_EMAIL:'to@example.com'})
  const calls=[]; let idx=0
  globalThis.fetch = async (url,opts)=>{
    calls.push(url)
    if (url.includes('siteverify')) return new Response(JSON.stringify({success:true,hostname:'www.movein-media.co.uk'}),{status:200})
    if (url.includes('/rest/v1/rpc/movein_allow_request')) return new Response('true',{status:200})
    if (url.includes('/rest/v1/')) return new Response(JSON.stringify([{id:`mock-${++idx}`}]),{status:201})
    if (url.includes('api.resend.com')) return new Response(JSON.stringify({id:'email-123'}),{status:200})
    throw Error('Unrecognized URL')
  }
  const r=await call(payload)
  assert.equal(r.code,200);assert.equal(r.body.ok,true)
  assert.ok(calls.indexOf('https://db.example/rest/v1/booking_requests') < calls.indexOf('https://api.resend.com/emails'))
  assert.ok(calls.some(x=>x.includes('email_deliveries')))
})
test('a failed email never loses an already-saved booking',async()=>{
  let idx=0
  globalThis.fetch = async(url)=>{
    if (url.includes('siteverify')) return new Response(JSON.stringify({success:true,hostname:'www.movein-media.co.uk'}),{status:200})
    if (url.includes('/rest/v1/rpc/movein_allow_request')) return new Response('true',{status:200})
    if (url.includes('/rest/v1/')) return new Response(JSON.stringify([{id:`mock-${++idx}`}]),{status:201})
    if (url.includes('api.resend.com')) return new Response('',{status:500})
    throw Error('Unrecognized URL')
  }
  const r=await call(payload)
  assert.equal(r.code,202);assert.equal(r.body.notification,'pending'); assert.ok(r.body.reference)
})

test('rejects missing and rejected Turnstile tokens before persistence',async()=>{
  let dbCalls=0
  globalThis.fetch=async(url)=>{if(url.includes('/rest/v1/rpc/movein_allow_request'))return new Response('true',{status:200});if(url.includes('/rest/v1/')) dbCalls++;return new Response(JSON.stringify({success:false}),{status:200})}
  assert.equal((await call({...payload,turnstileToken:''})).code,403)
  assert.equal((await call(payload)).code,403)
  assert.equal(dbCalls,0)
})
