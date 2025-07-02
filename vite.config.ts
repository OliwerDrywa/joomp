import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        settings: resolve(__dirname, "settings.html"),
      },
    },
  },
});
