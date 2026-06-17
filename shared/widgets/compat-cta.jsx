import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 호환/마무리 CTA 섹션 (중앙 타이틀 + 본문 + 로고 + CTA + 디바이스).
// data-*: data-title, data-body, data-devices (i18n key) / data-logos (JSON 이미지 URL 배열)
//         data-cta (i18n key), data-cta-href
export default function CompatCta() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState({ title: "", body: "", devices: "", logos: [], cta: "", href: "/contact-us" });
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const get = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    let logos = []; try { logos = JSON.parse(get("data-logos") || "[]"); } catch (e) { logos = []; }
    setCfg({ title: get("data-title") || "", body: get("data-body") || "", devices: get("data-devices") || "", logos, cta: get("data-cta") || "cta.try", href: get("data-cta-href") || "/contact-us" });
  }, []);
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang); return () => document.removeEventListener("click", onLang);
  }, []);
  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };
  return (
    <div ref={ref} className="om-wrap om-compat__inner">
      {cfg.title ? <h2 className="om-compat__title">{t(cfg.title)}</h2> : null}
      {cfg.body ? <p className="om-compat__body">{t(cfg.body)}</p> : null}
      {cfg.logos.length ? <div className="om-compat__logos" aria-label="Supported services">{cfg.logos.map((s, i) => <img key={i} src={s} alt="" />)}</div> : null}
      <a className="om-btn om-btn--primary" href={cfg.href}>{t(cfg.cta)}</a>
      {cfg.devices ? <p className="om-compat__devices">{t(cfg.devices)}</p> : null}
    </div>
  );
}
