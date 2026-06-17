# Local Namo Preview

## 한국어

로컬 preview runtime은 Namo Sitebuilder의 page HTML, widget placeholder, split CSS, local assets, 위젯에서 쓰는 최소 document API를 흉내냅니다.

```bash
npm install
SITE=_template npm run dev
SITE=my-site npm run dev -- --port 5174
```

- 템플릿 기본 URL: `http://127.0.0.1:5173/`
- 커스텀 사이트 기본 URL: `http://127.0.0.1:5174/`

포트가 이미 사용 중이면 Vite가 다음 가능한 포트를 자동으로 선택합니다. dev server가 출력하는 `Local:` URL을 기준으로 확인합니다.

preview는 `sites/<site>/site.config.json`, `pages/`, `widgets/`, `css-split/`, `tokens.css`를 읽습니다. 문서 위젯은 `dist/<site>/<siteId>/staging/documents.json`이 있으면 먼저 사용하고, `sites/<site>/documents.extra.json`이 있으면 병합합니다.

이 runtime은 로컬 호환성 확인용입니다. 최종 Namo admin 승인이나 live QA를 대체하지 않습니다.

## English

The local preview runtime emulates Namo Sitebuilder page HTML, widget placeholders, split CSS, local assets, and the minimal document APIs used by widgets.

```bash
npm install
SITE=_template npm run dev
SITE=my-site npm run dev -- --port 5174
```

- Template default URL: `http://127.0.0.1:5173/`
- Custom site default URL: `http://127.0.0.1:5174/`

If a port is already occupied, Vite automatically picks the next available port. Use the `Local:` URL printed by the dev server.

The preview reads `sites/<site>/site.config.json`, `pages/`, `widgets/`, `css-split/`, and `tokens.css`. Document widgets use `dist/<site>/<siteId>/staging/documents.json` first when it exists, then merge `sites/<site>/documents.extra.json` if present.

This runtime is for local compatibility checks. It does not replace final Namo admin approval or live QA.

## 日本語

ローカル preview runtime は、Namo Sitebuilder の page HTML、widget placeholder、split CSS、local assets、widget が使う最小限の document API を再現します。

```bash
npm install
SITE=_template npm run dev
SITE=my-site npm run dev -- --port 5174
```

- テンプレートの既定 URL: `http://127.0.0.1:5173/`
- カスタムサイトの既定 URL: `http://127.0.0.1:5174/`

ポートが既に使われている場合、Vite は次に利用可能なポートを自動で選びます。dev server が出力する `Local:` URL を確認してください。

preview は `sites/<site>/site.config.json`, `pages/`, `widgets/`, `css-split/`, `tokens.css` を読み込みます。document widget は `dist/<site>/<siteId>/staging/documents.json` があれば先に使い、`sites/<site>/documents.extra.json` があればそれを merge します。

この runtime はローカル互換性確認用です。最終的な Namo admin 承認や live QA の代替ではありません。
