# Namo Migration Kit Instructions

## 협업 실행 환경

- cduo 같은 다중 에이전트 오케스트레이션에서 실행 중이면 현재 세션이 주입한 협업 지침을 따른다.
- 이 파일은 shareable kit에 포함되므로 특정 로컬 사용자 경로를 include하지 않는다.

## 지침 관리 원칙

- 새 지침을 추가하기 전에 기존 섹션에 같은 계약이 있는지 확인한다.
- 같은 결론은 가장 높은 우선순위의 한 곳에만 둔다. 하위 섹션에는 예외, 절차, 검증 방법만 남긴다.
- 파일명/사이트명 사례보다 데이터 계약, 런타임 계약, 검증 기준을 먼저 쓴다.
- 사이트별 교훈은 범용 원칙으로 승격 가능한지 먼저 검토한다. 특정 사이트에만 남길 때는 그 이유가 분명해야 한다.
- 검증 기준으로 이어지지 않는 표면 규칙은 줄이거나 제거한다.
- 공개 사용자 문서는 한국어, English, 日本語 순서로 작성한다. 코드 주석과 agent 실행 지침은 필요한 경우 한국어를 기본으로 유지할 수 있다.

## Sitebuilder 작업 모델

### 레이어

사이트는 다음 단위로 나눠 관리한다.

| 레이어 | 범위 | MCP 도구 |
| --- | --- | --- |
| site_data | 전역 설정, 메뉴, 메타, Site CSS/JS | `update_site_css`, `update_site_js`, `update_site_metadata` |
| pages | 라우트별 body HTML, Page CSS, 인증/메뉴 설정 | `create_page`, `update_page_html`, `update_page_css`, `update_page_info` |
| widgets | 반복 UI, 인터랙션, 문서 목록/상세 | `create_widget`, `update_widget` |
| documents/categories | 뉴스, 블로그, 사례, 가격, 반복 운영 콘텐츠 | admin ZIP `documents.json` MERGE |
| storage-files/assets | 이미지, 폰트, CSS 참조 파일 | ZIP assets 또는 asset MCP |

Page HTML은 `<body>` 내부만 가진다. `<style>`은 Page/Site CSS로 분리한다. 단, React 위젯 내부 `<style>`은 런타임 격리 목적일 때 허용한다.

### 로컬 먼저, 업로드 나중

1. 로컬 source(`sites/<site>/pages`, `widgets`, `css-split`, `documents.extra.json`)에서 구현한다.
2. `SITE=<site> npm run dev`로 Namo preview runtime에서 확인한다.
3. `SITE=<site> npm run pack`로 admin ZIP을 만든다.
4. ZIP 산출물 기준으로 페이지, 위젯, 문서, 자산 URL을 검증한다.
5. MCP 직접 업로드가 필요한 경우에만 Sitebuilder 도구를 사용하고, 기존 Site CSS/JS는 먼저 읽어 보존한다.

실제 `sites/<site>` 마이그레이션 산출물은 기본적으로 로컬 작업물이다. 공개/협업용 git에는 공통 런타임, 공통 스크립트, shared 위젯, `_template`, `sample/` 예시를 공유하고, 특정 사이트 소스/문서/assets와 과거 일회성 도구는 명시적으로 요청된 경우에만 포함한다.

### Sitebuilder 런타임 제약

- React 위젯은 ES module `export default` 형식으로 작성한다.
- TypeScript 타입, npm package import, dynamic import, Next.js SSR, shadcn/MagicUI/Framer Motion/R3F는 Sitebuilder 런타임에 직접 올리지 않는다. 필요한 경우 CDN+`window` 객체 또는 별도 Vercel/Netlify 배포를 쓴다.
- 자동 제공 hook은 제한적이다. `useId`는 전역 제공을 가정하지 말고 `React.useId` 폴백을 둔다.
- 위젯은 props를 받지 않는다. placeholder의 `data-*`를 런타임에 읽는다.
- `create_widget`는 명시적 `widgetId`를 사용한다. `update_widget.constants`는 merge가 아니라 전체 교체다.
- `constants`는 10KB 하드 제한으로 본다. 큰 데이터는 문서/JSON asset/placeholder JSON로 분리한다.
- 위젯 간 상태 공유와 코드 import를 전제로 쪼개지 않는다. 재사용은 데이터 계약과 공통 CSS 계약으로 만든다.

## 콘텐츠와 문서 모델

### 원칙

