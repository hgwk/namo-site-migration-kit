import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 2단 기능 로우(본문 | 아트) + Lottie 스크롤 스크럽. 6개 기능 섹션 통합.
// 본문은 파라미터 조합으로 변형 흡수: 타이틀(스플릿) / 서브헤드 / 리드 / 본문 / mini-list / mailflow / featlist.
// placeholder data-*:
//   data-reverse "true"  → 아트 왼쪽
//   data-title   JSON i18n key 배열(스플릿 타이틀 조각). data-title-words "true" 면 조각 사이 공백.
//   data-subhead i18n key (얇은 보라 h3)
//   data-lead    i18n key (om-section-lead)
//   data-body    i18n key (단락)
//   data-mini    JSON [{icon,title,desc}]  (mini-list)
//   data-feat    JSON [{icon,text}]        (featlist)
//   data-flow    JSON [{from,to}]          (mailflow)
//   data-lottie  Lottie .json URL (path)   /  data-lottie-doc  Namo type:JSON 문서 id (라이브 CORS 우회, 빌드가 주입)
//   data-scroll-length 핀 거리(기본 120%)
const LOTTIE_CDN = "https://cdn.jsdelivr.net/npm/lottie-web@latest/build/player/lottie_light.min.js";
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js";
const ST_CDN = "https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js";

let _stRefreshTimer = null;
function scheduleStRefresh() { if (_stRefreshTimer) clearTimeout(_stRefreshTimer); _stRefreshTimer = setTimeout(() => { _stRefreshTimer = null; try { window.ScrollTrigger && window.ScrollTrigger.refresh(); } catch (e) {} }, 250); }
function loadScript(src, marker, test) {
  return new Promise((resolve, reject) => {
    if (test()) return resolve();
    let s = document.querySelector(`script[data-x="${marker}"]`);
    const wait = () => { const t0 = Date.now(); const iv = setInterval(() => { if (test()) { clearInterval(iv); resolve(); } else if (Date.now() - t0 > 12000) { clearInterval(iv); reject(new Error("cdn " + marker)); } }, 50); };
    if (!s) { s = document.createElement("script"); s.src = src; s.async = true; s.setAttribute("data-x", marker); document.head.appendChild(s); }
    wait();
  });
}
function parse(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }

