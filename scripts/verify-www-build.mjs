import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const websiteRoot = path.join(root, 'www');
const distRoot = path.join(websiteRoot, 'dist');
const documents = JSON.parse(
  await readFile(path.join(websiteRoot, 'src/content/generated/shared-documents.json'), 'utf8'),
);

const routes = ['/', '/faq', '/privacy', '/terms', '/whats-new'];
const siteUrl = 'https://simplefasting.app';
const requiredRobots = 'index, follow, max-image-preview:large';
const documentRoutes = {
  '/faq': documents.faq,
  '/privacy': documents.privacy,
  '/terms': documents.terms,
  '/whats-new': documents.whatsNew,
};

const routeFile = (route) =>
  route === '/' ? path.join(distRoot, 'index.html') : path.join(distRoot, route.slice(1), 'index.html');

const decodeHtml = (value) =>
  value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const attributeValue = (tag, attribute) => {
  const match = tag.match(new RegExp(`\\b${attribute}="([^"]*)"`));
  return match ? decodeHtml(match[1]) : undefined;
};
const metaContent = (html, attribute, value) => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/g)]
    .map((match) => match[0])
    .find((candidate) => attributeValue(candidate, attribute) === value);
  return tag ? attributeValue(tag, 'content') : undefined;
};
const linkHref = (html, relation) => {
  const tag = [...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .find((candidate) => attributeValue(candidate, 'rel') === relation);
  return tag ? attributeValue(tag, 'href') : undefined;
};
const failures = [];
const htmlByRoute = new Map();

for (const route of routes) {
  const file = routeFile(route);
  try {
    await access(file);
    htmlByRoute.set(route, await readFile(file, 'utf8'));
  } catch {
    failures.push(`${route}: missing ${path.relative(root, file)}`);
  }
}

for (const [route, document] of Object.entries(documentRoutes)) {
  const html = htmlByRoute.get(route);
  if (!html) continue;
  const text = decodeHtml(html);
  const expected = [
    document.title,
    `Version ${document.version}`,
    document.intro,
    ...document.sections.flatMap((section) => [
      section.title,
      ...section.blocks.flatMap((block) =>
        block.type === 'paragraph' ? [block.text] : block.items,
      ),
    ]),
  ];

  for (const value of expected) {
    if (!text.includes(normalize(value))) {
      failures.push(`${route}: generated page is missing source content: ${value.slice(0, 80)}`);
    }
  }
}

for (const [route, html] of htmlByRoute) {
  const canonicalPath = route === '/' ? route : `${route}/`;
  const expectedUrl = new URL(canonicalPath, siteUrl).toString();
  const titleMarkup = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const title = titleMarkup ? decodeHtml(titleMarkup) : undefined;
  const description = metaContent(html, 'name', 'description');
  const canonical = linkHref(html, 'canonical');
  const socialImage = metaContent(html, 'property', 'og:image');

  if (!title) failures.push(`${route}: missing a non-empty title`);
  if (!description) failures.push(`${route}: missing a meta description`);
  if (canonical !== expectedUrl) {
    failures.push(`${route}: canonical URL is ${canonical ?? 'missing'}, expected ${expectedUrl}`);
  }
  if (metaContent(html, 'name', 'robots') !== requiredRobots) {
    failures.push(`${route}: missing expected index/follow crawler directives`);
  }
  if (metaContent(html, 'property', 'og:type') !== 'website') {
    failures.push(`${route}: missing Open Graph page type`);
  }
  if (metaContent(html, 'property', 'og:title') !== title) {
    failures.push(`${route}: Open Graph title does not match the page title`);
  }
  if (metaContent(html, 'property', 'og:description') !== description) {
    failures.push(`${route}: Open Graph description does not match the meta description`);
  }
  if (metaContent(html, 'property', 'og:url') !== canonical) {
    failures.push(`${route}: Open Graph URL does not match the canonical URL`);
  }
  if (!socialImage?.startsWith(`${siteUrl}/`)) {
    failures.push(`${route}: Open Graph image is missing or not an absolute site URL`);
  }
  if (
    metaContent(html, 'property', 'og:image:type') !== 'image/png' ||
    metaContent(html, 'property', 'og:image:width') !== '1200' ||
    metaContent(html, 'property', 'og:image:height') !== '630'
  ) {
    failures.push(`${route}: Open Graph image type or dimensions are missing or incorrect`);
  }
  if (!metaContent(html, 'property', 'og:image:alt')) {
    failures.push(`${route}: Open Graph image alt text is missing`);
  }
  if (metaContent(html, 'name', 'twitter:card') !== 'summary_large_image') {
    failures.push(`${route}: missing large Twitter card metadata`);
  }
  if (metaContent(html, 'name', 'twitter:title') !== title) {
    failures.push(`${route}: Twitter title does not match the page title`);
  }
  if (metaContent(html, 'name', 'twitter:description') !== description) {
    failures.push(`${route}: Twitter description does not match the meta description`);
  }
  if (metaContent(html, 'name', 'twitter:image') !== socialImage) {
    failures.push(`${route}: Twitter image does not match the Open Graph image`);
  }
  if (!metaContent(html, 'name', 'twitter:image:alt')) {
    failures.push(`${route}: Twitter image alt text is missing`);
  }

  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of links) {
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/_astro/')) continue;
    const target = href.split('#')[0].replace(/\/$/, '') || '/';
    if (!routes.includes(target)) {
      failures.push(`${route}: internal link does not map to a built route: ${href}`);
    }
  }
}

