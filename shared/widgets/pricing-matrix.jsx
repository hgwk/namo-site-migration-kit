import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 가격 페이지 "전체 기능" 비교 매트릭스.
// 원본 셀값을 보존해 Free/Business별 지원(✔)·미지원(—)을 렌더한다.
// placeholder data-*:
//   data-doc-id   Namo type:JSON 문서 id (있으면 API.Docs_GetDocument). 없으면 window.__OM_PRICING__.
export default function PricingMatrix() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [data, setData] = useState(null);

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

  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang);
    [0, 150, 400, 800, 1500].forEach((ms) => setTimeout(() => { try { const l = window.OMI18N && window.OMI18N.locale && window.OMI18N.locale(); if (l) setLocale(l); } catch (e) {} }, ms));
    return () => document.removeEventListener("click", onLang);
  }, []);

  const tx = (o) => (o && (o[locale] || o.ko || o.en || o.ja)) || "";
  if (!data || !data.matrix) return <div ref={ref} className="om-wrap" />;
  const mx = data.matrix;
  const cols = mx.cols || [];

  return (
    <div ref={ref} className="om-matrix">
      <header className="om-matrix__head">
        <h2 className="om-matrix__title">{tx(mx.title)}</h2>
        {mx.body ? <p className="om-matrix__body">{tx(mx.body)}</p> : null}
      </header>

      {(mx.categories || []).map((cat, ci) => (
        <section key={ci} className="om-matrix__cat">
          <h3 className="om-matrix__cat-label">{tx(cat.label)}</h3>
          {(cat.subs || []).map((sub, si) => (
            <div key={si} className="om-matrix__sub">
              {tx(sub.title) ? <h4 className="om-matrix__sub-title">{tx(sub.title)}</h4> : null}
              {tx(sub.body) ? <p className="om-matrix__sub-body">{tx(sub.body)}</p> : null}
              <div className="om-matrix__tablewrap">
                <table className="om-matrix__table">
                  <thead>
                    <tr>
                      <th scope="col">{tx(mx.colFeature)}</th>
                      {cols.map((c, i) => <th key={i} scope="col" className="om-matrix__plan">{tx(c)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(sub.features || []).map((f, fi) => {
                      const support = [f.free !== false, f.business !== false]; // 원본 셀값. 미지정=지원으로 간주.
                      return (
                        <tr key={fi}>
                          <td>{tx(f)}</td>
                          {cols.map((c, i) => (support[i]
                            ? <td key={i} className="om-matrix__check" aria-label="지원"><span aria-hidden="true">✔</span></td>
                            : <td key={i} className="om-matrix__check om-matrix__check--no" aria-label="미지원"><span aria-hidden="true">—</span></td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
