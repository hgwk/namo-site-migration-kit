# Namo Site Migration Kit

한국어 | [English](README.en.md) | [日本語](README.ja.md)

이 레포는 기존 웹사이트를 Namo/Sitebuilder import ZIP으로 재구성하기 위한 로컬 마이그레이션 키트입니다. 새 이식 작업은 `sites/_template`를 복사해서 시작합니다.

## npm으로 시작

```bash
npx @hgwk/nsmk create migration-work --site my-site --name "My Site"
cd migration-work
npm install
SITE=my-site npm run dev
```

## 빠른 시작

```bash
npm install
npm run init:site -- my-site --name "My Site"
```

필요하면 `sites/my-site/site.config.json`에서 site ID와 workspace ID를 바꿉니다.

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

## 사이트 폴더 계약

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

- `pages/*.html`: Page HTML body source. `<body>` wrapper가 있으면 build가 내부만 추출합니다.
- `css-split/GLOBAL.css`: 사이트 공통 CSS.
- `css-split/p-<slug>.css`: 페이지별 CSS.
- `widgets/*.html`: 정적 SSR 위젯.
- `widgets/*.jsx`: React 위젯.
- `assets/`: 빌드 가능한 소스 자산. `dist/`나 `_source/`에만 있는 자산에 의존하지 않습니다.
- `_source/`: 원본 export, 크롤 HTML, WordPress XML, 기존 사이트 ZIP 같은 로컬 원본 보관소. git에는 포함하지 않습니다.
- `_reports/`: 분석/검증 리포트 보관소. git에는 포함하지 않습니다.
- `_qa/`: 스크린샷, 비교 결과 같은 QA 산출물 보관소. git에는 포함하지 않습니다.
- `documents.extra.json`: `ARTICLE`, `JSON`, `PLAN`, `CUSTOMER` 등 운영 콘텐츠.

## 설정 메모

- `primarySiteId`는 import 대상 Namo site ID입니다. `TARGET_SITE_ID` 환경변수로 덮어쓸 수 있습니다.
- `wsId`는 workspace ID입니다. `WS_ID` 환경변수로 덮어쓸 수 있습니다.
- `builder: "generic"`은 새 사이트용 범용 빌더입니다.

## 공통 마이그레이션 도구

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

## 공개 repo와 사이트 import ZIP

`sample/`은 Namo 사이트에서 제공한 샘플 위젯 모음입니다. 공개 repo에는 참고용으로 포함합니다. 단, 특정 사이트를 Namo에 import하기 위해 `SITE=<site> npm run pack`으로 만드는 admin ZIP에는 `sample/`, README, 개발 스크립트가 들어가지 않습니다. 특정 사이트 이식 과정에서 사용한 과거/일회성 도구와 실제 사이트 산출물도 공개 repo에서 추적하지 않습니다.

## 릴리즈

npm 패키지는 로컬 `npm publish`가 아니라 GitHub Actions의 npm Trusted Publishing(OIDC)으로 배포합니다.

- GitHub repository: `hgwk/nsmk`
- npm package: `@hgwk/nsmk`
- workflow: `.github/workflows/release.yml`
- release tag는 `package.json`의 `version`과 같아야 합니다. 예: `v0.1.0`
- npm Trusted Publisher 설정: GitHub Actions / `hgwk` / `nsmk` / `release.yml` / environment 없음
