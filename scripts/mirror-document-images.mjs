import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const siteSlug = process.env.SITE || valueArg('--site');
const siteConfig = siteSlug ? await maybeReadJson(path.join(root, 'sites', siteSlug, 'site.config.json')) : null;
const migration = siteConfig?.migration || {};
const docsPath = resolvePath(valueArg('--documents') || valueArg('--input') || migration.documentsOutPath || (siteSlug ? path.join('sites', siteSlug, 'documents.extra.json') : ''));
const assetsDir = resolvePath(valueArg('--assets-dir') || siteConfig?.assetsDir || (siteSlug ? path.join('sites', siteSlug, 'assets') : ''));
const reportPath = resolvePath(valueArg('--out') || migration.assetMirrorReport || (siteSlug ? path.join('sites', siteSlug, '_reports/document-image-mirror.json') : path.join(path.dirname(docsPath), 'document-image-mirror.json')));
const concurrency = positiveInt(valueArg('--concurrency') || process.env.IMAGE_MIRROR_CONCURRENCY || migration.assetMirror?.concurrency, 16, 'concurrency');
const dryRun = args.includes('--dry') || args.includes('--dry-run');
const timeoutMs = positiveInt(valueArg('--timeout-ms') || migration.assetMirror?.timeoutMs, 20_000, 'timeout-ms');
const minBytes = positiveInt(valueArg('--min-bytes') || migration.assetMirror?.minBytes, 64, 'min-bytes');

if (!docsPath || !assetsDir) {
  throw new Error('Usage: SITE=<site> npm run mirror:documents -- [--documents sites/<site>/documents.extra.json]');
}

function valueArg(name) {
  const item = args.find((arg) => arg === name || arg.startsWith(`${name}=`));
  if (!item) return '';
  if (item === name) return args[args.indexOf(item) + 1] || '';
  return item.slice(name.length + 1);
}

function resolvePath(value) {
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function positiveInt(value, fallback, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${label}: expected a positive integer, got "${value}"`);
  }
  return parsed;
}

async function maybeReadJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return String(value || '').replace(/&amp;/g, '&');
}

function collectUrls(value, out) {
  const text = String(value || '');
  let match;
  const img = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((match = img.exec(text))) out.add(decodeEntities(match[1]));
  const media = /(?:url\(["']?|href=["']|data-src=["']|src=["'])([^"')]+\.(?:png|jpe?g|gif|webp|svg|mp4|webm))(?:["')?#]|\?)/gi;
  while ((match = media.exec(text))) out.add(decodeEntities(match[1]));
}

function isExternal(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function validThumbUrl(url) {
  const value = String(url || '').trim();
  return /^(https?:\/\/|\/storage-files\/assets\/|\/)\S+$/i.test(value) && !value.includes('https:https');
}

function firstValidContentImage(html) {
  for (const match of String(html || '').matchAll(/<img\b[^>]*?\ssrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = match[1]?.trim();
    if (validThumbUrl(src)) return src;
  }
  return null;
}

function localAssetName(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const base = decodeURIComponent(path.basename(parsed.pathname))
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
  const host = parsed.hostname.replace(/^www\./, '').split('.')[0].replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'asset';
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
  return `${host}-${hash}-${base}`;
}

function candidates(url) {
  const list = [url];
  try {
    const encoded = encodeURI(decodeURIComponent(url));
    if (encoded !== url) list.push(encoded);
  } catch {
    const encoded = encodeURI(url);
    if (encoded !== url) list.push(encoded);
  }
  return [...new Set(list)];
}

async function fileExistsNonEmpty(file) {
  try {
    const size = (await stat(file)).size;
    return size >= minBytes;
  } catch {
    return false;
  }
}

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (namo-migration-kit)' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return { response, buffer };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadOne(url, fileName) {
  const dest = path.join(assetsDir, fileName);
  if (await fileExistsNonEmpty(dest)) return { ok: true, fileName, cached: true };
  let lastError = 'fetch failed';
  for (const candidate of candidates(url)) {
    try {
      const { response, buffer } = await fetchBuffer(candidate);
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (buffer.length < minBytes) {
        lastError = `tiny (${buffer.length}B)`;
        continue;
      }
      if (contentType.includes('text/html')) {
        lastError = 'html (not media)';
        continue;
      }
      await writeFile(dest, buffer);
      return { ok: true, fileName, bytes: buffer.length };
    } catch (error) {
      lastError = error.name === 'AbortError' ? 'timeout' : (error.message || String(error));
    }
  }
  return { ok: false, fileName, reason: lastError };
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
      if ((current + 1) % 100 === 0) console.log(`  ${current + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function stripFailedUrl(html, url) {
  let next = String(html);
  const variants = new Set([url, decodeEntities(url), url.replace(/^https:/, 'http:'), url.replace(/^http:/, 'https:')]);
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`<figure[^>]*>\\s*(?:<a[^>]*>\\s*)?<img[^>]*src=["']${escaped}["'][^>]*>(?:\\s*</a>)?\\s*(?:<figcaption[^>]*>[\\s\\S]*?</figcaption>)?\\s*</figure>`, 'gi'), '');
    next = next.replace(new RegExp(`<a[^>]*>\\s*<img[^>]*src=["']${escaped}["'][^>]*>\\s*</a>`, 'gi'), '');
    next = next.replace(new RegExp(`<img[^>]*src=["']${escaped}["'][^>]*>`, 'gi'), '');
    next = next.split(variant).join('');
  }
  return next;
}

