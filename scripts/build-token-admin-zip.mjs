import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const siteSlug = process.env.SITE || '_template';
const siteConfigPath = path.join(root, 'sites', siteSlug, 'site.config.json');
const siteConfig = JSON.parse(await readFile(siteConfigPath, 'utf8'));

if (siteConfig.builder && siteConfig.builder !== 'generic') {
  throw new Error(`Unsupported builder "${siteConfig.builder}". Public kit packaging supports builder:"generic".`);
}

const siteSourceDir = resolveRootPath(siteConfig.sourceDir || path.join('sites', siteSlug));
const pagesDir = path.join(siteSourceDir, 'pages');
const cssSplitDir = path.join(siteSourceDir, 'css-split');
const assetsDir = path.join(siteSourceDir, 'assets');
const targetSiteId = process.env.TARGET_SITE_ID || siteConfig.primarySiteId || siteConfig.siteIds?.[0];
if (!targetSiteId) throw new Error(`Missing TARGET_SITE_ID or primarySiteId/siteIds in ${siteConfigPath}`);

const workspaceId = process.env.WS_ID || siteConfig.wsId || 'factory';
const distRoot = resolveRootPath(siteConfig.distDir || 'dist');
const outDir = path.join(distRoot, siteSlug, targetSiteId, 'staging');
const zipPath = path.join(distRoot, siteSlug, targetSiteId, `${siteConfig.slug || siteSlug}-${targetSiteId}-token-admin-import.zip`);
const assetsOutDir = path.join(outDir, 'storage-files/assets');

function resolveRootPath(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function compactJson(value) {
  return JSON.stringify(value);
}

async function readOptional(filePath) {
  return existsSync(filePath) ? readFile(filePath, 'utf8') : '';
}

async function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const rows = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...await listFiles(full));
    else rows.push(full);
  }
  return rows;
}

function extractBody(html) {
  return html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]?.trim() || html.trim();
}

function minifyCss(css) {
  return String(css || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .trim();
}

function firebaseAssetUrl(fileName) {
  return `https://firebasestorage.googleapis.com/v0/b/sunbisites.firebasestorage.app/o/sites%2F${encodeURIComponent(targetSiteId)}%2Fassets%2F${encodeURIComponent(fileName)}?alt=media`;
}

function rewriteAssetRefs(text) {
  return String(text || '').replace(/\/storage-files\/assets\/([^,\s"'()<>?#]+)([?#][^,\s"'()<>]*)?/g, (_match, fileName) => {
    return firebaseAssetUrl(decodeURIComponent(fileName));
  });
}

function rewriteAssetRefsDeep(value) {
  if (Array.isArray(value)) return value.map(rewriteAssetRefsDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteAssetRefsDeep(item)]));
  }
  return typeof value === 'string' ? rewriteAssetRefs(value) : value;
}

