import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const origin = site?.href.replace(/\/$/, '')
  const sitemap = origin ? `Sitemap: ${origin}/sitemap-index.xml\n` : ''

  return new Response(`User-agent: *\nAllow: /\n${sitemap}`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
