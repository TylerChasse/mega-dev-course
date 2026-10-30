import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const layout = fileURLToPath(new URL('./src/lib/layouts/runbook.svelte', import.meta.url));

export default defineConfig({
  plugins: [
    sveltekit({
      extensions: ['.svelte', '.svx'],
      preprocess: [mdsvex({ extensions: ['.svx'], layout: { runbook: layout } })],
      adapter: adapter({ pages: 'build', assets: 'build', strict: false }),
      prerender: { entries: ['*'], handleHttpError: 'warn' },
      inlineStyleThreshold: Infinity,
    }),
  ],
});