- 운영자가 바꿀 가능성이 있는 반복 콘텐츠는 정적 HTML보다 documents + widget을 우선 검토한다. 예: 뉴스, 리소스, 고객 사례, 가격 플랜, FAQ, 후기, 로고 목록.
- 약관, 개인정보 처리방침, 특상법 표기처럼 길고 운영성인 정적 본문도 documents 대상으로 본다. 페이지 HTML의 긴 `data-content`나 assets JSON fetch로 두지 말고 `type:"LEGAL"` 같은 문서 + `data-doc-id` + `Docs_GetDocument`로 렌더한다.
- 레이아웃 자체가 핵심이고 수정 빈도가 낮은 마케팅 섹션은 HTML 유지가 가능하다.
- 문서 컬렉션은 `type`으로 분리한다. 예: `ARTICLE`, `JSON`, `FOUNDER`, `TESTIMONIAL`, `CUSTOMER`, `PLAN`.
- 뉴스/최근글 위젯은 서버 필터를 쓰더라도 클라이언트에서 `doc.type === "ARTICLE"`와 `state === "PUBLISHED"`를 다시 확인한다.
- `Docs_GetDocumentList`는 기본 정렬을 믿지 않는다. 라이브에서 날짜가 아니라 문서 ID/저장 순서에 가까운 순서로 반환될 수 있고, import 후 `updated`는 전체 문서가 같은 시각으로 덮일 수 있다. 최신순 UI는 의미 있는 발행일 필드(`created` 등)를 기준으로, 충분히 넉넉히 가져온 뒤 클라이언트에서 desc 정렬 후 slice한다.
- 서버 offset 페이지네이션이나 `data.total`은 API가 정렬까지 보장할 때만 최신순 목록에 쓴다. 반환 순서가 검증되지 않았으면 작은 `limit` 창을 먼저 받은 뒤 정렬하지 않는다. 최신 문서가 fetch window 밖에 있으면 레일/목록 정렬이 서로 달라진다.
- `Docs_SearchDocuments` 같은 전용 검색 API는 라이브 인증/세션 요구와 한국어·카테고리 결과를 확인한 뒤 쓴다. 실패하거나 세션 의존이면 `Docs_GetDocumentList` 기반 클라이언트 검색을 유지한다.
- `categoryId`는 단수다. 여러 카테고리 UI가 필요하면 카테고리별 호출 후 merge하거나 문서의 `categoryIds`를 클라이언트에서 해석한다.
- 상세 글은 글마다 페이지를 만들지 말고 `/article` 같은 공용 상세 라우트 1개 + document 데이터로 처리한다.
- 사이트별 추가 문서는 `sites/<site>/documents.extra.json`에 두고 build/import 단계에서 `documents.json`에 병합한다. 로컬 preview도 같은 데이터를 읽어야 한다.
- JSON 파일은 추출/빌드 중간 source로만 쓸 수 있다. 라이브 위젯이 운영 콘텐츠를 `/storage-files/assets/*.json`로 직접 fetch하게 만들지 않는다.

### 문서 ID와 원본 데이터

- `ARTICLE` document ID는 source JSON부터 최종 산출물까지 운영용 난수형 ID(예: 20자리 hex 또는 `doc-*`)를 쓴다. 원본이 WordPress export여도 `wp-*`, post id, source host, 의미론적 slug를 ID에 노출하지 않는다.
- `LEGAL` 등 운영 관리용 JSON 문서는 사람이 추적하기 쉬운 semantic ID를 허용한다. 단, 뉴스/블로그 URL이나 최근글 큐레이션에 섞이는 `ARTICLE`에는 적용하지 않는다.
- 원본 추적이 필요하면 source 파일이나 추출 스크립트에서만 유지하고, 최종 산출 문서에는 운영에 필요한 필드만 둔다.
- 외부 원문 링크가 제품 요구가 아니면 `sourceUrl`을 산출 문서에 남기지 않는다.
- 원본 반복 섹션을 문서화할 때 copy, 이미지, 우선순위, 표시 순서는 문서 데이터에 두고 위젯은 렌더링과 인터랙션만 담당한다.
- WordPress/Tistory 계열 본문은 원본 HTML을 그대로 운영 문서에 넣지 않는다. `wp:*` 주석, shortcode, 깨진 `onerror`, inline style/data 속성, lazy-load 잔재를 source 정리와 build 정제 양쪽에서 제거한다. YouTube embed는 iframe 등 명시적 렌더 구조로 변환하고, 일반 출처 링크는 링크로 유지한다.

## 자산 계약

