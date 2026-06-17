import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 다운로드 플랫폼 카드 그리드 (데이터 기반). 원본 4 플랫폼(Android/iOS/Windows/Mac).
// placeholder data-*:
//   data-items  JSON 배열: [{ id, title, sub?, href?, disabled?, version?, requirements?[] }]
//               id = android|ios|windows|mac (아이콘 매핑). title/sub/version/requirements = i18n key.
//   라벨 키: data-version-label, data-req-label, data-cta, data-coming
// 아이콘은 material-icons 의존 제거 위해 inline SVG 내장(Codex 수정분 유지).
const ICONS = {
  android: <svg viewBox="0 0 24 24" fill="none"><path d="M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" /><path d="M9 8 7 4M15 8l2-4M9 14h.01M15 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  ios: <svg viewBox="0 0 24 24" fill="none"><rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" strokeWidth="2" /><path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  windows: <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h16v10H4zM8 20h8M12 15.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  mac: <svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14v10H5zM3 19h18l-2-4H5l-2 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>,
};

export default function DownloadPlatforms() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState({ items: [], versionLabel: "", reqLabel: "", cta: "", coming: "" });

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const g = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    let items = [];
    try { items = JSON.parse(g("data-items") || "[]"); } catch (e) { items = []; }
    setCfg({
      items,
      versionLabel: g("data-version-label") || "downloadPage.versionLabel",
      reqLabel: g("data-req-label") || "downloadPage.requirementsLabel",
      cta: g("data-cta") || "downloadPage.downloadCta",
      coming: g("data-coming") || "downloadPage.comingSoon",
    });
  }, []);

  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang);
    [0, 150, 400, 800, 1500].forEach((ms) => setTimeout(() => { try { const l = window.OMI18N && window.OMI18N.locale && window.OMI18N.locale(); if (l) setLocale(l); } catch (e) {} }, ms));
    return () => document.removeEventListener("click", onLang);
  }, []);

  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };

  return (
    <div ref={ref} className="om-download-grid">
      {cfg.items.map((it) => (
        <article key={it.id} className={"om-download-card" + (it.disabled ? " om-download-card--disabled" : "")}>
          <div className="om-download-card__main">
            <span className="om-download-card__icon" aria-hidden="true">{ICONS[it.id] || null}</span>
            <div>
              <h3>{t(it.title)}</h3>
              {it.sub ? <p className="om-download-card__sub">{t(it.sub)}</p> : null}
              {it.disabled
                ? <span className="om-btn om-download-card__button om-download-card__button--disabled">{t(cfg.coming)}</span>
                : (it.href ? <a className="om-btn om-btn--primary om-download-card__button" href={it.href} target="_blank" rel="noopener">{t(cfg.cta)}</a> : null)}
            </div>
          </div>
          {(it.version || (it.requirements && it.requirements.length)) ? (
            <dl className="om-download-card__meta">
              {it.version ? (
                <div><dt>{t(cfg.versionLabel)}</dt><dd>{t(it.version)}</dd></div>
              ) : null}
              {it.requirements && it.requirements.length ? (
                <div>
                  <dt>{t(cfg.reqLabel)}</dt>
                  <dd>{it.requirements.map((r, i) => (<React.Fragment key={i}>{i ? <br /> : null}{t(r)}</React.Fragment>))}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}
