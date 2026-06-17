import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 중앙 인용 타이틀 + 2×2 카드 그리드 (데이터 기반, 페이지 간 재사용).
// placeholder data-*:
//   data-title  (i18n key) 상단 중앙 인용 타이틀 (선택)
//   data-items  JSON 배열: [{ "icon":"search", "title":"home.t22", "desc":"home.t54" }, ...]
//               icon = lucide 아이콘명. logo = 이미지 URL(아이콘 대신 작은 로고). image = 카드 상단 스크린샷.
//               title/desc = i18n key.
//   data-cols   카드 열 수 (기본 자동: 이미지 카드면 3열, 아니면 2열)
//   i18n 은 window.__OM_I18N__ 를 t() 로 직접 읽고 [data-set-lang] 클릭 구독해 재렌더(React-i18n 충돌 회피).
const localizeAsset = (src, locale) => String(src || "").replace(/-(en|ja|ko)(\.(?:png|jpe?g|webp)(?:[?#].*)?)$/i, `-${locale}$2`);

export default function FeatureCardGrid() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState({ title: "", items: [] });

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const get = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    let items = [];
    try { items = JSON.parse(get("data-items") || "[]"); } catch (e) { items = []; }
    setCfg({ title: get("data-title") || "", items, cols: Number(get("data-cols")) || 0 });
  }, []);

  useEffect(() => {
    const onLang = (ev) => {
      const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]");
      if (!b) return;
      setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0);
    };
    document.addEventListener("click", onLang);
    return () => document.removeEventListener("click", onLang);
  }, []);

  // lucide 아이콘 렌더 보강
  useEffect(() => { if (window.__omLucide) window.__omLucide(); });

  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };
  const hasLogo = cfg.items.some((it) => it.logo);
  const hasImage = cfg.items.some((it) => it.image);
  const cols = cfg.cols || (hasImage ? 3 : 2);

  return (
    <div ref={ref} className="om-wrap">
      {cfg.title ? <h2 className="om-row-title">{t(cfg.title)}</h2> : null}
      <div className={"om-card-grid om-card-grid--cols-" + cols + (hasLogo ? " om-card-grid--with-logo" : "") + (hasImage ? " om-card-grid--img" : "")}>
        {cfg.items.map((it, i) => (it.image ? (
          // 이미지 카드: 제목(중앙) → 이미지(1:1) → 설명 (원본 순서)
          <article key={i}>
            <h3>{t(it.title)}</h3>
            <div className="om-card-shot"><img src={localizeAsset(it.image, locale)} alt="" /></div>
            <p>{t(it.desc)}</p>
          </article>
        ) : (
          // 아이콘/로고 카드 또는 텍스트 전용 카드
          <article key={i}>
            {it.logo
              ? <img className="om-card-logo" src={localizeAsset(it.logo, locale)} alt="" />
              : (it.icon ? <span className="om-featlist__ic"><i data-lucide={it.icon}></i></span> : null)}
            <h3>{t(it.title)}</h3>
            <p>{t(it.desc)}</p>
          </article>
        )))}
      </div>
    </div>
  );
}
