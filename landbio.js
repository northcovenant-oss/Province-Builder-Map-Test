/*
 * LAND BIO GENERATOR
 * -------------------
 * This is the only file you need to touch to change how land bios are
 * written. map.js calls window.generateLandBio(provinces) when someone
 * hits "Generate Land Bio".
 *
 * `provinces` is an array of the claimed province objects, in the order
 * they were claimed. Each one looks like:
 *
 *   {
 *     id: "path123",
 *     label: "S42",              // display name (rename these in data.js
 *                                 // once real province names exist)
 *     continent: "south",        // "north" or "south"
 *     fill: "#78b464",
 *     econ: "Agriculture Oriented",
 *     climate: {
 *       dominant: "Oceanic",
 *       breakdown: { "Oceanic": 87.4, "Semi-Arid": 12.6 }
 *     }
 *   }
 *
 * generateLandBio returns (or resolves to, if you make it async — see the
 * note at the bottom) an object: { text, bbcCode }
 *   - text: the prose paragraph shown on the bio page
 *   - bbcCode: a forum-ready BBC-code version of the same claim, shown as
 *     the "Copy BBC Code" button's clipboard content
 *
 * Both are built from one shared computeEconomics() pass so the numbers
 * in the prose and the numbers in the BBC code always match — if you add
 * more output formats later, feed them from that same object rather than
 * recomputing sector splits again (each computation re-rolls the dice).
 *
 * Also included below: ECON_SECTOR_CONFIG and computeSectorSplit(), which
 * randomize a Services / Manufacturing / Extraction breakdown for each
 * province based on its econ category, per-generation. See the comment
 * above ECON_SECTOR_CONFIG for how to hard-code these instead later.
 */

function generateLandBio(provinces) {
  if (!provinces || provinces.length === 0) {
    return { text: "No provinces claimed yet.", bbcCode: "" };
  }

  const economics = computeEconomics(provinces);
  return {
    text: buildBioText(provinces, economics),
    bbcCode: buildBBCCode(provinces, economics),
  };
}

// One shared pass over the claimed provinces — climates, econ categories,
// and a randomized sector-percentage roll — that both output formats
// below are built from.
function computeEconomics(provinces) {
  const continents = uniq(provinces.map(p => p.continent));
  const climates = countBy(provinces, p => (p.climate ? p.climate.dominant : "Unknown"));
  const econs = countBy(provinces, p => p.econ);
  const topClimate = topEntry(climates);
  const topEcon = topEntry(econs);

  const sectorSplits = provinces.map(p => computeSectorSplit(p.econ)).filter(Boolean);
  const sectorTotals = sectorSplits.length > 0 ? computeSectorTotals(sectorSplits) : null;

  return { continents, climates, econs, topClimate, topEcon, sectorTotals };
}

function buildBioText(provinces, econ) {
  const provinceList = provinces.map(p => p.label).join(", ");

  let bio = "";
  bio += `This territory spans ${provinces.length} province${provinces.length === 1 ? "" : "s"} `;
  bio += econ.continents.length > 1
    ? `across both the northern and southern continents.\n\n`
    : `on the ${econ.continents[0]} continent.\n\n`;

  bio += `The land is predominantly ${describeClimate(econ.topClimate)}`;
  if (Object.keys(econ.climates).length > 1) {
    bio += `, with pockets of ${otherKeys(econ.climates, econ.topClimate).join(" and ")} scattered throughout`;
  }
  bio += `.\n\n`;

  bio += `Economically, the region leans toward ${econ.topEcon.toLowerCase()}`;
  if (Object.keys(econ.econs).length > 1) {
    bio += `, supplemented by ${otherKeys(econ.econs, econ.topEcon).map(e => e.toLowerCase()).join(" and ")}`;
  }
  bio += `.\n\n`;

  if (econ.sectorTotals) {
    const t = econ.sectorTotals;
    bio += `Across the claimed territory, economic output breaks down to roughly ` +
      `${t.Services}% Services, ${t.Manufacturing}% Manufacturing, and ` +
      `${t.Extraction}% Extraction.\n\n`;
  }

  bio += `Claimed provinces: ${provinceList}.`;

  return bio;
}

