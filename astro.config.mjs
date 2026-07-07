import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://map.tavda.info",
  integrations: [react()],
  vite: {
    ssr: {
      noExternal: ["leaflet"],
    },
  },
});
