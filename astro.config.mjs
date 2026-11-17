import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import emdash from "emdash/astro";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  image: {
    layout: "constrained",
    responsiveStyles: true,
    // Lets the Cloudflare Images binding resize EmDash media served from these
    // hosts. EmDash only adds this automatically when `siteUrl` is set, which
    // would also pin passkeys/CSRF to one host. Bytes are read from R2, never
    // fetched from the host.
    remotePatterns: [
      "comehometopa.lafaverandwaltersrealty.workers.dev",
      "comehometopa.com",
      "www.comehometopa.com",
    ].map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/_emdash/api/media/file/**",
    })),
  },
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB", session: "auto", coalesce: true }),
      storage: r2({ binding: "MEDIA" }),
      plugins: [
        {
          id: "lead-forms",
          version: "1.0.0",
          format: "native",
          entrypoint: fileURLToPath(
            new URL("./plugins/lead-forms/index.ts", import.meta.url),
          ),
          options: {
            to: process.env.LEAD_FORMS_TO || "lafaverandwalters@gmail.com",
          },
          capabilities: ["email:send"],
        },
      ],
      // Runs registry and `sandboxed: []` plugins as Dynamic Workers (needs
      // the Workers Paid plan and the LOADER binding in wrangler.jsonc).
      sandboxRunner: sandbox(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