- 최종 라이브 HTML/CSS/document content/widget output은 외부 원문 이미지에 의존하지 않는다. 원문 이미지와 비디오는 assets로 미러링한 뒤 Firebase storage URL로 치환한다.
- 문서 본문(`content`)과 썸네일(`thumbUrl`)의 외부 이미지도 page asset과 별개로 다운로드/치환한다.
- `thumbUrl`은 형식 검증과 실제 로드 실패를 둘 다 방어한다. 깨진 URL은 source/build/mirror 단계에서 `null` 또는 본문 첫 유효 이미지로 backfill하고, 카드/히어로 위젯은 `onError` fallback으로 Storage 누락/404 시 로고나 빈 썸네일을 렌더한다.
- 썸네일 backfill, dead 이미지 제거, embed 변환 같은 데이터 보정은 source 파일만 고치지 말고 extract/mirror/build 스크립트에도 영구화한다. 재실행 후 같은 오류가 되살아나지 않아야 한다.
- `siteId`는 asset Firebase URL에 포함된다. siteId 변경 후에는 반드시 전체 rebuild한다.
- HTML/CSS/React 위젯 코드/위젯 constants의 `/storage-files/assets/...`는 build가 치환한다. 이미지 경로는 런타임에서 hostname/siteId를 추론하지 말고 source에 리터럴 자산 경로로 남긴다.
- 동적 파일명을 조립해야 하는 위젯은 build 치환 대상 밖이다. 가능하면 정적 배열에 `/storage-files/assets/<file>`을 직접 두고, 불가피하면 별도 검증으로 최종 산출물 URL을 확인한다.
- 언어별 이미지가 있으면 텍스트 locale과 같은 resolver로 전환한다.
- 대량 이미지 최적화는 재실행 가능한 CLI/스크립트 파이프라인으로 처리하고, 리포트/백업/skip-if-larger/참조 치환 결과를 남긴다.
- 블로그·마이그레이션 이미지의 기본 최적화 기준은 별도 요구가 없으면 최대 변 1280px, JPEG/WebP quality 75를 우선한다. PNG 투명도가 운영상 의미 없으면 흰 배경 JPG로 치환하고, GIF는 animated WebP로 변환한 뒤 문서/HTML 참조도 함께 바꾼다.
- 최적화 도구의 임시 산출물이 source assets나 ZIP staging에 들어가지 않게 제거한다.

## CSS와 UI 계약

- 여러 페이지에서 쓰는 토큰, 공통 레이아웃, 공통 위젯 스타일, keyframes는 Site/GLOBAL CSS에 둔다. Page CSS는 진짜 페이지 고유 예외만 둔다.
- Site CSS 하드 한도는 20,000자 수준으로 보고, 전역에는 토큰과 진짜 공통 클래스만 둔다.
- 특정 위젯에서만 쓰는 CSS는 `widgets/<widget-id>.css` 또는 위젯 내부 `<style>`로 분리할 수 있다. 여러 위젯이 공유하는 카드, 페이지네이션, 스켈레톤, 본문 타이포 같은 계약은 GLOBAL에 남긴다.
- 같은 위젯도 섹션 래퍼, 배경, 패딩, max-width가 다르면 다르게 보인다. 반복 섹션은 공통 밴드/폭/헤딩 스케일 계약을 맞춘다.
- 섹션 콘텐츠 폭은 공유 변수나 공통 wrapper로 맞춘다.
- 전역 `word-break: keep-all`이 카드 본문에 새면 긴 일본어/영문에서 overflow가 난다. 카드 제목/본문에는 필요 시 `overflow-wrap:anywhere; word-break:normal` 예외를 둔다.
- 폰트 아이콘은 폰트 실패 시 아이콘명이 텍스트로 샐 수 있다. 중요한 아이콘은 inline SVG를 우선한다.
- SVG 배경 패턴은 `preserveAspectRatio="none"`로 늘리지 않는다. 반복 패턴은 `patternUnits="userSpaceOnUse"`와 px tile을 쓴다.

## 원본 이식과 i18n

- 저장 원본을 진실원으로 삼는다. 이미 재작성한 `pages/*.html`을 다시 데이터화해 원본으로 삼지 않는다.
- 정독 → 정합 → 위젯화 순서로 진행한다. 원본 섹션 순서, 카드 수, 컬럼, 카피, 이미지 비율을 먼저 확정한다.
- "번역 없음", "원본과 동일" 같은 단정은 `rg`, 원본 HTML/JSON, 렌더 결과로 확인한 뒤 말한다.
- 이미지 원본 대조는 파일명만으로 판단하지 않는다. 이전 중 리네임이 있을 수 있으므로 가능하면 원본 이미지와 현재 assets의 byte hash/SHA를 비교한다.
- 내용 원본 대조는 렌더된 텍스트 추출로 확인한다. 원본 문장을 축약·의역한 상태는 "정합 완료"가 아니다.
- 로케일 소스가 없다고 성급히 단정하지 않는다. Polylang 매핑, Elementor kit content, 라이브 locale HTML을 함께 확인한다.
- 진짜 번역이 없을 때만 `en/ja=null` 같은 명시적 fallback 상태를 둔다. KO 미러를 번역처럼 채우지 않는다.
- i18n key는 의미 기반으로 둔다. 위치 기반 key 재사용은 다른 문구가 새는 원인이 된다.
- 비교 매트릭스는 체크마크를 추정하지 말고 원본 셀별 지원/미지원 값을 보존한다.
- split-title 조각은 locale별 띄어쓰기 규칙을 적용한다. KO 조사는 앞 조각에 붙고, JA는 무공백, EN은 공백이 기본이다.

