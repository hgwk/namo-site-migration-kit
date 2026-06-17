import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const siteSlug = process.env.SITE || valueArg('--site');
const siteConfig = siteSlug ? await maybeReadJson(path.join(root, 'sites', siteSlug, 'site.config.json')) : null;
const migration = siteConfig?.migration || {};
const xmlPath = resolvePath(
  valueArg('--input')
    || process.env.WORDPRESS_EXPORT_PATH
    || migration.wordpressExportPath
    || siteConfig?.wordpressExportPath,
);
const outPath = resolvePath(
  valueArg('--out')
    || migration.documentsOutPath
    || (siteSlug ? path.join('sites', siteSlug, 'documents.extra.json') : ''),
);

if (!xmlPath || !outPath) {
  throw new Error('Usage: SITE=<site> npm run extract:wordpress -- --input <export.xml> [--out sites/<site>/documents.extra.json]');
}

const documentType = valueArg('--document-type') || migration.wordpressDocumentType || 'ARTICLE';
const postTypes = csv(valueArg('--post-types') || migration.wordpressPostTypes || 'post');
const categoryPrefix = valueArg('--category-prefix') || migration.categoryPrefix || (siteSlug ? siteSlug.slice(0, 8) : 'wp');
const skipCategorySlugs = new Set(csv(valueArg('--skip-category-slugs') || migration.skipCategorySlugs || [
  'uncategorized',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
  '2026',
  '2027',
]));
const preserveTypes = new Set(csv(valueArg('--preserve-types') || migration.preserveDocumentTypes || 'LEGAL,JSON,PLAN,CUSTOMER,TESTIMONIAL,FOUNDER'));

function valueArg(name) {
  const item = args.find((arg) => arg === name || arg.startsWith(`${name}=`));
  if (!item) return '';
  if (item === name) return args[args.indexOf(item) + 1] || '';
  return item.slice(name.length + 1);
}

function csv(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function resolvePath(value) {
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.join(root, value);
}

async function maybeReadJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function unwrap(value) {
  const text = String(value || '').trim();
  const cdata = text.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return decodeEntities(cdata ? cdata[1] : text).trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`);
  return unwrap(block.match(re)?.[1] || '');
}

function attrsToObject(attrs) {
  const out = {};
  for (const match of String(attrs || '').matchAll(/([a-zA-Z_:.-]+)="([^"]*)"/g)) {
    out[match[1]] = decodeEntities(match[2]);
  }
  return out;
}

function categories(item) {
  return [...item.matchAll(/<category\s+([^>]*)>([\s\S]*?)<\/category>/g)].map((match) => ({
    ...attrsToObject(match[1]),
    name: unwrap(match[2]),
  }));
}

function postmeta(item) {
  const out = new Map();
  for (const match of item.matchAll(/<wp:postmeta>[\s\S]*?<\/wp:postmeta>/g)) {
    out.set(tag(match[0], 'wp:meta_key'), tag(match[0], 'wp:meta_value'));
  }
  return out;
}

function isoDate(value) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('0000-00-00')) return new Date(0).toISOString();
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstImage(content) {
  const match = String(content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]) : null;
}

function decodeSlug(name) {
  try {
    return decodeURIComponent(String(name || ''));
  } catch {
    return String(name || '');
  }
}

function stableCategoryId(slug) {
  return `${categoryPrefix}-${String(slug || 'uncategorized').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function stableDocumentId(value) {
  return createHash('sha1').update(String(value || '')).digest('hex').slice(0, 20);
}

const xml = await readFile(xmlPath, 'utf8');
const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
const attachmentUrlById = new Map();

for (const item of items) {
  if (tag(item, 'wp:post_type') !== 'attachment') continue;
  const id = tag(item, 'wp:post_id');
  const url = tag(item, 'wp:attachment_url');
  if (id && url) attachmentUrlById.set(id, url);
}

const categoryMap = new Map();
const documents = [];
const typeCounts = new Map();

for (const item of items) {
  const postType = tag(item, 'wp:post_type');
  if (!postTypes.includes(postType)) continue;
  if (tag(item, 'wp:status') !== 'publish') continue;

  const cats = categories(item)
    .filter((cat) => cat.domain === 'category')
    .map((cat) => {
      const slug = (cat.nicename || cat.name || '').toLowerCase();
      return { slug, name: cat.name || cat.nicename, id: stableCategoryId(cat.nicename || cat.name) };
    })
    .filter((cat) => !skipCategorySlugs.has(cat.slug));

  for (const category of cats) {
    if (!categoryMap.has(category.id)) {
      categoryMap.set(category.id, { id: category.id, name: category.name, slug: category.slug });
    }
  }

  const meta = postmeta(item);
  const content = tag(item, 'content:encoded');
  const excerpt = tag(item, 'excerpt:encoded') || stripHtml(content).slice(0, 240);
  const thumbnailId = meta.get('_thumbnail_id');
  const thumbUrl = (thumbnailId && attachmentUrlById.get(thumbnailId)) || firstImage(content) || null;
  const categoryIds = cats.map((category) => category.id);
  const created = isoDate(tag(item, 'wp:post_date_gmt') || tag(item, 'wp:post_date'));
  const updated = isoDate(tag(item, 'wp:post_modified_gmt') || tag(item, 'wp:post_modified') || created);
  const sourceUrl = tag(item, 'link');

  typeCounts.set(postType, (typeCounts.get(postType) || 0) + 1);
  documents.push({
    id: stableDocumentId(sourceUrl || `${created}:${tag(item, 'wp:post_name')}:${tag(item, 'title')}`),
    type: documentType,
    title: tag(item, 'title'),
    slug: decodeSlug(tag(item, 'wp:post_name')),
    excerpt,
    content,
    thumbUrl,
    categoryId: categoryIds[0] || null,
    categoryIds,
    state: 'PUBLISHED',
    created,
    updated,
  });
}

documents.sort((a, b) => new Date(b.created) - new Date(a.created));
const categoriesOut = [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name));
const existing = await maybeReadJson(outPath);
const preserved = (existing?.documents || []).filter((doc) => doc.type && preserveTypes.has(doc.type));
const mergedCategories = mergeCategories(existing?.categories || [], categoriesOut);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify({
  _note: `WordPress documents extracted from ${path.relative(root, xmlPath)}. Re-run safe: preserveTypes=${[...preserveTypes].join(',')}.`,
  categories: mergedCategories,
  documents: [...preserved, ...documents],
}, null, 2)}\n`);

console.log(`Extracted ${documents.length} ${documentType} documents and ${categoriesOut.length} categories to ${path.relative(root, outPath)}`);
console.log('By post_type:', Object.fromEntries(typeCounts));
console.log(`Preserved existing non-target documents: ${preserved.length}; categories total after merge: ${mergedCategories.length}`);

function mergeCategories(existingCategories, extractedCategories) {
  const byId = new Map();
  for (const category of existingCategories) {
    if (!category?.id) continue;
    byId.set(String(category.id), category);
  }
  for (const category of extractedCategories) {
    if (!category?.id) continue;
    byId.set(String(category.id), category);
  }
  return [...byId.values()].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
}
