const siteUrl = 'https://simplefasting.app';
const routes = ['/', '/faq/', '/legal/', '/privacy/', '/terms/', '/whats-new/'];

export function GET() {
  const urls = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${new URL(route, siteUrl)}</loc>\n  </url>`,
    )
    .join('\n');

  return new Response(
    `${[
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>',
    ].join('\n')}\n`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
}
