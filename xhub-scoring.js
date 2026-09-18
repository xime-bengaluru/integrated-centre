/* X-Hub shared scoring — single source of truth for CPS points, floors and incentive.
 * Extracted verbatim from the faculty form (performance.html) so every surface that
 * shows a score computes it identically. Load with <script src="/xhub-scoring.js"></script>
 * before the page's own script, then call XScore.init(RULES, FLOORS) once rules and
 * floors are loaded from Supabase. All scoring then goes through XScore.*.
 *
 * Policy of record (Joy / CPS notes, Sep 2026): teaching floor 135; a single combined
 * floor of 90 across research + revenue + institution building in any mix (no sub-floor);
 * incentive threshold 300; Rs 1000 per point above 300; paid work excluded from the
 * incentive base. The live values come from the database via init(); the fallbacks below
 * match this policy so a missing value never silently reverts to an old number.
 */
(function (global) {
  "use strict";

  var RULES = [];
  var FLOORS = {};

  var CREDIT_CODE  = { "3": "TCH_BASE_3CR", "2": "TCH_BASE_2CR", "1.5": "TCH_BASE_1_5CR", "1": "TCH_BASE_1CR" };
  var PROJECT_CODE = { "3": "TCH_PROJECT_3CR", "2": "TCH_PROJECT_2CR", "1.5": "TCH_PROJECT_1_5CR" };
  var REPEAT_CODE  = { "3": "TCH_REPEAT_3CR", "2": "TCH_REPEAT_2CR", "1.5": "TCH_REPEAT_1_5CR" };
  var BASE_FB      = { "3": 35, "2": 25, "1.5": 20, "1": 10 };
  var PROJECT_FB   = { "3": 40, "2": 30, "1.5": 25 };
  var REPEAT_FB    = { "3": 25, "2": 15, "1.5": 10 };

  function ruleByCode(c) { return RULES.find(function (r) { return r.rule_code === c; }); }
  function rulesBy(d) { return RULES.filter(function (r) { return r.domain === d; }); }
  function pts(code) { var r = ruleByCode(code); return r && r.points != null ? Number(r.points) : 0; }
  function ptsOr(code, fb) { var r = ruleByCode(code); return r && r.points != null ? Number(r.points) : fb; }
  function isProvisional(code) { var r = ruleByCode(code); return !r || r.status !== "ratified" || r.points == null; }

  function teachScore(e) {
    // Anchor faculty on a 3-credit course is a flat 15, per handbook.
    if (e.anchor === "yes" && e.credit === "3") return ptsOr("TCH_ANCHOR", 15);
    var normalBase = ptsOr(CREDIT_CODE[e.credit] || "", BASE_FB[e.credit] != null ? BASE_FB[e.credit] : 0);
    var repeatBase = REPEAT_CODE[e.credit] ? ptsOr(REPEAT_CODE[e.credit], REPEAT_FB[e.credit] != null ? REPEAT_FB[e.credit] : normalBase) : normalBase;
    // Repeat sections and small electives of 30 or fewer are scored at the repeat rate.
    var base = (e.repeat || e.small === "yes") ? repeatBase : normalBase;
    // Project-based adds a premium (project value minus the normal base for that credit).
    if (e.mode === "project" && PROJECT_CODE[e.credit]) {
      var projPts = ptsOr(PROJECT_CODE[e.credit], PROJECT_FB[e.credit] != null ? PROJECT_FB[e.credit] : normalBase);
      base += (projPts - normalBase);
    }
    var total = base;
    var cross = Number(e.crossN) || 0;
    if (cross > 0) total += cross * ptsOr("TCH_CROSS_CAMPUS", 1.5);
    if (e.eff === "below2") total += ptsOr("TCH_EFF_PENALTY", -10);
    return total;
  }

  // Author credit: all-XIME ladder (first 50 pct, rest split), plus the external sole-first case.
  function authorShare(authors, pos, collab) {
    var a = Number(authors) || 1, p = Number(pos) || 1;
    if (a <= 1) return 1;
    if (collab === "external") {
      if (p === 1) return 1;   // XIME sole first author with external co-authors: 100 percent
      return null;             // other external positions: needs matrix ruling
    }
    if (p === 1) return 0.5;   // all XIME: first author 50 percent
    return 0.5 / (a - 1);      // remaining 50 percent split equally among the others
  }

  function resScore(e) {
    var share = authorShare(e.authors, e.pos, e.collab);
    if (share == null) return 0;
    return pts(e.code) * share;
  }

  function revScore(e) {
    var s = (Number(e.amount) / 10000) * pts(e.code);
    if (e.code === "REV_MDP_OBP_FDP_EDP" && e.hours) s += (Number(e.hours) || 0) * ptsOr("REV_MDP_TEACHING_HOURS", 1.5);
    return s;
  }

  function instScore(e) {
    var r = ruleByCode(e.code);
    if (!r) return 0;
    if (e.ruled_points != null) return Number(e.ruled_points);  // panel set a final value at year-end
    if (r.points == null) return 0;                             // variable-range role, awaits a number
    return Number(r.points) / 2;                                // provisional: half the cap, pending approval
  }

  function compute(state) {
    var st = state || {};
    var T = st.teaching || [], R = st.research || [], V = st.revenue || [], I = st.institution || [];
    var t = T.reduce(function (s, e) { return s + teachScore(e); }, 0);
    var r = R.reduce(function (s, e) { return s + resScore(e); }, 0);
    var v = V.reduce(function (s, e) { return s + revScore(e); }, 0);
    var i = I.reduce(function (s, e) { return s + instScore(e); }, 0);
    // CPS note b: 90 from research, EP revenue or academic administration, in any combination.
    var other = r + v + i, overall = t + r + v + i;
    var target = FLOORS.TGT_ANNUAL_PLAN != null ? FLOORS.TGT_ANNUAL_PLAN : 300;
    var rateRule = RULES.find(function (x) { return x.domain === "incentive" && x.points != null; });
    var rate = rateRule ? Number(rateRule.points) : 1000;
    var cap = FLOORS.FLR_INCENTIVE_CAP != null ? FLOORS.FLR_INCENTIVE_CAP : 450;
    var floors = {
      teaching: t >= (FLOORS.FLR_TEACHING != null ? FLOORS.FLR_TEACHING : 135),
      other: other >= (FLOORS.FLR_RESEARCH_REVENUE != null ? FLOORS.FLR_RESEARCH_REVENUE : 90)
    };
    var floorsMet = floors.teaching && floors.other;
    // Paid work (MDP/OBP/Consulting) already paid to the faculty is stripped from the incentive base only.
    var paidDeduct = V.reduce(function (s, e) {
      if ((e.code === "REV_MDP_OBP_FDP_EDP" || e.code === "REV_CONSULTING") && e.paid === "yes")
        return s + (Number(e.amount_paid || 0) / 10000) * pts(e.code);
      return s;
    }, 0);
    var incentiveBase = Math.max(0, overall - paidDeduct);
    var eligible = Math.max(0, Math.min(incentiveBase, cap) - target);
    var gross = eligible * rate;
    return {
      teaching: t, research: r, revenue: v, institution: i, other: other, overall: overall,
      paidDeduct: paidDeduct, incentiveBase: incentiveBase,
      target: target, rate: rate, cap: cap, floors: floors, floorsMet: floorsMet,
      incentiveGross: gross, incentive: floorsMet ? gross : 0
    };
  }

  function init(rules, floors) {
    RULES = rules || [];
    if (Array.isArray(floors)) {
      FLOORS = {};
      floors.forEach(function (f) { FLOORS[f.floor_code] = Number(f.points); });
    } else {
      FLOORS = floors || {};
    }
    return global.XScore;
  }

  global.XScore = {
    init: init, pts: pts, ptsOr: ptsOr, ruleByCode: ruleByCode, rulesBy: rulesBy,
    isProvisional: isProvisional, authorShare: authorShare,
    teachScore: teachScore, resScore: resScore, revScore: revScore, instScore: instScore,
    compute: compute
  };
})(window);
