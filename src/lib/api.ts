export type AppUser = {
  id: string
  email: string | null
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

async function parseError(response: Response) {
  const data = await response.clone().json().catch(() => null)
  return typeof data?.error === "string" ? data.error : `Request failed (${response.status})`
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.method && !["GET", "HEAD"].includes(init.method.toUpperCase())) headers.set("x-movein-request", "1")
  if (init.body && typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json")
  const response = await fetch(`/api/${path.replace(/^\//, "")}`, { ...init, headers, credentials: "same-origin" })
  if (!response.ok) throw new Error(await parseError(response))
  return response.json() as Promise<T>
}

export async function apiUpload(path: string, file: File, index: number) {
  const response = await fetch(`/api/${path.replace(/^\//, "")}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "x-movein-request": "1",
      "x-file-index": String(index),
      "x-file-name": file.name,
      "content-type": file.type,
    },
    body: file,
  })
  if (!response.ok) throw new Error(await parseError(response))
}

export function apiDownloadUrl(path: string) {
  return `/api/${path.replace(/^\//, "")}`
}
