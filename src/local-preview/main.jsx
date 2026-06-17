import React from 'react';
import { createRoot } from 'react-dom/client';

const pageModules = import.meta.glob('../../sites/*/pages/*.html', { query: '?raw', import: 'default', eager: true });
const tokenModules = import.meta.glob('../../sites/*/tokens.css', { query: '?raw', import: 'default', eager: true });
const cssModules = import.meta.glob('../../sites/*/css-split/*.css', { query: '?raw', import: 'default', eager: true });
const sharedCssModules = import.meta.glob('../../shared/css-split/*.css', { query: '?raw', import: 'default', eager: true });
const widgetCssModules = import.meta.glob('../../sites/*/widgets/*.css', { query: '?raw', import: 'default', eager: true });
const htmlWidgetModules = import.meta.glob('../../sites/*/widgets/*.html', { query: '?raw', import: 'default', eager: true });
const reactWidgetModules = import.meta.glob('../../sites/*/widgets/*.jsx');
const sharedReactWidgetModules = import.meta.glob('../../shared/widgets/*.jsx');

Object.assign(globalThis, {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useRef: React.useRef,
  useCallback: React.useCallback
});

const rootEl = document.getElementById('root');
const roots = new Map();
let siteSlug = '_template';
let siteConfig = null;
let documentsPayload = { categories: [], documents: [] };
let siteScriptLoaded = false;
let routePath = window.location.pathname;
let routeSearch = window.location.search;

function siteKey(filePath) {
  return filePath.match(/sites\/([^/]+)\//)?.[1] || '';
}

function fileBase(filePath) {
  return filePath.split('/').pop().replace(/\.(html|jsx|css)$/, '');
}

function extractBody(html) {
  return html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]?.trim() || html.trim();
}

