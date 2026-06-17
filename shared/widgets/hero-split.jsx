import React, { useEffect, useRef, useState } from "react";

// 공유 위젯: 기능 서브페이지 히어로 (좌 카피 + 우 아이폰 폰 목업). email/contacts/schedule 재사용.
// placeholder data-*:
//   data-eyebrow data-title data-body data-devices (i18n key)
//   data-cta (i18n key, 기본 cta.try) data-cta-href (기본 /download)
//   data-phone  폰 화면 이미지 URL(콤마 다중 → 자동 순환)
//   data-interval 순환 간격(기본 2800)
const PW = 433, PH = 882, SX = 21.25, SY = 19.25, SW = 389.5, SH = 843.5, SR = 55.75;
const LEFT = (SX / PW) * 100, TOP = (SY / PH) * 100, WIDTH = (SW / PW) * 100, HEIGHT = (SH / PH) * 100;
const RH = (SR / SW) * 100, RV = (SR / SH) * 100;
const localizeAsset = (src, locale) => String(src || "").replace(/-(en|ja|ko)(\.(?:png|jpe?g|webp)(?:[?#].*)?)$/i, `-${locale}$2`);

export default function HeroSplit() {
  const ref = useRef(null);
  const [locale, setLocale] = useState(() => { try { return (window.OMI18N && window.OMI18N.locale && window.OMI18N.locale()) || "en"; } catch (e) { return "en"; } });
  const [cfg, setCfg] = useState(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const ph = host.closest("[data-widget-id]") || host.parentElement;
    const g = (n) => (ph && ph.getAttribute ? ph.getAttribute(n) : null);
    const phones = (g("data-phone") || "").split(",").map((s) => s.trim()).filter(Boolean);
    setCfg({
      eyebrow: g("data-eyebrow") || "", title: g("data-title") || "", body: g("data-body") || "",
      devices: g("data-devices") || "", cta: g("data-cta") || "cta.try", href: g("data-cta-href") || "/download",
      phones, interval: Number(g("data-interval")) || 2800,
    });
  }, []);
  useEffect(() => {
    if (!cfg || cfg.phones.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % cfg.phones.length), cfg.interval);
    return () => clearInterval(id);
  }, [cfg]);
  useEffect(() => {
    const onLang = (ev) => { const b = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]"); if (!b) return; setTimeout(() => { let l = b.getAttribute("data-set-lang") || "en"; try { if (window.OMI18N && window.OMI18N.locale) l = window.OMI18N.locale() || l; } catch (e) {} setLocale(l); }, 0); };
    document.addEventListener("click", onLang); return () => document.removeEventListener("click", onLang);
  }, []);

  const t = (key, fb) => { if (!key) return fb || ""; try { const p = (window.__OM_I18N__ || {})[locale] || (window.__OM_I18N__ || {}).en || {}; return p[key] || fb || key; } catch (e) { return fb || key; } };
  if (!cfg) return <div ref={ref} className="om-wrap om-hero-split__grid" />;

  return (
    <div ref={ref} className="om-wrap om-hero-split__grid">
      <div className="om-hero-split__copy">
        {cfg.eyebrow ? <p className="om-eyebrow">{t(cfg.eyebrow)}</p> : null}
        {cfg.title ? <h1>{t(cfg.title)}</h1> : null}
        {cfg.body ? <p className="om-hero-split__body">{t(cfg.body)}</p> : null}
        <div className="om-hero-split__actions">
          <a className="om-btn om-btn--primary" href={cfg.href}>{t(cfg.cta)}</a>
          {cfg.devices ? <span className="om-hero-split__devices">{t(cfg.devices)}</span> : null}
        </div>
      </div>
      <div className="om-hero-split__phone">
        <div className="om-iphone">
          <div className="om-iphone__inner" style={{ position: "relative", display: "block", width: "100%", aspectRatio: `${PW}/${PH}` }}>
            <div className="om-iphone__screen" style={{ position: "absolute", left: `${LEFT}%`, top: `${TOP}%`, width: `${WIDTH}%`, height: `${HEIGHT}%`, borderRadius: `${RH}% / ${RV}%`, overflow: "hidden", zIndex: 0, background: "#fff" }}>
              {cfg.phones.map((s, i) => (
                <img key={i} src={localizeAsset(s, locale)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: i === active ? 1 : 0, transition: "opacity .7s ease" }} />
              ))}
            </div>
            <svg viewBox={`0 0 ${PW} ${PH}`} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <g mask="url(#omHeroPunch)">
                <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" fill="#E5E5E5" />
                <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" fill="#FFFFFF" />
              </g>
              <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" fill="#E5E5E5" />
              <path d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z" fill="#F5F5F5" />
              <path d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z" fill="#E5E5E5" />
              <defs>
                <mask id="omHeroPunch" maskUnits="userSpaceOnUse">
                  <rect x="0" y="0" width={PW} height={PH} fill="white" />
                  <rect x={SX} y={SY} width={SW} height={SH} rx={SR} ry={SR} fill="black" />
                </mask>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
