/** Supabase Storage TUS upload in fixed 6 MiB chunks for large ZIP handovers. */
export async function uploadPropertyZip(args:{baseUrl:string;apiKey:string;accessToken:string;path:string;file:File;onProgress?:(percent:number)=>void}){
 const {baseUrl,apiKey,accessToken,path,file,onProgress}=args
 const base=baseUrl.replace(/\/$/,"")
 const endpoint=base.replace(".supabase.co",".storage.supabase.co")+"/storage/v1/upload/resumable"
 const encode=(value:string)=>btoa(value)
 const metadata=["bucketName property-deliverables","objectName "+encode(path),"contentType "+encode("application/zip")].map((x,i)=>i===0?"bucketName "+encode("property-deliverables"):x).join(",")
 const headers={"Authorization":"Bearer "+accessToken,"apikey":apiKey,"Tus-Resumable":"1.0.0","x-upsert":"true"}
 const creation=await fetch(endpoint,{method:"POST",headers:{...headers,"Upload-Length":String(file.size),"Upload-Metadata":metadata}})
 if(creation.status!==201)throw Error("Could not start photo upload ("+creation.status+")")
 const locationHeader=creation.headers.get("Location")
 if(!locationHeader)throw Error("Photo upload session unavailable")
 const location=new URL(locationHeader,endpoint).toString()
 const chunk=6*1024*1024
 for(let offset=0;offset<file.size;){
  const end=Math.min(file.size,offset+chunk)
  const result=await fetch(location,{method:"PATCH",headers:{...headers,"Content-Type":"application/offset+octet-stream","Upload-Offset":String(offset)},body:file.slice(offset,end)})
  if(result.status!==204)throw Error("Photo upload interrupted ("+result.status+"). Please try again.")
  const newOffset=Number(result.headers.get("Upload-Offset"))
  offset=Number.isFinite(newOffset)&&newOffset>offset?newOffset:end
  onProgress?.(Math.round(offset/file.size*100))
 }
}
