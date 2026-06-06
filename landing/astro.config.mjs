// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// Custom-domain deploys are served from the domain root, so keep Astro's base
// path at "/" and let absolute SEO URLs be configured by the deploy env.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://tokenbar.nyanako.com',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
})
