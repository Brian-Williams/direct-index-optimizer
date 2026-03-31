import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages the site lives at /direct-index-optimizer/
// Set base to "/" for local dev and the repo name for production.
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === "production" ? "/direct-index-optimizer/" : "/",
});
