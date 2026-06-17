import { createReadStream, existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteSlug = process.env.SITE || process.argv[2];
if (!siteSlug) throw new Error('Usage: SITE=<site> npm run optimize:assets');

const siteDir = path.join(root, 'sites', siteSlug);
const assetsDir = path.join(siteDir, 'assets');
const backupRoot = path.join(siteDir, '_backup');
const reportRoot = path.join(siteDir, '_reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportRoot, `image-optimization-${timestamp}.json`);
const args = new Set(process.argv.slice(2));

const maxSize = Number(process.env.IMAGE_MAX_SIZE || 1280);
const quality = Number(process.env.IMAGE_QUALITY || 75);
const concurrency = Number(process.env.IMAGE_CONCURRENCY || Math.max(2, Math.min(8, cpus().length - 1)));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyKind = onlyArg ? onlyArg.split('=')[1] : '';
const dryRun = args.has('--dry-run');
const noBackup = args.has('--no-backup') || dryRun;
const forceConvertLarger = args.has('--force-convert-larger');
const pngquantBin = process.env.PNGQUANT_BIN || 'pngquant';

if (!existsSync(assetsDir)) throw new Error(`Missing assets directory: ${path.relative(root, assetsDir)}`);

sharp.concurrency(concurrency);

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
  });
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

function relativeAsset(file) {
  return path.relative(assetsDir, file).split(path.sep).join('/');
}

async function fileHash(file) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  for (const unit of units) {
    if (value < 1024 || unit === units.at(-1)) return `${value.toFixed(1)} ${unit}`;
    value /= 1024;
  }
}

function imageKind(file) {
  if (path.basename(file).includes('.optimizing-')) return null;
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'jpeg';
  if (ext === '.webp') return 'webp';
  if (ext === '.png') return 'png';
  if (ext === '.gif') return 'gif';
  return null;
}

