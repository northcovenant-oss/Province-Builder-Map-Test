/*
 * CLAIMS LOADER
 * -------------
 * Used by index.html to grey out/lock already-claimed provinces on the map.
 *
 * Reads live from the community's claims-tracking Google Sheet - reversed
 * from a typical spreadsheet layout: instead of one row per nation with a
 * column per field, this sheet runs sideways. Row 2 holds every nation's
 * name, one per column; row 20 holds the matching claim code, in the SAME
 * column position (column C's name pairs with column C's claim code, and
 * so on). Column A is assumed to be a row label ("Nation" / "Claim Code"),
 * not actual data - real entries start at column B. Flag if that's wrong.
 *
 * Each claim record returned:
 *   { id: "col-2", name: "Testlandia", provinces: ["S9","S12"], capital: "S9", dateAdded: null }
 *
 * `capital` is the label of one of the entries in `provinces`, or null if
 * no capital was marked - a trailing "*" on a label in the claim code
 * marks it, the same convention the bio page's own Claim Code box uses.
 *
 * DIAGNOSTICS: unlike the previous version, this one always logs to the
 * console - a success line with how many claims it found, or a warning
 * with the specific failure reason - so checking whether this is working
 * doesn't require manually calling anything in DevTools. Also exposes
 * window.ClaimsStore.VERSION so a stale cached copy can be spotted at a
 * glance (console.log(window.ClaimsStore.VERSION)).
 *
 * NOTE: this fetches a public URL from the browser at page-load time. I
 * could not verify this exact sheet/layout myself - my fetch tool got
 * stuck serving a cached snapshot of a different tab in this same
 * document regardless of which URL I requested, so I was not able to
 * confirm column A's contents or the live data directly. Please verify
 * the live page against the actual sheet and let me know if anything
 * about the layout is different from what's described above.
 */

(function () {
  const CLAIMS_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1GSaqRFLXAyr13NIPWLi-COP2618QG4gg8ki4y-4rqVk/export?format=csv&gid=1336017158";
  const NATION_ROW_INDEX = 1;       // row 2 (0-indexed)
  const CLAIM_CODE_ROW_INDEX = 19;  // row 20 (0-indexed)
  const FIRST_DATA_COLUMN = 1;      // column B (0-indexed) - column A assumed to be a row label

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
    // Guard against fetch() itself being unavailable, and against any
    // other synchronous throw - an uncaught error here would abort
    // map.js entirely, breaking far more than just claim-locking.
    try {
      if (typeof fetch !== "function") {
        console.warn("[ClaimsStore] fetch() is not available - skipping the claims sheet.");
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
          const nameRow = rows[NATION_ROW_INDEX] || [];
          const claimCodeRow = rows[CLAIM_CODE_ROW_INDEX] || [];
          const claims = [];
          const lastCol = Math.max(nameRow.length, claimCodeRow.length);
          for (let col = FIRST_DATA_COLUMN; col < lastCol; col++) {
            const name = (nameRow[col] || "").trim();
            const claimCodeRaw = (claimCodeRow[col] || "").trim();
            if (!name || !claimCodeRaw) continue;
            const parsed = parseClaimCode(claimCodeRaw, byLabel);
            if (parsed.provinces.length === 0) continue;
            claims.push({
              id: "col-" + col,
              name: name,
              provinces: parsed.provinces,
              capital: parsed.capital,
              dateAdded: null,
            });
          }
          console.log("[ClaimsStore] Loaded " + claims.length + " claim(s): " +
            claims.map(function (c) { return c.name; }).join(", "));
          return claims;
        })
        .catch(function (e) {
          // Network error, sheet moved/became private, or unexpected
          // format - fail quietly to an empty list rather than breaking
          // the page, but always log why.
          console.warn("[ClaimsStore] Could not load claims from the sheet:", e.message);
          return [];
        });
    } catch (e) {
      console.warn("[ClaimsStore] Could not load claims from the sheet:", e.message);
      return Promise.resolve([]);
    }
  }

  // Builds a lookup of provinceId -> claim record, for every province
  // across every claim. Two claims should never contain the same
  // province, but if the sheet ever has an overlap, the later column wins.
  function buildProvinceIndex(claims) {
    const index = {};
    claims.forEach(function (claim) {
      (claim.provinces || []).forEach(function (label) {
        index[label.toUpperCase()] = claim;
      });
    });
    return index;
  }

  window.ClaimsStore = {
    loadClaims: loadClaims,
    buildProvinceIndex: buildProvinceIndex,
    VERSION: "2026-09-07-row-based-rebuild",
  };
})();
