// 공유 i18n 런타임 (Namo Site JS 에 인라인/연결). 다국어 = 단일 페이지 + 언어팩 오버레이.
// 로케일: ?lang= → localStorage(om_lang) → 기본 'en'. 지원 en/ja/ko.
// 마크업: data-i18n(텍스트), data-i18n-html(리치), data-i18n-src(img/배경 src), data-i18n-placeholder(form placeholder).
// 팩 소스: window.__OM_I18N__ (인라인, FOUC 없음) 우선, 없으면 window.__OM_I18N_URL__(기본 /storage-files/assets/i18n.json) fetch.
// FOUC 가드: 즉시 html.i18n-pending 부여 → 적용 완료 시 해제(가드 CSS는 site CSS 참고).
(function () {
  var LOCALES = ["en", "ja", "ko"], DEFAULT = "en", STORE = "om_lang";
  var d = document.documentElement;
  d.classList.add("i18n-pending");

  function pickLocale() {
    try { var q = new URLSearchParams(location.search).get("lang"); if (q && LOCALES.indexOf(q) >= 0) { try { localStorage.setItem(STORE, q); } catch (e) {} return q; } } catch (e) {}
    try { var s = localStorage.getItem(STORE); if (s && LOCALES.indexOf(s) >= 0) return s; } catch (e) {}
    return DEFAULT;
  }

  function apply(pack, loc) {
    var t = (pack && (pack[loc] || pack[DEFAULT])) || {};
    document.querySelectorAll("[data-i18n]").forEach(function (el) { var k = el.getAttribute("data-i18n"); if (t[k] != null) el.textContent = t[k]; });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) { var k = el.getAttribute("data-i18n-html"); if (t[k] != null) el.innerHTML = t[k]; });
    document.querySelectorAll("[data-i18n-src]").forEach(function (el) { var k = el.getAttribute("data-i18n-src"); if (t[k] != null) el.setAttribute("src", t[k]); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) { var k = el.getAttribute("data-i18n-placeholder"); if (t[k] != null) el.setAttribute("placeholder", t[k]); });
    document.querySelectorAll("[data-set-lang]").forEach(function (el) {
      var active = el.getAttribute("data-set-lang") === loc;
      el.classList.toggle("is-active", active);
      if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", active ? "true" : "false");
    });
    d.setAttribute("lang", loc);
    d.classList.remove("i18n-pending");
  }

  function loadPack() {
    if (window.__OM_I18N__) return Promise.resolve(window.__OM_I18N__);
    var url = window.__OM_I18N_URL__ || "/storage-files/assets/i18n.json";
    return fetch(url).then(function (r) { return r.json(); }).catch(function () { return {}; });
  }

  var current = pickLocale();
  var packReady = loadPack();
  function run() { packReady.then(function (pack) { window.__OM_PACK__ = pack; apply(pack, current); }); }

  // 헤더 언어토글 등에서 호출: OMI18N.setLocale('ja')
  window.OMI18N = {
    setLocale: function (loc) { if (LOCALES.indexOf(loc) < 0) return; current = loc; try { localStorage.setItem(STORE, loc); } catch (e) {} if (window.__OM_PACK__) apply(window.__OM_PACK__, loc); },
    locale: function () { return current; },
  };

  // 헤더 언어 전환: [data-set-lang="ja|en|ko"] 클릭 → setLocale (SSR 위젯에 JS 불필요)
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("[data-set-lang]");
    if (!el) return;
    e.preventDefault();
    window.OMI18N.setLocale(el.getAttribute("data-set-lang"));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
