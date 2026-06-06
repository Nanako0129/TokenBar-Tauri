// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// TokenBar is a GitHub *project* page (nanako0129.github.io/TokenBar/), so the
// whole site is served under a base path. Every asset/link is base-aware via
// import.meta.env.BASE_URL.
export default defineConfig({
  site: 'https://nanako0129.github.io',
  base: '/TokenBar/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
})
