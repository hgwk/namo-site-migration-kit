import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 페이지 타이틀(히어로) — 가격/다운로드/문의하기 등 유틸리티 페이지 공용으로 디자인 통일.
// placeholder data-*: (각 값은 i18n 키 또는 리터럴 — t()가 키면 번역, 아니면 그대로 반환)
//   data-eyebrow data-title data-lead data-note  data-cta data-cta-href  data-align(center|left, 기본 center)
const t = (locale, key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };

export default function PageHero() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const g = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    setCfg({
      eyebrow: g("data-eyebrow") || "", title: g("data-title") || "", lead: g("data-lead") || "",
      note: g("data-note") || "", cta: g("data-cta") || "", ctaHref: g("data-cta-href") || "",
      align: g("data-align") || "center",
    });
  }, []);

  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang);
    [0, 150, 400, 800, 1500].forEach((ms) => setTimeout(() => { try { const l = window.OMI18N && window.OMI18N.locale && window.OMI18N.locale(); if (l) setLocale(l); } catch (e) {} }, ms));
    return () => document.removeEventListener("click", onLang);
  }, []);

  if (!cfg) return <div ref={ref} className="om-page-hero__inner" />;
  const tt = (k) => t(locale, k);

  return (
    <div ref={ref} className={"om-page-hero__inner om-page-hero__inner--" + cfg.align}>
      {cfg.eyebrow ? <p className="om-eyebrow">{tt(cfg.eyebrow)}</p> : null}
      {cfg.title ? <h1 className="om-page-hero__title">{tt(cfg.title)}</h1> : null}
      {cfg.lead ? <p className="om-page-hero__lead">{tt(cfg.lead)}</p> : null}
      {cfg.note ? <p className="om-page-hero__note">{tt(cfg.note)}</p> : null}
      {cfg.cta ? <a className="om-btn om-btn--ghost om-page-hero__cta" href={cfg.ctaHref || "#"}>{tt(cfg.cta)}</a> : null}
    </div>
  );
}