## Import와 검증

### 빌드/Import

- admin ZIP import는 `documents.json`도 MERGE한다. 문서 이전은 Tool Script가 아니라 ZIP import를 기준으로 본다.
- 대형 사이트는 Firestore 문서 1MB 제한을 넘지 않게 page/widget/document/site_data를 나눈다.
- 큰 CSS/HTML은 반복 블록을 widget으로 분리하고, CSS는 Site CSS 또는 asset으로 분산한다.
- 위젯화 후 placeholder 사용처가 사라진 위젯 파일도 삭제한다. generic build는 `widgets/` 파일을 모두 패킹할 수 있으므로 unused widget이 남으면 중복 산출물이다.
- 사이트는 기본 미게시일 수 있다. preview는 `https://<siteId>.namo.site/`를 기준으로 확인한다.

### 로컬 Preview

- `staging/` 파일이나 page HTML을 브라우저로 직접 열지 않는다. placeholder, 위젯 CSS, Site/Page CSS, 문서 API mock이 빠져 실제 렌더와 다르다.
- repo 루트 preview runtime을 사용한다: `SITE=<site> npm run dev`.
- `site-header`/`site-footer`는 source page에 없어도 build/preview가 붙일 수 있다. 누락 판단은 preview 기준으로 한다.
- 로컬 preview는 source와 mock을 읽을 수 있고, ZIP staging은 최종 import payload다. preview가 오래된 `dist/.../staging/documents.json` 같은 stale 데이터를 우선하면 source 수정이 반영되지 않은 것처럼 보일 수 있으므로, 데이터가 이상하면 preview의 문서 소스 우선순위와 stale staging 존재 여부를 먼저 확인한다. 자산 URL 최종 판단은 ZIP 산출물 기준으로 한다.

### 필수 검증

- 패키징은 `SITE=<site> npm run pack` 계열 명령을 사용한다. 빌드 후 `scripts/verify-site-package.mjs`가 자동 실행되어 count, `missing:0`, Site CSS 20KB, siteId, 외부 원문 이미지 URL, 원본 시스템 ID, `sourceUrl`, 깨진 템플릿 리터럴 흔적을 검사한다.
- 브라우저 검증은 preview 서버에서 `SITE=<site> PREVIEW_URL=http://127.0.0.1:5173 npm run verify:preview`로 실행한다.
- 브라우저 기준: header/footer, 주요 heading, 위젯 콘텐츠 렌더, 문서 목록/상세 연결, broken images 0, console errors 0(라이브 CORS/HMR 노이즈 제외), 가로 overflow 0, locale 누수 0.
- UI/스크롤/탭/sticky 같은 동작은 실제 preview runtime에서 클릭/스크롤로 확인한다.
- 대형 asset 사이트를 pack할 때는 기존 `build-token-admin-zip`/`zip`/이미지 최적화 프로세스가 남아 있는지 확인한다. 실행 중인 zip이 staging assets를 읽고 있으면 clean/repack이 `ENOTEMPTY`로 실패할 수 있으므로 중복 pack을 피하고 프로세스 종료 후 재시도한다.

## 비자명 구현 노트

- `@keyframes`가 여러 위젯에서 필요하면 GLOBAL CSS에 둔다. 위젯 단독 애니메이션이면 reactCode 내부 `<style>`에 둬도 된다.
- 숨김 필드(폼 허니팟 등)의 숨김 CSS는 Page/Site CSS에도 있어야 ZIP/preview 경로에서 드러나지 않는다.
- GSAP pin은 명시적 pin 섹션 클래스에만 적용한다. pin 섹션 배경은 불투명해야 뒤 섹션이 비치지 않는다.
- 알림/외부 전송 채널은 `<br>`을 줄바꿈으로 취급하지 않고 한 줄로 collapse할 수 있다. HTML 메일과 평문 메신저를 모두 고려해 `<br>\n`를 병행한다.
- 빌드 템플릿 리터럴 안에서 출력 위젯 소스에 `\n`이 필요하면 `<br>\\n`처럼 escape한다.
