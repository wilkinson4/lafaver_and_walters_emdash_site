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
