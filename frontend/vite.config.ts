import { defineConfig } from "vitest/config"
import { VitePWA } from "vite-plugin-pwa"
import tailwindcss from "@tailwindcss/vite"
import solid from "vite-plugin-solid"

export default defineConfig({
    plugins: [
        solid(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Lumi Reader",
                short_name: "Lumi Reader",
                description: "Book reader",
                start_url: "/",
                display: "standalone",
                background_color: "#1b1f23",
                theme_color: "#1b1f23",
                icons: [
                    {
                        src: "/android-chrome-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/android-chrome-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB
            },
        }),
    ],
    resolve: {
        alias: {
            "@": "/src",
        },
    },
    worker: {
        format: "es",
    },
    build: {
        assetsInlineLimit: 0,
    },
    test: {
        environment: "jsdom",
        setupFiles: "test/setupTests.ts",
        include: ["test/**/*.test.tsx"],
    },
})
