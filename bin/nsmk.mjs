#!/usr/bin/env node
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'help';

const kitEntries = [
  'AGENTS.md',
  'LOCAL_PREVIEW.md',
  'README.md',
  'README.en.md',
  'README.ja.md',
  'index.html',
  'package-lock.json',
  'package.json',
  'vite.config.mjs',
  'sample',
  'scripts',
  'shared',
  'sites/_template',
  'src',
];

function usage() {
  return [
    'Usage:',
    '  nsmk create <directory> [--site <site-slug>] [--name "Site Name"] [--site-id <namo-site-id>] [--ws-id <workspace-id>]',
    '  nsmk init <site-slug> [--name "Site Name"] [--site-id <namo-site-id>] [--ws-id <workspace-id>]',
    '',
    'Examples:',
    '  npx nsmk create migration-work --site my-site --name "My Site"',
    '  npx nsmk init my-site --name "My Site"',
  ].join('\n');
}

function option(argv, name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] || fallback : fallback;
}

function firstPositional(argv) {
  return argv.find((arg) => !arg.startsWith('--')) || '';
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function assertSlug(slug) {
  if (!slug) throw new Error('Missing site slug.');
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    throw new Error(`Invalid site slug "${slug}". Use letters, numbers, and hyphens only.`);
  }
}

async function copyKit(targetDir) {
  if (existsSync(targetDir)) throw new Error(`Target directory already exists: ${targetDir}`);
  await mkdir(targetDir, { recursive: true });
  for (const entry of kitEntries) {
    const source = path.join(packageRoot, entry);
    if (!existsSync(source)) continue;
    await cp(source, path.join(targetDir, entry), { recursive: true });
  }
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  packageJson.name = path.basename(targetDir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'namo-migration-work';
  packageJson.private = true;
  delete packageJson.bin;
  delete packageJson.files;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  await ensureClaudeSymlink(targetDir);
}

async function ensureClaudeSymlink(rootDir) {
  const claudePath = path.join(rootDir, 'CLAUDE.md');
  if (existsSync(claudePath)) await rm(claudePath, { force: true });
  try {
    await symlink('AGENTS.md', claudePath);
  } catch {
    await writeFile(claudePath, await readFile(path.join(rootDir, 'AGENTS.md'), 'utf8'));
  }
}

async function initSite(rootDir, siteSlug, argv) {
  assertSlug(siteSlug);
  const templateDir = path.join(rootDir, 'sites', '_template');
  const targetDir = path.join(rootDir, 'sites', siteSlug);
  if (!existsSync(templateDir)) throw new Error(`Missing template directory: ${path.relative(rootDir, templateDir)}`);
  if (existsSync(targetDir)) throw new Error(`Target site already exists: ${path.relative(rootDir, targetDir)}`);

  const siteName = option(argv, 'name', titleFromSlug(siteSlug));
  const siteId = option(argv, 'site-id', 'replace-with-namo-site-id');
  const wsId = option(argv, 'ws-id', 'replace-with-workspace-id');

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
  return targetDir;
}

try {
  if (command === 'create') {
    const argv = args.slice(1);
    const targetArg = firstPositional(argv);
    if (!targetArg) throw new Error('Missing target directory.');
    const targetDir = path.resolve(cwd, targetArg);
    await copyKit(targetDir);
    const siteSlug = option(argv, 'site', '');
    if (siteSlug) {
      await initSite(targetDir, siteSlug, argv);
      console.log(`Created ${path.relative(cwd, targetDir)}`);
      console.log(`Created site ${siteSlug}`);
      console.log(`Next: cd ${path.relative(cwd, targetDir)} && npm install && SITE=${siteSlug} npm run dev`);
    } else {
      console.log(`Created ${path.relative(cwd, targetDir)}`);
      console.log(`Next: cd ${path.relative(cwd, targetDir)} && npm install && npm run init:site -- my-site`);
    }
  } else if (command === 'init') {
    const argv = args.slice(1);
    const siteSlug = firstPositional(argv);
    const targetDir = await initSite(cwd, siteSlug, argv);
    console.log(`Created ${path.relative(cwd, targetDir)}`);
    console.log(`Source inbox: ${path.relative(cwd, path.join(targetDir, '_source'))}`);
    console.log(`Next: SITE=${siteSlug} npm run dev`);
  } else if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
  } else {
    throw new Error(`Unknown command "${command}".\n\n${usage()}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
