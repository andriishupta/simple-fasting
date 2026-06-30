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

const routes = ['/', '/faq', '/legal', '/privacy', '/terms', '/whats-new'];
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
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of links) {
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/_astro/')) continue;
    const target = href.split('#')[0].replace(/\/$/, '') || '/';
    if (!routes.includes(target)) {
      failures.push(`${route}: internal link does not map to a built route: ${href}`);
    }
  }
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

console.log(`Website verification passed: ${routes.length} routes and shared documents match.`);
