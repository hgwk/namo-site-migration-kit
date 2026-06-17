import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 중앙 헤드라인 로우 (로고 + 인용 + 서브리드). org/auto 등 100vh 헤드라인 섹션 재사용.
// placeholder data-*: data-logo(이미지 URL,선택), data-quote(i18n key), data-lead(i18n key,선택)
export default function HeadlineRow() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState({ logo: "", quote: "", lead: "" });
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const get = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    setCfg({ logo: get("data-logo") || "", quote: get("data-quote") || "", lead: get("data-lead") || "" });
  }, []);
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang); return () => document.removeEventListener("click", onLang);
  }, []);
  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };
  return (
    <div ref={ref} className="om-wrap">
      <div className="om-headline">
        {cfg.logo ? <img className="om-headline__logo" src={cfg.logo} alt="" /> : null}
        {cfg.quote ? <h2 className="om-quote" dangerouslySetInnerHTML={{ __html: t(cfg.quote) }} /> : null}
        {cfg.lead ? <p className="om-headline__lead" dangerouslySetInnerHTML={{ __html: t(cfg.lead) }} /> : null}
      </div>
    </div>
  );
}