const readBuiltFile = async (relativePath) => {
  const file = path.join(distRoot, relativePath);
  try {
    return await readFile(file, 'utf8');
  } catch {
    failures.push(`missing ${path.relative(root, file)}`);
    return '';
  }
};

const robots = await readBuiltFile('robots.txt');
if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) {
  failures.push('robots.txt: missing permissive crawler rules');
}
if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
  failures.push('robots.txt: missing the absolute sitemap URL');
}

const sitemap = await readBuiltFile('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedSitemapUrls = routes.map((route) =>
  new URL(route === '/' ? route : `${route}/`, siteUrl).toString(),
);
if (
  sitemapUrls.length !== expectedSitemapUrls.length ||
  expectedSitemapUrls.some((url) => !sitemapUrls.includes(url))
) {
  failures.push('sitemap.xml: URLs do not exactly match the canonical public HTML routes');
}
if (new Set(sitemapUrls).size !== sitemapUrls.length) {
  failures.push('sitemap.xml: contains duplicate URLs');
}

const llms = await readBuiltFile('llms.txt');
if (!llms.startsWith('# Simple Fasting')) {
  failures.push('llms.txt: missing the product heading');
}
for (const url of expectedSitemapUrls) {
  if (!llms.includes(`](${url})`)) {
    failures.push(`llms.txt: missing public page link ${url}`);
  }
}
for (const statement of ['no account', 'no account, backend, cloud sync', 'does not provide medical advice']) {
  if (!llms.includes(statement)) {
    failures.push(`llms.txt: missing important product boundary: ${statement}`);
  }
}

const notFound = await readBuiltFile('404.html');
if (!notFound.includes('Oops, something went wrong.')) {
  failures.push('404.html: missing the not-found message');
}
if (metaContent(notFound, 'name', 'robots') !== 'noindex, nofollow') {
  failures.push('404.html: missing noindex/nofollow crawler directives');
}
if (!notFound.includes('class="site-header"') || !notFound.includes('class="site-footer"')) {
  failures.push('404.html: missing the shared site header or footer');
}

await readBuiltFile('favicon.svg');
await readBuiltFile('images/og-image.png');

const homeStructuredData = [...(htmlByRoute.get('/') ?? '').matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => match[1]);
if (
  !homeStructuredData.some(
    (value) => value.includes('"@type":"WebSite"') && value.includes('"@type":"MobileApplication"'),
  )
) {
  failures.push('/: missing WebSite and MobileApplication structured data');
}

const faqStructuredData = [...(htmlByRoute.get('/faq') ?? '').matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => match[1]);
if (!faqStructuredData.some((value) => value.includes('"@type":"FAQPage"'))) {
  failures.push('/faq: missing FAQPage structured data');
}

const homeText = decodeHtml(htmlByRoute.get('/') ?? '');
for (const section of documents.faq.sections) {
  if (!homeText.includes(normalize(section.title))) {
    failures.push(`/: homepage FAQ is missing: ${section.title}`);
  }
}

if (failures.length) {
  console.error(`Website verification failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Website verification passed: ${routes.length} routes, discovery files, metadata, and shared documents match.`,
);
