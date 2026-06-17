# Namo Site Migration Kit

## 한국어

이 레포는 기존 웹사이트를 Namo/Sitebuilder import ZIP으로 재구성하기 위한 로컬 마이그레이션 키트입니다. 새 이식 작업은 `sites/_template`를 복사해서 시작합니다.

### 빠른 시작

```bash
npm install
cp -R sites/_template sites/my-site
```

`sites/my-site/site.config.json`에서 최소값을 바꿉니다.

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

### 사이트 폴더 계약

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
└── documents.extra.json
```

- `pages/*.html`: Page HTML body source. `<body>` wrapper가 있으면 build가 내부만 추출합니다.
- `css-split/GLOBAL.css`: 사이트 공통 CSS.
- `css-split/p-<slug>.css`: 페이지별 CSS.
- `widgets/*.html`: 정적 SSR 위젯.
- `widgets/*.jsx`: React 위젯.
- `assets/`: 빌드 가능한 소스 자산. `dist/`나 `_source/`에만 있는 자산에 의존하지 않습니다.
- `documents.extra.json`: `ARTICLE`, `JSON`, `PLAN`, `CUSTOMER` 등 운영 콘텐츠.

### 설정 메모

- `primarySiteId`는 import 대상 Namo site ID입니다. `TARGET_SITE_ID` 환경변수로 덮어쓸 수 있습니다.
- `wsId`는 workspace ID입니다. `WS_ID` 환경변수로 덮어쓸 수 있습니다.
- `builder: "generic"`은 새 사이트용 범용 빌더입니다.

### 공통 마이그레이션 도구

```bash
SITE=my-site npm run extract:wordpress -- --input sites/my-site/_source/export.xml
SITE=my-site npm run mirror:documents
SITE=my-site npm run optimize:assets
SITE=my-site npm run analyze:sitebuilder -- --input sites/my-site/_source/sitebuilder-export
npm run generate:dotted-map
```

- `extract:wordpress`: WordPress XML에서 운영 문서를 추출합니다.
- `mirror:documents`: 문서 본문/썸네일의 외부 이미지를 `sites/<site>/assets`로 미러링하고 `/storage-files/assets/...` 참조로 치환합니다.
- `optimize:assets`: 이미지 자산을 최적화합니다.
- `analyze:sitebuilder`: Sitebuilder export 구조를 분석합니다.
- `generate:dotted-map`: 점 세계지도 공유 위젯 데이터를 재생성합니다.

### 공개 repo와 kit 패키지

`sample/`은 위젯 API와 문서 API 사용 예시로 공개 repo에는 보관하지만 shareable kit tarball에는 포함하지 않습니다. 특정 사이트 이식 과정에서 사용한 과거/일회성 도구와 실제 사이트 산출물은 공개 repo에서 추적하지 않습니다.

```bash
npm run pack:kit
```

산출물은 `dist/namo-migration-kit.tar.gz`입니다. 이 tarball에는 `sites/_template`, 로컬 preview runtime, shared widgets, common migration helpers, build/verify scripts만 들어갑니다.

## English

This repository is a local migration kit for rebuilding existing websites as Namo/Sitebuilder import ZIP packages. Start a new migration by copying `sites/_template`.

### Quick Start

```bash
npm install
cp -R sites/_template sites/my-site
```

Update the minimum values in `sites/my-site/site.config.json`.

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

### Site Folder Contract

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
└── documents.extra.json
```

- `pages/*.html`: Page HTML body source. If a `<body>` wrapper exists, the build extracts only its inner HTML.
- `css-split/GLOBAL.css`: Site-wide CSS.
- `css-split/p-<slug>.css`: Page-specific CSS.
- `widgets/*.html`: Static SSR widgets.
- `widgets/*.jsx`: React widgets.
- `assets/`: Source assets used by the build. Do not depend on files that exist only in `dist/` or `_source/`.
- `documents.extra.json`: Managed content such as `ARTICLE`, `JSON`, `PLAN`, and `CUSTOMER`.

### Configuration Notes

- `primarySiteId` is the target Namo site ID. Override it with `TARGET_SITE_ID`.
- `wsId` is the workspace ID. Override it with `WS_ID`.
- `builder: "generic"` selects the reusable builder for new sites.

### Common Migration Helpers

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

### Public Repo And Kit Package

`sample/` is kept in the public repo as widget/API examples, but it is excluded from the shareable kit tarball. Site-specific one-off tools and real migration outputs are not tracked in the public repo.

```bash
npm run pack:kit
```

The output is `dist/namo-migration-kit.tar.gz`. It contains only `sites/_template`, the local preview runtime, shared widgets, common migration helpers, and build/verify scripts.

## 日本語

このリポジトリは、既存サイトを Namo/Sitebuilder import ZIP として再構成するためのローカル移行キットです。新しい移行作業は `sites/_template` をコピーして始めます。

### クイックスタート

```bash
npm install
cp -R sites/_template sites/my-site
```

`sites/my-site/site.config.json` の最小設定を変更します。

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

### サイトフォルダ契約

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
└── documents.extra.json
```

- `pages/*.html`: Page HTML の body source です。`<body>` wrapper がある場合、build は内部だけを抽出します。
- `css-split/GLOBAL.css`: サイト共通 CSS。
- `css-split/p-<slug>.css`: ページ別 CSS。
- `widgets/*.html`: 静的 SSR widget。
- `widgets/*.jsx`: React widget。
- `assets/`: build で使う source assets。`dist/` や `_source/` にしかない asset には依存しません。
- `documents.extra.json`: `ARTICLE`, `JSON`, `PLAN`, `CUSTOMER` などの運用コンテンツ。

### 設定メモ

- `primarySiteId` は import 先の Namo site ID です。`TARGET_SITE_ID` 環境変数で上書きできます。
- `wsId` は workspace ID です。`WS_ID` 環境変数で上書きできます。
- `builder: "generic"` は新規サイト向けの汎用 builder です。

### 共通移行ツール

```bash
SITE=my-site npm run extract:wordpress -- --input sites/my-site/_source/export.xml
SITE=my-site npm run mirror:documents
SITE=my-site npm run optimize:assets
SITE=my-site npm run analyze:sitebuilder -- --input sites/my-site/_source/sitebuilder-export
npm run generate:dotted-map
```

- `extract:wordpress`: WordPress XML export から運用 documents を抽出します。
- `mirror:documents`: document 本文/thumbnail の外部画像を `sites/<site>/assets` にミラーし、参照を `/storage-files/assets/...` に書き換えます。
- `optimize:assets`: 画像 assets を最適化します。
- `analyze:sitebuilder`: Sitebuilder export 構造を分析します。
- `generate:dotted-map`: 共有の dotted world map widget data を再生成します。

### 公開 repo と kit package

`sample/` は widget/API の例として公開 repo に残しますが、shareable kit tarball には含めません。サイト固有の一回限りの tool や実際の移行成果物は公開 repo では追跡しません。

```bash
npm run pack:kit
```

出力は `dist/namo-migration-kit.tar.gz` です。この tarball には `sites/_template`, local preview runtime, shared widgets, common migration helpers, build/verify scripts だけが含まれます。
