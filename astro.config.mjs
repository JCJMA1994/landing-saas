import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  adapter: process.env.BUILD_TARGET === "node" ? node({ mode: "standalone" }) : vercel(),
  security: { checkOrigin: true },
});