// ---- BBC code output ----
//
// Fills in the community's forum application template with whatever we
// can confidently derive from the claim (dominant climate, top economy
// type, and the three sector percentages, ranked highest to lowest to
// match the template's generic "Primary / Secondary / Tertiary" columns).
// Everything else in the template (exports, resources, population, links)
// is intentionally left blank for manual completion, since we don't have
// that data yet.
//
// A few things in the template as given look like they may be typos or
// left incomplete (a duplicated "Energy Production" line, and two [url=]
// tags with no target) — those were left exactly as provided rather than
// guessed at. Worth double-checking against your forum before heavy use.

const BBC_TEMPLATE = `[spoiler=Land Bio] Land Bio: [nation][/nation]

[list][b]Climate[/b]: [i]{{CLIMATE}}[/i]
[list][u]Season(s):[/u][list][/list]  
[u]Features:[/u][list][/list]
[u]Agriculture:[/u][list] [/list]
[u]Examples:[/u][list][/list]
[u]External Link:[/u][list][/list][/list]

[b]Economy[/b][list]| {{PRIMARY_PCT}}% | {{SECONDARY_PCT}}% | {{TERTIARY_PCT}}% |
[*][u]Economy Type[/u]: 
 [i]{{ECON_TYPE}}[/i][list][*]
[/list][*][u]World Exports[/u]: 
 [list]| 1[sup]st[/sup] :  | 2[sup]nd[/sup] : | 3[sup]rd[/sup] : | 4[sup]th[/sup] : | 5[sup]th[/sup] :  |[/list] 
 [*][i]Please look over the [url=[/url] to understand how your economy fits into the region.[/i][/list] 

[b]Resources & Production[/b]:
[list][*][u]Resources[/u]:
[*][u]Energy Production[/u]:[*][u]Energy Production[/u]:
[*][u]Food Production[/u]: [/list]

[b]Stable Population[/b]:
[list][*][i]Look over the [url=[/url] when choosing your population.[/i][/list][/list]
[i]If you have any questions or concerns feel free to contact me otherwise use this information to complete the application and you are all set[/i]
[/spoiler]`;

function buildBBCCode(provinces, econ) {
  let primaryPct = "", secondaryPct = "", tertiaryPct = "";
  if (econ.sectorTotals) {
    const ranked = Object.values(econ.sectorTotals).sort((a, b) => b - a);
    [primaryPct, secondaryPct, tertiaryPct] = ranked;
  }

  return BBC_TEMPLATE
    .replace("{{CLIMATE}}", econ.topClimate)
    .replace("{{ECON_TYPE}}", econ.topEcon)
    .replace("{{PRIMARY_PCT}}", primaryPct)
    .replace("{{SECONDARY_PCT}}", secondaryPct)
    .replace("{{TERTIARY_PCT}}", tertiaryPct);
}

// ---- economic sector randomization ----
//
// Every province's econ category (e.g. "Service Focused", "Mineral Oriented")
// implies a ranking of three underlying sectors — Services, Manufacturing,
// and Extraction — and "Focused" vs "Oriented" controls how lopsided the
// split is. This is computed fresh each time a bio is generated; if you'd
// rather lock these numbers in per-province instead of re-rolling them
// every time, this is the place to swap random generation for a lookup
// against a value stored in data.js.

