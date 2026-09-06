/*
 * CLAIMS LOADER
 * -------------
 * Used by index.html to grey out/lock already-claimed provinces on the map.
 *
 * Reads live from the community's "Rylet Land Bio Data" Google Sheet, FR
 * (Form Responses) tab - column B holds the nation name, column T holds
 * the claim code, one row per submission. This replaces the previous
 * static claims.json approach (and the Admin Page that maintained it,
 * both retired): a claim becomes visible to everyone the moment it's
 * submitted to the sheet, with no file to push and no redeploy to wait on.
 *
 * Each claim record returned looks like:
 *   { id: "row-4", name: "Astoria", provinces: ["S9","S12","N4"], capital: "S9", dateAdded: "..." }
 *
 * `capital` is the label of one of the entries in `provinces`, or null if
 * no capital was marked - a trailing "*" on a label in the sheet's Claim
 * Code column marks it, the same convention the bio page's own Claim
 * Code box uses, so a code copied from there parses identically here.
 *
 * NOTE: this fetches a public URL from the browser at page-load time: I
 * couldn't run a live end-to-end test of this exact call from a real
 * browser (no external network access in the environment I built this
 * in) - the parsing/transform logic below is verified against the
 * sheet's actual real data, and the CSV export URL follows Google's
 * standard public-sheet pattern (the same one already used successfully
 * for the Market Saturation feature on the Specialization page), but
 * please confirm the live page pulls correctly once deployed.
 */

(function () {
  const CLAIMS_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1GSaqRFLXAyr13NIPWLi-COP2618QG4gg8ki4y-4rqVk/export?format=csv&gid=113158919";
  const NATION_COLUMN = 1;      // column B
  const CLAIM_CODE_COLUMN = 19; // column T

  // Minimal CSV row parser (handles quoted fields, escaped quotes) - no
  // external library, same approach used for the Market Saturation sheet.
  function parseCsvLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else { cur += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { result.push(cur); cur = ""; }
        else cur += c;
      }
    }
    result.push(cur);
    return result;
  }

  // Turns a claim code string (e.g. "S9*, S12, N4") into { provinces, capital }.
  // Unrecognized labels are silently skipped rather than rejecting the
  // whole row - a live, player-editable sheet will have the occasional
  // typo, and one bad label shouldn't hide an otherwise-valid claim.
  function parseClaimCode(raw, byLabel) {
    const tokens = raw.split(/[,\s]+/).map(function (t) { return t.trim().toUpperCase(); }).filter(Boolean);
    const provinces = [];
    const seen = {};
    let capital = null;
    tokens.forEach(function (tok) {
      const isCapitalTok = tok.charAt(tok.length - 1) === "*";
      const label = isCapitalTok ? tok.slice(0, -1) : tok;
      const p = byLabel[label];
      if (!p) return;
      if (seen[p.label]) return;
      seen[p.label] = true;
      provinces.push(p.label);
      if (isCapitalTok) capital = p.label;
    });
    return { provinces: provinces, capital: capital };
  }

  function loadClaims() {
    // Guard against fetch() itself being unavailable (very old browsers, or
    // some restricted embedded contexts) - calling an undefined function
    // throws synchronously, which a .catch() further down the chain can't
    // intercept, and an uncaught error here would abort map.js entirely,
    // breaking far more than just claim-locking. Wrapping the whole thing
    // in try/catch makes this fail safe no matter where it goes wrong.
    try {
      if (typeof fetch !== "function") {
        console.warn("fetch() is not available - skipping the claims sheet.");
        return Promise.resolve([]);
      }
      const byLabel = {};
      (window.PROVINCES || []).forEach(function (p) { byLabel[p.label] = p; });

      return fetch(CLAIMS_SHEET_CSV_URL, { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (csvText) {
          const rows = csvText.split(/\r?\n/).map(parseCsvLine);
          const claims = [];
          // Row 0 is the header ("Timestamp", "Nation", ... "Claim Code").
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length <= CLAIM_CODE_COLUMN) continue;
            const name = (row[NATION_COLUMN] || "").trim();
            const claimCodeRaw = (row[CLAIM_CODE_COLUMN] || "").trim();
            if (!name || !claimCodeRaw) continue;
            const parsed = parseClaimCode(claimCodeRaw, byLabel);
            if (parsed.provinces.length === 0) continue;
            claims.push({
              id: "row-" + i,
              name: name,
              provinces: parsed.provinces,
              capital: parsed.capital,
              dateAdded: (row[0] || "").trim() || null,
            });
          }
          return claims;
        })
        .catch(function (e) {
          // Network error, sheet moved/became private, or unexpected
          // format - fail quietly to an empty list rather than breaking
          // the page.
          console.warn("Could not load claims from the Google Sheet:", e.message);
          return [];
        });
    } catch (e) {
      console.warn("Could not load claims from the Google Sheet:", e.message);
      return Promise.resolve([]);
    }
  }

  // Builds a lookup of provinceId -> claim record, for every province
  // across every claim. Two claims should never contain the same
  // province, but if the sheet ever has an overlap, the later row wins.
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