function rewriteAssetRefs(text) {
  return String(text || '')
    .replace(/(?:\.\.\/|(?<!\/)\b)storage-files\/assets\//g, '/storage-files/assets/')
    .replace(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/sunbisites\.firebasestorage\.app\/o\/sites%2F[^/?#"'()\s<>]+%2Fassets%2F([^?'"()\s<>]+)\?alt=media/g, (_match, name) => {
      return `/storage-files/assets/${decodeURIComponent(name)}`;
    });
}

function rewriteExternalImageRefs(text) {
  return rewriteAssetRefs(text).replace(/https?:\/\/[^"'()\s<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^"'()\s<>]*)?/gi, (url) => {
    return `/__local_preview/proxy?url=${encodeURIComponent(url)}`;
  });
}

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function youtubeEmbedSrc(rawUrl) {
  try {
    const url = new URL(String(rawUrl).trim());
    let videoId = '';
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (url.hostname.endsWith('youtube.com')) {
      videoId = url.pathname.startsWith('/embed/')
        ? url.pathname.split('/').filter(Boolean)[1] || ''
        : url.searchParams.get('v') || '';
    }
    if (!videoId) return '';
    const params = new URLSearchParams();
    const start = url.searchParams.get('start') || url.searchParams.get('t');
    if (start) params.set('start', String(start).replace(/s$/i, ''));
    const query = params.toString();
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}${query ? `?${query}` : ''}`;
  } catch {
    return '';
  }
}

function normalizeDocumentEmbeds(text) {
  const replaceEmbed = (_match, rawUrl, caption = '') => {
    const embedSrc = youtubeEmbedSrc(rawUrl);
    const cleanCaption = String(caption || '').replace(/\sclass="[^"]*"/g, '');
    if (!embedSrc) {
      const safeUrl = escapeHtmlAttribute(rawUrl);
      return `<p><a href="${safeUrl}" target="_blank" rel="noopener">${safeUrl}</a></p>${cleanCaption}`;
    }
    return `<figure><iframe src="${escapeHtmlAttribute(embedSrc)}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>${cleanCaption}</figure>`;
  };
  return String(text || '')
    .replace(/<figure\b[^>]*>\s*\[embed\]\s*(https?:\/\/[^\s<]+)\s*\[\/embed\]\s*(<figcaption\b[^>]*>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi, replaceEmbed)
    .replace(/<figure\b[^>]*>\s*<div\b[^>]*>\s*(https?:\/\/[^\s<]+)\s*<\/div>\s*(<figcaption\b[^>]*>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi, replaceEmbed)
    .replace(/\[embed\]\s*(https?:\/\/[^\s<]+)\s*\[\/embed\]/gi, (_match, rawUrl) => replaceEmbed(_match, rawUrl));
}

function installStyles() {
  document.querySelectorAll('[data-local-preview-style]').forEach((node) => node.remove());
  const baseStyle = document.createElement('style');
  baseStyle.dataset.localPreviewStyle = 'local-preview-base';
  baseStyle.textContent = `
    widget-placeholder{display:block}
    .local-preview-error,.local-preview-missing{white-space:pre-wrap;padding:16px;margin:16px;border:1px solid #f97316;color:#f97316;background:#111}
  `;
  document.head.appendChild(baseStyle);
  const styles = [];
  for (const [filePath, css] of Object.entries(tokenModules)) {
    if (siteKey(filePath) === siteSlug) styles.push({ order: '00', filePath, css });
  }
  for (const [filePath, css] of Object.entries(cssModules)) {
    if (siteKey(filePath) === siteSlug) styles.push({ order: fileBase(filePath) === 'GLOBAL' ? '01' : `10-${fileBase(filePath)}`, filePath, css });
  }
  for (const [filePath, css] of Object.entries(widgetCssModules)) {
    if (siteKey(filePath) === siteSlug) styles.push({ order: `20-widget-${fileBase(filePath)}`, filePath, css });
  }
  for (const [filePath, css] of Object.entries(sharedCssModules)) {
    styles.push({ order: `90-shared-${fileBase(filePath)}`, filePath, css });
  }
  styles.sort((a, b) => a.order.localeCompare(b.order)).forEach(({ filePath, css }) => {
    const style = document.createElement('style');
    style.dataset.localPreviewStyle = filePath;
    style.textContent = rewriteAssetRefs(css);
    document.head.appendChild(style);
  });
}

function pageBySlug(slug) {
  return pageModules[`../../sites/${siteSlug}/pages/${slug}.html`] || null;
}

function staticSlugForPath(pathname) {
  const entries = Object.entries(siteConfig.staticPages || {});
  return entries.find(([, value]) => value === pathname)?.[0] || null;
}

function dynamicForPath(pathname) {
  return (siteConfig.dynamicPages || []).find((page) => page.path === pathname) || null;
}

function shell(inner) {
  return [
    '<widget-placeholder data-widget-id="site-header"></widget-placeholder>',
    inner,
    '<widget-placeholder data-widget-id="site-footer"></widget-placeholder>'
  ].join('\n');
}

function ensureChrome(inner) {
  let next = inner.trim();
  if (!/data-widget-id=["']site-header["']/.test(next)) {
    next = `<widget-placeholder data-widget-id="site-header"></widget-placeholder>\n${next}`;
  }
  if (!/data-widget-id=["']site-footer["']/.test(next)) {
    next = `${next}\n<widget-placeholder data-widget-id="site-footer"></widget-placeholder>`;
  }
  return next;
}

function dynamicHtml(page) {
  if (page.type === 'docs-list') {
    return shell(`<widget-placeholder data-widget-id="docs-list" data-docs-group="${page.arg || 'blog'}" data-docs-category="${page.arg || 'blog'}"></widget-placeholder>`);
  }
  if (page.type === 'docs-article') {
    return shell('<widget-placeholder data-widget-id="docs-article"></widget-placeholder>');
  }
  if (page.type === 'lead') {
    return shell(`<widget-placeholder data-widget-id="lead-form" data-form-kind="${page.arg || 'inquiry'}"></widget-placeholder>`);
  }
  return shell(`<main class="local-preview-missing">Unsupported dynamic page: ${page.type}</main>`);
}

function htmlForRoute(pathname) {
  const slug = staticSlugForPath(pathname);
  if (slug) {
    const html = pageBySlug(slug);
    if (html) return ensureChrome(extractBody(html));
  }
  const dynamic = dynamicForPath(pathname);
  if (dynamic) return dynamicHtml(dynamic);
  const homeSlug = staticSlugForPath('/') || 'home';
  return pageBySlug(homeSlug) ? extractBody(pageBySlug(homeSlug)) : '<main>Page not found.</main>';
}

function widgetHtml(id) {
  return htmlWidgetModules[`../../sites/${siteSlug}/widgets/${id}.html`] || null;
}

function widgetImporter(id) {
  return reactWidgetModules[`../../sites/${siteSlug}/widgets/${id}.jsx`]
    || sharedReactWidgetModules[`../../shared/widgets/${id}.jsx`]
    || null;
}

function widgetConstants(id) {
  return siteConfig?.widgetConstants?.[id] || {};
}

function installApi() {
  const categories = documentsPayload.categories || [];
  const documents = documentsPayload.documents || [];
  const normalizeList = (rows, contentLength) => rows.map((doc) => ({
    ...doc,
    thumbUrl: doc.thumbUrl ? rewriteExternalImageRefs(doc.thumbUrl) : doc.thumbUrl,
    content: contentLength && doc.content ? String(doc.content).replace(/<[^>]+>/g, '').slice(0, contentLength) : rewriteExternalImageRefs(normalizeDocumentEmbeds(doc.content))
  }));
  globalThis.API = {
    async Docs_GetCategories() {
      return { categories };
    },
    async Docs_GetDocumentList(params = {}) {
      const start = Number(params.startOffset || 0);
      const limit = Number(params.limit || 50);
      let rows = documents.slice();
      if (params.type) rows = rows.filter((doc) => doc.type === params.type);
      if (params.categoryId) rows = rows.filter((doc) => doc.categoryId === params.categoryId || (doc.categoryIds || []).includes(params.categoryId));
      rows = rows.slice(start, start + limit);
      return { documents: normalizeList(rows, params.contentLength) };
    },
    async Docs_GetDocument(id) {
      const found = documents.find((doc) => doc.id === id);
      const document = found ? {
        ...found,
        thumbUrl: found.thumbUrl ? rewriteExternalImageRefs(found.thumbUrl) : found.thumbUrl,
        content: rewriteExternalImageRefs(normalizeDocumentEmbeds(found.content))
      } : null;
      if (!document) throw new Error(`Local preview document not found: ${id}`);
      return { document };
    },
    async Chat_Message(message, conversationId) {
      return { conversationId: conversationId || 'local-preview', message: `로컬 프리뷰 응답: ${message}` };
    },
    async ToolCall(name, payload) {
      console.info('[local-preview] ToolCall', name, payload);
      return { ok: true };
    },
    async Site_SendEmailToAdmin(subject, body, durationMS) {
      console.info('[local-preview] Site_SendEmailToAdmin', { subject, body, durationMS });
      return { ok: true };
    }
  };
}

function scrollToHash(hash) {
  if (!hash) return false;
  let el;
  try { el = document.querySelector(hash); } catch (_) { return false; }
  if (el) { el.scrollIntoView({ behavior: 'smooth' }); return true; }
  return false;
}

function enhanceLinks() {
  rootEl.querySelectorAll('a[href^="/"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      event.preventDefault();
      // Same-page anchor: scroll instead of re-render (preserve hash).
      if (url.pathname === routePath && url.search === routeSearch && url.hash) {
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        scrollToHash(url.hash);
        return;
      }
      window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
      routePath = url.pathname;
      routeSearch = url.search;
      render();
      if (url.hash) setTimeout(() => scrollToHash(url.hash), 60);
    });
  });
}

async function mountWidgets() {
  for (const root of roots.values()) root.unmount();
  roots.clear();

  rootEl.querySelectorAll('widget-placeholder[data-widget-id]').forEach((placeholder) => {
    const id = placeholder.getAttribute('data-widget-id');
    const html = widgetHtml(id);
    if (html) placeholder.innerHTML = rewriteAssetRefs(html);
  });

  const placeholders = Array.from(rootEl.querySelectorAll('widget-placeholder[data-widget-id]'));
  await Promise.all(placeholders.map(async (placeholder, index) => {
    const id = placeholder.getAttribute('data-widget-id');
    const importer = widgetImporter(id);
    if (!importer) return;
    try {
      const mod = await importer();
      const root = createRoot(placeholder);
      roots.set(`${id}-${index}`, root);
      const constants = widgetConstants(id);
      function LocalWidgetWithConstants() {
        globalThis.Constants = constants;
        return React.createElement(mod.default);
      }
      root.render(React.createElement(LocalWidgetWithConstants));
    } catch (error) {
      console.error(`[local-preview] failed to mount widget ${id}`, error);
      placeholder.innerHTML = `<pre class="local-preview-error">Widget ${id} failed: ${error.message}</pre>`;
    }
  }));
}

async function render() {
  window.history.replaceState(window.history.state, '', `${routePath}${routeSearch}`);
  rootEl.innerHTML = rewriteAssetRefs(htmlForRoute(routePath));
  await mountWidgets();
  enhanceLinks();
  if (window.OMI18N && window.__OM_PACK__) window.OMI18N.setLocale(window.OMI18N.locale());
  if (window.__omLucide) window.__omLucide();
}

async function boot() {
  const configRes = await fetch('/__local_preview/config.json');
  const config = await configRes.json();
  siteSlug = config.siteSlug;
  siteConfig = config.siteConfig;
  const docsRes = await fetch('/__local_preview/documents.json');
  documentsPayload = await docsRes.json();
  installStyles();
  installApi();
  const siteScript = await fetch('/__local_preview/site-script.js').then((res) => res.text()).catch(() => '');
  if (siteScript && !siteScriptLoaded) {
    siteScriptLoaded = true;
    const script = document.createElement('script');
    script.textContent = siteScript;
    document.head.appendChild(script);
  }
  window.addEventListener('popstate', () => {
    routePath = window.location.pathname;
    routeSearch = window.location.search;
    render();
  });
  await render();
}

boot().catch((error) => {
  console.error(error);
  rootEl.innerHTML = `<pre class="local-preview-error">${error.stack || error.message}</pre>`;
});
