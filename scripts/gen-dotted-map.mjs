// 빌드 타임 1회 실행: svg-dotted-map 으로 정확한 점 세계지도 좌표를 미리 계산해
// shared/widgets/dotted-map.jsx 에 정적 baking. → 런타임 네트워크/npm 의존 없이 Namo에서 정확한 월드맵 렌더.
// 마커 변경/재생성: node scripts/gen-dotted-map.mjs
import { createMap } from 'svg-dotted-map';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const W = 150, H = 75;
const { points, addMarkers } = createMap({ width: W, height: H, mapSamples: 5000 });
const markers = addMarkers([
  { lat: 37.5665, lng: 126.978, size: 1.5 }, // 한국 (서울)
  { lat: 38.9, lng: -77.04, size: 1.5 },      // 미국 (워싱턴 D.C.)
]);

const round = (n) => Math.round(n * 100) / 100;
const POINTS = points.map((p) => [round(p.x), round(p.y)]);
const MARKERS = markers.map((m) => ({ x: round(m.x), y: round(m.y), size: m.size || 1.2 }));

const widget = `import React from "react";

// 자동 생성(scripts/gen-dotted-map.mjs) — svg-dotted-map 좌표 정적 baking. 직접 수정 금지.
// 점 세계지도 + 마커 펄스(제자리 확대). 마커색은 placeholder data-marker-color.
const W = ${W}, H = ${H};
const POINTS = ${JSON.stringify(POINTS)};
const MARKERS = ${JSON.stringify(MARKERS)};

export default function DottedMapWidget() {
  const ref = React.useRef(null);
  const [color, setColor] = React.useState("#FF1E54");
  React.useEffect(() => {
    const h = ref.current && (ref.current.closest("[data-widget-id='dotted-map']") || ref.current.parentElement);
    const v = h && h.getAttribute && h.getAttribute("data-marker-color");
    if (v) setColor(v);
  }, []);
  return (
    <svg ref={ref} className="sb-dotted-map" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      {POINTS.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={0.22} fill="currentColor" />)}
      {MARKERS.map((m, i) => {
        const r = m.size || 1.2;
        return (
          <g key={"m" + i}>
            <circle cx={m.x} cy={m.y} r={r} fill={color} />
            <circle cx={m.x} cy={m.y} r={r} fill="none" stroke={color} strokeWidth="0.4">
              <animate attributeName="r" values={r + ";" + r * 3.2} dur="1.6s" begin={(i * 0.4) + "s"} repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="1.6s" begin={(i * 0.4) + "s"} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
`;

await writeFile(path.join(root, 'shared/widgets/dotted-map.jsx'), widget);
console.log(`Baked dotted-map: ${POINTS.length} land points, ${MARKERS.length} markers → shared/widgets/dotted-map.jsx`);
