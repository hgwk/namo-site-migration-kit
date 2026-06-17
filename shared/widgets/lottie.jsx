import React, { useEffect, useRef } from "react";

// 공유 위젯: Lottie 애니메이션. npm import 불가 → lottie-web 을 CDN 스크립트로 주입 후 사용.
// placeholder data-*: data-src(.json URL), data-doc-id(Namo type:JSON 문서 id), data-loop, data-autoplay
// data-doc-id 가 있으면 동일출처 API.Docs_GetDocument 로 animationData 로드(라이브 firebase CORS 우회).
// onview = IntersectionObserver 로 뷰 진입 시 재생, 이탈 시 일시정지(스크롤 트리거).
const LOTTIE_CDN = "https://cdn.jsdelivr.net/npm/lottie-web@latest/build/player/lottie_light.min.js";

function ensureLottie() {
  return new Promise((resolve, reject) => {
    if (window.lottie) return resolve(window.lottie);
    let s = document.querySelector("script[data-lottie-web]");
    if (s) { s.addEventListener("load", () => resolve(window.lottie)); s.addEventListener("error", reject); return; }
    s = document.createElement("script");
    s.src = LOTTIE_CDN; s.async = true; s.setAttribute("data-lottie-web", "");
    s.onload = () => resolve(window.lottie); s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function LottieWidget() {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current && (ref.current.closest("[data-widget-id='lottie']") || ref.current.parentElement);
    const getA = (n, d) => { const v = host && host.getAttribute && host.getAttribute(n); return v == null ? d : v; };
    const src = getA("data-src", "");
    const docId = getA("data-doc-id", "");
    const loop = getA("data-loop", "true") !== "false";
    const autoplay = getA("data-autoplay", "true"); // true | false | onview
    if (!src && !docId) return;
    let anim = null, io = null, alive = true;
    const resolveSource = async () => {
      if (docId && window.API && typeof window.API.Docs_GetDocument === "function") {
        const res = await window.API.Docs_GetDocument(docId);
        const doc = res && (res.document || res);
        let data = doc && doc.content;
        if (typeof data === "string") data = JSON.parse(data);
        return { animationData: data };
      }
      return { path: src };
    };
    ensureLottie().then(async (lottie) => {
      if (!alive || !ref.current || !lottie) return;
      const source = await resolveSource();
      if (!alive || !ref.current) return;
      anim = lottie.loadAnimation({ container: ref.current, renderer: "svg", loop, autoplay: autoplay === "true", ...source });
      if (autoplay === "onview" && window.IntersectionObserver) {
        io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) anim.play(); else anim.pause(); }), { threshold: 0.2 });
        io.observe(ref.current);
      }
    }).catch((e) => console.error("lottie load fail", e));
    return () => { alive = false; if (io) io.disconnect(); if (anim) anim.destroy(); };
  }, []);
  return <div ref={ref} className="sb-lottie" aria-hidden="true" />;
}
