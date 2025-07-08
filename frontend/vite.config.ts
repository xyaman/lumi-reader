import { defineConfig } from "vitest/config"
import tailwindcss from "@tailwindcss/vite"
import solid from "vite-plugin-solid"

export default defineConfig({
    plugins: [solid(), tailwindcss()],
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
