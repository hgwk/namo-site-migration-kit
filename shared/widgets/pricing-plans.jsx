import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 가격 페이지 요금제 카드 + 견적 박스.
// 페이지 타이틀/리드는 page-hero 위젯이 담당하고, 가격 데이터는 type:JSON 문서(pricing)가 자급.
// placeholder data-*:
//   data-doc-id   Namo type:JSON 문서 id (있으면 API.Docs_GetDocument). 없으면 window.__OM_PRICING__.
// 다국어: 각 항목이 {ko,en,ja} → 현재 locale 선택. [data-set-lang] 클릭 구독해 재렌더.
const PER_USER = 1000; // fallback: Business 100,000원/100명 = 1,000원/명 기준 선형 추정.

export default function PricingPlans() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [data, setData] = useState(null);
  const [users, setUsers] = useState(150);

  // 데이터 로드(문서 우선, 인라인 폴백)
  useEffect(() => {
    let alive = true;
    const host = ref.current; const ph = host && (host.closest("[data-widget-id]") || host.parentElement);
    const docId = ph && ph.getAttribute ? ph.getAttribute("data-doc-id") : "";
    (async () => {
      let d = null;
      try {
        if (docId && window.API && typeof window.API.Docs_GetDocument === "function") {
          const res = await window.API.Docs_GetDocument(docId);
          const doc = res && (res.document || res);
          d = doc && doc.content; if (typeof d === "string") d = JSON.parse(d);
        }
      } catch (e) { d = null; }
      if (!d) { try { d = window.__OM_PRICING__ || null; } catch (e) { d = null; } }
      if (alive) setData(d);
    })();
    return () => { alive = false; };
  }, []);

  // locale 구독
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang);
    [0, 150, 400, 800, 1500].forEach((ms) => setTimeout(() => { try { const l = window.OMI18N && window.OMI18N.locale && window.OMI18N.locale(); if (l) setLocale(l); } catch (e) {} }, ms));
    return () => document.removeEventListener("click", onLang);
  }, []);

  const tx = (o) => {
    if (!o) return "";
    if (Object.prototype.hasOwnProperty.call(o, locale) && o[locale] != null) return o[locale];
    if (Object.prototype.hasOwnProperty.call(o, "ko") && o.ko != null) return o.ko;
    if (Object.prototype.hasOwnProperty.call(o, "en") && o.en != null) return o.en;
    if (Object.prototype.hasOwnProperty.call(o, "ja") && o.ja != null) return o.ja;
    return "";
  };
  if (!data) return <div ref={ref} className="om-wrap" />;

  const fmt = (n) => { try { return n.toLocaleString("ko-KR"); } catch (e) { return String(n); } };
  const rate = Number((data.estimate.rate && (data.estimate.rate[locale] ?? data.estimate.rate.ko)) || PER_USER);
  const est = Math.max(0, Math.round(users) * rate);
  const prefix = tx(data.estimate.prefix);
  const unit = tx(data.estimate.unit);

  return (
    <div ref={ref} className="om-pricing-top">
      <div className="om-plan-grid">
        {data.plans.map((p) => (
          <article key={p.id} className={"om-plan-card" + (p.featured ? " om-plan-card--featured" : "")}>
            {p.featured ? <div className="om-plan-card__badge">{tx(p.name)}</div> : null}
            <div className="om-plan-card__top">
              <h3>{tx(p.name)}</h3>
              {p.caption ? <p className="om-plan-card__caption">{tx(p.caption)}</p> : null}
            </div>
            <div className="om-plan-card__price">{tx(p.price)}</div>
            <ul className="om-plan-card__list">
              {(p.limits || []).map((li, i) => tx(li) ? <li key={i}>{tx(li)}</li> : null)}
            </ul>
            <a className={"om-btn " + (p.featured ? "om-btn--primary" : "om-btn--ghost")} href={p.ctaHref || "/download"}>{tx(p.cta)}</a>
          </article>
        ))}
      </div>

      <section className="om-estimate" aria-labelledby="om-estimate-title">
        <div className="om-estimate__copy">
          <h2 id="om-estimate-title">{tx(data.estimate.title)}</h2>
          {data.estimate.body ? <p>{tx(data.estimate.body)}</p> : null}
        </div>
        <div className="om-estimate__box">
          <label htmlFor="om-user-count">{tx(data.estimate.label)}</label>
          <div className="om-estimate__row">
            <input id="om-user-count" type="number" min="101" value={users}
              onChange={(e) => setUsers(Math.max(0, Number(e.target.value) || 0))} aria-label="User count" />
            <span className="om-estimate__out">{prefix}{fmt(est)} {unit}</span>
          </div>
          <a className="om-btn om-btn--primary" href={data.estimate.ctaHref || "/contact-us"}>{tx(data.estimate.cta)}</a>
        </div>
      </section>
    </div>
  );
}
