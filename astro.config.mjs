// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import node from '@astrojs/node';
import { commercePlugin } from 'emdash-plugin-commerce';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    emdash({
      database: sqlite({ url: 'file:./data.db' }),
      storage: local({
        directory: './uploads',
        baseUrl: '/_emdash/api/media/file',
      }),
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
  },
  devToolbar: { enabled: false },
});
