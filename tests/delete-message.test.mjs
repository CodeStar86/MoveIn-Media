import {test} from "node:test"
import assert from "node:assert/strict"
import handler from "../api/admin/delete-message.ts"
const env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY}
function response(){return {code:0,body:null,setHeader(){},status(code){this.code=code;return this},json(body){this.body=body}}}
test("delete requires authenticated admin and valid UUID",async()=>{
 process.env.SUPABASE_URL="https://example.supabase.co";process.env.SUPABASE_SERVICE_ROLE_KEY="test-secret"
 try {
  for(const [req,status] of [[{method:"GET",headers:{}},405],[{method:"POST",headers:{},body:{}},401],[{method:"POST",headers:{authorization:"Bearer example"},body:{id:"invalid"}},400]]){
   const res=response();await handler(req,res);assert.equal(res.code,status)
  }
 }finally{
  for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value}
 }
})
