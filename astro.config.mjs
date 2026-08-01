import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { execSync } from "child_process";

const gitHash = execSync("git rev-parse --short HEAD").toString().trim();
const buildTime = new Date().toISOString();

export default defineConfig({
  site: "https://map.tavda.info",
  integrations: [react()],
  vite: {
    ssr: {
      noExternal: ["leaflet"],
    },
    define: {
      __GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
  },
});
