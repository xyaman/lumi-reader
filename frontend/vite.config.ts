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
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
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
    test: {
        environment: "jsdom",
        setupFiles: "test/setupTests.ts",
        include: ["test/**/*.test.tsx"],
    },
})
