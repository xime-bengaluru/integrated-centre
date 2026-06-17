/* ============================================================
   X-Hub shared access resolver
   centre.xime.org  ·  assets/js/access.js

   One canonical place for faculty-facing access resolution.
   Pages load this BEFORE their inline script, then call
   window.XHubAccess.resolveFacultyAccess(sb, opts).

   Why this exists: resolveAccess() logic used to be copy-pasted
   into every page (evaluation.html, my-review.html, x-purpose,
   x-impact). The President-lands-on-Rajagopalan bug had to be
   fixed once per copy. Now the logic lives here; a page keeps
   only a thin wrapper. Future fixes touch this small file only.

   Standing rule: no em dashes anywhere.
   ============================================================ */
(function(){
  window.XHubAccess = {
    /* Resolve which faculty this page should show, and whether it is a
       super_admin preview. Returns one of:
         { faculty, isPreview, profile, role }   on success
         null                                     when it has already
                                                  redirected or shown a blocker
       Side effects on the null paths: redirect to login / index, or call
       showBlocker(msg). The caller should `return` immediately on null.

       opts:
         showBlocker(msg)   optional. Default sets #blocker text + shows it.
         forceChangeUrl     optional. Where to send a user who must change
                            their password. Default login.html?force_change=1.
                            Pages that use a different param pass it here so
                            their existing behavior is preserved exactly.
         noTargetMessage    optional. Shown to a super_admin with no ?as=
                            and no own faculty_master row (e.g. the President).
         notFoundMessage(e) optional. Shown when ?as= email does not resolve.
    */
    resolveFacultyAccess: async function(sb, opts){
      opts = opts || {};
      var showBlocker = opts.showBlocker || function(msg){
        var b = document.getElementById('blocker');
        if(b){ b.textContent = msg; b.style.display = 'block'; }
      };
      var forceChangeUrl = opts.forceChangeUrl || 'login.html?force_change=1';
      var noTargetMessage = opts.noTargetMessage ||
        'Super admin preview. Add ?as=faculty@xime.org to the web address to open a specific faculty member.';
      var notFoundMessage = opts.notFoundMessage || function(email){
        return 'No faculty found for ' + email + '. Check the email in the ?as= part of the web address.';
      };

      /* Session */
      var sess = await sb.auth.getSession();
      var session = sess && sess.data ? sess.data.session : null;
      if(!session){ window.location.href = 'login.html'; return null; }

      /* H8 must_change_password gate.
         Source of truth is user_profiles, NOT session.user.user_metadata.
         Metadata is set at user creation and does not auto-clear on password
         change; trusting it caused a login <-> page flicker loop (30 May 2026,
         Dr Bhatta + Shimona). Read the profile column instead. */
      var pr = await sb.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
      var profile = pr ? pr.data : null;
      if(!profile){ window.location.href = 'login.html'; return null; }
      if(profile.must_change_password === true){
        window.location.href = forceChangeUrl; return null;
      }

      var role = profile.role;
      var urlParams = new URLSearchParams(window.location.search);
      var asEmail = role === 'super_admin' ? urlParams.get('as') : null;
      var targetEmail = asEmail || profile.email;

      /* Faculty, deans, directors: always their own row. */
      if(role === 'fdp_user' || role === 'dean' || role === 'director'){
        var own = await sb.from('faculty_master').select('*').eq('email', profile.email).maybeSingle();
        if(!own || !own.data){
          showBlocker('Your faculty profile is not linked to the review system yet. Please contact your Director.');
          return null;
        }
        return { faculty: own.data, isPreview: false, profile: profile, role: role };
      }

      /* Super admin: explicit ?as= target, or own row if they have one.
         Do NOT auto-pick a faculty member. An admin with no row of their own
         (e.g. the President) used to be dropped onto the alphabetically first
         faculty via an order('campus') fallback. That fallback is gone. */
      if(role === 'super_admin'){
        var r = await sb.from('faculty_master').select('*').eq('email', targetEmail).maybeSingle();
        if(!r || !r.data){
          showBlocker(asEmail ? notFoundMessage(asEmail) : noTargetMessage);
          return null;
        }
        return { faculty: r.data, isPreview: targetEmail !== profile.email, profile: profile, role: role };
      }

      /* Any other role has no business on a faculty surface. */
      window.location.href = 'index.html';
      return null;
    }
  };
})();
