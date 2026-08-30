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

  const sectorSplits = provinces.map(p => computeSectorSplit(p.econ)).filter(Boolean);
  const sectorTotals = sectorSplits.length > 0 ? computeSectorTotals(sectorSplits) : null;

  return { continents, climates, econs, topClimate, topEcon, sectorTotals };
}

function buildBioText(provinces, econ) {
  const provinceList = provinces.map(p => p.label).join(", ");
  const capital = provinces.find(p => p.isCapital);

  let bio = "";
  bio += `This territory spans ${provinces.length} province${provinces.length === 1 ? "" : "s"} `;
  bio += econ.continents.length > 1
    ? `across both the northern and southern continents.`
    : `on the ${econ.continents[0]} continent.`;
  bio += capital ? ` Its capital is ${capital.label}.\n\n` : `\n\n`;

  bio += buildClimateParagraphs(provinces, econ);

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

  const detail = CLIMATE_DETAILS[econ.topClimate];
  const climateBlock = detail ? detail.bbc : `[i]${econ.topClimate}[/i][list][u]Season(s):[/u][list][/list][u]Features:[/u][list][/list][u]Agriculture:[/u][list][/list][u]Examples:[/u][list][/list][u]External Link:[/u][list][/list][/list]`;

  return BBC_TEMPLATE
    .replace("{{CLIMATE_BLOCK}}", climateBlock)
    .replace("{{ECON_TYPE}}", econ.topEcon)
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
