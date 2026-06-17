import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const siteSlug = process.env.SITE || process.argv[2];
if (!siteSlug) throw new Error('Usage: SITE=<site> node scripts/verify-site-package.mjs');

const siteConfigPath = path.join(root, 'sites', siteSlug, 'site.config.json');
const siteConfig = JSON.parse(await readFile(siteConfigPath, 'utf8'));
const targetSiteId = process.env.TARGET_SITE_ID || siteConfig.primarySiteId || siteConfig.siteIds?.[0];
if (!targetSiteId) throw new Error(`Missing target site id for ${siteSlug}`);

const distRoot = path.resolve(root, siteConfig.distDir || 'dist');
const siteDistDir = path.join(distRoot, siteSlug);
const stagingDir = path.join(siteDistDir, targetSiteId, 'staging');
if (!existsSync(stagingDir)) throw new Error(`Missing staging directory: ${path.relative(root, stagingDir)}`);

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function walk(dir) {
  const rows = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...await walk(full));
    else rows.push(full);
  }
  return rows;
}

function rel(file) {
  return path.relative(root, file);
}

function textFiles(files) {
  return files.filter((file) => /\.(html|css|js|jsx|json|txt|svg)$/i.test(file));
}

function snippets(text, patterns) {
  const hits = [];
  for (const pattern of patterns) {
    if (pattern.test(text)) hits.push(pattern);
  }
  return hits;
}

const allFiles = await walk(stagingDir);
const texts = [];
for (const file of textFiles(allFiles)) {
  texts.push({ file, text: await readFile(file, 'utf8') });
}

const siteDataPath = path.join(stagingDir, 'site-data.json');
if (!existsSync(siteDataPath)) fail('Missing site-data.json');
const siteData = existsSync(siteDataPath) ? JSON.parse(await readFile(siteDataPath, 'utf8')) : null;

const documentsPath = path.join(stagingDir, 'documents.json');
const documentsPayload = existsSync(documentsPath) ? JSON.parse(await readFile(documentsPath, 'utf8')) : { documents: [], categories: [] };
const documents = documentsPayload.documents || [];

if (siteData?.site?.id !== targetSiteId) {
  fail(`site-data site.id mismatch: expected ${targetSiteId}, got ${siteData?.site?.id}`);
}
if (siteData?.siteData?.id !== targetSiteId) {
  fail(`site-data siteData.id mismatch: expected ${targetSiteId}, got ${siteData?.siteData?.id}`);
}

const siteCss = siteData?.siteData?.siteCSS || (existsSync(path.join(stagingDir, 'site-style.css')) ? await readFile(path.join(stagingDir, 'site-style.css'), 'utf8') : '');
const cssBytes = Buffer.byteLength(siteCss);
if (cssBytes > 20_000) fail(`Site CSS exceeds 20KB: ${cssBytes} bytes`);

const staleIds = new Set([
  ...(siteConfig.siteIds || []).filter((id) => id && id !== targetSiteId),
  ...(existsSync(siteDistDir) ? (await readdir(siteDistDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== targetSiteId)
    .map((entry) => entry.name) : []),
  ...(process.env.PREVIOUS_SITE_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
]);
for (const id of staleIds) {
  for (const { file, text } of texts) {
    if (text.includes(id)) fail(`Stale siteId "${id}" remains in ${rel(file)}`);
  }
}

const forbiddenOriginalAssetPatterns = [
  /wp-content\/uploads/gi,
  /cdn\.imweb\.me\/upload/gi,
  /%24%7B(?:file|name)/gi,
  /\$\{(?:file|name)\}`/g,
];
for (const { file, text } of texts) {
  const hits = snippets(text, forbiddenOriginalAssetPatterns);
  if (hits.length) fail(`Forbidden package pattern in ${rel(file)}: ${hits.map((p) => p.source).join(', ')}`);
}

const articleIdAllowed = [/^[a-f0-9]{20}$/i, /^doc-[a-z0-9]+$/i];
for (const doc of documents) {
  const id = String(doc.id || '');
  if (doc.type === 'ARTICLE' && !articleIdAllowed.some((pattern) => pattern.test(id))) {
    fail(`ARTICLE document id is source-derived or nonstandard: ${id}`);
  }
  if (Object.prototype.hasOwnProperty.call(doc, 'sourceUrl')) {
    fail(`Document ${id || '(missing id)'} includes sourceUrl`);
  }
  const bytes = Buffer.byteLength(JSON.stringify(doc));
  if (bytes > 1_000_000) fail(`Document ${id || '(missing id)'} exceeds 1MB: ${bytes} bytes`);
  else if (bytes > 900_000) warn(`Document ${id || '(missing id)'} is near 1MB: ${bytes} bytes`);
}

const documentsText = existsSync(documentsPath) ? await readFile(documentsPath, 'utf8') : '';
const mediaUrlRe = /https?:\/\/[^"'<>\\\s)]+\.(?:png|jpe?g|gif|webp|svg|mp4)(?:\?[^"'<>\\\s)]*)?/gi;
const externalDocumentMedia = [...new Set([...documentsText.matchAll(mediaUrlRe)].map((match) => match[0]))]
  .filter((url) => !url.includes('firebasestorage.googleapis.com'));
if (externalDocumentMedia.length) {
  fail(`documents.json contains external media URLs: ${externalDocumentMedia.slice(0, 8).join(', ')}${externalDocumentMedia.length > 8 ? ' ...' : ''}`);
}

const assetDir = path.join(stagingDir, 'storage-files/assets');
const assetCount = existsSync(assetDir) ? (await readdir(assetDir)).length : 0;
if (!assetCount) fail('No packaged assets found in storage-files/assets');

const assetInventoryPath = path.join(stagingDir, 'asset-inventory.local.json');
if (existsSync(assetInventoryPath)) {
  const inventory = JSON.parse(await readFile(assetInventoryPath, 'utf8'));
  if ((inventory.missingAssets || []).length) {
    fail(`asset-inventory.local.json has missing assets: ${inventory.missingAssets.join(', ')}`);
  }
}

for (const file of allFiles) {
  const info = await stat(file);
  if (/\/pages\/|\/widgets\//.test(file) && info.size > 1_000_000) {
    fail(`Packaged page/widget file exceeds 1MB: ${rel(file)} (${info.size} bytes)`);
  }
}

if (warnings.length) {
  console.warn(`[verify-site-package] warnings for ${siteSlug}:`);
  for (const message of warnings) console.warn(`- ${message}`);
}

if (failures.length) {
  console.error(`[verify-site-package] failed for ${siteSlug}/${targetSiteId}:`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`[verify-site-package] ok: ${siteSlug}/${targetSiteId}; pages=${siteData?.pages?.length || 0}; widgets=${siteData?.widgets?.length || 0}; documents=${documents.length}; assets=${assetCount}; css=${cssBytes} bytes`);
