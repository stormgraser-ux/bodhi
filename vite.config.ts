import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const host = process.env.TAURI_DEV_HOST;
const buildTarget = process.env.VITE_BUILD_TARGET;
const isPwa = buildTarget === "pwa";
const isSync = buildTarget === "sync";

/** Injects CSP meta tag into built HTML (production PWA and sync builds) */
function cspPlugin(target: "pwa" | "sync"): Plugin {
  // PWA (GitHub Pages) needs to reach desktop sync server on port 8108
  const connectSrc = target === "pwa"
    ? "connect-src 'self' http://*:8108"
    : "connect-src 'self'";
  return {
    name: "bodhi-csp",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; ${connectSrc}">`
      );
    },
    apply: "build",
  };
}

export default defineConfig(async () => {
  const plugins = [wasm(), topLevelAwait(), react()];

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
    plugins.push(cspPlugin("pwa"));
  }

  if (isSync) {
    // Sync build: CSP but no service worker (served from desktop)
    plugins.push(cspPlugin("sync"));
  }

  return {
    base: isPwa ? "/bodhi/" : "/",
    build: isSync ? { outDir: "dist-sync" } : undefined,
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