await mkdir(assetsDir, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const data = JSON.parse(await readFile(docsPath, 'utf8'));
const docs = data.documents || [];
const allUrls = new Set();
for (const doc of docs) {
  collectUrls(doc.content, allUrls);
  if (doc.thumbUrl && validThumbUrl(doc.thumbUrl)) allUrls.add(decodeEntities(String(doc.thumbUrl).trim()));
}
const external = [...allUrls].filter(isExternal);
const byHost = {};
for (const url of external) {
  try {
    const host = new URL(url).host;
    byHost[host] = (byHost[host] || 0) + 1;
  } catch {
    /* ignore malformed URL */
  }
}

console.log(`Documents: ${docs.length}; distinct external media URLs: ${external.length}`);
if (dryRun) {
  console.log('--dry-run: no downloads or rewrites.');
  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), documents: docs.length, externalUrls: external.length, byHost }, null, 2)}\n`);
  process.exit(0);
}

const targets = external.map((url) => [url, localAssetName(url)]).filter((row) => row[1]);
console.log(`Downloading ${targets.length} assets with concurrency=${concurrency} ...`);
const results = await pool(targets, ([url, name]) => downloadOne(url, name));
const ok = new Map();
const failed = [];
let cached = 0;
let downloaded = 0;
for (let i = 0; i < results.length; i += 1) {
  const result = results[i];
  const [url, name] = targets[i];
  if (result.ok) {
    ok.set(url, `/storage-files/assets/${name}`);
    if (result.cached) cached += 1;
    else downloaded += 1;
  } else {
    failed.push({ url, reason: result.reason });
  }
}
const failedUrls = new Set(failed.map((item) => item.url));

let docsRewritten = 0;
let strippedImageRefs = 0;
for (const doc of docs) {
  let content = String(doc.content || '');
  const docUrls = new Set();
  collectUrls(content, docUrls);
  let changed = false;
  for (const raw of docUrls) {
    if (!isExternal(raw)) continue;
    const local = ok.get(raw);
    if (local) {
      for (const variant of new Set([raw, raw.replace(/&/g, '&amp;'), raw.replace(/^https:/, 'http:'), raw.replace(/^http:/, 'https:')])) {
        if (content.includes(variant)) {
          content = content.split(variant).join(local);
          changed = true;
        }
      }
    } else if (failedUrls.has(raw)) {
      const before = content;
      content = stripFailedUrl(content, raw);
      if (content !== before) {
        strippedImageRefs += 1;
        changed = true;
      }
    }
  }
  if (changed) {
    doc.content = content;
    docsRewritten += 1;
  }
  if (doc.thumbUrl && !validThumbUrl(doc.thumbUrl)) {
    doc.thumbUrl = null;
  } else if (doc.thumbUrl && isExternal(doc.thumbUrl)) {
    const rawThumb = String(doc.thumbUrl).trim();
    const decoded = decodeEntities(rawThumb);
    doc.thumbUrl = ok.get(rawThumb) || ok.get(decoded) || null;
  }
  if (!doc.thumbUrl) doc.thumbUrl = firstValidContentImage(doc.content);
}

await writeFile(docsPath, `${JSON.stringify(data, null, 2)}\n`);
const report = {
  generatedAt: new Date().toISOString(),
  documents: docs.length,
  externalUrls: external.length,
  downloaded,
  cached,
  okTotal: ok.size,
  failedTotal: failed.length,
  docsRewritten,
  strippedImageRefs,
  byHost,
  failed,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const text = JSON.stringify(docs);
const leftover = [...new Set([...text.matchAll(/https?:\/\/[^"'()\s<>]+\.(?:png|jpe?g|gif|webp|svg|mp4)(?:\?[^"'()\s<>]*)?/gi)].map((match) => match[0]))];
console.log(`Done. downloaded=${downloaded} cached=${cached} failed=${failed.length} docsRewritten=${docsRewritten}`);
console.log(`Report: ${path.relative(root, reportPath)}`);
if (leftover.length) console.log(`WARNING: ${leftover.length} external media URLs still remain (first 8): ${leftover.slice(0, 8).join(', ')}`);
else console.log('No external media URLs remain in documents.');
console.log(`Assets dir now has ${(await readdir(assetsDir)).filter((file) => !file.startsWith('.')).length} files.`);
