import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://ragnaross.co.uk",
  trailingSlash: "ignore",
  vite: {
    plugins: [tailwindcss()],
  },
});
