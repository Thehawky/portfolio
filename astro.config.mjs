// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    preview: {
      allowedHosts: ['portfolio.lucamedia.ch'],
    },
  },
});
