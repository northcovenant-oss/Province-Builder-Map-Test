/*
 * LAND BIO GENERATOR
 * -------------------
 * This is the only file you need to touch to change how land bios are
 * written. map.js calls window.generateLandBio(provinces) when someone
 * hits "Generate Land Bio" and just displays whatever string comes back.
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
 * Feel free to gut this function entirely and replace it with something
 * template-based, table-driven, or hooked up to an AI API call — as long
 * as it returns a string (or a Promise<string>, see the async note below).
 */

function generateLandBio(provinces) {
  if (!provinces || provinces.length === 0) {
    return "No provinces claimed yet.";
  }

  const continents = uniq(provinces.map(p => p.continent));
  const climates = countBy(provinces, p => (p.climate ? p.climate.dominant : "Unknown"));
  const econs = countBy(provinces, p => p.econ);

  const topClimate = topEntry(climates);
  const topEcon = topEntry(econs);

  const provinceList = provinces.map(p => p.label).join(", ");

  let bio = "";
  bio += `This territory spans ${provinces.length} province${provinces.length === 1 ? "" : "s"} `;
  bio += continents.length > 1
    ? `across both the northern and southern continents.\n\n`
    : `on the ${continents[0]} continent.\n\n`;

  bio += `The land is predominantly ${describeClimate(topClimate)}`;
  if (Object.keys(climates).length > 1) {
    bio += `, with pockets of ${otherKeys(climates, topClimate).join(" and ")} scattered throughout`;
  }
  bio += `.\n\n`;

  bio += `Economically, the region leans toward ${topEcon.toLowerCase()}`;
  if (Object.keys(econs).length > 1) {
    bio += `, supplemented by ${otherKeys(econs, topEcon).map(e => e.toLowerCase()).join(" and ")}`;
  }
  bio += `.\n\n`;

  bio += `Claimed provinces: ${provinceList}.`;

  return bio;
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
 * stays the same — it still just needs to resolve to a string.
 */
