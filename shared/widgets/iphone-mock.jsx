import React, { useEffect, useRef, useState } from "react";

// 아이폰 목업 + 화면 이미지 캐러셀(자동 순환=원본 Swiper autoplay 대체). npm 불가 → 경량 자체 구현.
// placeholder data-*:
//   data-srcs    화면에 순환할 이미지 URL들(콤마 구분). 1장이면 정지.
//   data-src     (호환) 단일 이미지. data-srcs 없을 때 사용.
//   data-interval 순환 간격 ms (기본 2800)
//   data-scroll  "true" 면 같은 섹션의 .om-intro__line 텍스트를 스크롤 스크럽으로 위→아래 페이드인
//                (GSAP ScrollTrigger 핀). 폰 프레임/이미지는 회전하지 않음 — 이미지는 캐러셀로 순환.
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js";
const ST_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js";

const PW = 433, PH = 882, SX = 21.25, SY = 19.25, SW = 389.5, SH = 843.5, SR = 55.75;
const LEFT = (SX / PW) * 100, TOP = (SY / PH) * 100, WIDTH = (SW / PW) * 100, HEIGHT = (SH / PH) * 100;
const RH = (SR / SW) * 100, RV = (SR / SH) * 100;
const localizeAsset = (src, locale) => String(src || "").replace(/-(en|ja|ko)(\.(?:png|jpe?g|webp)(?:[?#].*)?)$/i, `-${locale}$2`);

function loadScript(src, marker, test) {
  return new Promise((resolve, reject) => {
    if (test()) return resolve();
    let s = document.querySelector(`script[data-x="${marker}"]`);
    const wait = () => { const t0 = Date.now(); const iv = setInterval(() => {
      if (test()) { clearInterval(iv); resolve(); }
      else if (Date.now() - t0 > 12000) { clearInterval(iv); reject(new Error("cdn timeout " + marker)); }
    }, 50); };
    if (!s) { s = document.createElement("script"); s.src = src; s.async = true; s.setAttribute("data-x", marker); document.head.appendChild(s); }
    wait();
  });
}

export default function IphoneMock() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [srcs, setSrcs] = useState([]);
  const [interval_, setInterval_] = useState(2800);
  const [active, setActive] = useState(0);

  // 설정 읽기 (placeholder data-*)
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const getA = (n, d) => { const v = ph && ph.getAttribute && ph.getAttribute(n); return v == null ? d : v; };
    const raw = getA("data-srcs", "") || getA("data-src", "");
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    setSrcs(list);
    setInterval_(Number(getA("data-interval", "2800")) || 2800);
  }, []);

  // 캐러셀 자동 순환
  useEffect(() => {
    if (srcs.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % srcs.length), interval_);
    return () => clearInterval(id);
  }, [srcs, interval_]);

  useEffect(() => {
    const onLang = (ev) => {
      const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]");
      if (!b) return;
      setTimeout(() => {
        let l = b.getAttribute("data-set-lang") || "en";
        try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {}
        setLocale(l);
      }, 0);
    };
    document.addEventListener("click", onLang);
    return () => document.removeEventListener("click", onLang);
  }, []);

  // 스크롤 스크럽: 같은 섹션 텍스트 라인 위→아래 페이드인 (폰/이미지 회전 없음)
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const scroll = ph && ph.getAttribute && ph.getAttribute("data-scroll");
    if (scroll !== "true") return;
    if (window.innerWidth < 900 || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    let st = null, alive = true;
    const section = host.closest(".om-section") || host.parentElement;
    const lines = section ? Array.from(section.querySelectorAll(".om-intro__line")) : [];
    if (!lines.length) return;
    (async () => {
      try {
        await loadScript(GSAP_CDN, "gsap", () => window.gsap);
        await loadScript(ST_CDN, "gsap-st", () => window.ScrollTrigger);
        if (!alive || !window.gsap || !window.ScrollTrigger) return;
        window.gsap.registerPlugin(window.ScrollTrigger);
        lines.forEach((l) => (l.style.opacity = "0.16"));
        const docTop = section.getBoundingClientRect().top + (window.scrollY || 0);
        st = window.ScrollTrigger.create({
          trigger: section, start: "top top", end: "+=" + Math.round(window.innerHeight * 1.1),
          pin: section, pinSpacing: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
          refreshPriority: -Math.round(docTop),
          onUpdate: (self) => {
            const p = self.progress;
            lines.forEach((l, i) => {
              const seg = 1 / (lines.length + 1);
              const local = Math.min(1, Math.max(0, (p - i * seg) / (seg * 1.6)));
              l.style.opacity = String(0.16 + 0.84 * local);
            });
          },
        });
        window.ScrollTrigger.refresh();
      } catch (e) { console.warn("[iphone-mock]", e && e.message); lines.forEach((l) => (l.style.opacity = "1")); }
    })();
    return () => { alive = false; if (st) st.kill(); lines.forEach((l) => (l.style.opacity = "")); };
  }, []);

  return (
    <div ref={ref} className="om-iphone">
      <div className="om-iphone__inner" style={{ position: "relative", display: "block", width: "100%", aspectRatio: `${PW}/${PH}` }}>
        <div className="om-iphone__screen" style={{ position: "absolute", left: `${LEFT}%`, top: `${TOP}%`, width: `${WIDTH}%`, height: `${HEIGHT}%`, borderRadius: `${RH}% / ${RV}%`, overflow: "hidden", zIndex: 0, background: "#fff" }}>
          {srcs.map((s, i) => (
            <img key={i} className="om-iphone__img" src={localizeAsset(s, locale)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: i === active ? 1 : 0, transition: "opacity .7s ease" }} />
          ))}
        </div>
        <svg viewBox={`0 0 ${PW} ${PH}`} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <g mask="url(#omScreenPunch)">
            <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" fill="#E5E5E5" />
            <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" fill="#E5E5E5" />
            <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" fill="#E5E5E5" />
            <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" fill="#E5E5E5" />
            <path d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z" fill="#E5E5E5" />
            <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" fill="#FFFFFF" />
          </g>
          <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" fill="#E5E5E5" />
          <path d={`M${SX} 75C${SX} 44.2101 46.2101 ${SY} 77 ${SY}H355C385.79 ${SY} 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 ${SX} 837.79 ${SX} 807V75Z`} fill="none" stroke="#E5E5E5" strokeWidth="0.5" />
          <path d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z" fill="#F5F5F5" />
          <path d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z" fill="#F5F5F5" />
          <path d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z" fill="#E5E5E5" />
          <defs>
            <mask id="omScreenPunch" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width={PW} height={PH} fill="white" />
              <rect x={SX} y={SY} width={SW} height={SH} rx={SR} ry={SR} fill="black" />
            </mask>
          </defs>
        </svg>
      </div>
    </div>
  );
}
