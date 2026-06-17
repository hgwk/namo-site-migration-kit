# Namo Site Migration Kit

[한국어](README.md) | [English](README.en.md) | 日本語

このリポジトリは、既存サイトを Namo/Sitebuilder import ZIP として再構成するためのローカル移行キットです。新しい移行作業は `sites/_template` をコピーして始めます。

## クイックスタート

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

## サイトフォルダ契約

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

## 設定メモ

- `primarySiteId` は import 先の Namo site ID です。`TARGET_SITE_ID` 環境変数で上書きできます。
- `wsId` は workspace ID です。`WS_ID` 環境変数で上書きできます。
- `builder: "generic"` は新規サイト向けの汎用 builder です。

## 共通移行ツール

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

## 公開 repo と kit package

`sample/` は widget/API の例として公開 repo に残しますが、shareable kit tarball には含めません。サイト固有の一回限りの tool や実際の移行成果物は公開 repo では追跡しません。

```bash
npm run pack:kit
```

出力は `dist/namo-migration-kit.tar.gz` です。この tarball には `sites/_template`, local preview runtime, shared widgets, common migration helpers, build/verify scripts だけが含まれます。
