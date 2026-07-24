const siteUrl = 'https://simplefasting.app';

export function GET() {
  return new Response(
    `${[
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${new URL('/sitemap.xml', siteUrl)}`,
    ].join('\n')}\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
}
