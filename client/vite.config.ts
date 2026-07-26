import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Q102: was `vite.config.js`, excluded from `tsc` and so never type-checked. */
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Bind on all interfaces so the app is reachable from a phone on the same
        // network, which is how it is actually used at the table.
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
    build: {
        sourcemap: true,
    },
});
