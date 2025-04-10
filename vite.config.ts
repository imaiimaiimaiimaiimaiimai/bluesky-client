import { fileURLToPath, URL } from "node:url"
import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"

// Minify HTML
import { createHtmlPlugin } from "vite-plugin-html"

// Enable cross-origin isolation to make `measureUserAgentSpecificMemory` executable
// SEE: https://web.dev/articles/monitor-total-page-memory-usage?hl=ja
const env = loadEnv("development", process.cwd(), "")
const server = (
  env.NODE_ENV === "development" &&
  env.VITE_MEMORY_INFO === "1"
)
? {
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  },
}
: undefined

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),

    // Minify HTML
    createHtmlPlugin({
      minify: true,
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "/",

  build: {
    // for `TypeError: xx is not a constructor`
    // SEE: stackoverflow.com/a/73470097
    // commonjsOptions: { include: [] },

    chunkSizeWarningLimit: 600,

    outDir: "docs",

    rollupOptions: {
      output: {
        manualChunks (id: string) {
          if (id.includes("@atproto_api"))
            return "atproto-api"
          if (id.includes("node_modules"))
            return "vendor"
        },
      },
    },
  },

  // Drop development objects in build production
  esbuild: {
    drop: process.env.NODE_ENV === "production"
      ? ["console", "debugger"]
      : [],
  },

  css: {
    preprocessorOptions: {
      scss: {
        // NOTICE: Do not load CSS with actual content
        additionalData: "@use 'sass:map'; @use 'sass:math'; @import '@/scss/_variables.scss';",

        // Suppress the following warnings
        // * `Deprecation Warning [import]: Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.`
        // * `Deprecation Warning [legacy-js-api]: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.`
        // * `Deprecation Warning [mixed-decls]: Sass's behavior for declarations that appear after nested rules will be changing to match the behavior specified by CSS in an upcoming version. To keep the existing behavior, move the declaration above the nested rule. To opt into the new behavior, wrap the declaration in \`& {}\`.`
        // SEE: https://sass-lang.com/documentation/js-api/interfaces/deprecations/
        silenceDeprecations: ["import", "legacy-js-api", "mixed-decls"],
      },
    },
  },

  // for `TypeError: xx is not a constructor`
  // SEE: stackoverflow.com/a/73470097
  /*
  optimizeDeps: {
    disabled: false,
  },
  */

  server,
})