export default function FeatureSplit() {
  const ref = useRef(null);
  const shotRef = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const g = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    setCfg({
      reverse: g("data-reverse") === "true",
      title: parse(g("data-title"), null), titleWords: g("data-title-words") === "true",
      subhead: g("data-subhead") || "", lead: g("data-lead") || "", body: g("data-body") || "",
      mini: parse(g("data-mini"), null), feat: parse(g("data-feat"), null), flow: parse(g("data-flow"), null),
      lottie: g("data-lottie") || "", lottieDoc: g("data-lottie-doc") || "",
      scrollLen: g("data-scroll-length") || "120%",
    });
  }, []);

  // 로케일 구독
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang); return () => document.removeEventListener("click", onLang);
  }, []);
  useEffect(() => { if (window.__omLucide) window.__omLucide(); });

  // Lottie 로드 + 핀 스크럽
  useEffect(() => {
    if (!cfg || (!cfg.lottie && !cfg.lottieDoc)) return;
    const shot = shotRef.current; if (!shot) return;
    let anim = null, st = null, io = null, alive = true;
    const reduce = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || window.innerWidth < 900;
    const resolve = async () => {
      if (cfg.lottieDoc && window.API && typeof window.API.Docs_GetDocument === "function") {
        const res = await window.API.Docs_GetDocument(cfg.lottieDoc); const doc = res && (res.document || res);
        let data = doc && doc.content; if (typeof data === "string") data = JSON.parse(data); return { animationData: data };
      }
      return { path: cfg.lottie };
    };
    const endVal = () => { const m = String(cfg.scrollLen).trim(); return "+=" + (m.endsWith("%") ? Math.round(window.innerHeight * parseFloat(m) / 100) : (parseFloat(m) || window.innerHeight)); };
    (async () => {
      try {
        await loadScript(LOTTIE_CDN, "lottie-web", () => window.lottie); if (!alive) return;
        const src = await resolve(); if (!alive) return;
        anim = window.lottie.loadAnimation({ container: shot, renderer: "svg", loop: false, autoplay: false, ...src, rendererSettings: { preserveAspectRatio: "xMidYMid meet" } });
        await new Promise((r) => anim.addEventListener("DOMLoaded", r)); if (!alive) return;
        const last = Math.max(0, (anim.totalFrames || 1) - 1);
        const sec = shot.closest(".om-section") || shot.parentElement;
        const shouldPin = sec && sec.classList && sec.classList.contains("om-feature-sec--pin");
        if (reduce || !shouldPin) { if (window.IntersectionObserver) { io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) anim.play(); }), { threshold: .25 }); io.observe(shot); } else anim.goToAndStop(last, true); return; }
        await loadScript(GSAP_CDN, "gsap", () => window.gsap); await loadScript(ST_CDN, "gsap-st", () => window.ScrollTrigger); if (!alive) return;
        if (!window.gsap || !window.ScrollTrigger) { anim.play(); return; }
        window.gsap.registerPlugin(window.ScrollTrigger);
        const top = sec.getBoundingClientRect().top + (window.scrollY || 0);
        st = window.ScrollTrigger.create({ trigger: sec, start: "top top", end: endVal, pin: sec, pinSpacing: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true, refreshPriority: -Math.round(top), onUpdate: (s) => { if (anim) anim.goToAndStop(s.progress * last, true); } });
        scheduleStRefresh();
      } catch (e) { console.warn("[feature-split]", e && e.message); if (anim) anim.goToAndStop((anim.totalFrames || 1) - 1, true); }
    })();
    return () => { alive = false; if (io) io.disconnect(); if (st) st.kill(); if (anim) anim.destroy(); };
  }, [cfg]);

  if (!cfg) return <div ref={ref} className="om-wrap" />;
  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };

  const body = (
    <div className="om-feature__body">
      {cfg.title ? <h2 className="om-split-title">{cfg.title.map((k, i) => {
        const txt = t(k);
        let sep = "";
        if (i > 0) {
          if (locale === "ja") sep = "";
          else if (locale === "ko") sep = /^(도|은|는|이|가|을|를|와|과|의|에|에서|으로|로|만|부터|까지|에게|한테|께|보다|처럼|마다|밖에|조차|마저|이나|나|든지|라도)/.test(txt) ? "" : " ";
          else sep = " ";
        }
        return <span key={i}>{sep}{txt}</span>;
      })}</h2> : null}
      {cfg.subhead ? <h3>{t(cfg.subhead)}</h3> : null}
      {cfg.lead ? <p className="om-section-lead">{t(cfg.lead)}</p> : null}
      {cfg.body ? <p>{t(cfg.body)}</p> : null}
      {cfg.mini ? <div className="om-mini-list">{cfg.mini.map((it, i) => <article key={i}><span className="om-featlist__ic"><i data-lucide={it.icon || "check"}></i></span><h3>{t(it.title)}</h3><p>{t(it.desc)}</p></article>)}</div> : null}
      {cfg.flow ? <div className="om-mailflow" aria-label="flow">{cfg.flow.map((f, i) => [<span key={i + "a"}>{t(f.from)}</span>, <b key={i + "b"}><i data-lucide="arrow-right"></i></b>, <span key={i + "c"}>{t(f.to)}</span>])}</div> : null}
      {cfg.feat ? <ul className="om-featlist">{cfg.feat.map((it, i) => <li key={i}><span className="om-featlist__ic"><i data-lucide={it.icon || "check"}></i></span><span>{t(it.text)}</span></li>)}</ul> : null}
    </div>
  );
  const shot = <div className="om-feature__shot"><div ref={shotRef} className="sb-lottie sb-lottie--scroll" aria-hidden="true" /></div>;

  return (
    <div ref={ref} className="om-wrap">
      <div className={"om-feature" + (cfg.reverse ? " om-feature--rev" : "")}>
        {cfg.reverse ? <>{shot}{body}</> : <>{body}{shot}</>}
      </div>
    </div>
  );
}
