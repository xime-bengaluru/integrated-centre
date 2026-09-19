/* X-Hub Assistant widget.
 * Drop-in help button + chat panel for any X-Hub page. Add once, after the supabase-js script:
 *   <script src="/xhub-help.js"></script>
 * It talks only to the xhub-help edge function (which holds the Anthropic key and reads the live
 * rules), never to the model directly. Page context is inferred from the URL, or set explicitly
 * with  window.XHUB_PAGE = "Performance form — Revenue section";  before this script loads.
 */
(function () {
  "use strict";
  if (window.__xhubHelpLoaded) return; window.__xhubHelpLoaded = true;

  var SB_URL = "https://qcufrukhfcmyfvwwoqjo.supabase.co";
  var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWZydWtoZmNteWZ2d3dvcWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjI0MTEsImV4cCI6MjA5MDY5ODQxMX0.sswZ6e-mCvHznWmu8p7fm0AbRrlaRfM0jvpA2ppNlWI";
  var FN_URL = SB_URL + "/functions/v1/xhub-help";

  var STARTERS = [
    "Why is my incentive showing Rs 0?",
    "What's the teaching floor now?",
    "Why do my institution points look halved?",
    "Can I still change my goals?"
  ];

  function pageLabel() {
    if (window.XHUB_PAGE) return window.XHUB_PAGE;
    var p = (location.pathname || "").toLowerCase();
    if (p.indexOf("performance") >= 0) return "Performance form";
    if (p.indexOf("validate") >= 0) return "Validate (dean review)";
    if (p.indexOf("review") >= 0) return "Review (director/dean)";
    if (p.indexOf("xpedagogy") >= 0) return "X-Pedagogy";
    if (p.indexOf("xresearch") >= 0) return "X-Research";
    if (p.indexOf("xleap") >= 0) return "XLEAP";
    if (p.indexOf("xprocess") >= 0 || p.indexOf("register") >= 0) return "X-Process";
    if (p.indexOf("connect") >= 0) return "X-Connect";
    return "X-Hub";
  }

  var CSS = `
  .xhb-btn{position:fixed;right:22px;bottom:22px;z-index:99998;width:56px;height:56px;border-radius:50%;
    background:#0D1F35;color:#C9A84C;border:2px solid #C9A84C;cursor:pointer;box-shadow:0 8px 24px rgba(13,31,53,.28);
    font-size:24px;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',Georgia,serif;font-weight:700}
  .xhb-btn:hover{transform:translateY(-2px)}
  .xhb-panel{position:fixed;right:22px;bottom:88px;z-index:99999;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 130px));
    background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(13,31,53,.3);display:none;flex-direction:column;overflow:hidden;
    font-family:'DM Sans',system-ui,sans-serif;color:#24303F}
  .xhb-panel.open{display:flex}
  .xhb-head{background:#0D1F35;color:#fff;padding:13px 16px;display:flex;align-items:center;gap:9px}
  .xhb-head .l{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:20px;letter-spacing:.5px}
  .xhb-head .t{font-size:13px;font-weight:600;line-height:1.1}
  .xhb-head .t span{display:block;font-size:10.5px;color:#9FB0C7;font-weight:400}
  .xhb-x{margin-left:auto;background:none;border:none;color:#9FB0C7;font-size:20px;cursor:pointer;line-height:1}
  .xhb-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:11px}
  .xhb-m{max-width:86%;padding:10px 13px;border-radius:13px;font-size:13.5px;line-height:1.48;white-space:pre-wrap;word-wrap:break-word}
  .xhb-u{align-self:flex-end;background:#0D1F35;color:#fff;border-bottom-right-radius:3px}
  .xhb-b{align-self:flex-start;background:#FAF8F3;border:1px solid #E5E0D6;border-bottom-left-radius:3px}
  .xhb-b strong{color:#0D1F35}
  .xhb-intro{color:#5B6472;font-size:13px;text-align:center;padding:8px 4px;line-height:1.5}
  .xhb-intro b{display:block;color:#0D1F35;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;margin-bottom:3px}
  .xhb-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:9px}
  .xhb-chip{font-size:12px;color:#0D1F35;background:#fff;border:1px solid #C9A84C;border-radius:999px;padding:5px 11px;cursor:pointer}
  .xhb-chip:hover{background:#C9A84C;color:#fff}
  .xhb-typing{align-self:flex-start;color:#5B6472;font-size:12.5px;font-style:italic}
  .xhb-bar{display:flex;gap:8px;padding:11px;border-top:1px solid #E5E0D6}
  .xhb-bar input{flex:1;font-family:inherit;font-size:13.5px;border:1px solid #E5E0D6;border-radius:9px;padding:9px 12px;outline:none}
  .xhb-bar input:focus{border-color:#C9A84C}
  .xhb-bar button{background:#0D1F35;color:#fff;border:none;border-radius:9px;padding:0 15px;font-family:inherit;font-weight:600;cursor:pointer}
  .xhb-bar button:disabled{opacity:.5}
  .xhb-foot{text-align:center;font-size:10px;color:#8a93a1;padding:0 10px 9px}
  `;

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }

  var history = [];
  var client = null, session = null;

  function ensureSupabase(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }

  function boot() {
    var style = el("style"); style.textContent = CSS; document.head.appendChild(style);

    var btn = el("button", "xhb-btn", "?"); btn.title = "X-Hub help";
    var panel = el("div", "xhb-panel");
    panel.appendChild(el("div", "xhb-head",
      '<div class="l">XIME</div><div class="t">X-Hub Assistant<span>' + esc(pageLabel()) + '</span></div>'));
    panel.querySelector(".xhb-head").appendChild((function () { var x = el("button", "xhb-x", "&times;"); x.onclick = toggle; return x; })());

    var log = el("div", "xhb-log");
    var intro = el("div", "xhb-intro", "<b>How can I help?</b>I read X-Hub's current rules, so my answers stay up to date.");
    var chips = el("div", "xhb-chips");
    STARTERS.forEach(function (q) { var c = el("div", "xhb-chip", esc(q)); c.onclick = function () { inp.value = q; send(); }; chips.appendChild(c); });
    intro.appendChild(chips); log.appendChild(intro);

    var bar = el("div", "xhb-bar");
    var inp = el("input"); inp.placeholder = "Ask a question…"; inp.autocomplete = "off";
    var snd = el("button", null, "Send");
    bar.appendChild(inp); bar.appendChild(snd);

    var foot = el("div", "xhb-foot", "Grounded in X-Hub's live rules");
    panel.appendChild(log); panel.appendChild(bar); panel.appendChild(foot);
    document.body.appendChild(btn); document.body.appendChild(panel);

    function toggle() { panel.classList.toggle("open"); if (panel.classList.contains("open")) inp.focus(); }
    btn.onclick = toggle;

    function bubble(role, text) {
      var d = el("div", "xhb-m " + (role === "user" ? "xhb-u" : "xhb-b"));
      d.innerHTML = role === "user" ? esc(text) : fmt(text);
      log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
    }

    function send() {
      var q = inp.value.trim(); if (!q) return;
      if (intro.parentNode) intro.remove();
      inp.value = ""; snd.disabled = true; inp.disabled = true;
      bubble("user", q); history.push({ role: "user", content: q });
      var typing = el("div", "xhb-typing", "reading the rules…"); log.appendChild(typing); log.scrollTop = log.scrollHeight;

      var token = (session && session.access_token) ? session.access_token : ANON;
      var email = (session && session.user) ? session.user.email : null;

      fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON, "Authorization": "Bearer " + token },
        body: JSON.stringify({ question: q, page: pageLabel(), history: history.slice(-10), faculty_email: email })
      }).then(function (r) { return r.json(); }).then(function (data) {
        typing.remove();
        var ans = data && data.answer ? data.answer : "I couldn't answer just now — please try again.";
        bubble("bot", ans); history.push({ role: "assistant", content: ans });
      }).catch(function () {
        typing.remove();
        bubble("bot", "I couldn't reach the assistant just now. Please try again in a moment.");
      }).then(function () { snd.disabled = false; inp.disabled = false; inp.focus(); });
    }

    snd.onclick = send;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

    ensureSupabase(function () {
      try {
        client = window.supabase.createClient(SB_URL, ANON);
        client.auth.getSession().then(function (res) { session = res.data.session; });
      } catch (e) { /* explainer still works signed-out via the anon key */ }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
