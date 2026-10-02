import { supabase } from "./supabase"

export async function startCheckout(orderId: string) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      orderId,
      // Stripe should return to the deployment the customer is actually using.
      // This avoids stale preview/production URLs stored in an Edge Function secret.
      returnOrigin: window.location.origin,
    },
  })
  if (error) throw error
  const url = data?.url
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Checkout could not be started. Please try again.")
  }
  window.location.assign(url)
}
