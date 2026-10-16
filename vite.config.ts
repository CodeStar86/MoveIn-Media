import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Only public Supabase credentials are embedded into the browser bundle.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY or a Supabase secret key here.
const publicSupabaseUrl = process.env.SUPABASE_URL || ""
const publicSupabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || ""
const safePublicKey = publicSupabaseKey.startsWith("sb_publishable_") ? publicSupabaseKey : ""

export default defineConfig({
  define: {
    __MOVEIN_PUBLIC_SUPABASE_URL__: JSON.stringify(publicSupabaseUrl),
    __MOVEIN_PUBLIC_SUPABASE_KEY__: JSON.stringify(safePublicKey),
  },
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { host: "0.0.0.0", port: Number(process.env.PORT || 8443) },
  preview: { host: "0.0.0.0", port: Number(process.env.PORT || 8443) },
});
