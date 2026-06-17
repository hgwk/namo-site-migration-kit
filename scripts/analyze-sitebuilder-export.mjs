import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const siteSlug = process.env.SITE || valueArg('--site');
const siteConfig = siteSlug ? await maybeReadJson(path.join(root, 'sites', siteSlug, 'site.config.json')) : null;
const exportDir = resolvePath(
  valueArg('--input')
    || process.env.SITEBUILDER_EXPORT_DIR
    || siteConfig?.migration?.sitebuilderExportDir
    || siteConfig?.sourceExportDir,
);
if (!exportDir) {
  throw new Error('Usage: node scripts/analyze-sitebuilder-export.mjs --input <sitebuilder-export-dir> [--out <report.json>]');
}
const reportPath = resolvePath(
  valueArg('--out')
    || siteConfig?.migration?.sitebuilderExportReport
    || (siteSlug ? path.join('sites', siteSlug, '_reports/sitebuilder-export-analysis.json') : path.join(exportDir, 'sitebuilder-export-analysis.json')),
);

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

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function maybeReadJson(file) {
  try {
    return await readJson(file);
  } catch {
    return null;
  }
}

async function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => path.join(dir, entry.name));
}

async function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, files);
    else files.push(full);
  }
  return files;
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((key) => [key, obj?.[key]]));
}

async function main() {
  const manifest = await maybeReadJson(path.join(exportDir, 'mcp-upload/manifest.json')) || {};
  const site = await maybeReadJson(path.join(exportDir, 'mcp-upload/site.json')) || {};
  const documents = await maybeReadJson(path.join(exportDir, 'mcp-upload/documents.json')) || [];
  const categories = await maybeReadJson(path.join(exportDir, 'mcp-upload/categories.json')) || [];
  const pageFiles = await listJsonFiles(path.join(exportDir, 'mcp-upload/pages'));
  const widgetFiles = await listJsonFiles(path.join(exportDir, 'mcp-upload/widgets'));
  const storageFiles = await walkFiles(path.join(exportDir, 'storage-files')).catch(() => []);

  const pages = [];
  for (const file of pageFiles) {
    const page = await maybeReadJson(file);
    if (!page) continue;
    pages.push({
      file: path.relative(exportDir, file),
      pageId: page.pageId ?? path.basename(file, '.json'),
      title: page.title ?? '',
      path: page.path ?? '',
      htmlBytes: Buffer.byteLength(page.html ?? '', 'utf8'),
      cssBytes: Buffer.byteLength(page.css ?? '', 'utf8'),
      tailwindBytes: Buffer.byteLength(page.tailwindCss ?? '', 'utf8'),
      hasWidgetPlaceholders: String(page.html ?? '').includes('widget-placeholder'),
      inMenu: page.inMenu ?? false,
    });
  }

  const widgets = [];
  for (const file of widgetFiles) {
    const widget = await maybeReadJson(file);
    if (!widget) continue;
    widgets.push({
      file: path.relative(exportDir, file),
      id: widget.id ?? path.basename(file, '.json'),
      label: widget.label ?? '',
      type: widget.type ?? '',
      reactBytes: Buffer.byteLength(widget.reactCode ?? '', 'utf8'),
      cssBytes: Buffer.byteLength(widget.css ?? '', 'utf8'),
      compilationStatus: widget.compilationStatus ?? '',
    });
  }

  const storageStats = {
    files: storageFiles.length,
    bytes: 0,
  };
  for (const file of storageFiles) {
    storageStats.bytes += (await stat(file)).size;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    exportDir,
    manifest: pick(manifest, ['version', 'generatedAt', 'siteShape']),
    site: pick(site, ['id', 'name', 'isPublished']),
    counts: {
      pages: pages.length,
      widgets: widgets.length,
      documents: Array.isArray(documents) ? documents.length : 0,
      categories: Array.isArray(categories) ? categories.length : 0,
      storageFiles: storageStats.files,
    },
    sizes: {
      siteDataBytes: await maybeSize(path.join(exportDir, 'site-data.json')),
      siteStyleBytes: await maybeSize(path.join(exportDir, 'site-style.css')),
      documentsBytes: await maybeSize(path.join(exportDir, 'mcp-upload/documents.json')),
      storageBytes: storageStats.bytes,
      largestPages: pages.slice().sort((a, b) => b.htmlBytes + b.cssBytes - (a.htmlBytes + a.cssBytes)).slice(0, 20),
      largestWidgets: widgets.slice().sort((a, b) => b.reactBytes + b.cssBytes - (a.reactBytes + a.cssBytes)).slice(0, 20),
    },
    pages: pages.sort((a, b) => a.path.localeCompare(b.path)),
    widgets: widgets.sort((a, b) => a.id.localeCompare(b.id)),
    comparisonNotes: [
      'Sitebuilder export is rendered/snapshot-oriented and useful for visual HTML/CSS reference.',
      'Validate document count, category count, and page/widget size before treating the export as import-ready.',
      'Large site-data.json files should be split into pages, widgets, documents, assets, and site_data.',
      'Repeated header/footer widget variants should usually collapse into one curated header/footer contract.',
    ],
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    counts: report.counts,
    sizes: report.sizes,
    siteShape: report.manifest.siteShape,
  }, null, 2));
}

async function maybeSize(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
