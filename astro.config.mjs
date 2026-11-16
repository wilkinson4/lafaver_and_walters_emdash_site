import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  integrations: [
    react(),
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({
        directory: "./uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
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
      // Runs registry and `sandboxed: []` plugins in an isolated workerd process.
      sandboxRunner: "@emdash-cms/sandbox-workerd/sandbox",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
