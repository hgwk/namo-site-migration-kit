import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const siteSlug = args.find((arg) => !arg.startsWith('--'));

if (!siteSlug) {
  throw new Error('Usage: npm run init:site -- <site-slug> [--name "Site Name"] [--site-id <namo-site-id>] [--ws-id <workspace-id>]');
}

if (!/^[a-z0-9][a-z0-9-]*$/i.test(siteSlug)) {
  throw new Error(`Invalid site slug "${siteSlug}". Use letters, numbers, and hyphens only.`);
}

function option(name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const siteName = option('name', titleFromSlug(siteSlug));
const siteId = option('site-id', 'replace-with-namo-site-id');
const wsId = option('ws-id', 'replace-with-workspace-id');
const templateDir = path.join(root, 'sites', '_template');
const targetDir = path.join(root, 'sites', siteSlug);

if (!existsSync(templateDir)) throw new Error(`Missing template directory: ${path.relative(root, templateDir)}`);
if (existsSync(targetDir)) throw new Error(`Target site already exists: ${path.relative(root, targetDir)}`);

await cp(templateDir, targetDir, { recursive: true });
await Promise.all([
  mkdir(path.join(targetDir, '_source'), { recursive: true }),
  mkdir(path.join(targetDir, '_reports'), { recursive: true }),
  mkdir(path.join(targetDir, '_qa'), { recursive: true }),
  mkdir(path.join(targetDir, 'assets'), { recursive: true }),
]);

const configPath = path.join(targetDir, 'site.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
config.slug = siteSlug;
config.name = siteName;
config.siteIds = [siteId];
config.primarySiteId = siteId;
config.wsId = wsId;
config.sourceDir = `sites/${siteSlug}`;
config.siteMetaData = {
  ...(config.siteMetaData || {}),
  title: siteName,
};
config.pageTitles = {
  ...(config.pageTitles || {}),
  home: 'Home',
};
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`Created ${path.relative(root, targetDir)}`);
console.log(`Source inbox: ${path.relative(root, path.join(targetDir, '_source'))}`);
console.log(`Next: SITE=${siteSlug} npm run dev`);
