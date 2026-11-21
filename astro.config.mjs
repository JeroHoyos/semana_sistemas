// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://semanasistemas.vercel.app',
	// Keeps the old addresses: /sustometro.html, /evento.html?id=maraton
	build: { format: 'file' },
	vite: {
		plugins: [tailwindcss()],
	},
});
