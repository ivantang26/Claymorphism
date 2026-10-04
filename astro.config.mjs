// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

const adapter = process.env.VERCEL === "1" ? vercel() : node({ mode: "standalone" });

// Marketing pages are prerendered; only /api/* runs on the server.
// CSP: everything loads from our own origin. No third-party scripts, frames,
// fonts or beacons can run even if someone adds one by mistake (FR-8).
export default defineConfig({
  site: "https://doodlemath.example",
  output: "static",
  adapter,
  integrations: [svelte()],
  trailingSlash: "never",
  build: { format: "file" },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "media-src 'self' blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Inline style *attributes* carry CSS custom properties (progress values,
      // stagger delays). Scripts stay locked to hashed, same-origin code.
      styleDirective: {
        resources: ["'self'", { resource: "'unsafe-inline'", kind: "attribute" }],
      },
    },
  },
});
