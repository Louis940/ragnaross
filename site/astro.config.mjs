import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://ragnaross.co.uk",
  trailingSlash: "ignore",
  integrations: [tailwind()],
});
