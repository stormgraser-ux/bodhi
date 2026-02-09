import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const isPwa = process.env.VITE_BUILD_TARGET === "pwa";

/** Injects CSP meta tag into built HTML (production PWA only) */
function cspPlugin(): Plugin {
  return {
    name: "bodhi-csp",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'">`
      );
    },
    apply: "build",
  };
}

export default defineConfig(async () => {
  const plugins = [react()];

  if (isPwa) {
    const { VitePWA } = await import("vite-plugin-pwa");
    plugins.push(
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        },
        manifest: false,
      })
    );
    plugins.push(cspPlugin());
  }

  return {
    base: isPwa ? "/bodhi/" : undefined,
    plugins,
    clearScreen: false,
    server: isPwa
      ? {
          port: 5173,
          strictPort: true,
        }
      : {
          port: 1420,
          strictPort: true,
          host: host || false,
          hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
              }
            : undefined,
          watch: {
            ignored: ["**/src-tauri/**"],
          },
        },
  };
});
