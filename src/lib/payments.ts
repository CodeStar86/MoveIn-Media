import { apiJson } from "./api"

export async function startCheckout(orderId: string) {
  const data = await apiJson<{ url?: string }>(`checkout/${encodeURIComponent(orderId)}`, { method: "POST" })
  const url = data?.url
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Checkout could not be started. Please try again.")
  }
  window.location.assign(url)
}
