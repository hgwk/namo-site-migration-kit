import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 인페이지 sticky 알약 기능 내비.
// data-*: data-items (JSON: [{ "href":"#email", "key":"nav.email" }, ...]) / data-cta(i18n key), data-cta-href
export default function FeatureNav() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState({ items: [], cta: "", href: "/contact-us" });
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const get = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    let items = []; try { items = JSON.parse(get("data-items") || "[]"); } catch (e) { items = []; }
    setCfg({ items, cta: get("data-cta") || "cta.try", href: get("data-cta-href") || "/contact-us" });
  }, []);
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang); return () => document.removeEventListener("click", onLang);
  }, []);
  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };
  return (
    <div ref={ref} className="om-feature-nav__inner">
      {cfg.items.map((it, i) => <a key={i} href={it.href}>{t(it.key)}</a>)}
      <a className="om-btn om-btn--primary" href={cfg.href}>{t(cfg.cta)}</a>
    </div>
  );
}
