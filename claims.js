/*
 * CLAIMS LOADER
 * -------------
 * Shared by both index.html (to grey out/lock already-claimed provinces)
 * and admin.html (to see what's already on record before adding more).
 *
 * claims.json is the single source of truth for "what's been accepted."
 * It only updates when someone commits a new export from the Admin Page —
 * this is a static site with no server, so there's no way for the map to
 * see a claim the moment it's added; it becomes visible to everyone once
 * the updated claims.json is pushed to the repo and GitHub Pages
 * redeploys (usually well under a minute).
 *
 * Each claim record looks like:
 *   { id: "1735500000000", name: "Astoria", provinces: ["S9","S12","N4"], capital: "S9", dateAdded: "2026-08-29T12:00:00.000Z" }
 *
 * `capital` is the label of one of the entries in `provinces`, or null if
 * no capital was set. It's set on the Admin Page by starring a label in
 * the claim code (e.g. "S9*"), which is the same marker the bio page's
 * "Claim Code" box and the main map's "Load a Claim Code" use.
 */

(function () {
  function loadClaims() {
    // Guard against fetch() itself being unavailable (very old browsers, or
    // some restricted embedded contexts) - calling an undefined function
    // throws synchronously, which a .catch() further down the chain can't
    // intercept, and an uncaught error here would abort map.js entirely,
    // breaking far more than just claim-locking. Wrapping the whole thing
    // in try/catch makes this fail safe no matter where it goes wrong.
    try {
      if (typeof fetch !== 'function') {
        console.warn('fetch() is not available - skipping claims.json.');
        return Promise.resolve([]);
      }
      return fetch('claims.json', { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) return [];
          return res.json();
        })
        .then(function (data) {
          return Array.isArray(data.claims) ? data.claims : [];
        })
        .catch(function (e) {
          // Missing file, offline, or opened via file:// (fetch of local
          // files is blocked by the browser in that case) - fail quietly
          // to an empty list rather than breaking the page.
          console.warn('Could not load claims.json:', e.message);
          return [];
        });
    } catch (e) {
      console.warn('Could not load claims.json:', e.message);
      return Promise.resolve([]);
    }
  }

  // Builds a lookup of provinceId -> claim record, for every province
  // across every claim. Two claims should never contain the same
  // province (the Admin Page checks this before saving), but if it ever
  // happens, the later claim in the array wins.
  function buildProvinceIndex(claims) {
    const index = {};
    claims.forEach(function (claim) {
      (claim.provinces || []).forEach(function (label) {
        index[label.toUpperCase()] = claim;
      });
    });
    return index;
  }

  window.ClaimsStore = { loadClaims, buildProvinceIndex };
})();
