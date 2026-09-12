/* xleap-hub.js  v1.2  12 Sep 2026
   X-Hub adapter for XLEAP (Madhu Kumar PS, XLEAP v2.0 Aug 2026).
   Loads after the XLEAP page script and overrides five behaviours by name.
   Madhu's calculation engine is not touched. To adopt a new XLEAP release,
   drop the new file in as index.html and keep the two script tags before </body>.

   Overrides:
     1. Sign-in gate         : Google OAuth (xime.org), identity from faculty_master via xl_me()
     2. Identity pre-fill    : faculty name and campus set from X-Hub and locked
     3. Persistence          : markChanged() also saves to xl_workspace (localStorage kept as cache)
     4. Submit               : exportExecutiveSummaryCSV() submits to xl_submission; CSV stays as a copy
     5. Course master        : "Load from X-Hub" on the setup tab reads xl_course_master and xl_po_set
*/
(function () {
  "use strict";

  const HUB_URL = "https://qcufrukhfcmyfvwwoqjo.supabase.co";
  const HUB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWZydWtoZmNteWZ2d3dvcWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjI0MTEsImV4cCI6MjA5MDY5ODQxMX0.sswZ6e-mCvHznWmu8p7fm0AbRrlaRfM0jvpA2ppNlWI";
  const AY_DEFAULT = "2026-27";
  const ADAPTER_VERSION = "hub-1.2";
  const CAMPUS_TO_TOOL = { Bengaluru: "Bangalore", Kochi: "Kochi", Chennai: "Chennai" };

  if (!window.supabase || !window.supabase.createClient) {
    console.error("xleap-hub: supabase-js not loaded");
    return;
  }
  const sb = window.supabase.createClient(HUB_URL, HUB_ANON);

  let ME = null;            // {email, full_name, campus, subject_area, designation, can_review}
  let WS_ID = null;         // current xl_workspace id
  let WS_KEY = null;        // record_key the workspace was last saved under
  let hubTimer = null;
  let hubSaving = false;
  let hubQueued = false;

  const $ = (s, r) => (r || document).querySelector(s);
  const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  /* ---------- styles: overlay and hub bar, XIME Paper theme ---------- */
  const css = document.createElement("style");
  css.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;500;600&display=swap');
  #hubOverlay{position:fixed;inset:0;z-index:9999;background:#FAF8F3;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',Arial,sans-serif;color:#0D1F35}
  #hubOverlay .card{width:min(760px,94vw);background:#fff;border:1px solid #D8D2C5;border-radius:14px;box-shadow:0 12px 40px rgba(13,31,53,.12);padding:34px 38px}
  #hubOverlay .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8A6F2A;font-weight:600}
  #hubOverlay h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:34px;margin:6px 0 4px;color:#0D1F35}
  #hubOverlay p{font-size:15px;color:#5A6B82;margin:0 0 18px;line-height:1.5}
  #hubOverlay .btn-g{display:inline-flex;align-items:center;gap:10px;background:#0D1F35;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-size:15px;font-weight:600;cursor:pointer}
  #hubOverlay .btn-g:hover{background:#1A3352}
  #hubOverlay .btn-o{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#0D1F35;border:1px solid #C9A84C;border-radius:8px;padding:9px 14px;font-size:14px;font-weight:600;cursor:pointer}
  #hubOverlay .btn-x{display:inline-flex;align-items:center;background:#fff;color:#8A1C1C;border:1px solid #D8D2C5;border-radius:8px;padding:9px 12px;font-size:13px;cursor:pointer}
  #hubOverlay .btn-x:hover{border-color:#C8102E}
  #hubOverlay .err{color:#C8102E;font-size:14px;margin-top:12px}
  #hubOverlay table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 18px}
  #hubOverlay th{text-align:left;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5A6B82;padding:8px 6px;border-bottom:1px solid #D8D2C5}
  #hubOverlay td{padding:9px 6px;border-bottom:1px solid #EFEAE0;vertical-align:middle}
  #hubOverlay .who{font-size:13px;color:#5A6B82;margin-top:22px;border-top:1px solid #EFEAE0;padding-top:12px;display:flex;justify-content:space-between;align-items:center}
  #hubOverlay .who a{color:#8A6F2A}
  #hubOverlay .pill{display:inline-block;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;background:#EFEAE0;color:#5A6B82}
  #hubOverlay .pill.ok{background:#E2F0D9;color:#166534}
  #hubBar{display:flex;align-items:center;gap:10px;font-size:12px;color:#334155;padding:4px 10px;border:1px solid #C9A84C;border-radius:999px;background:#FAF8F3}
  #hubBar b{color:#0D1F35}
  #hubBar a{color:#8A6F2A;cursor:pointer;text-decoration:underline}
  #hubBar .dot{width:8px;height:8px;border-radius:50%;background:#0D9268}
  .hub-locked select,.hub-locked input{background:#EFEAE0!important;color:#0D1F35!important;border-color:#C9A84C!important;pointer-events:none;cursor:not-allowed}
  .hub-locked-note{font-size:11px;color:#8A6F2A;margin-top:4px;font-weight:600}
  .hub-master-panel{background:#FAF8F3;border:1px solid #C9A84C;border-radius:10px;padding:12px 14px;margin:0 0 14px}
  .hub-master-panel b{color:#0D1F35}
  .hub-master-panel select{margin:0 8px;padding:7px 9px;border:1px solid #b7c3d0;border-radius:6px;min-width:280px}
  `;
  document.head.appendChild(css);

  /* ---------- overlay ---------- */
  function overlay(html) {
    let o = $("#hubOverlay");
    if (!o) { o = document.createElement("div"); o.id = "hubOverlay"; document.body.appendChild(o); }
    o.innerHTML = `<div class="card">${html}</div>`;
    o.style.display = "flex";
    return o;
  }
  function hideOverlay() { const o = $("#hubOverlay"); if (o) o.style.display = "none"; }

  function showSigningIn() {
    overlay(`
      <div class="eyebrow">X-Hub &middot; AY ${h(AY_DEFAULT)}</div>
      <h1>XLEAP</h1>
      <p>Signing you in and loading your records from X-Hub...</p>`);
  }
  function showSignIn(msg) {
    overlay(`
      <div class="eyebrow">X-Hub &middot; AY ${h(AY_DEFAULT)}</div>
      <h1>XLEAP</h1>
      <p>Learning Evidence and Attainment. Sign in with your XIME Google account to open your course records. Your work is saved on X-Hub and follows you across devices.</p>
      <button class="btn-g" id="hubGoogle">Sign in with Google</button>
      <div class="err" id="hubErr">${h(msg || "")}</div>
      <div class="who"><span>XIME &middot; centre.xime.org/v2/xleap</span><a href="../index.html">Back to X-Hub</a></div>`);
    $("#hubGoogle").onclick = async () => {
      $("#hubGoogle").disabled = true;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { hd: "xime.org", prompt: "select_account" } }
      });
      if (error) { $("#hubErr").textContent = error.message; $("#hubGoogle").disabled = false; }
    };
  }

  async function showPicker() {
    const { data, error } = await sb.rpc("xl_my_workspaces");
    if (error) { showSignIn("Could not read your records: " + error.message); return; }
    const rows = data || [];
    const list = rows.length ? `
      <table><thead><tr><th>Course</th><th>Term</th><th>Section</th><th>Saved</th><th>X-Hub</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td><b>${h(r.course_name || r.course_code || "Untitled record")}</b>${r.course_code && r.course_name ? `<br><span style="color:#5A6B82">${h(r.course_code)}</span>` : ""}</td>
        <td>${h(r.term || "")}</td><td>${h(r.class_section || "")}</td>
        <td>${fmtDate(r.last_saved_at)} ${fmtTime(r.last_saved_at)}</td>
        <td>${r.current_version ? `<span class="pill ok">Submitted v${r.current_version}</span>` : `<span class="pill">Draft</span>`}</td>
        <td style="white-space:nowrap"><button class="btn-o" data-open="${h(r.workspace_id)}">Open</button> <button class="btn-x" data-del="${h(r.workspace_id)}" data-name="${h(r.course_name || "this record")}" data-sub="${r.current_version ? 1 : 0}" title="Delete this draft from X-Hub">Delete</button></td></tr>`).join("")}
      </tbody></table>` : `<p>No records yet on X-Hub. Start your first course record below.</p>`;
    overlay(`
      <div class="eyebrow">X-Hub &middot; AY ${h(AY_DEFAULT)}</div>
      <h1>Your XLEAP records</h1>
      <p>You are signed in. One record per course and class. Open a record to continue, or start a new one.</p>
      ${list}
      <button class="btn-g" id="hubNew">Start a new course record</button>
      <div class="who"><span>Signed in as <b>${h(ME.full_name)}</b> &middot; ${h(ME.campus || "")}</span><span>${ME.can_review ? '<a href="review.html" style="margin-right:16px">Institutional record</a>' : ''}<a href="#" id="hubOut">Sign out</a></span></div>`);
    $("#hubNew").onclick = () => startNewRecord();
    $("#hubOut").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    document.querySelectorAll("[data-open]").forEach((b) => { b.onclick = () => openRecord(b.getAttribute("data-open"), rows); });
    document.querySelectorAll("[data-del]").forEach((b) => { b.onclick = () => deleteRecord(b.getAttribute("data-del"), b.getAttribute("data-name"), b.getAttribute("data-sub") === "1"); });
  }

  async function deleteRecord(id, name, submitted) {
    const msg = submitted
      ? `Delete the working record for ${name}? The submitted institutional record on X-Hub stays; only your working copy is removed.`
      : `Delete the draft for ${name} from X-Hub? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    const { error } = await sb.from("xl_workspace").delete().eq("workspace_id", id);
    if (error) { toast("Could not delete: " + error.message, 6000); return; }
    if (WS_ID === id) { WS_ID = null; WS_KEY = null; }
    showPicker();
  }

  /* ---------- record open / new ---------- */
  async function openRecord(id, rows) {
    const { data, error } = await sb.from("xl_workspace").select("workspace_id,record_key,state").eq("workspace_id", id).maybeSingle();
    if (error || !data) { toast("Could not open that record: " + (error ? error.message : "not found"), 6000); return; }
    clearCurrentWorkingState();
    state = normalizeState(data.state || clone(EMPTY_TOOL_DATA));
    WS_ID = data.workspace_id; WS_KEY = data.record_key;
    applyIdentity();
    afterLoad("Opened from X-Hub");
  }
  function startNewRecord() {
    clearCurrentWorkingState();
    state = normalizeState(clone(EMPTY_TOOL_DATA));
    WS_ID = null; WS_KEY = null;
    applyIdentity();
    afterLoad("New record");
    scheduleHubSave();
  }
  function afterLoad(msg) {
    activeAssessment = state.assessments[0] ? state.assessments[0].id : "MidTerm";
    activeTab = "setup";
    results = calculateAll();
    renderSidebar(); renderActive();
    hideOverlay();
    renderHubBar();
    document.getElementById("saveStatus").textContent = msg;
  }

  /* ---------- identity ---------- */
  function applyIdentity() {
    state.meta = state.meta || {}; state.aol = state.aol || {};
    state.meta.facultyName = ME.full_name || state.meta.facultyName;
    state.aol.campus = CAMPUS_TO_TOOL[ME.campus] || ME.campus || state.aol.campus;
    if (!state.aol.academicYear) state.aol.academicYear = AY_DEFAULT;
    if (!state.meta.area && ME.subject_area) {
      const areas = ["Analytics", "HR", "Operations", "Finance", "General Management", "Marketing"];
      const hit = areas.find((a) => String(ME.subject_area).toLowerCase().includes(a.toLowerCase()));
      if (hit) state.meta.area = hit;
    }
  }
  function lockIdentityFields() {
    document.querySelectorAll('[data-required-key="facultyName"],[data-required-key="campus"]').forEach((el) => {
      if (el.classList.contains("hub-locked")) return;
      el.classList.add("hub-locked");
      const c = el.querySelector("select,input"); if (c) { c.setAttribute("readonly", "readonly"); c.setAttribute("tabindex", "-1"); }
      const n = document.createElement("div"); n.className = "hub-locked-note"; n.innerHTML = "&#128274; Filled by X-Hub from the faculty directory and cannot be edited here. If it is wrong, tell the X-Hub administrator."; el.appendChild(n);
    });
  }

  /* ---------- hub bar in toolbar ---------- */
  function renderHubBar() {
    let bar = $("#hubBar");
    const host = $(".status.clean-status") || $(".toolbar");
    if (!host) return;
    if (!bar) { bar = document.createElement("div"); bar.id = "hubBar"; host.parentNode.insertBefore(bar, host); }
    bar.innerHTML = `<span class="dot"></span><span><b>${h(ME.full_name)}</b> &middot; ${h(ME.campus || "")}</span><a id="hubRecords">My records</a>${ME.can_review ? '<a href="review.html">Institutional record</a>' : ''}<a id="hubSignOut">Sign out</a>`;
    $("#hubRecords").onclick = () => showPicker();
    $("#hubSignOut").onclick = async () => { await flushHubSave(); await sb.auth.signOut(); location.reload(); };
  }

  /* ---------- persistence ---------- */
  function currentRecordKey() {
    const m = state.meta || {}, a = state.aol || {};
    return [a.academicYear, a.campus, m.area, m.programme, m.batch, m.term, m.courseCode || m.courseName, m.classSection].map((v) => String(v || "").trim()).join("|");
  }
  function currentMeta() {
    const m = state.meta || {}, a = state.aol || {};
    return { academicYear: a.academicYear, campus: a.campus, area: m.area, programme: m.programme, batch: m.batch, term: m.term, courseCode: m.courseCode, courseName: m.courseName, classSection: m.classSection };
  }
  function scheduleHubSave() {
    clearTimeout(hubTimer);
    hubTimer = setTimeout(hubSave, 1500);
  }
  async function hubSave() {
    if (!ME) return;
    if (hubSaving) { hubQueued = true; return; }
    hubSaving = true;
    ensureIdentity();
    const key = currentRecordKey();
    const status = document.getElementById("saveStatus");
    try {
      const { data, error } = await sb.rpc("xl_workspace_save", { p_record_key: key, p_state: state, p_meta: currentMeta(), p_tool_version: (state.meta && state.meta.toolVersion) || "2.0 " + ADAPTER_VERSION });
      if (error) throw error;
      if (WS_KEY && WS_KEY !== key) {
        await sb.from("xl_workspace").delete().eq("faculty_email", ME.email).eq("record_key", WS_KEY);
      }
      WS_ID = data; WS_KEY = key;
      if (status) status.textContent = "Saved to X-Hub " + fmtTime(Date.now());
    } catch (e) {
      console.error("xleap-hub save", e);
      if (status) status.textContent = "X-Hub save failed, kept locally";
    } finally {
      hubSaving = false;
      if (hubQueued) { hubQueued = false; scheduleHubSave(); }
    }
  }
  async function flushHubSave() { clearTimeout(hubTimer); await hubSave(); }

  const _markChanged = window.markChanged;
  window.markChanged = function (message) {
    _markChanged.apply(this, arguments);
    scheduleHubSave();
  };
  const _renderActive = window.renderActive;
  window.renderActive = function () {
    if (ME) ensureIdentity();
    _renderActive.apply(this, arguments);
    if (ME) { lockIdentityFields(); patchRouting(); injectMasterPanel(); }
  };
  // Returns true when identity had to be repaired (after Clear Contents / New, Open Project, imports)
  function ensureIdentity() {
    if (!ME || !state) return false;
    state.meta = state.meta || {}; state.aol = state.aol || {};
    const wantName = ME.full_name, wantCampus = CAMPUS_TO_TOOL[ME.campus] || ME.campus;
    let fixed = false;
    if (state.meta.facultyName !== wantName) { state.meta.facultyName = wantName; fixed = true; }
    if (wantCampus && state.aol.campus !== wantCampus) { state.aol.campus = wantCampus; fixed = true; }
    if (!state.aol.academicYear) { state.aol.academicYear = AY_DEFAULT; fixed = true; }
    if (fixed) { try { results = calculateAll(); } catch (e) {} scheduleHubSave(); }
    return fixed;
  }
  window.addEventListener("beforeunload", () => { if (hubTimer) { navigator.sendBeacon && hubSave(); } });

  /* ---------- submit ---------- */
  const _exportCSV = window.exportExecutiveSummaryCSV;
  window.downloadExecutiveSummaryCSV = _exportCSV;
  window.exportExecutiveSummaryCSV = async function () {
    if (ensureIdentity()) { results = calculateAll(); renderActive(); }
    const ready = institutionalExecutiveSummaryReadiness();
    if (!ready.ok) { focusFirstMandatoryIssue("Submit to X-Hub"); return; }
    const rec = executiveSummaryRecord();
    try {
      await flushHubSave();
      const { data, error } = await sb.rpc("xl_submit", { p_workspace_id: WS_ID, p_record: rec, p_columns: Object.keys(rec) });
      if (error) throw error;
      const v = data && data[0] ? data[0].version : "?";
      const eligible = rec.InstitutionalAggregationEligible === "YES";
      toast(`Submitted to X-Hub as version ${v}. ${eligible ? "Eligible for institutional aggregation." : "Recorded, but not yet eligible for aggregation: " + rec.AggregationReason + "."} Keep the Full Report in the Course File.`, 10000);
      renderActive();
    } catch (e) {
      console.error("xleap-hub submit", e);
      toast("Submission failed: " + e.message + ". Your work is saved; try again or download the CSV copy.", 9000);
    }
  };
  window.exportSummaryCSV = window.exportExecutiveSummaryCSV;

  function patchRouting() {
    const card = $(".output-route-xhub");
    if (card && !card.dataset.hub) {
      card.dataset.hub = "1";
      const t = card.querySelector("h3"); if (t) t.textContent = "X-HUB \u00B7 INSTITUTIONAL RECORD";
      const f = card.querySelector(".route-file"); if (f) f.textContent = "Submit to X-Hub";
      const p = card.querySelector("p"); if (p) p.innerHTML = "Click <b>Submit to X-Hub</b>. XLEAP files the executive summary record on X-Hub for Academics and IQAC consolidation and PO diagnostics. Each submission is versioned; a re-submission supersedes the earlier one.";
      const b = card.querySelector("button.primary"); if (b) b.textContent = "Submit to X-Hub";
      const acts = card.querySelector(".output-route-actions");
      if (acts) { const c = document.createElement("button"); c.type = "button"; c.className = "btn"; c.textContent = "Download CSV copy"; c.onclick = () => downloadExecutiveSummaryCSV(); acts.appendChild(c); }
    }
    const rule = $(".output-routing-rule");
    if (rule && !rule.dataset.hub) { rule.dataset.hub = "1"; rule.innerHTML = "<strong>Important:</strong> The <b>Full Report / Executive Summary</b> belongs in the <b>Course File</b>. The institutional record is submitted to <b>X-Hub</b> with the button above. Do not email PDFs or CSVs for consolidation."; }
    document.querySelectorAll("button").forEach((b) => { if (b.textContent.trim() === "Executive Summary Data") b.textContent = "Submit to X-Hub"; });
  }

  /* ---------- course master ---------- */
  function injectMasterPanel() {
    if (activeTab !== "setup" || $("#hubMasterPanel")) return;
    const anchor = $("#syllabusInput");
    const host = anchor ? anchor.closest(".panel-body") || anchor.parentElement : null;
    if (!host) return;
    const panel = document.createElement("div");
    panel.id = "hubMasterPanel"; panel.className = "hub-master-panel";
    panel.innerHTML = `<b>Approved syllabus from X-Hub</b> <select id="hubMasterSel"><option value="">Loading course master...</option></select><button class="btn primary" type="button" id="hubMasterLoad">Load</button> <span style="font-size:12px;color:#5A6B82">Loads COs, Bloom levels, CO-PO mapping and modules as approved by IQAC. File upload below remains available for courses not yet in the master.</span>`;
    host.insertBefore(panel, host.firstChild);
    loadMasterOptions();
    $("#hubMasterLoad").onclick = applyMaster;
  }
  let MASTER = [];
  async function loadMasterOptions() {
    const sel = $("#hubMasterSel"); if (!sel) return;
    const ay = (state.aol && state.aol.academicYear) || AY_DEFAULT;
    const { data, error } = await sb.from("xl_course_master").select("master_id,course_code,course_name,programme,campus,term,credits,domain,po_set_id,cos,co_po,modules").eq("academic_year", ay).eq("status", "approved").order("course_name");
    if (error) { sel.innerHTML = `<option value="">Course master unavailable</option>`; return; }
    MASTER = (data || []).filter((m) => !m.campus || m.campus === ME.campus);
    sel.innerHTML = MASTER.length ? `<option value="">Select approved course</option>` + MASTER.map((m) => `<option value="${h(m.master_id)}">${h(m.course_name)}${m.course_code ? " (" + h(m.course_code) + ")" : ""} \u00B7 ${h(m.programme)}${m.term ? " \u00B7 T" + h(m.term) : ""}</option>`).join("") : `<option value="">No approved courses in the master yet for ${h(ay)}</option>`;
  }
  async function applyMaster() {
    const id = $("#hubMasterSel").value;
    if (!id) { toast(MASTER.length ? "Select an approved course first, then click Load." : "No approved courses are in the X-Hub course master yet for this year. Use the syllabus file upload below; the master fills as IQAC approves Term 1 syllabi.", 7000); return; }
    const m = MASTER.find((x) => x.master_id === id); if (!m) return;
    let pos = state.pos && state.pos.length ? state.pos.map((p) => ({ code: p.code, statement: p.statement })) : [];
    if (m.po_set_id) {
      const { data } = await sb.from("xl_po_set").select("pos").eq("po_set_id", m.po_set_id).maybeSingle();
      if (data && Array.isArray(data.pos) && data.pos.length) pos = data.pos;
    }
    const parsed = {
      meta: { courseCode: m.course_code || "", courseName: m.course_name || "", programme: m.programme || "", term: m.term || "", credits: m.credits == null ? "" : String(m.credits), facultyName: ME.full_name },
      cos: (m.cos || []).map((c) => ({ code: c.code, statement: c.statement, bloom: c.bloom })),
      pos: pos,
      modules: m.modules || [],
      coPo: m.co_po || {},
      mappingDetected: !!(m.co_po && Object.keys(m.co_po).length),
      warnings: []
    };
    applyCurriculumImport(parsed, "X-Hub course master");
    applyIdentity();
    state = normalizeState(state);
    results = calculateAll();
    renderActive();
    markChanged("Loaded approved syllabus from X-Hub");
    toast(`Loaded ${parsed.cos.length} COs and ${Object.keys(parsed.coPo).length ? "the approved CO-PO mapping" : "no mapping"} for ${m.course_name} from X-Hub.`, 7000);
  }

  /* ---------- boot ---------- */
  async function boot(session) {
    const { data, error } = await sb.rpc("xl_me");
    const me = data && data[0];
    if (error || !me || !me.full_name) {
      await sb.auth.signOut();
      showSignIn(`Signed in as ${session.user.email}, but that address is not on the faculty list. Tell the X-Hub administrator which XIME address you use.`);
      return;
    }
    ME = me;
    await showPicker();
  }
  const returningFromGoogle = /[#?&](access_token|code)=/.test(window.location.hash + window.location.search);
  showSigningIn();
  let booting = false;
  async function tryBoot(session) {
    if (booting || ME) return;
    booting = true;
    try { await boot(session); } finally { booting = false; }
  }
  sb.auth.getSession().then(({ data }) => {
    if (data && data.session) tryBoot(data.session);
    else if (!returningFromGoogle) showSignIn();
  });
  sb.auth.onAuthStateChange((ev, session) => {
    if (session && (ev === "SIGNED_IN" || ev === "INITIAL_SESSION")) tryBoot(session);
    else if (ev === "INITIAL_SESSION" && !session && !ME && !returningFromGoogle) showSignIn();
  });
  setTimeout(() => { if (!ME && returningFromGoogle && !booting) showSignIn("Sign-in did not complete. Please try again."); }, 8000);
})();
