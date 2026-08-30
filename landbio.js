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
 *     },
 *     isCapital: false           // true for at most one province - set on
 *                                 // the map by clicking the star next to a
 *                                 // claimed province in the sidebar list
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

  // Keep each province's own roll paired with its label/econ (not just the
  // blended total) - buildBioText uses this for the per-province testing
  // breakdown so the underlying per-province math can actually be checked,
  // not just trusted from the aggregate.
  const perProvinceSectors = provinces
    .map(p => ({ label: p.label, econ: p.econ, split: computeSectorSplit(p.econ) }))
    .filter(entry => entry.split);
  const sectorSplits = perProvinceSectors.map(entry => entry.split);
  const sectorTotals = sectorSplits.length > 0 ? computeSectorTotals(sectorSplits) : null;
  const classification = sectorTotals ? classifyEconomy(sectorTotals) : null;

  return { continents, climates, econs, topClimate, topEcon, sectorTotals, perProvinceSectors, classification };
}

// Section headers in the returned text are marked with a leading "## " -
// map.js looks for that prefix and renders those lines as headings instead
// of paragraphs. The section names themselves (Climate, Economy, Resources
// & Production, Stable Population) intentionally match the BBC template's
// [b]Section[/b] headers one-for-one, so the on-page bio and the copied
// BBC code read as the same document in two formats rather than two
// different pieces of writing.
function buildBioText(provinces, econ) {
  const provinceList = provinces.map(p => p.label).join(", ");
  const capital = provinces.find(p => p.isCapital);

  let bio = "";
  bio += `This territory spans ${provinces.length} province${provinces.length === 1 ? "" : "s"} `;
  bio += econ.continents.length > 1
    ? `across both the northern and southern continents.`
    : `on the ${econ.continents[0]} continent.`;
  bio += capital ? ` Its capital is ${capital.label}.\n\n` : `\n\n`;

  bio += `## Climate\n\n`;
  bio += buildClimateParagraphs(provinces, econ);

  bio += `## Economy\n\n`;
  bio += `Economy Type: ${econ.topEcon}`;
  if (Object.keys(econ.econs).length > 1) {
    bio += `, supplemented by ${otherKeys(econ.econs, econ.topEcon).join(", ")}`;
  }
  bio += `.\n\n`;
  if (econ.sectorTotals) {
    const t = econ.sectorTotals;
    bio += `Output breakdown: roughly ${t.Services}% Services, ${t.LightIndustry}% Light Industry, ` +
      `${t.HeavyIndustry}% Heavy Industry, and ${t.Extraction}% Extraction.\n\n`;

    const classification = econ.classification;
    bio += `Economic Classification: ${classification.name}` +
      (classification.pct != null ? ` (${classification.pct}% combined)` : ``) + `.\n\n`;
    const desc = ECONOMY_DESCRIPTIONS[classification.name];
    if (desc) bio += `${desc}\n\n`;
  }

  // TESTING ONLY - remove this block once the Light/Heavy Industry formula
  // is confirmed correct. It lists each province's own roll (rather than
  // just the blended claim-wide total above) so the per-province math can
  // actually be checked against ECON_SECTOR_CONFIG / LIGHT_INDUSTRY_FACTOR,
  // LIGHT_INDUSTRY_FACTOR, not just trusted from the average.
  if (econ.perProvinceSectors && econ.perProvinceSectors.length > 0) {
    bio += `[Testing] Per-province sector breakdown:\n`;
    econ.perProvinceSectors.forEach(entry => {
      const s = entry.split;
      bio += `${entry.label} (${entry.econ}): ${s.Services}% Services, ${s.LightIndustry}% Light Industry, ` +
        `${s.HeavyIndustry}% Heavy Industry, ${s.Extraction}% Extraction\n`;
    });
    bio += `\n`;
  }

  bio += `## Resources & Production\n\n`;
  bio += `*(Resources, energy production, and food production haven't been filled in yet - add them here or in the BBC code before submitting.)*\n\n`;

  bio += `## Stable Population\n\n`;
  bio += `*(Population hasn't been set yet - add it here or in the BBC code before submitting.)*\n\n`;

  bio += `Claimed provinces: ${provinceList}.`;

  return bio;
}

// Climates covering more than this share of the claim (by province count)
// each get their own full descriptive paragraph; anything at or below the
// threshold gets folded into one brief "small pockets of..." mention, so a
// claim spanning many climate zones doesn't turn into a wall of text.
const MAJOR_CLIMATE_THRESHOLD_PCT = 10;

