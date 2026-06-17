# Namo Site Migration Kit

[한국어](README.md) | English | [日本語](README.ja.md)

This repository is a local migration kit for rebuilding existing websites as Namo/Sitebuilder import ZIP packages. Start a new migration by copying `sites/_template`.

## Start From npm

```bash
npx @hgwk/nsmk create migration-work --site my-site --name "My Site"
cd migration-work
npm install
SITE=my-site npm run dev
```

## Quick Start

```bash
npm install
npm run init:site -- my-site --name "My Site"
```

If needed, update the site ID and workspace ID in `sites/my-site/site.config.json`.

```json
{
  "builder": "generic",
  "slug": "my-site",
  "name": "My Site",
  "primarySiteId": "namo-site-id",
  "wsId": "workspace-id",
  "sourceDir": "sites/my-site"
}
```

```bash
SITE=my-site npm run dev
SITE=my-site npm run pack
SITE=my-site npm run verify:package
SITE=my-site PREVIEW_URL=http://127.0.0.1:5173 npm run verify:preview
```

## Site Folder Contract

```text
sites/<site>/
├── site.config.json
├── tokens.css
├── css-split/
│   ├── GLOBAL.css
│   └── p-home.css
├── pages/
│   └── home.html
├── widgets/
│   ├── site-header.html
│   └── site-footer.html
├── assets/
│   └── ...
├── _source/
├── _reports/
├── _qa/
└── documents.extra.json
```

- `pages/*.html`: Page HTML body source. If a `<body>` wrapper exists, the build extracts only its inner HTML.
- `css-split/GLOBAL.css`: Site-wide CSS.
- `css-split/p-<slug>.css`: Page-specific CSS.
- `widgets/*.html`: Static SSR widgets.
- `widgets/*.jsx`: React widgets.
- `assets/`: Source assets used by the build. Do not depend on files that exist only in `dist/` or `_source/`.
- `_source/`: Local inbox for original exports, crawled HTML, WordPress XML, and existing site ZIPs. It is not committed to git.
- `_reports/`: Local analysis and verification reports. It is not committed to git.
- `_qa/`: Local screenshots and comparison results. It is not committed to git.
- `documents.extra.json`: Managed content such as `ARTICLE`, `JSON`, `PLAN`, and `CUSTOMER`.

## Configuration Notes

- `primarySiteId` is the target Namo site ID. Override it with `TARGET_SITE_ID`.
- `wsId` is the workspace ID. Override it with `WS_ID`.
- `builder: "generic"` selects the reusable builder for new sites.

## Common Migration Helpers

```bash
SITE=my-site npm run extract:wordpress -- --input sites/my-site/_source/export.xml
SITE=my-site npm run mirror:documents
SITE=my-site npm run optimize:assets
SITE=my-site npm run analyze:sitebuilder -- --input sites/my-site/_source/sitebuilder-export
npm run generate:dotted-map
```

- `extract:wordpress`: Extracts managed documents from a WordPress XML export.
- `mirror:documents`: Mirrors external images from document content/thumbnails into `sites/<site>/assets` and rewrites references to `/storage-files/assets/...`.
- `optimize:assets`: Optimizes image assets.
- `analyze:sitebuilder`: Analyzes a Sitebuilder export structure.
- `generate:dotted-map`: Regenerates the shared dotted world map widget data.

## Public Repo And Site Import ZIP

`sample/` contains sample widgets provided by Namo Site. It is included in the public repo for reference. It is not included in the Namo admin import ZIP created with `SITE=<site> npm run pack` for a specific site. README files and development scripts are also excluded from that admin ZIP. Site-specific one-off tools and real migration outputs are not tracked in the public repo.

## Release

The npm package is published from GitHub Actions through npm Trusted Publishing (OIDC), not from local `npm publish`.

- GitHub repository: `hgwk/nsmk`
- npm package: `@hgwk/nsmk`
- Workflow: `.github/workflows/release.yml`
- Release tags must match the version in `package.json`. Example: `v0.1.0`
- npm Trusted Publisher configuration: GitHub Actions / `hgwk` / `nsmk` / `release.yml` / no environment
