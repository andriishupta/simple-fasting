import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = {
  privacy: 'docs/legal/privacy-policy.md',
  terms: 'docs/legal/terms-of-use.md',
  faq: 'docs/faq.md',
};
const targets = [
  'app/src/content/generated/shared-documents.json',
  'www/src/content/generated/shared-documents.json',
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function parseFrontmatter(source, sourcePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${sourcePath}: expected YAML frontmatter`);

  const metadata = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        if (separator < 1) throw new Error(`${sourcePath}: invalid frontmatter line: ${line}`);
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );

  for (const field of ['id', 'title', 'version', 'description', 'intro']) {
    if (!metadata[field]) throw new Error(`${sourcePath}: missing ${field}`);
  }

  return { metadata, body: match[2].trim() };
}

function parseBlocks(lines) {
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list });
    list = [];
  };

  for (const rawLine of [...lines, '']) {
    const line = rawLine.trim();
    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2).trim());
    } else if (line === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  return blocks;
}

function parseDocument(source, sourcePath) {
  const { metadata, body } = parseFrontmatter(source, sourcePath);
  const sections = [];
  let current;

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      if (current) sections.push({ ...current, blocks: parseBlocks(current.lines) });
      const title = line.slice(3).trim();
      current = { id: slugify(title), title, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      throw new Error(`${sourcePath}: content must be inside level-two sections`);
    }
  }
  if (current) sections.push({ ...current, blocks: parseBlocks(current.lines) });
  if (!sections.length) throw new Error(`${sourcePath}: expected at least one section`);

  const ids = sections.map(({ id }) => id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error(`${sourcePath}: section headings must produce unique IDs`);
  }

  return {
    ...metadata,
    sections: sections.map(({ lines: _lines, ...section }) => section),
  };
}

const documents = {};
for (const [key, sourcePath] of Object.entries(sources)) {
  documents[key] = parseDocument(await readFile(path.join(root, sourcePath), 'utf8'), sourcePath);
}
const output = `${JSON.stringify(documents, null, 2)}\n`;
const checkOnly = process.argv.includes('--check');

for (const target of targets) {
  const absoluteTarget = path.join(root, target);
  if (checkOnly) {
    const current = await readFile(absoluteTarget, 'utf8').catch(() => '');
    if (current !== output) {
      console.error(`${target} is stale. Run: node scripts/sync-shared-content.mjs`);
      process.exitCode = 1;
    }
  } else {
    await mkdir(path.dirname(absoluteTarget), { recursive: true });
    await writeFile(absoluteTarget, output);
  }
}

if (!process.exitCode) {
  console.log(checkOnly ? 'Shared content is current.' : 'Shared content synchronized.');
}
