import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const siteSlug = process.env.SITE || process.argv[2];
const baseUrl = process.env.PREVIEW_URL || process.argv[3] || 'http://127.0.0.1:5173';
if (!siteSlug) throw new Error('Usage: SITE=<site> PREVIEW_URL=http://127.0.0.1:5173 node scripts/verify-site-preview.mjs');

const siteConfig = JSON.parse(await readFile(path.join(root, 'sites', siteSlug, 'site.config.json'), 'utf8'));
const paths = [...new Set(Object.values(siteConfig.staticPages || {}))];
const failures = [];

function fail(message) {
  failures.push(message);
}

function ignoredConsoleError(text) {
  return /recaptcha|ERR_ABORTED|WebGL context|THREE\.|HMR|favicon/i.test(text);
}

async function checkPage(page, pagePath) {
  const errors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !ignoredConsoleError(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(new URL(pagePath, baseUrl).href, { waitUntil: 'networkidle', timeout: 45_000 });
  const result = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1,h2')?.textContent?.trim() || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    broken: Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
    placeholders: Array.from(document.querySelectorAll('widget-placeholder')).length,
  }));

  if (!result.heading) fail(`${pagePath}: no h1/h2 rendered`);
  if (result.overflow) fail(`${pagePath}: horizontal overflow`);
  if (result.broken.length) fail(`${pagePath}: broken images: ${result.broken.slice(0, 5).join(', ')}`);
  if (errors.length) fail(`${pagePath}: console/page errors: ${errors.slice(0, 5).join(' | ')}`);
}

async function checkArticleFlow(page) {
  if (!paths.includes('/news')) return;
  await page.goto(new URL('/news', baseUrl).href, { waitUntil: 'networkidle', timeout: 45_000 });
  const card = await page.$('.jf-news-card, .docs-list a, [data-doc-card], a[href^="/article?doc_id="]');
  if (!card) return;
  const href = await card.evaluate((node) => node.getAttribute('href'));
  const target = await card.evaluate((node) => node.getAttribute('target'));
  if (!href?.startsWith('/article?doc_id=')) fail(`/news: first article link is not internal /article?doc_id=: ${href}`);
  if (target) fail(`/news: first article link should not open a new tab: target=${target}`);
  if (!href) return;
  await page.goto(new URL(href, baseUrl).href, { waitUntil: 'networkidle', timeout: 45_000 });
  const article = await page.evaluate(() => ({
    heading: document.querySelector('article h1,.jf-article h1,.docs-article h1')?.textContent?.trim() || '',
    contentLength: document.querySelector('article,.jf-article,.docs-article')?.textContent?.trim().length || 0,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    broken: Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  }));
  if (!article.heading) fail(`${href}: article heading missing`);
  if (article.contentLength < 100) fail(`${href}: article content too short (${article.contentLength})`);
  if (article.overflow) fail(`${href}: horizontal overflow`);
  if (article.broken.length) fail(`${href}: broken images: ${article.broken.slice(0, 5).join(', ')}`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844, isMobile: true }]) {
    const page = await browser.newPage({ viewport, isMobile: !!viewport.isMobile });
    for (const pagePath of paths) await checkPage(page, pagePath);
    if (viewport.width === 1280) await checkArticleFlow(page);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`[verify-site-preview] failed for ${siteSlug} at ${baseUrl}:`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`[verify-site-preview] ok: ${siteSlug} at ${baseUrl}; pages=${paths.length}`);