const ECON_SECTOR_CONFIG = {
  "Service Focused":      { order: ["Services", "Manufacturing", "Extraction"], magnitude: "focused" },
  "Service Oriented":     { order: ["Services", "Manufacturing", "Extraction"], magnitude: "oriented" },
  "Production Focused":   { order: ["Manufacturing", "Services", "Extraction"], magnitude: "focused" },
  "Energy Focused":       { order: ["Extraction", "Services", "Manufacturing"], magnitude: "focused" },
  "Energy Oriented":      { order: ["Extraction", "Manufacturing", "Services"], magnitude: "oriented" },
  "Agriculture Focused":  { order: ["Extraction", "Services", "Manufacturing"], magnitude: "focused" },
  "Agriculture Oriented": { order: ["Extraction", "Manufacturing", "Services"], magnitude: "oriented" },
  "Mineral Focused":      { order: ["Extraction", "Services", "Manufacturing"], magnitude: "focused" },
  "Mineral Oriented":     { order: ["Extraction", "Manufacturing", "Services"], magnitude: "oriented" },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns { Services, Manufacturing, Extraction } percentages (integers,
// summing to 100) for a single province's econ category, or null if the
// category isn't recognized.
function computeSectorSplit(econName) {
  const config = ECON_SECTOR_CONFIG[econName];
  if (!config) return null;

  const [primaryKey, secondaryKey, tertiaryKey] = config.order;
  let primary, secondary;

  if (config.magnitude === "focused") {
    primary = randInt(70, 90);
    secondary = randInt(9, 99 - primary);
  } else {
    primary = randInt(41, 70);
    secondary = randInt(9, Math.min(99 - primary, primary));
  }
  const tertiary = 100 - primary - secondary;

  return {
    [primaryKey]: primary,
    [secondaryKey]: secondary,
    [tertiaryKey]: tertiary,
  };
}

// Averages a list of per-province sector splits into one overall
// breakdown, rounded to whole percentages that still sum to 100.
function computeSectorTotals(splits) {
  const sectors = ["Services", "Manufacturing", "Extraction"];
  const raw = {};
  sectors.forEach(s => {
    raw[s] = splits.reduce((sum, sp) => sum + (sp[s] || 0), 0) / splits.length;
  });

  const rounded = {};
  let roundedSum = 0;
  sectors.forEach(s => {
    rounded[s] = Math.round(raw[s]);
    roundedSum += rounded[s];
  });

  // Rounding can drift the total off 100 by a point or two — nudge the
  // largest sector to absorb the difference so the displayed total is
  // always exactly 100%.
  const diff = 100 - roundedSum;
  if (diff !== 0) {
    const largest = sectors.reduce((a, b) => (rounded[a] >= rounded[b] ? a : b));
    rounded[largest] += diff;
  }
  return rounded;
}

// ---- small helpers ----

function uniq(arr) {
  return Array.from(new Set(arr));
}

function countBy(arr, fn) {
  const out = {};
  arr.forEach(item => {
    const key = fn(item);
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function topEntry(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function otherKeys(counts, exclude) {
  return Object.keys(counts).filter(k => k !== exclude);
}

function describeClimate(name) {
  const descriptions = {
    "Oceanic": "temperate and oceanic",
    "Humid Continental": "humid continental",
    "Mediterranean": "mild and Mediterranean",
    "Arid": "arid and dry",
    "Semi-Arid": "semi-arid",
    "Tropical Wet Dry": "tropical, with distinct wet and dry seasons",
    "Tropical Rainforest": "dense tropical rainforest",
    "Highlands": "rugged highland terrain",
    "Sub Arctic": "subarctic and cold",
    "Polar": "polar and frozen",
  };
  return descriptions[name] || name.toLowerCase();
}

// Expose globally so map.js can call it without a module bundler.
window.generateLandBio = generateLandBio;

/*
 * NOTE ON ASYNC / AI-GENERATED BIOS
 * ----------------------------------
 * If you'd rather call an AI API to write the bio instead of the
 * template above, make generateLandBio an async function and update
 * the call site in map.js to `await` it (and show a loading state
 * while it's in flight). Everything else in this file's contract
 * stays the same — it still just needs to resolve to { text, bbcCode }.
 */
