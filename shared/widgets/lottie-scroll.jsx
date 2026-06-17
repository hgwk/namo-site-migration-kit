import React, { useEffect, useRef } from "react";

// 공유 위젯: 스크롤 핀(pin) + Lottie 스크럽. 피처 로우가 화면 상단에 닿으면 섹션이
// 고정되고, 스크롤 진행도(0→1)에 맞춰 Lottie 프레임이 재생(goToAndStop)된다. 끝까지
// 재생되면 핀이 풀리고 다음 섹션으로 스크롤이 이어진다.
//
// npm import 불가 → lottie-web + GSAP/ScrollTrigger 모두 CDN 스크립트로 주입.
// GSAP 미가용 또는 prefers-reduced-motion 이면 onview 1회 재생으로 폴백.
//
// placeholder data-*:
//   data-src           (.json URL, path 로드용 — 로컬 프리뷰/동일출처)
//   data-doc-id        Namo type:JSON 문서 id (있으면 API.Docs_GetDocument 로 animationData 로드).
//                      firebase Storage 의 GET 은 CORS 헤더가 없어 cross-origin fetch(path)가
//                      라이브에서 막힘 → 라이브는 동일출처 Docs API 로 우회. 빌드가 자동 주입.
//   data-pin-target    핀 대상 CSS 셀렉터 (기본: 가장 가까운 .om-section)
//   data-scroll-length 핀 유지 스크롤 거리. "120%"=뷰포트 높이의 120% (기본), 또는 px 숫자
//   data-start         ScrollTrigger start (기본 "top top")
//   data-scrub         스크럽 부드러움. "true"=즉시, 숫자=래그초 (기본 0.6)
const LOTTIE_CDN = "https://cdn.jsdelivr.net/npm/lottie-web@latest/build/player/lottie_light.min.js";
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js";
const ST_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js";

function loadScript(src, marker, test) {
  return new Promise((resolve, reject) => {
    if (test()) return resolve();
    let s = document.querySelector(`script[data-x="${marker}"]`);
    const wait = () => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (test()) { clearInterval(iv); resolve(); }
        else if (Date.now() - t0 > 12000) { clearInterval(iv); reject(new Error("cdn timeout: " + marker)); }
      }, 50);
    };
    if (!s) {
      s = document.createElement("script");
      s.src = src; s.async = true; s.setAttribute("data-x", marker);
      document.head.appendChild(s);
    }
    wait();
  });
}

// 여러 핀 트리거가 비동기(lottie 로드 완료 순)로 생성되면 pin-spacer 정렬/좌표가
// 어긋난다. 모든 인스턴스 생성 후 한 번만 ScrollTrigger.refresh() 하도록 디바운스.
let _refreshTimer = null;
function scheduleStRefresh() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    _refreshTimer = null;
    try { window.ScrollTrigger && window.ScrollTrigger.refresh(); } catch (e) { /* noop */ }
  }, 250);
}

export default function LottieScrollWidget() {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const getA = (n, d) => { const v = ph && ph.getAttribute && ph.getAttribute(n); return v == null ? d : v; };
    const src = getA("data-src", "");
    const docId = getA("data-doc-id", "");
    if (!src && !docId) return;
    const pinSel = getA("data-pin-target", "");
    const scrollLen = getA("data-scroll-length", "120%");
    const start = getA("data-start", "top top");
    const scrubAttr = getA("data-scrub", "0.6");
    const scrub = scrubAttr === "true" ? true : (Number(scrubAttr) || 0.6);

    const reduce = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      || window.innerWidth < 900; // 모바일은 핀/스크럽 대신 onview 1회 재생(CSS와 일치)
    let anim = null, st = null, io = null, alive = true;

    const endValue = () => {
      const m = String(scrollLen).trim();
      if (m.endsWith("%")) return "+=" + Math.round(window.innerHeight * (parseFloat(m) / 100));
      return "+=" + (parseFloat(m) || window.innerHeight);
    };

    // docId 가 있으면 동일출처 Docs API 로 animationData 확보(라이브 CORS 우회), 아니면 path.
    const resolveData = async () => {
      if (docId && window.API && typeof window.API.Docs_GetDocument === "function") {
        const res = await window.API.Docs_GetDocument(docId);
        const doc = res && (res.document || res);
        let data = doc && doc.content;
        if (typeof data === "string") data = JSON.parse(data);
        return { animationData: data };
      }
      return { path: src };
    };

    (async () => {
      try {
        await loadScript(LOTTIE_CDN, "lottie-web", () => window.lottie);
        if (!alive || !ref.current) return;
        const source = await resolveData();
        if (!alive || !ref.current) return;
        anim = window.lottie.loadAnimation({
          container: ref.current, renderer: "svg", loop: false, autoplay: false, ...source,
          rendererSettings: { progressiveLoad: false, preserveAspectRatio: "xMidYMid meet" }
        });
        await new Promise((res) => anim.addEventListener("DOMLoaded", res));
        if (!alive) return;
        const lastFrame = Math.max(0, (anim.totalFrames || 1) - 1);

        // 폴백: GSAP 불가/reduced-motion → 뷰 진입 시 1회 재생(스크럽 없음).
        const playOnView = () => {
          if (!window.IntersectionObserver) { anim.goToAndStop(lastFrame, true); return; }
          io = new IntersectionObserver((es) => es.forEach((e) => {
            if (e.isIntersecting) { anim.setDirection(1); anim.play(); }
          }), { threshold: 0.25 });
          io.observe(ref.current);
        };
        if (reduce) { playOnView(); return; }

        await loadScript(GSAP_CDN, "gsap", () => window.gsap);
        await loadScript(ST_CDN, "gsap-st", () => window.ScrollTrigger);
        if (!alive) return;
        if (!window.gsap || !window.ScrollTrigger) { playOnView(); return; }
        window.gsap.registerPlugin(window.ScrollTrigger);

        const pinEl = (pinSel && ref.current.closest(pinSel)) || ref.current.closest(".om-section") || ref.current.parentElement;
        // 페이지 상단일수록 먼저 refresh 되도록 우선순위 부여(비동기 생성 순서 무관하게 정렬).
        const docTop = pinEl.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);

        st = window.ScrollTrigger.create({
          trigger: pinEl,
          start,
          end: endValue,
          pin: pinEl,
          pinSpacing: true,
          anticipatePin: 1,
          scrub,
          invalidateOnRefresh: true,
          refreshPriority: -Math.round(docTop),
          onUpdate: (self) => { if (anim) anim.goToAndStop(self.progress * lastFrame, true); }
        });
        scheduleStRefresh();
      } catch (e) {
        console.warn("[lottie-scroll]", e && e.message);
        if (anim) anim.goToAndStop((anim.totalFrames || 1) - 1, true);
      }
    })();

    return () => {
      alive = false;
      if (io) io.disconnect();
      if (st) st.kill();
      if (anim) anim.destroy();
    };
  }, []);
  return <div ref={ref} className="sb-lottie sb-lottie--scroll" aria-hidden="true" />;
}