function assetRefs(text) {
  const refs = new Set();
  for (const match of String(text || '').matchAll(/\/storage-files\/assets\/([^,\s"'()<>?#]+)(?:[?#][^,\s"'()<>]*)?/g)) {
    refs.add(decodeURIComponent(match[1]));
  }
  return refs;
}

function validDocumentThumbUrl(value) {
  if (!value) return false;
  const text = String(value).trim();
  return /^\/storage-files\/assets\/[^"'<>]+/i.test(text) || /^https?:\/\/[^"'<>]+/i.test(text);
}

function firstValidContentImage(html) {
  const match = String(html || '').match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return validDocumentThumbUrl(match?.[1]) ? match[1].trim() : null;
}

function cleanImportedHtmlContent(html) {
  return String(html || '')
    .replace(/<!--\s*wp:[\s\S]*?-->/g, '')
    .replace(/\s+onerror=(["'])[\s\S]*?\1/gi, '')
    .trim();
}

async function copyAssets(requiredAssets) {
  await mkdir(assetsOutDir, { recursive: true });
  const available = existsSync(assetsDir)
    ? (await listFiles(assetsDir)).map((file) => path.relative(assetsDir, file))
    : [];
  const wanted = requiredAssets.size ? [...requiredAssets].sort() : available.sort();
  const copiedAssets = [];
  const missingAssets = [];

  for (const name of wanted) {
    const source = path.join(assetsDir, name);
    if (!existsSync(source)) {
      missingAssets.push(name);
      continue;
    }
    const target = path.join(assetsOutDir, name);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target);
    copiedAssets.push(name);
  }

  await writeFile(path.join(outDir, 'asset-inventory.local.json'), stableJson({
    copiedAssets,
    missingAssets,
  }));
  return { copiedAssets, missingAssets };
}

async function writePage({ slug, pagePath, title, html, css, exportedAt }) {
  const pageId = `page-${slug}`;
  const folder = path.join(outDir, 'pages', slug);
  const row = {
    pageId,
    siteId: targetSiteId,
    title,
    path: pagePath,
    inMenu: (siteConfig.menuPaths || []).includes(pagePath),
    requiredAuthLevel: 0,
    projectJSON: '',
    tailwindCss: '',
    html,
    css,
    lastSaved: exportedAt,
    folderName: slug,
  };
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'body.html'), html);
  await writeFile(path.join(folder, 'style.css'), css);
  await writeFile(path.join(folder, 'page.json'), stableJson({
    pageId,
    title,
    path: pagePath,
    inMenu: row.inMenu,
    requiredAuthLevel: 0,
  }));
  return row;
}

async function writeWidget({ id, source, css, isReact, exportedAt }) {
  const fileBase = `Custom__${id}`;
  const row = {
    id,
    siteId: targetSiteId,
    label: id,
    tags: [],
    reactCode: isReact ? source : '',
    htmlCode: isReact ? '' : source,
    css,
    constants: rewriteAssetRefsDeep(siteConfig.widgetConstants?.[id] || {}),
    icon: '',
    isSample: false,
    isSSR: !isReact,
    compilationStatus: 'success',
    bundleUrl: '',
    createdAt: exportedAt,
    updatedAt: exportedAt,
  };
  await mkdir(path.join(outDir, 'widgets'), { recursive: true });
  await writeFile(path.join(outDir, 'widgets', `${fileBase}${isReact ? '.jsx' : '.html'}`), source);
  await writeFile(path.join(outDir, 'widgets', `${fileBase}.json`), stableJson(row));
  return row;
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await mkdir(outDir, { recursive: true });

  const exportedAt = new Date().toISOString();
  const requiredAssets = new Set();
  const tokenCss = await readOptional(path.join(siteSourceDir, 'tokens.css'));
  const globalCss = await readOptional(path.join(cssSplitDir, 'GLOBAL.css'));
  const siteCss = minifyCss(rewriteAssetRefs(`${tokenCss}\n${globalCss}`));
  for (const ref of assetRefs(`${tokenCss}\n${globalCss}`)) requiredAssets.add(ref);

  const widgets = [];
  const widgetDir = path.join(siteSourceDir, 'widgets');
  if (existsSync(widgetDir)) {
    for (const fileName of (await readdir(widgetDir)).sort()) {
      const ext = path.extname(fileName);
      if (!['.html', '.jsx'].includes(ext)) continue;
      const id = path.basename(fileName, ext);
      const rawSource = await readFile(path.join(widgetDir, fileName), 'utf8');
      const css = await readOptional(path.join(widgetDir, `${id}.css`));
      for (const ref of assetRefs(`${rawSource}\n${css}\n${JSON.stringify(siteConfig.widgetConstants?.[id] || {})}`)) requiredAssets.add(ref);
      widgets.push(await writeWidget({
        id,
        source: rewriteAssetRefs(rawSource),
        css: rewriteAssetRefs(css),
        isReact: ext === '.jsx',
        exportedAt,
      }));
    }
  }

  const pages = [];
  for (const [slug, pagePath] of Object.entries(siteConfig.staticPages || {})) {
    const htmlPath = path.join(pagesDir, `${slug}.html`);
    if (!existsSync(htmlPath)) throw new Error(`Missing page source: ${path.relative(root, htmlPath)}`);
    const rawHtml = extractBody(await readFile(htmlPath, 'utf8'));
    const css = await readOptional(path.join(cssSplitDir, `p-${slug}.css`));
    for (const ref of assetRefs(`${rawHtml}\n${css}`)) requiredAssets.add(ref);
    pages.push(await writePage({
      slug,
      pagePath,
      title: siteConfig.pageTitles?.[slug] || siteConfig.name || slug,
      html: rewriteAssetRefs(rawHtml),
      css: rewriteAssetRefs(css),
      exportedAt,
    }));
  }

  const extraDocsPath = path.join(siteSourceDir, 'documents.extra.json');
  const documentsPayload = existsSync(extraDocsPath)
    ? JSON.parse(await readFile(extraDocsPath, 'utf8'))
    : { version: '1.0', categories: [], documents: [] };

  const documents = (documentsPayload.documents || []).map((doc) => {
    const cleanContent = cleanImportedHtmlContent(doc.content || '');
    const thumbUrl = validDocumentThumbUrl(doc.thumbUrl) ? String(doc.thumbUrl).trim() : firstValidContentImage(cleanContent);
    for (const ref of assetRefs(`${cleanContent}\n${thumbUrl || ''}`)) requiredAssets.add(ref);
    return {
      creator: null,
      priority: 0,
      parentDocumentId: null,
      embedding: null,
      state: 'PUBLISHED',
      categoryId: null,
      categoryIds: [],
      created: exportedAt,
      updated: exportedAt,
      ...doc,
      thumbUrl: thumbUrl ? rewriteAssetRefs(thumbUrl) : null,
      content: rewriteAssetRefs(cleanContent),
      siteId: targetSiteId,
    };
  });

  const { copiedAssets, missingAssets } = await copyAssets(requiredAssets);
  await writeFile(path.join(outDir, 'site-style.css'), siteCss);
  await writeFile(path.join(outDir, 'site-script.js'), siteConfig.siteJS || '');
  await writeFile(path.join(outDir, 'documents.json'), compactJson({
    version: '1.0',
    exportedAt,
    categories: (documentsPayload.categories || []).map((category) => ({
      created: exportedAt,
      isHidden: false,
      ...category,
      siteId: targetSiteId,
    })),
    documents,
  }));
  await writeFile(path.join(outDir, 'site-data.json'), stableJson({
    version: '1.0',
    exportedAt,
    site: {
      id: targetSiteId,
      wsId: workspaceId,
      name: siteConfig.name || siteSlug,
      createdAt: exportedAt,
      updatedAt: exportedAt,
      isPublished: false,
      creator: siteConfig.creator || null,
    },
    siteData: {
      id: targetSiteId,
      siteCSS: siteCss,
      siteJS: siteConfig.siteJS || '',
      siteMetaData: siteConfig.siteMetaData || {},
      siteScriptImport: siteConfig.siteScriptImport || [],
      sitemapXml: '',
    },
    pages,
    widgets,
    siteUsers: [],
    serviceConfigs: [],
    toolScripts: [],
    siteIcon: null,
  }));
  await writeFile(path.join(outDir, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/pages/home/body.html">\n');
  await writeFile(path.join(outDir, 'local-widget-placeholder.js'), '// Generic admin ZIP placeholder helper intentionally omitted.\n');
  await writeFile(path.join(outDir, 'server.js'), 'import http from "node:http";\nhttp.createServer((_,res)=>{res.end("generic zip preview");}).listen(process.env.PORT||8080);\n');

  if (missingAssets.length) {
    throw new Error(`Missing assets: ${missingAssets.join(', ')}`);
  }

  const zip = spawnSync('zip', ['-qr', zipPath, '.'], { cwd: outDir, stdio: 'inherit' });
  if (zip.status !== 0) throw new Error(`zip failed with status ${zip.status}`);

  console.log(`Wrote ${path.relative(root, outDir)}`);
  console.log(`Wrote ${path.relative(root, zipPath)}`);
  console.log(`Pages: ${pages.length}; widgets: ${widgets.length}; documents: ${documents.length}; assets: ${copiedAssets.length}; missing: ${missingAssets.length}; css: ${Buffer.byteLength(siteCss)} bytes`);

  const verify = spawnSync('node', ['scripts/verify-site-package.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, SITE: siteSlug, TARGET_SITE_ID: targetSiteId },
  });
  if (verify.status !== 0) throw new Error(`verify-site-package failed with status ${verify.status}`);
}

await main();