function buildClimateParagraphs(provinces, econ) {
  const total = provinces.length;
  const entries = Object.entries(econ.climates)
    .map(([name, count]) => ({ name, pct: (count / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const major = entries.filter(e => e.pct > MAJOR_CLIMATE_THRESHOLD_PCT);
  const minor = entries.filter(e => e.pct <= MAJOR_CLIMATE_THRESHOLD_PCT);

  let out = "";
  major.forEach(e => {
    const detail = CLIMATE_DETAILS[e.name];
    out += `${e.name} climate covers roughly ${Math.round(e.pct)}% of the claimed territory. `;
    out += detail ? `${detail.features} ${detail.agriculture}` : `${describeClimate(e.name)}.`;
    out += `\n\n`;
  });

  if (minor.length > 0) {
    out += `Small pockets of ${joinWithAnd(minor.map(e => e.name))} round out the remaining terrain.\n\n`;
  }

  return out;
}

function joinWithAnd(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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

[list][b]Climate[/b]: {{CLIMATE_BLOCK}}[/list]

[b]Economy[/b][list]| {{PRIMARY_PCT}}% | {{SECONDARY_PCT}}% | {{TERTIARY_PCT}}% |
[*][u]Economy Type[/u]: 
 [i]{{ECON_TYPE}}[/i][list][*]{{ECON_TYPE_DESC}}
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
    // Explicitly the three combined sectors (Manufacturing = Light + Heavy
    // recombined) - NOT Object.values(), since sectorTotals now also
    // carries the Light/Heavy sub-buckets and this table's fixed 3-column
    // forum-template format has no room for a 5-way ranking.
    const t = econ.sectorTotals;
    const ranked = [t.Services, t.Manufacturing, t.Extraction].sort((a, b) => b - a);
    [primaryPct, secondaryPct, tertiaryPct] = ranked;
  }

  const detail = CLIMATE_DETAILS[econ.topClimate];
  const climateBlock = detail ? detail.bbc : `[i]${econ.topClimate}[/i][list][u]Season(s):[/u][list][/list][u]Features:[/u][list][/list][u]Agriculture:[/u][list][/list][u]Examples:[/u][list][/list][u]External Link:[/u][list][/list][/list]`;

  // The classification (Service Economy, Industrial Economy, etc.) rather
  // than the per-province econ category (Service Focused, etc.) - this
  // template slot's existing empty "[list][*]...[/list]" bullet was
  // clearly built to hold a description of an economy archetype like
  // these, not the more granular per-province category.
  const econType = econ.classification ? econ.classification.name : econ.topEcon;
  const econTypeDesc = econ.classification ? (ECONOMY_DESCRIPTIONS[econ.classification.name] || "") : "";

  return BBC_TEMPLATE
    .replace("{{CLIMATE_BLOCK}}", climateBlock)
    .replace("{{ECON_TYPE}}", econType)
    .replace("{{ECON_TYPE_DESC}}", econTypeDesc)
    .replace("{{PRIMARY_PCT}}", primaryPct)
    .replace("{{SECONDARY_PCT}}", secondaryPct)
    .replace("{{TERTIARY_PCT}}", tertiaryPct);
}

// ---- climate reference data ----
//
// One entry per climate zone: `bbc` is the exact BBC-formatted block (used
// only in the copyable BBC code — see buildBBCCode above), while `features`
// and `agriculture` are plain-English versions of the same content, used in
// the prose shown on the bio page itself so nobody sees raw [list]/[u] tags
// there. Keyed by the climate names used elsewhere in this app; "Tundra"
// and "Humid Subtropical" aren't produced by the current climate data but
// are included here in case a future climate raster adds them.

const CLIMATE_DETAILS = {
  "Polar": {
    bbc: `[i]Polar/ Ice Cap[/i][list][u]Season(s):[/u][list]Polar Day, Polar Night[/list][u]Features:[/u][list]In Ice Cap Climates, the temperature never or almost never exceeds 0 °C (32 °F). The climate covers areas in or near the polar regions, as well as the highest mountaintops. Such areas are covered by a permanent layer of ice and have no vegetation, but they may have animal life, that usually feeds from the oceans. Ice cap climates are inhospitable to human life.[/list][u]Agriculture:[/u][list]Very little vegetation exists allowing for only niche foods based off of the environment. Found mostly in polar regions and deserts where the climate is too extreme to support most forms of life.[/list][u]Examples:[/u][list] Inner Greenland, Antarctica[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Ice_cap_climate[/list][/list]`,
    features: "In Polar / Ice Cap climates, the temperature almost never exceeds 0\u00b0C (32\u00b0F). The land is permanently covered in ice with no vegetation, though animal life feeding from the oceans can still be found \u2014 conditions are largely inhospitable to human life.",
    agriculture: "Very little vegetation exists, allowing for only niche foods based on the environment \u2014 among the most extreme climates on the planet for sustaining life.",
  },
  "Tundra": {
    bbc: `[i]Tundra[/i][list][u]Season(s):[/u][list]Winter, Summer[/list][u]Features:[/u][list] Tundra climates signifying a local climate in which at least one month has an average temperature high enough to melt snow. Tundras are dominated by polar winds and extremely low temperatures. It is divided into two seasons Winter when temperatures range from −28 °C (−18 °F) to −50 °C (−58 °F) and Summer with a temperature around 12 °C (54 °F) leaving the ground marshy. Very little Precipitation.  [/list][u]Agriculture:[/u][list]Cold Pastoral regions are found in the upper latitudes in regions usually too cold to support traditional agriculture. The herding of livestock better adapted for the lower vegetation level is an important part of the culture.[/list][u]Examples:[/u][list]Far Northern Canada/Russia Greenland[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Tundra[/list][/list]`,
    features: "Tundra climates see at least one month warm enough to melt snow, but are otherwise dominated by polar winds and extreme cold \u2014 winters range from \u221228\u00b0C to \u221250\u00b0C (\u221218\u00b0F to \u221258\u00b0F), while summers hover around 12\u00b0C (54\u00b0F) and leave the ground marshy. Precipitation is very low.",
    agriculture: "Cold pastoral regions in these upper latitudes are usually too cold for traditional agriculture, so herding livestock adapted to sparse vegetation is an important part of the culture.",
  },
  "Sub Arctic": {
    bbc: `[i]Sub-Arctic[/i][list][u]Season(s):[/u][list]Winter, Summer[/list][u]Features:[/u][list]In Subarctic climates temperatures, can vary widely sometimes dipping below −40 °C (−40 °F) with highs of 30 °C (86 °F) with 5–7 consecutive months where the average temperature is below freezing. Precipitation is low but slightly better than in the Tundra. This region is usually dominated by expansive Taiga forests with heavy snow in the winter.[/list][u]Agriculture:[/u][list]Cold Pastoral regions are found in the upper latitudes in regions usually too cold to support traditional agriculture. The herding of livestock better adapted for the lower vegetation level is an important part of the culture.[/list][u]Examples:[/u][list] Northern Canada/Russia[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Subarctic_climate[/list][/list]`,
    features: "Sub Arctic climates vary widely, sometimes dipping below \u221240\u00b0C (\u221240\u00b0F) with highs of 30\u00b0C (86\u00b0F), and 5\u20137 consecutive months averaging below freezing. Precipitation is low but slightly better than the Tundra, with the region usually dominated by expansive taiga forest and heavy winter snow.",
    agriculture: "Cold pastoral regions are found in these upper latitudes, generally too cold for traditional agriculture \u2014 herding livestock adapted to sparse vegetation is an important part of the culture here.",
  },
  "Highlands": {
    bbc: `[i]Alpine/Highlands[/i][list][u]Season(s):[/u][list]Winter, Summer[/list][u]Features:[/u][list] Alpine Climates are found on mountains whose elevation causes a separate climate to form distinct from the surrounding one. No month has a mean temperature higher than 10 °C (50 °F) in an Alpine Climate.[/list][u]Agriculture:[/u][list] Alpine climates are found in and around mountain ranges where vegetation is lacking leading to an extremely specialized diet along with reliance on pastoralism.[/list][u]Examples:[/u][list]Mountains[/list][u]External Link:[/u][list] https://en.wikipedia.org/wiki/Alpine_climate [/list][/list]`,
    features: "Highlands / Alpine climates form on mountains whose elevation creates a separate climate from the surrounding lowlands \u2014 no month sees a mean temperature above 10\u00b0C (50\u00b0F).",
    agriculture: "Vegetation is sparse in and around these mountain ranges, leading to a highly specialized diet reliant on pastoralism.",
  },
  "Arid": {
    bbc: `[i]Arid/Desert[/i][list][u]Season(s):[/u][list] Dry or Summer, Winter[/list][u]Features:[/u][list]Hot desert climates usually feature hot, sometimes exceptionally hot, periods of the year. In many locations featuring a hot desert climate, maximum temperatures of over 40 °C (104 °F) are not uncommon in summer and can soar to over 45 °C (113 °F) in the hottest regions. precipitation is too low to sustain any vegetation at all, or at most a very scanty shrub. An area that features this climate usually experiences from 25 to 200 mm (7.87 inches) per year of precipitation and in some years may experience no precipitation at all.[/list][list]Cold desert climates usually feature warm (usually hot) and dry summers, though summers typically are not quite as hot as summers in hot desert climates. Unlike hot desert climates, cold desert climates tend to feature cold winters with rare snow. Cold desert climates are typically found at higher altitudes than hot desert climates and are usually drier than hot desert climates. A cold desert climate is typically found in temperate zones, usually in the rain shadow of high mountains, which restrict precipitation from the westerly winds.[/list][u]Agriculture:[/u][list]Very little vegetation exists allowing for only niche foods based off of the environment. Found mostly in polar regions and deserts where the climate is too extreme to support many forms of life. Subsistence based on hunting and gathering as well as domesticated migratory animals.[/list][u]Examples:[/u][list] Sahara Desert (Hot), Gobi Desert (Cold)[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Desert_climate[/list][/list]`,
    features: "Hot desert climates bring scorching periods, with summer highs regularly above 40\u00b0C (104\u00b0F) and up to 45\u00b0C (113\u00b0F) in the hottest regions; precipitation is too low to sustain more than scanty shrub, typically 25\u2013200mm a year and sometimes none at all. Cold desert climates instead see warm, dry summers and cold winters with rare snow, usually forming at higher altitude in the rain shadow of mountains that block precipitation.",
    agriculture: "Very little vegetation exists, allowing for only niche foods based on the environment, with subsistence relying on hunting, gathering, and domesticated migratory animals.",
  },
  "Semi-Arid": {
    bbc: `[i]Semi-Arid/Steppe[/i][list][u]Season(s):[/u][list] Summer, Winter[/list][u]Features:[/u][list]Hot semi-arid climates tend to be located in the tropics and subtropics. These climates tend to have hot, sometimes extremely hot, summers and mild to warm winters. Snow rarely (if ever) falls in these regions. Hot semi-arid climates are most commonly found on the fringes of subtropical deserts.[/list][list]Cold semi-arid climates tend to be in temperate zones or elevated portions in subtropical zones. They are typically found in continental interiors some distance from large bodies of water. Cold semi-arid climates usually feature hot and dry summers. These areas usually see some snowfall during the winter, though snowfall is much lower than at locations at similar latitudes with more humid climates, and are sometimes subject to major temperature swings between day and night. [/list][u]Agriculture:[/u][list]Hot Pastoral regions are found in semi-arid to arid regions where most food production comes from basic subsistence farming and the herding of livestock better adapted for the lower vegetation level.[/list][u]Examples:[/u][list] Australian Out Back (Hot) Eurasian Steppes, Rocky Mountains (Cold)[/list][u]External Link:[/u][list] https://en.wikipedia.org/wiki/Semi-arid_climate[/list][/list]`,
    features: "Hot Semi-Arid climates are found mostly in the tropics and subtropics, on the fringes of subtropical deserts, with hot (sometimes extremely hot) summers, mild-to-warm winters, and rare snow. Cold semi-arid climates instead sit in temperate continental interiors, with hot, dry summers, some winter snowfall, and often sharp day-to-night temperature swings.",
    agriculture: "Pastoral regions here rely on basic subsistence farming alongside herding livestock adapted to sparse vegetation.",
  },
  "Mediterranean": {
    bbc: `[i]Mediterranean[/i][list][u]Season(s):[/u][list]Summer, Winter[/list][u]Features:[/u][list]Mediterranean climates are characterized by dry summers and mild, moist winters. The average temperature is above 10 °C (50 °F) in their warmest months, and an average in the coldest between 18 to −3 °C (64 to 27 °F). The climate receives almost all of its precipitation during the winter, autumn and spring seasons, and may go anywhere from 4 to 6 months during the summer without having any significant precipitation.[/list][u]Agriculture:[/u][list]Mediterranean regions have a specialized diet based around it\u2019s distinct climate. The environment leads to more niche foods suitable for the drier climate such as olive oil, and wines. [/list][u]Examples:[/u][list]The Mediterranean Basin, California[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Mediterranean_climate[/list][/list]`,
    features: "Mediterranean climates bring dry summers and mild, moist winters, with warmest-month averages above 10\u00b0C (50\u00b0F) and coldest-month averages between 18\u00b0C and \u22123\u00b0C (64\u00b0F to 27\u00b0F). Nearly all precipitation falls in winter, autumn, and spring, leaving 4 to 6 summer months with little to no rain.",
    agriculture: "The dry climate shapes a specialized diet built around niche crops like olives and grapes, producing regional staples such as olive oil and wine.",
  },
  "Tropical Wet Dry": {
    bbc: `[i]Savanna/Tropical Wet & Dry[/i][list][u]Season(s):[/u][list]Wet, Dry[/list][u]Features:[/u][list]Tropical savanna climates have monthly mean temperatures above 18 °C (64 °F) in every month of the year and typically a pronounced dry season, with the driest month having precipitation less than 60 mm. The difference between the wet and dry season can either be quite pronounced in either direction or relatively equal depending on location and yearly patterns[/list][u]Agriculture:[/u][list]Seasonal regions are dependent on a wet season to produce most crops, focusing on plants that can survive in waterlogged conditions. Droughts can have a profound effect on people\u2019s lives as it can seriously hamper food production. Most food is produced on a subsistence level. [/list][u]Examples:[/u][list]South East Asia, Central Africa[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Tropical_savanna_climate[/list][/list]`,
    features: "Tropical Wet & Dry (savanna) climates stay above 18\u00b0C (64\u00b0F) year-round with a pronounced dry season \u2014 the driest month sees less than 60mm of rain \u2014 though the contrast between wet and dry seasons varies by location and year.",
    agriculture: "These seasonal regions depend heavily on the wet season to produce most crops, favoring plants that tolerate waterlogged conditions; droughts can seriously disrupt food production, which is mostly subsistence-level.",
  },
  "Humid Continental": {
    bbc: `[i]Humid Continental[/i][list][u]Season(s):[/u][list]Spring, Summer, Autumn, Winter[/list][u]Features:[/u][list] In the Humid Continental Climate, precipitation is relatively well distributed year-round in many areas, while others may see a marked reduction in wintry precipitation, which increases the chances of a wintertime drought.  Snowfall occurs in all areas with a humid continental climate and in many such places is more common than rain during the height of winter. In places with sufficient wintertime precipitation, the snow cover is often deep, having the coldest month mean temperature below -3 C (26.6 F). [/list][u]Agriculture:[/u][list]Continental climates are well known as bread basket regions. The immense flat lands are perfect for growing staple crops like corn, wheat, and barley on a large scale.[/list][u]Examples:[/u][list]Western Russia/Ukraine, United States Mid-West [/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Humid_continental_climate[/list][/list]`,
    features: "Humid Continental climates see precipitation fairly well distributed year-round in many areas, though some see markedly less winter precipitation and a higher risk of wintertime drought. Snow falls everywhere in this climate and is often more common than rain in the depths of winter, with the coldest month averaging below \u22123\u00b0C (26.6\u00b0F).",
    agriculture: "Known as classic bread-basket regions, the vast flat lands here are ideal for large-scale staple crops like corn, wheat, and barley.",
  },
  "Oceanic": {
    bbc: `[i]Marine West Coast/Oceanic[/i][list][u]Season(s):[/u][list]Spring, Summer, Autumn, Winter[/list][u]Features:[/u][list]The Marine West Coast or Oceanic Climate has a very mild climate lacking in extreme temperatures. It typically lacks a dry season, as precipitation is consistent throughout the year. Summers are cool due to cool ocean currents, winters are mild usually very cloudy. With Summers below 22 °C (72 °F) and winters above −3 °C (27 °F).[/list][u]Agriculture:[/u][list]Temperate regions are excellent for traditional farming techniques well suited for a host of different crops that can be grown in the mid-latitudes. It usually lacking a large scale industrial production due to the terrain. [/list][u]Examples:[/u][list]Western Europe, Pacific NW North America, South Africa[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Oceanic_climate[/list][/list]`,
    features: "Oceanic climates are mild and lack extreme temperatures, with no real dry season since precipitation stays fairly consistent year-round. Cool ocean currents keep summers below 22\u00b0C (72\u00b0F), while winters stay mild \u2014 usually cloudy \u2014 and above \u22123\u00b0C (27\u00b0F).",
    agriculture: "These temperate regions suit traditional farming techniques and a wide range of mid-latitude crops well, though large-scale industrial agriculture is less common given the terrain.",
  },
  "Tropical Rainforest": {
    bbc: `[i]Rain Forest/Tropical Wet[/i][list][u]Season(s):[/u][list]Wet[/list][u]Features:[/u][list]Tropical rainforests have a type of tropical climate in which there is no dry season – all months have an average precipitation value of at least 60 mm. Tropical rainforests have no summer or winter; it is typically hot and wet throughout the year and rainfall is both heavy and frequent. One day in an equatorial climate can be very similar to the next, while the change in temperature between day and night may be more significant than the average change in temperature across the year.[/list][u]Agriculture:[/u][list]Tropical regions produce food through labor-intensive cultivation. Traditional farming techniques usually can\u2019t be supported without widespread deforestation. Most food is produced on a subsistence level and comes from trees. Tropical Fruits, Teas, Rice, and Beans are some of the many crops grown here. [/list][u]Examples:[/u][list]Amazon Rainforest, Indonesia[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Tropical_rainforest_climate[/list][/list]`,
    features: "Tropical Rainforest climates have no dry season at all \u2014 every month averages at least 60mm of rain \u2014 and no real summer or winter, staying hot and wet with heavy, frequent rainfall year-round. Day-to-day weather barely changes, and the swing between day and night temperatures can exceed the swing across the whole year.",
    agriculture: "Food here comes through labor-intensive cultivation, since traditional farming can rarely be sustained without heavy deforestation; most food is subsistence-level and tree-grown, including tropical fruits, tea, rice, and beans.",
  },
  "Humid Subtropical": {
    bbc: `[i]Humid Subtropical[/i][list][u]Season(s):[/u][list]Summer, Winter[/list][u]Features:[/u][list]Humid Subtropical climates feature mean temperatures in the coldest months between 0 °C (32 °F) and 18 °C (64 °F) and mean temperatures in the warmest months of 22 °C (72 °F) or higher. They tend to have more uniform rainfall. Most summer rainfall occurs during thunderstorms. Dry Seasons can occur in the winter although mostly in extreme conditions. [/list][u]Agriculture:[/u][list] Subtropical regions are well suited for growing Cash Crop. The climate allows for the cultivation of fast growing highly valued crops such as cotton, soybeans, tobacco, and fruits. Rice is usually produced in this region as well due to the rainfall. [/list][u]Examples:[/u][list] Southern United States, Southern China[/list][u]External Link:[/u][list]https://en.wikipedia.org/wiki/Humid_subtropical_climate[/list][/list]`,
    features: "Humid Subtropical climates see coldest-month means between 0\u00b0C and 18\u00b0C (32\u00b0F to 64\u00b0F) and warmest-month means of 22\u00b0C (72\u00b0F) or higher, with fairly uniform rainfall \u2014 mostly from summer thunderstorms \u2014 and only rare, extreme-condition winter dry spells.",
    agriculture: "These regions suit fast-growing, high-value cash crops like cotton, soybeans, tobacco, and fruit, with rice also common thanks to reliable rainfall.",
  },
};

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
  "Energy Oriented":      { order: ["Manufacturing", "Extraction", "Services"], magnitude: "oriented" },
  "Agriculture Focused":  { order: ["Extraction", "Services", "Manufacturing"], magnitude: "focused" },
  "Agriculture Oriented": { order: ["Manufacturing", "Extraction", "Services"], magnitude: "oriented" },
  "Mineral Focused":      { order: ["Extraction", "Services", "Manufacturing"], magnitude: "focused" },
  "Mineral Oriented":     { order: ["Manufacturing", "Extraction", "Services"], magnitude: "oriented" },
};

// Manufacturing is further split into Light Industry and Heavy Industry.
// Light Industry = Manufacturing % × this factor (rounded); Heavy Industry
// is whatever's left, so Light + Heavy always equals Manufacturing exactly
// for that province.
const LIGHT_INDUSTRY_FACTOR = {
  "Service Focused":      0.75,
  "Service Oriented":     0.50,
  "Production Focused":   0.25,
  "Energy Focused":       0.10,
  "Energy Oriented":      0.20,
  "Agriculture Focused":  0.75,
  "Agriculture Oriented": 0.80,
  "Mineral Focused":      0.10,
  "Mineral Oriented":     0.20,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns { Services, Manufacturing, Extraction, LightIndustry, HeavyIndustry }
// percentages (integers) for a single province's econ category, or null if
// the category isn't recognized. Services + Manufacturing + Extraction sum
// to 100; LightIndustry + HeavyIndustry sum to exactly Manufacturing.
//
// Primary rolls 70-90% for Focused categories, 41-70% for Oriented ones;
// secondary and tertiary split whatever's left, with Oriented additionally
// keeping secondary from exceeding primary.
//
// Service Focused / Service Oriented get one further adjustment: Extraction
// (their tertiary sector) is kept under EXTRACTION_CAP_PCT (~10%), since a
// service economy should have very little raw resource extraction. Keeping
// secondary <= primary while also forcing tertiary that low requires
// primary to be at least MIN_FEASIBLE_PRIMARY_FOR_CAP - Service Focused's
// range (70-90) already always clears that on its own, but Service
// Oriented's normal range (41-70) doesn't reach it for every roll. Rather
// than rolling in the full 41-70 range and pushing low rolls up to the
// floor (which piles up a disproportionate share of rolls on exactly 46),
// Service Oriented rolls its primary directly within the feasible
// 46-70 window, so every value in range is equally likely.
const EXTRACTION_CAP_PCT = 10;
const EXTRACTION_CAPPED_ECONS = ["Service Focused", "Service Oriented"];
const MIN_FEASIBLE_PRIMARY_FOR_CAP = Math.ceil((101 - EXTRACTION_CAP_PCT) / 2); // = 46 at a 10% cap

function computeSectorSplit(econName) {
  const config = ECON_SECTOR_CONFIG[econName];
  if (!config) return null;

  const [primaryKey, secondaryKey, tertiaryKey] = config.order;
  const isCapped = EXTRACTION_CAPPED_ECONS.indexOf(econName) !== -1;
  let primary, secondary;

  if (config.magnitude === "focused") {
    primary = randInt(70, 90); // already always >= MIN_FEASIBLE_PRIMARY_FOR_CAP
  } else if (isCapped) {
    primary = randInt(MIN_FEASIBLE_PRIMARY_FOR_CAP, 70);
  } else {
    primary = randInt(41, 70);
  }

  if (isCapped) {
    const secondaryMax = Math.min(primary, 99 - primary);
    const secondaryMin = Math.min(secondaryMax, Math.max(9, (101 - EXTRACTION_CAP_PCT) - primary));
    secondary = randInt(secondaryMin, secondaryMax);
  } else if (config.magnitude === "focused") {
    secondary = randInt(9, 99 - primary);
  } else {
    secondary = randInt(9, Math.min(99 - primary, primary));
  }
  const tertiary = 100 - primary - secondary;

  const split = {
    [primaryKey]: primary,
    [secondaryKey]: secondary,
    [tertiaryKey]: tertiary,
  };

  const factor = LIGHT_INDUSTRY_FACTOR[econName] != null ? LIGHT_INDUSTRY_FACTOR[econName] : 0.5;
  const manufacturing = split.Manufacturing || 0;
  const light = Math.round(manufacturing * factor);
  split.LightIndustry = light;
  split.HeavyIndustry = manufacturing - light;

  return split;
}

// Averages a list of per-province sector splits into one overall
// breakdown, rounded to whole percentages that still sum to 100.
// Returns Services / LightIndustry / HeavyIndustry / Extraction (the four
// displayed buckets, always summing to 100) plus Manufacturing (the
// unsplit Light+Heavy total, kept around for the BBC code's ranked
// Primary/Secondary/Tertiary columns, which mirror the forum template's
// fixed 3-column structure rather than this 4-way breakdown).
function computeSectorTotals(splits) {
  const allKeys = ["Services", "Extraction", "LightIndustry", "HeavyIndustry"];
  const raw = {};
  allKeys.forEach(s => {
    raw[s] = splits.reduce((sum, sp) => sum + (sp[s] || 0), 0) / splits.length;
  });

  const rounded = {};
  let roundedSum = 0;
  allKeys.forEach(s => {
    rounded[s] = Math.round(raw[s]);
    roundedSum += rounded[s];
  });

  // Rounding can drift the total off 100 by a point or two — nudge the
  // largest bucket to absorb the difference so the displayed total is
  // always exactly 100%.
  const diff = 100 - roundedSum;
  if (diff !== 0) {
    const largest = allKeys.reduce((a, b) => (rounded[a] >= rounded[b] ? a : b));
    rounded[largest] += diff;
  }

  // Manufacturing = Light + Heavy, recombined post-rounding so it stays
  // consistent with the two displayed sub-buckets above.
  rounded.Manufacturing = rounded.LightIndustry + rounded.HeavyIndustry;

  return rounded;
}

// ---- economy classification ----
//
// A single descriptive label for the claim's overall economic character,
// derived from the aggregate Services / Light Industry / Heavy Industry /
// Extraction totals. Checked in two tiers:
//
//   1. The four "pure" economies (>50% in one sector alone). At most one
//      of these can ever be true at once, since two sectors can't each
//      individually exceed 50% of a 100% total.
//   2. Only if none of those match, the six blended two-sector economies
//      (>50% combined). Multiple of these CAN be true simultaneously
//      (e.g. Services+Light both also make Services+Extraction pass if
//      Extraction is nonzero), so whichever has the largest combined
//      percentage wins.
//
// Tier 1 has to be checked first and separately - if every candidate were
// thrown into one flat "largest percentage wins" pool, a pure economy
// would almost never win, since adding any second sector's percentage on
// top of it only makes the combined number bigger. That would make the
// four pure economies effectively unreachable.
const ECONOMY_TYPES = [
  { name: "Service Economy",                    tier: 1, pct: t => t.Services },
  { name: "Consumer Goods Economy",              tier: 1, pct: t => t.LightIndustry },
  { name: "Industrial Economy",                  tier: 1, pct: t => t.HeavyIndustry },
  { name: "Resource Economy",                    tier: 1, pct: t => t.Extraction },
  { name: "Consumer Goods & Services Economy",   tier: 2, pct: t => t.Services + t.LightIndustry },
  { name: "Consumer Goods & Materials Economy",  tier: 2, pct: t => t.LightIndustry + t.Extraction },
  { name: "Manufacturing Economy",               tier: 2, pct: t => t.LightIndustry + t.HeavyIndustry },
  { name: "Industrial Goods & Services Economy", tier: 2, pct: t => t.HeavyIndustry + t.Services },
  { name: "Industrial Goods & Materials Economy",tier: 2, pct: t => t.HeavyIndustry + t.Extraction },
  { name: "Non-Industrial Economy",              tier: 2, pct: t => t.Services + t.Extraction },
];

function classifyEconomy(sectorTotals) {
  const tier1 = ECONOMY_TYPES.filter(e => e.tier === 1)
    .map(e => ({ name: e.name, pct: e.pct(sectorTotals) }))
    .filter(e => e.pct > 50);

  const pool = tier1.length > 0
    ? tier1
    : ECONOMY_TYPES.filter(e => e.tier === 2)
        .map(e => ({ name: e.name, pct: e.pct(sectorTotals) }))
        .filter(e => e.pct > 50);

  if (pool.length === 0) {
    // Only possible when the sectors are split too evenly for any single
    // sector, or any pair, to break 50% (e.g. close to a 25/25/25/25 split).
    return { name: "Diversified Economy", pct: null };
  }

  pool.sort((a, b) => b.pct - a.pct);
  return pool[0];
}

// Plain-text description per classification, used both in the on-page bio
// prose and (via buildBBCCode) inside the BBC template's Economy Type
// bullet. "Diversified Economy" isn't one of the ten named types - it's
// this file's own fallback for claims too evenly split to hit any of the
// >50% thresholds - so it gets a short description written to match here
// rather than one from the original set.
const ECONOMY_DESCRIPTIONS = {
  "Service Economy": "Service Economies are highly specialized economies in which the tertiary sector is the dominant force in the economy. The tertiary sector consists of activities where people offer their knowledge and time to improve productivity, performance, potential, and sustainability. Unlike goods services are intangible in nature. The goal of the economy is to export services, while importing finished goods, consumer goods, and services from other states. Competition, demand, and trade will shape the service industry dramatically. The state is heavily reliant on imported goods of all kinds. Competition can be fierce so finding a specialized market is ideal. Pollution is minimal.",

  "Consumer Goods Economy": "Consumer Goods Economies are highly specialized in the light secondary sector. They are focused on the creation of consumer goods, as contrasted by industrial economies which are oriented towards intermediate and final products. The goal of the economy is to export its consumer goods while importing raw material, finished goods, and services from other states. The resources on hand, trade, and the priorities of your nation will influence what type of refinement and manufacturing will take place within the country. The state is reliant on importation of raw materials from other states to be manufactured into consumer goods, as well as needing finished goods and services. Competition can be high so finding a specialized market is ideal. Pollution is a concern for many of these economies but investment into cleaner practices can help limit such issues.",

  "Industrial Economy": "Industrial Economies are highly specialized in the heavy secondary sector. They are oriented towards intermediate and finished goods intended for other industries and require large capital investment. They are contrasted by consumer goods economies, which focuses on the creation of consumer goods. The goal of the economy is to export its intermediate and finished goods while importing raw material, other finished goods, and services from other states. The resources on hand, trade, and the priorities of your nation will influence what type of refinement and manufacturing will take place within the country. The state is reliant on importation of raw materials, and intermediate goods from other states to be manufactured into finished goods, as well as needing consumer goods and services. Competition can be high so finding a specialized market is ideal. Environmental Damage and Pollution are major concerns for heavy industries as they produce a large amount of waste material.",

  "Resource Economy": "Resource Economies are highly specialized in the primary sector. They are focused on the cultivation and extraction of natural resources. Resource economies have various forms depending on the natural resources available. The goal of the economy is to export its raw materials while importing finished goods, consumer goods, and services from other states. The natural resources at your disposal will influence what type of production will take place within the country ie extraction of raw materials or cultivation of agriculture. The state is reliant on importation of goods and services. Although considered at the of the international economy resource based nations are the foundation of the economic order allowing them the power to severely damage the economics of unfriendly nations through embargoes. Environmental damage is a concern for many of these economies from mining and fracking to soil erosion and pesticide usage.",

  "Consumer Goods & Services Economy": "Consumer Goods & Services Economy has a mixture of tertiary and light secondary sectors as the dominant force in the country. The economy is focused on creating and selling consumer goods. The service sector and the light manufacturing sector are the primary outputs of your economy, making up a sizable portion of the economy. The goal of the economy is to export services as well as finished goods, while importing parts, other finished goods, and services from other states. Competition, demand, and trade will shape the service industry dramatically while the resources on hand, and the priorities of your nation will influence what type of manufacturing will take place within the country. The state is reliant on the importation of raw materials and finished goods. Competition can be fierce so finding a specialized market is ideal. Pollution is a concern for some of these economies but investment into cleaner practices can help limit such issues.",

  "Consumer Goods & Materials Economy": "Consumer Goods & Materials Economies are based around Primary and Light Secondary activities. The economy is focused on raw material extraction and creating consumer goods. Light Manufacturing and Extraction are the primary outputs of your economy, making up a sizable portion of the economy. The goal of the economy is to extract raw materials for export or usage in the production of Consumer goods, while importing finished goods, and services from other states. Competition, demand, and trade will shape the service industry dramatically while the resources on hand, and the priorities of your nation will influence what type of manufacturing will take place within the country. The state is reliant on the importation of finished goods and services. Competition can be high so finding a specialized market is ideal. Environmental damage is a concern for many of these economies from mining and fracking to soil erosion and pesticide usage.",

  "Manufacturing Economy": "Manufacturing Economies are based around Secondary activities. The economy is focused on creating intermediate, finished, and consumer goods. Light Manufacturing and Heavy Manufacturing are the primary outputs of your economy, making up a sizable portion of the economy. The goal of the economy is to export its intermediate, final, and consumer goods, while importing raw materials, and services from other states. Competition, demand, and trade will shape the service industry dramatically while the resources on hand, and the priorities of your nation will influence what type of manufacturing will take place within the country. The state is reliant on the importation of raw materials and services. Competition can be high so finding a specialized market is ideal. Environmental Damage and Pollution are major concerns for manufacturing economies as they produce a large amount of waste material.",

  "Industrial Goods & Services Economy": "Industrial & Services Economies are based around Tertiary and Heavy Secondary activities. The economy is focused on creating and selling intermediate and finished goods intended for use in other businesses. Services and Heavy Manufacturing are the primary outputs of your economy, making up a sizable portion of the economy. The goal of the economy is to export its services and, intermediate/final goods, while importing, raw materials, and consumer goods and services from other states. Competition, demand, and trade will shape the service industry dramatically while the resources on hand, and the priorities of your nation will influence what type of manufacturing will take place within the country. The state is reliant on the importation of raw materials and consumer goods. Competition can be high so finding a specialized market is ideal. Environmental Damage and Pollution are major concerns for heavy industries as they produce a large amount of waste material.",

  "Industrial Goods & Materials Economy": "Industrial Goods & Materials Economies are based around Primary and Heavy Secondary activities. The economy is focused on raw material extraction and creating intermediate and final goods. Heavy Manufacturing and Extraction are the primary outputs of your economy, making up a sizable portion of the economy. The goal of the economy is to extract raw materials for export or usage in the production of intermediate and final goods, while importing consumer goods, and services from other states. Competition, demand, and trade will shape the service industry dramatically while the resources on hand, and the priorities of your nation will influence what type of manufacturing will take place within the country. The state is reliant on the importation of consumer goods and services. Competition can be high so finding a specialized market is ideal. Environmental damage is a major concern for many of these economies from mining and fracking to soil erosion and pesticide usage, as well as pollution from heavy industries.",

  "Non-Industrial Economy": "Non-industrial Economies are based around Primary and Tertiary activities. The economy is focused on raw material extraction and services. Services and Extraction are the primary outputs of your economy, making up a sizable portion of the economy. These economies usually emerge from resource rich nations who have grown economically to the point of supporting a large Service industry but have not caught up infrastructure to support a secondary sector. The existence of the service economy is almost entirely reliant on the raw resource and usually is the source of wealth of the consumers and or focus of the service industry through the trade of resource. Commonly found in petrol states, it is considered highly unstable and many attempt to use the momentary wealth to diversify the economy either through creating a strong independent service economy bypassing the other or the catching up of the other sectors to build a more stable basis. The state is reliant on the importation of most goods. Environmental damage is a concern for many of these economies from mining and fracking to soil erosion and pesticide usage.",

  "Diversified Economy": "Diversified Economies have no single sector, or pair of sectors, that clearly dominates output - Services, Manufacturing, and Extraction each contribute a meaningful share. This spread-out base can make the economy more resilient to a downturn in any one sector, but also means it lacks the sharp specialization (and the trade leverage that comes with it) of a more focused economy. Trade tends to be broad rather than deep, importing and exporting across many categories instead of concentrating on one export and a handful of imports.",
};

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
