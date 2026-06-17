# Namo Site Migration Kit

[한국어](README.md) | [English](README.en.md) | 日本語

このリポジトリは、既存サイトを Namo/Sitebuilder import ZIP として再構成するためのローカル移行キットです。新しい移行作業は `sites/_template` をコピーして始めます。

## npm から始める

```bash
npx @hgwk/nsmk create migration-work --site my-site --name "My Site"
cd migration-work
npm install
SITE=my-site npm run dev
```

## クイックスタート

```bash
npm install
npm run init:site -- my-site --name "My Site"
```

必要に応じて `sites/my-site/site.config.json` の site ID と workspace ID を変更します。

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
├── _source/
├── _reports/
├── _qa/
└── documents.extra.json
```

- `pages/*.html`: Page HTML の body source です。`<body>` wrapper がある場合、build は内部だけを抽出します。
- `css-split/GLOBAL.css`: サイト共通 CSS。
- `css-split/p-<slug>.css`: ページ別 CSS。
- `widgets/*.html`: 静的 SSR widget。
- `widgets/*.jsx`: React widget。
- `assets/`: build で使う source assets。`dist/` や `_source/` にしかない asset には依存しません。
- `_source/`: original export、crawl HTML、WordPress XML、既存サイト ZIP などのローカル保管場所。git には含めません。
- `_reports/`: analysis / verification report のローカル保管場所。git には含めません。
- `_qa/`: screenshot や比較結果などの QA output のローカル保管場所。git には含めません。
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

## 公開 repo とサイト import ZIP

`sample/` は Namo Site が提供したサンプル widget 集です。参考用として公開 repo に含めます。ただし、特定サイトを Namo に import するために `SITE=<site> npm run pack` で作る admin ZIP には `sample/` は入りません。README や開発 scripts も admin ZIP には入りません。サイト固有の一回限りの tool や実際の移行成果物も公開 repo では追跡しません。
