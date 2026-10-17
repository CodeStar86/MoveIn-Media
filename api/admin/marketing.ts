type Req={method?:string;headers:Record<string,string|string[]|undefined>}
type Res={status:(n:number)=>Res;json:(b:unknown)=>void;setHeader:(k:string,v:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store")
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"})
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:"Database unavailable"})
 const bearer=req.headers.authorization;const token=(Array.isArray(bearer)?bearer[0]:bearer||"").replace(/^Bearer /,"")
 if(!token)return res.status(401).json({error:"Sign in required"})
 const userResp=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}})
 if(!userResp.ok)return res.status(401).json({error:"Session expired"})
 const user=await userResp.json() as {id?:string}
 if(!user.id)return res.status(401).json({error:"Sign in required"})
 const headers={apikey:key,Authorization:"Bearer "+key}
 const profile=await fetch(url+"/rest/v1/staff_profiles?user_id=eq."+encodeURIComponent(user.id)+"&active=eq.true&role=eq.admin&select=user_id&limit=1",{headers})
 if(!profile.ok||(await profile.json() as unknown[]).length===0)return res.status(403).json({error:"Admins only"})
 const since=new Date(Date.now()-30*86400000).toISOString()
 const [events,bookings]=await Promise.all([
 fetch(url+"/rest/v1/marketing_events?select=event_type,source,created_at&created_at=gte."+encodeURIComponent(since)+"&limit=10000",{headers}),
 fetch(url+"/rest/v1/booking_requests?select=source,submitted_at&submitted_at=gte."+encodeURIComponent(since)+"&limit=10000",{headers})
 ])
 if(!events.ok||!bookings.ok)return res.status(503).json({error:"Analytics query failed"})
 const ev=await events.json() as {event_type:string;source:string}[]
 const bk=await bookings.json() as {source:string}[]
 const totals:Record<string,{source:string;landings:number;shares:number;bookings:number}>={}
 const get=(source:string)=>totals[source]??={source,landings:0,shares:0,bookings:0}
 for(const e of ev){const row=get(e.source);if(e.event_type==="landing")row.landings++;else if(e.event_type==="share_click")row.shares++}
 for(const b of bk)get(b.source||"website").bookings++
 return res.status(200).json({periodDays:30,sources:Object.values(totals).sort((a,b)=>b.landings-a.landings),limits:"Campaign-tagged landings only; untagged visitors not counted. Events capped at 10,000 per request."})
}