async function optimizeSharp(file, kind) {
  const before = (await stat(file)).size;
  const tmp = `${file}.optimizing-${process.pid}`;
  let image = sharp(file, { animated: false, limitInputPixels: false }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (Math.max(width, height) > maxSize) {
    image = image.resize({
      width: width >= height ? maxSize : undefined,
      height: height > width ? maxSize : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  if (kind === 'jpeg') image = image.jpeg({ quality, mozjpeg: true, progressive: true });
  if (kind === 'webp') image = image.webp({ quality, effort: 4 });
  await image.toFile(tmp);
  const after = (await stat(tmp)).size;
  if (after >= before) {
    await unlink(tmp);
    return { status: 'kept-larger', before, after: before };
  }
  if (!dryRun) await rename(tmp, file);
  else await unlink(tmp);
  return { status: dryRun ? 'would-change' : 'changed', before, after };
}

async function optimizePngquant(file, hasPngquant) {
  const before = (await stat(file)).size;
  if (!hasPngquant) return { status: 'skipped-pngquant-missing', before, after: before };
  const tmp = `${file}.optimizing-${process.pid}.png`;
  const code = await new Promise((resolve) => {
    const child = spawn(pngquantBin, [
      `--quality=60-${quality}`,
      '--skip-if-larger',
      '--force',
      '--output', tmp,
      file,
    ], { stdio: 'ignore' });
    child.on('close', resolve);
  });
  if (code !== 0 || !existsSync(tmp)) return { status: 'kept-larger', before, after: before };
  const after = (await stat(tmp)).size;
  if (after >= before) {
    await unlink(tmp);
    return { status: 'kept-larger', before, after: before };
  }
  if (!dryRun) await rename(tmp, file);
  else await unlink(tmp);
  return { status: dryRun ? 'would-change' : 'changed', before, after };
}

async function optimizePng(file, hasPngquant) {
  return optimizePngToJpeg(file);
}

async function optimizePngToJpeg(file) {
  const before = (await stat(file)).size;
  const out = file.replace(/\.png$/i, '.jpg');
  const tmp = `${out}.optimizing-${process.pid}`;
  let image = sharp(file, { animated: false, limitInputPixels: false }).rotate().flatten({ background: '#ffffff' });
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (Math.max(width, height) > maxSize) {
    image = image.resize({
      width: width >= height ? maxSize : undefined,
      height: height > width ? maxSize : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  await image.jpeg({ quality, mozjpeg: true, progressive: true }).toFile(tmp);
  const after = (await stat(tmp)).size;
  if (after >= before && !forceConvertLarger) {
    await unlink(tmp);
    return { status: 'kept-larger', before, after: before };
  }
  if (!dryRun) {
    await rename(tmp, out);
    await unlink(file);
  } else {
    await unlink(tmp);
  }
  return {
    status: after >= before
      ? (dryRun ? 'would-convert-png-to-jpeg-larger' : 'converted-png-to-jpeg-larger')
      : (dryRun ? 'would-convert-png-to-jpeg' : 'converted-png-to-jpeg'),
    before,
    after,
    outputFile: relativeAsset(out),
  };
}

async function optimizeGifToWebp(file) {
  const before = (await stat(file)).size;
  const out = file.replace(/\.gif$/i, '.webp');
  const tmp = `${out}.optimizing-${process.pid}`;
  let image = sharp(file, { animated: true, limitInputPixels: false });
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.pageHeight || metadata.height || 0;
  if (Math.max(width, height) > maxSize) {
    image = image.resize({
      width: width >= height ? maxSize : undefined,
      height: height > width ? maxSize : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  await image.webp({ quality, effort: 4, loop: metadata.loop, delay: metadata.delay }).toFile(tmp);
  const after = (await stat(tmp)).size;
  if (!dryRun) {
    await rename(tmp, out);
    await unlink(file);
  } else {
    await unlink(tmp);
  }
  return {
    status: dryRun ? 'would-convert-gif-to-webp' : 'converted-gif-to-webp',
    before,
    after,
    outputFile: relativeAsset(out),
  };
}

async function writeReport(report) {
  const tmp = `${reportPath}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(report, null, 2)}\n`);
  await rename(tmp, reportPath);
}

function shouldRewriteFile(file) {
  const relative = path.relative(siteDir, file).split(path.sep);
  if (relative.some((part) => ['assets', '_backup', '_reports', '_inventory', '_source', '_qa', 'storage-files'].includes(part))) return false;
  return /\.(html|css|js|jsx|json)$/i.test(file);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function rewriteAssetReferences(mapping) {
  if (!mapping.length || dryRun) return [];
  const files = (await walk(siteDir)).filter(shouldRewriteFile);
  const changed = [];
  for (const file of files) {
    let text = await readFile(file, 'utf8');
    const before = text;
    for (const { from, to } of mapping) {
      const fromPath = `/storage-files/assets/${from}`;
      const toPath = `/storage-files/assets/${to}`;
      text = text.replace(new RegExp(escapeRegExp(fromPath), 'g'), toPath);
      text = text.replace(new RegExp(escapeRegExp(encodeURIComponent(fromPath)), 'g'), encodeURIComponent(toPath));
    }
    if (text !== before) {
      await writeFile(file, text);
      changed.push(path.relative(root, file));
    }
  }
  return changed;
}

async function runPool(items, worker) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

await mkdir(reportRoot, { recursive: true });
const hasPngquant = await commandExists(pngquantBin);
const allImages = (await walk(assetsDir)).filter((file) => {
  const kind = imageKind(file);
  return kind && (!onlyKind || kind === onlyKind);
});
const images = limit > 0 ? allImages.slice(0, limit) : allImages;
const backupDir = path.join(backupRoot, `assets-${timestamp}`);

const report = {
  site: siteSlug,
  startedAt: new Date().toISOString(),
  options: { maxSize, quality, concurrency, limit, onlyKind, dryRun, backup: !noBackup, forceConvertLarger, pngquant: hasPngquant, gif: 'force-webp', png: 'force-jpeg-white-background' },
  assetsDir: path.relative(root, assetsDir),
  backupDir: noBackup ? null : path.relative(root, backupDir),
  totals: { files: images.length, before: 0, after: 0, changed: 0, skipped: 0, keptLarger: 0, failed: 0 },
  files: [],
};

console.log(`[optimize-assets:fast] ${siteSlug}: scanning=${allImages.length}, selected=${images.length}, max=${maxSize}px, q=${quality}, pngquant=${hasPngquant ? 'yes' : 'no'}`);

if (!noBackup) {
  await mkdir(backupRoot, { recursive: true });
  console.log(`[optimize-assets:fast] backup: ${path.relative(root, backupDir)}`);
  await cp(assetsDir, backupDir, { recursive: true, force: false, errorOnExist: true });
}

let reportWrite = Promise.resolve();
const gifReferenceMapping = [];
const assetReferenceMapping = [];
await runPool(images, async (file) => {
  const kind = imageKind(file);
  const beforeHash = await fileHash(file);
  const relative = relativeAsset(file);
  try {
    const result = kind === 'png'
      ? await optimizePng(file, hasPngquant)
      : kind === 'gif'
        ? await optimizeGifToWebp(file)
        : await optimizeSharp(file, kind);
    const outputPath = result.outputFile ? path.join(assetsDir, result.outputFile) : file;
    const afterHash = dryRun && result.outputFile ? null : await fileHash(outputPath);
    const row = { file: relative, outputFile: result.outputFile, kind, before: result.before, after: result.after, saved: result.before - result.after, status: result.status, beforeHash, afterHash };
    report.files.push(row);
    if (kind === 'gif' && result.outputFile) gifReferenceMapping.push({ from: relative, to: result.outputFile });
    if (kind === 'png' && result.outputFile) assetReferenceMapping.push({ from: relative, to: result.outputFile });
    report.totals.before += row.before;
    report.totals.after += row.after;
    if (
      row.status === 'changed'
      || row.status === 'would-change'
      || row.status === 'converted-gif-to-webp'
      || row.status === 'would-convert-gif-to-webp'
      || row.status === 'converted-png-to-jpeg'
      || row.status === 'would-convert-png-to-jpeg'
      || row.status === 'converted-png-to-jpeg-larger'
      || row.status === 'would-convert-png-to-jpeg-larger'
    ) report.totals.changed += 1;
    else if (row.status === 'kept-larger') report.totals.keptLarger += 1;
    else report.totals.skipped += 1;
  } catch (error) {
    const size = (await stat(file)).size;
    report.files.push({ file: relative, kind, before: size, after: size, saved: 0, status: 'failed', error: error.message, beforeHash, afterHash: beforeHash });
    report.totals.before += size;
    report.totals.after += size;
    report.totals.failed += 1;
  }
  reportWrite = reportWrite.then(() => writeReport(report));
  await reportWrite;
});

report.referenceRewrites = await rewriteAssetReferences([...gifReferenceMapping, ...assetReferenceMapping]);
report.finishedAt = new Date().toISOString();
await writeReport(report);

const saved = report.totals.before - report.totals.after;
const percent = report.totals.before ? ((saved / report.totals.before) * 100).toFixed(1) : '0.0';
console.log(`[optimize-assets:fast] done: changed=${report.totals.changed}, skipped=${report.totals.skipped}, kept-larger=${report.totals.keptLarger}, failed=${report.totals.failed}`);
console.log(`[optimize-assets:fast] ${formatBytes(report.totals.before)} -> ${formatBytes(report.totals.after)} (${formatBytes(saved)} saved, ${percent}%)`);
console.log(`[optimize-assets:fast] report: ${path.relative(root, reportPath)}`);
