import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const siteSlug = process.env.SITE || '_template';
const siteDir = path.join(root, 'sites', siteSlug);
const configPath = path.join(siteDir, 'site.config.json');
const siteConfig = JSON.parse(readFileSync(configPath, 'utf8'));

function resolveRootPath(value, fallback) {
  const next = value || fallback;
  return path.isAbsolute(next) ? next : path.join(root, next);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[ext] || 'application/octet-stream';
}

function imagePlaceholder(label = 'image unavailable') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576"><rect width="1024" height="576" fill="#e5e7eb"/><text x="512" y="288" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="34">${label}</text></svg>`;
}

function documentsPath() {
  const primarySiteId = process.env.TARGET_SITE_ID || siteConfig.primarySiteId || siteConfig.siteIds?.[0];
  const distDir = resolveRootPath(siteConfig.distDir, 'dist');
  const staged = primarySiteId ? path.join(distDir, siteSlug, primarySiteId, 'staging', 'documents.json') : '';
  if (staged && existsSync(staged)) return staged;
  const postExportDir = resolveRootPath(siteConfig.postExportDir, path.join('sites', siteSlug, '_source'));
  const exported = path.join(postExportDir, 'documents.json');
  if (existsSync(exported)) return exported;
  return null;
}

function stagedFilePath(fileName) {
  const primarySiteId = process.env.TARGET_SITE_ID || siteConfig.primarySiteId || siteConfig.siteIds?.[0];
  const distDir = resolveRootPath(siteConfig.distDir, 'dist');
  const staged = primarySiteId ? path.join(distDir, siteSlug, primarySiteId, 'staging', fileName) : '';
  return staged && existsSync(staged) ? staged : null;
}

async function documentsPayload() {
  const filePath = documentsPath();
  const base = filePath ? JSON.parse(await readFile(filePath, 'utf8')) : { categories: [], documents: [] };
  const extraPath = path.join(siteDir, 'documents.extra.json');
  if (!existsSync(extraPath)) return base;
  const extra = JSON.parse(await readFile(extraPath, 'utf8'));
  const byId = new Map((base.documents || []).map((doc) => [doc.id, doc]));
  for (const doc of extra.documents || []) {
    if (byId.has(doc.id)) continue;
    byId.set(doc.id, {
      state: 'PUBLISHED',
      categoryId: null,
      categoryIds: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...byId.get(doc.id),
      ...doc
    });
  }
  return {
    ...base,
    documents: Array.from(byId.values())
  };
}

function assetPaths(fileName) {
  const primarySiteId = process.env.TARGET_SITE_ID || siteConfig.primarySiteId || siteConfig.siteIds?.[0];
  const distDir = resolveRootPath(siteConfig.distDir, 'dist');
  const postExportDir = resolveRootPath(siteConfig.postExportDir, path.join('sites', siteSlug, '_source'));
  return [
    path.join(siteDir, 'assets', fileName),
    primarySiteId ? path.join(distDir, siteSlug, primarySiteId, 'staging', 'storage-files', 'assets', fileName) : '',
    path.join(postExportDir, 'storage-files', 'assets', fileName)
  ].filter(Boolean);
}

function localPreviewPlugin() {
  return {
    name: 'namo-local-preview',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://local.test');
        if (url.pathname === '/__local_preview/config.json') {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ siteSlug, siteConfig }));
          return;
        }
        if (url.pathname === '/__local_preview/documents.json') {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(await documentsPayload()));
          return;
        }
        if (url.pathname === '/__local_preview/site-script.js') {
          const filePath = stagedFilePath('site-script.js');
          res.setHeader('content-type', 'text/javascript; charset=utf-8');
          res.end(filePath ? await readFile(filePath, 'utf8') : '');
          return;
        }
        if (url.pathname === '/__local_preview/proxy') {
          const target = url.searchParams.get('url') || '';
          if (!/^https?:\/\//i.test(target)) {
            res.statusCode = 400;
            res.end('Invalid proxy URL');
            return;
          }
          try {
            const upstream = await fetch(target);
            if (!upstream.ok) {
              res.statusCode = 200;
              res.setHeader('content-type', 'image/svg+xml');
              res.end(imagePlaceholder(`HTTP ${upstream.status}`));
              return;
            }
            res.statusCode = upstream.status;
            res.setHeader('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
            res.end(Buffer.from(await upstream.arrayBuffer()));
          } catch (error) {
            res.statusCode = 200;
            res.setHeader('content-type', 'image/svg+xml');
            res.end(imagePlaceholder('proxy failed'));
          }
          return;
        }
        const assetPrefix = '/storage-files/assets/';
        if (url.pathname.startsWith(assetPrefix) || url.pathname.startsWith('/assets/')) {
          const fileName = decodeURIComponent(url.pathname.replace(assetPrefix, '').replace(/^\/assets\//, ''));
          const filePath = assetPaths(fileName).find((candidate) => existsSync(candidate));
          if (filePath && existsSync(filePath)) {
            res.setHeader('content-type', contentType(filePath));
            res.end(await readFile(filePath));
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localPreviewPlugin()],
  server: {
    fs: {
      allow: [root]
    }
  }
});
