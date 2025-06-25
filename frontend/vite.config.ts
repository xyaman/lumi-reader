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
    test: {
        environment: "jsdom",
        setupFiles: "test/setupTests.ts",
        include: ["test/**/*.test.tsx"],
    },
})
