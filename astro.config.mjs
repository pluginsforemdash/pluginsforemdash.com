// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import emdash from 'emdash/astro';
import node from '@astrojs/node';
import { commercePlugin } from 'emdash-plugin-commerce';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    emdash({
      plugins: [commercePlugin({ currency: 'usd' })],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['emdash'],
      },
    },
  }
});
