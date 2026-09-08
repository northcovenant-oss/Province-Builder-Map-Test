/*
 * NATIONAL SPECIALIZATION DATA
 * ----------------------------
 * The four category pools players choose from in Step 1, plus the
 * military-specific list used in Step 2. Defense items are pulled out of
 * the general Heavy Industry pool so they're reserved for the military
 * step rather than also being pickable as a regular specialization.
 *
 * Step 1's five slots are tied to the land bio's own World Exports
 * ranking, not freely chosen from the whole economy type - see
 * EXPORT_LABEL_TO_POOLS / poolsForExportLabel below.
 */

const SPECIALIZATION_POOLS = {
  Primary: [
    "Agriculture - Animals",
    "Agriculture - Animal Products",
    "Agriculture - Animal & Vegetable Bi-Products",
    "Agriculture - Carbohydrate Products",
    "Agriculture - Fruits",
    "Agriculture - Sugar",
    "Agriculture - Vegetables",
    "Fishing - Aquaculture",
    "Fishing - Commercial",
    "Fishing - Pearling",
    "Forestry - Hard Wood",
    "Forestry - Soft Wood",
    "Forestry - Rubber",
    "Forestry - Tropical Hardwood",
    "Mining - Precious Metals",
    "Mining - Base Metals",
    "Mining - Precious Stones",
    "Mining - Rare Earth Elements",
    "Mining - Industrial Minerals",
    "Fuel - Coal Mining",
    "Fuel - Natural Gas Extraction",
    "Fuel - Petroleum Extraction",
    "Fuel - Uranium Extraction",
  ],
  Services: [
    "Hospitality - Food Service",
    "Hospitality - Hotels",
    "Hospitality - Tourism",
    "Mass Media - Printing & Publishing",
    "Mass Media - Film Industry",
    "Mass Media - Broadcast (News & TV)",
    "Mass Media - Music Industry",
    "Mass Media - Digital Media",
    "Healthcare",
    "Information technology",
    "Gambling",
    "Retailer - Online Store",
    "Retailer - Superstore",
    "Retail sales - Luxury Brand",
    "Financial services - Banking",
    "Financial services - Insurance",
    "Cargo Transportation - Air",
    "Cargo Transportation - Ship",
    "Cargo Transportation - Rail",
    "Cargo Transportation - Road",
    "Commercial Transportation - Air",
    "Commercial Transportation - Ship",
    "Commercial Transportation - Rail",
  ],
  "Light Industry": [
    "Consumer Goods - Appliances",
    "Consumer Goods - Beauty Products",
    "Consumer Goods - Electronics",
    "Consumer Goods - Furniture",
    "Consumer Goods - Luxury Goods",
    "Consumer Goods - Plastics",
    "Foodstuffs - Alcohol",
    "Foodstuffs - Baked Goods",
    "Foodstuffs - Beverages",
    "Foodstuffs - Candy",
    "Foodstuffs - Canned Goods",
    "Foodstuffs - Frozen Food",
    "Foodstuffs - Packaged Food",
    "Foodstuffs - Snacks",
    "Animal Feed",
    "Leather industry",
    "Attire - Accessories",
    "Attire - Clothing",
    "Ceramics & Glassware",
    "Attire - Footwear",
    "Textiles - Cotton",
    "Textiles - Natural Fibers",
    "Textiles - Synthetic",
  ],
  "Heavy Industry": [
    "Automotive - Personal Vehicles",
    "Automotive - Transportation Vehicles",
    "Automotive - Utility Vehicle",
    "Aerospace - Civil Aircraft Small",
    "Aerospace - Civil Aircraft Large",
    "Aerospace - Helicopter",
    "Aerospace - Rockets",
    "Aerospace - Spacecraft",
    "Chemical - Commercial",
    "Chemical - Commodity",
    "Chemical - Pharmaceuticals",
    "Construction - Commercial",
    "Construction - Industrial",
    "Defense - Ammunition",
    "Defense - Armoured Fighting Vehicle",
    "Defense - Artillery",
    "Defense - Explosives",
    "Defense - Firearms",
    "Defense - Missiles",
    "Defense - Military Aircraft",
    "Defense - Military Vehicles",
    "Defense - Ships",
    "Defense - Submarines",
    "Electronics - Computing",
    "Electronics - Industrial",
    "Electronics - Semiconductor",
    "Electronics - Telecommunication",
    "Energy - Nuclear",
    "Energy - Renewable",
    "Energy - Fossil Fuels",
    "Engineering - Civil",
    "Engineering - Environmental",
    "Engineering - Robotics",
    "General Machinery",
    "Locomotive - Rapid Transit & Light Rail",
    "Locomotive - Freight",
    "Locomotive - Passenger/High Speed",
    "Metals - Alloys",
    "Metals - Refined Metals",
    "Metals - Steel",
    "Pulp and Paper Industry",
    "Shipbuilding - Commercial Large",
    "Shipbuilding - Commercial Small",
    "Shipbuilding - Private",
    "Waste - Disposal",
    "Waste - Recycling",
  ],
};

// ---- Required Imports (by chosen specialization) ----
//
// For each specialization a player can pick in Step 1, the concrete goods
// a nation built around that industry would realistically need to import
// to operate it - no claim produces every input its own economy needs.
// Complexity scales with the industry: raw extraction (Primary) needs the
// fewest, mostly capital equipment (1-2); Services varies with how
// goods-dependent the sector is (1-3); Light Industry's consumer
// manufacturing needs a modest input chain (2-3); Heavy Industry's complex
// manufacturing needs the most (3-5). Purely descriptive flavor text for
// the Summary panel - not wired into any other mechanic (energy/food/GDP)
// in this file. Every entry in SPECIALIZATION_POOLS should have a matching
// key here; if pools are edited, re-sync this table the same pass.
const IMPORTS_BY_SPECIALIZATION = {
  // -- Primary --
  "Agriculture - Animals": ["Veterinary Pharmaceuticals", "Heavy Farm Machinery"],
  "Agriculture - Animal Products": ["Refrigeration Equipment", "Packaging Materials"],
  "Agriculture - Animal & Vegetable Bi-Products": ["Industrial Processing Equipment"],
  "Agriculture - Carbohydrate Products": ["Fertilizers", "Harvesting Machinery"],
  "Agriculture - Fruits": ["Fertilizers", "Refrigerated Transport"],
  "Agriculture - Sugar": ["Refining Equipment", "Fertilizers"],
  "Agriculture - Vegetables": ["Fertilizers", "Irrigation Equipment"],
  "Fishing - Aquaculture": ["Fish Feed", "Aquaculture Equipment"],
  "Fishing - Commercial": ["Fishing Vessels", "Refrigeration Equipment"],
  "Fishing - Pearling": ["Diving Equipment"],
  "Forestry - Hard Wood": ["Logging Machinery"],
  "Forestry - Soft Wood": ["Logging Machinery"],
  "Forestry - Rubber": ["Processing Chemicals"],
  "Forestry - Tropical Hardwood": ["Logging Machinery", "Processing Equipment"],
  "Mining - Precious Metals": ["Mining Machinery", "Refining Chemicals"],
  "Mining - Base Metals": ["Mining Machinery"],
  "Mining - Precious Stones": ["Cutting & Polishing Equipment"],
  "Mining - Rare Earth Elements": ["Mining Machinery", "Refining Chemicals", "Specialized Extraction Equipment"],
  "Mining - Industrial Minerals": ["Mining Machinery"],
  "Fuel - Coal Mining": ["Mining Machinery", "Safety Equipment"],
  "Fuel - Natural Gas Extraction": ["Drilling Equipment", "Pipeline Infrastructure"],
  "Fuel - Petroleum Extraction": ["Drilling Equipment", "Pipeline Infrastructure", "Refining Technology"],
  "Fuel - Uranium Extraction": ["Specialized Mining Equipment", "Radiation Safety Equipment"],

  // -- Services --
  "Hospitality - Food Service": ["Imported Foodstuffs", "Kitchen Equipment"],
  "Hospitality - Hotels": ["Furniture", "Textiles (Linens)", "Building Materials"],
  "Hospitality - Tourism": ["Transportation Vehicles", "Consumer Goods (for visitor spending)"],
  "Mass Media - Printing & Publishing": ["Paper Pulp", "Printing Equipment", "Ink & Chemicals"],
  "Mass Media - Film Industry": ["Film & Broadcast Equipment", "Electronics"],
  "Mass Media - Broadcast (News & TV)": ["Broadcast Equipment", "Electronics", "Satellite/Telecom Infrastructure"],
  "Mass Media - Music Industry": ["Audio Equipment", "Electronics"],
  "Mass Media - Digital Media": ["Computing Hardware", "Semiconductors"],
  "Healthcare": ["Pharmaceuticals", "Medical Equipment", "Laboratory Supplies"],
  "Information technology": ["Semiconductors", "Computing Hardware", "Telecom Infrastructure"],
  "Gambling": ["Gaming Equipment", "Electronics", "Security Systems"],
  "Retailer - Online Store": ["Consumer Goods (for resale)", "Logistics/Warehouse Equipment"],
  "Retailer - Superstore": ["Consumer Goods (for resale)", "Foodstuffs (for resale)"],
  "Retail sales - Luxury Brand": ["Luxury Goods (for resale)", "Precious Metals & Stones"],
  "Financial services - Banking": ["Computing Hardware", "Security Systems"],
  "Financial services - Insurance": ["Computing Hardware", "Actuarial Software Systems"],
  "Cargo Transportation - Air": ["Aircraft", "Aviation Fuel"],
  "Cargo Transportation - Ship": ["Cargo Vessels", "Marine Fuel"],
  "Cargo Transportation - Rail": ["Locomotives & Rolling Stock", "Electrical/Fuel Infrastructure"],
  "Cargo Transportation - Road": ["Trucks & Vehicles", "Fuel"],
  "Commercial Transportation - Air": ["Aircraft", "Aviation Fuel"],
  "Commercial Transportation - Ship": ["Passenger Vessels", "Marine Fuel"],
  "Commercial Transportation - Rail": ["Locomotives & Rolling Stock", "Electrical/Fuel Infrastructure"],

  // -- Light Industry --
  "Consumer Goods - Appliances": ["Steel", "Electronic Components", "Plastics"],
  "Consumer Goods - Beauty Products": ["Chemical Compounds", "Packaging Materials"],
  "Consumer Goods - Electronics": ["Semiconductors", "Rare Earth Elements", "Electronic Components"],
  "Consumer Goods - Furniture": ["Lumber", "Textiles", "Hardware Fittings"],
  "Consumer Goods - Luxury Goods": ["Precious Metals", "Precious Stones", "Fine Textiles"],
  "Consumer Goods - Plastics": ["Petrochemical Feedstock", "Molding Machinery"],
  "Foodstuffs - Alcohol": ["Agricultural Feedstock (Grain/Fruit)", "Glass Bottles & Packaging"],
  "Foodstuffs - Baked Goods": ["Grain & Flour", "Packaging Materials"],
  "Foodstuffs - Beverages": ["Sugar", "Packaging Materials", "Water Treatment Chemicals"],
  "Foodstuffs - Candy": ["Sugar", "Cocoa/Flavoring Imports", "Packaging Materials"],
  "Foodstuffs - Canned Goods": ["Metal Cans/Tin", "Preservatives", "Raw Produce"],
  "Foodstuffs - Frozen Food": ["Refrigeration Equipment", "Raw Produce", "Packaging Materials"],
  "Foodstuffs - Packaged Food": ["Raw Ingredients", "Packaging Materials"],
  "Foodstuffs - Snacks": ["Raw Ingredients (Grain/Oil)", "Packaging Materials"],
  "Animal Feed": ["Grain Surplus", "Nutritional Additives"],
  "Leather industry": ["Raw Hides", "Tanning Chemicals"],
  "Attire - Accessories": ["Metals", "Textiles", "Precious Stones (for premium lines)"],
  "Attire - Clothing": ["Raw Textiles", "Dyes & Chemicals"],
  "Ceramics & Glassware": ["Industrial Minerals", "Kiln/Furnace Equipment"],
  "Attire - Footwear": ["Leather", "Rubber", "Synthetic Materials"],
  "Textiles - Cotton": ["Raw Cotton Fiber", "Dyes & Chemicals"],
  "Textiles - Natural Fibers": ["Raw Fiber Stock (Wool/Silk/Hemp)", "Dyes & Chemicals"],
  "Textiles - Synthetic": ["Petrochemical Feedstock", "Dyes & Chemicals"],

  // -- Heavy Industry --
  "Automotive - Personal Vehicles": ["Steel", "Electronic Components", "Rubber", "Semiconductors"],
  "Automotive - Transportation Vehicles": ["Steel", "Heavy Machinery Parts", "Electronic Components", "Rubber"],
  "Automotive - Utility Vehicle": ["Steel", "Engine Components", "Rubber"],
  "Aerospace - Civil Aircraft Small": ["Aluminum & Alloys", "Avionics Systems", "Composite Materials", "Precision Engineering Parts"],
  "Aerospace - Civil Aircraft Large": ["Aluminum & Alloys", "Avionics Systems", "Composite Materials", "Jet Engine Components", "Precision Engineering Parts"],
  "Aerospace - Helicopter": ["Aluminum & Alloys", "Avionics Systems", "Precision Engineering Parts", "Composite Materials"],
  "Aerospace - Rockets": ["Specialized Alloys", "Propulsion Components", "Avionics Systems", "Composite Materials", "Precision Engineering Parts"],
  "Aerospace - Spacecraft": ["Specialized Alloys", "Propulsion Components", "Avionics Systems", "Composite Materials", "Precision Engineering Parts"],
  "Chemical - Commercial": ["Petrochemical Feedstock", "Industrial Minerals", "Processing Equipment"],
  "Chemical - Commodity": ["Petrochemical Feedstock", "Industrial Minerals"],
  "Chemical - Pharmaceuticals": ["Active Pharmaceutical Ingredients", "Laboratory Equipment", "Packaging Materials"],
  "Construction - Commercial": ["Steel", "Cement & Industrial Minerals", "Heavy Machinery"],
  "Construction - Industrial": ["Steel", "Cement & Industrial Minerals", "Heavy Machinery"],
  "Defense - Ammunition": ["Base Metals", "Propellant Chemicals", "Precision Manufacturing Equipment"],
  "Defense - Armoured Fighting Vehicle": ["Steel & Alloys", "Engine Components", "Electronics & Targeting Systems", "Composite Armor Materials"],
  "Defense - Artillery": ["Steel & Alloys", "Precision Manufacturing Equipment", "Propellant Chemicals"],
  "Defense - Explosives": ["Chemical Compounds", "Precision Manufacturing Equipment"],
  "Defense - Firearms": ["Steel & Alloys", "Precision Manufacturing Equipment"],
  "Defense - Missiles": ["Specialized Alloys", "Propulsion Components", "Guidance Electronics", "Propellant Chemicals"],
  "Defense - Military Aircraft": ["Aluminum & Alloys", "Avionics Systems", "Jet Engine Components", "Composite Materials", "Precision Engineering Parts"],
  "Defense - Military Vehicles": ["Steel & Alloys", "Engine Components", "Electronics Systems"],
  "Defense - Ships": ["Steel", "Marine Engine Components", "Electronics & Radar Systems"],
  "Defense - Submarines": ["Specialized Alloys", "Propulsion Components", "Sonar & Electronics Systems", "Precision Engineering Parts"],
  "Electronics - Computing": ["Semiconductors", "Rare Earth Elements", "Precision Manufacturing Equipment"],
  "Electronics - Industrial": ["Semiconductors", "Base Metals", "Precision Components"],
  "Electronics - Semiconductor": ["Silicon Wafers", "Rare Earth Elements", "Precision Fabrication Equipment"],
  "Electronics - Telecommunication": ["Semiconductors", "Rare Earth Elements", "Fiber Optic Materials"],
  "Energy - Nuclear": ["Enriched Uranium", "Specialized Reactor Components", "Safety Systems"],
  "Energy - Renewable": ["Rare Earth Elements", "Turbine/Photovoltaic Components", "Specialized Manufacturing Equipment"],
  "Energy - Fossil Fuels": ["Refining Equipment", "Pipeline Infrastructure"],
  "Engineering - Civil": ["Steel", "Cement & Industrial Minerals", "Heavy Machinery"],
  "Engineering - Environmental": ["Specialized Filtration Equipment", "Chemical Compounds"],
  "Engineering - Robotics": ["Semiconductors", "Precision Components", "Specialized Alloys"],
  "General Machinery": ["Steel", "Precision Components", "Electronic Components"],
  "Locomotive - Rapid Transit & Light Rail": ["Steel", "Electronics Systems", "Electrical Components"],
  "Locomotive - Freight": ["Steel", "Engine Components"],
  "Locomotive - Passenger/High Speed": ["Steel & Alloys", "Electronics Systems", "Precision Engineering Parts"],
  "Metals - Alloys": ["Base Metals", "Rare Earth Elements", "Industrial Chemicals"],
  "Metals - Refined Metals": ["Raw Ore & Base Metals", "Industrial Chemicals"],
  "Metals - Steel": ["Iron Ore", "Coking Coal", "Industrial Chemicals"],
  "Pulp and Paper Industry": ["Timber Pulp", "Industrial Chemicals"],
  "Shipbuilding - Commercial Large": ["Steel", "Marine Engine Components", "Electronics Systems"],
  "Shipbuilding - Commercial Small": ["Steel", "Marine Engine Components"],
  "Shipbuilding - Private": ["Steel", "Marine Engine Components", "Fine Fittings & Materials"],
  "Waste - Disposal": ["Specialized Processing Equipment"],
  "Waste - Recycling": ["Specialized Sorting & Processing Equipment", "Industrial Chemicals"],
};

// Returns the import list for a specialization name, or an empty array if
// it isn't in the table - shouldn't normally happen since every pool
// entry has a matching key, but keeps callers safe against future pool
// edits that outpace this list rather than throwing.
function importsForSpecialization(name){
  return IMPORTS_BY_SPECIALIZATION[name] || [];
}

// ---- Military Doctrine ----
//
// Military Priority: what a nation values most about its armed forces'
// makeup. Each option's description is shown to the player alongside its
// name.
const MILITARY_PRIORITY_INTRO = "What does your nation prioritize? Does your country value a single branch " +
  "above all else; a small, well-regulated army with strong discipline and good weaponry; a large, overwhelming " +
  "force that makes up for its lack of training and arms by its sheer size; or a healthy balance sacrificing " +
  "state-of-the-art equipment for a slightly larger size?";
const MILITARY_PRIORITY_OPTIONS = [
  { id: "Specialized", description: "Values a single branch above all else." },
  { id: "Quality",     description: "A small, well-regulated army with strong discipline and good weaponry." },
  { id: "Quantity",    description: "A large, overwhelming force that makes up for its lack of training and arms by its sheer size." },
  { id: "Balanced",    description: "A healthy balance, sacrificing state-of-the-art equipment for a slightly larger size." },
];

// Military Stance: national attitude towards war.
const MILITARY_STANCE_INTRO = "What is your national attitude towards war?";
const MILITARY_STANCE_OPTIONS = [
  { id: "Pacifist",   description: "No military." },
  { id: "Neutral",    description: "Armed but zero interference." },
  { id: "Defensive",  description: "Protective of themselves and allies." },
  { id: "Projecting", description: "Exerting pressure on those around them." },
  { id: "Combative",  description: "Actively hostile towards elements of the international community." },
  { id: "Aggressive", description: "Seen as a pariah state by the international community; warmongering." },
];

// ---- Military Focus ----
//
// Players distribute a points budget across five branches to rank their
// relative importance. The budget and each branch's cap depend on the
// Doctrine choices above.
const MILITARY_FOCUS_BASE_POINTS = 15;

// Stance-based budget bonus. Pacifist overrides everything else to 0
// (matches "No military" - Focus is skipped entirely for Pacifist).
function militaryFocusBudget(stance){
  if(stance === "Pacifist") return 0;
  if(stance === "Combative" || stance === "Aggressive") return MILITARY_FOCUS_BASE_POINTS + 5;
  if(stance === "Projecting") return MILITARY_FOCUS_BASE_POINTS + 2;
  if(stance === "Neutral") return MILITARY_FOCUS_BASE_POINTS - 2;
  return MILITARY_FOCUS_BASE_POINTS; // Defensive
}

// Each branch's standard (unmodified) cap, whether/how it can be raised
// by Doctrine choices, and any special allocation rule.
//
// Navy/Army/Air Force share the same raised-cap numbers: once their
// unlock condition is met, the cap becomes 9 - or 11 for a player with
// Specialized priority, since "values a single branch above all else"
// pushes further than any other combination can, in ANY of the three
// (Specialized alone is always one way to unlock each of them, alongside
// each branch's own specific condition). Expeditionary Forces uses its
// own, lower pair (5 / 7 with Specialized) since it's a smaller force by
// nature. Paramilitary works differently still (see its own comment).
const MILITARY_RAISED_CAP = 9;
const MILITARY_RAISED_CAP_SPECIALIZED = 11;
function raisedBranchCap(priority){
  return priority === "Specialized" ? MILITARY_RAISED_CAP_SPECIALIZED : MILITARY_RAISED_CAP;
}

const EXPEDITIONARY_RAISED_CAP = 5;
const EXPEDITIONARY_RAISED_CAP_SPECIALIZED = 7;
function raisedExpeditionaryCap(priority){
  return priority === "Specialized" ? EXPEDITIONARY_RAISED_CAP_SPECIALIZED : EXPEDITIONARY_RAISED_CAP;
}

const MILITARY_BRANCHES = [
  {
    id: "Navy",
    standardCap: 6,
    raiseCapIf: function(priority, stance){ return stance === "Projecting" || priority === "Specialized"; },
    raisedCap: function(priority, stance){ return raisedBranchCap(priority); },
    raiseDescription: "Raises to 9 (11 with Specialized priority) with Projecting stance or Specialized priority.",
  },
  {
    id: "Army",
    standardCap: 7,
    raiseCapIf: function(priority, stance){ return priority === "Quantity" || priority === "Specialized"; },
    raisedCap: function(priority, stance){ return raisedBranchCap(priority); },
    raiseDescription: "Raises to 9 (11 with Specialized priority) with Quantity or Specialized priority.",
  },
  {
    id: "Air Force",
    standardCap: 5,
    raiseCapIf: function(priority, stance){ return priority === "Quality" || priority === "Specialized"; },
    raisedCap: function(priority, stance){ return raisedBranchCap(priority); },
    raiseDescription: "Raises to 9 (11 with Specialized priority) with Quality or Specialized priority.",
  },
  {
    // No standard cap was given for this branch at all - unlike the other
    // four, it isn't just "harder to max out," it's unavailable entirely
    // without the right Doctrine. standardCap of 0 plus requiresUnlock
    // models "locked out" rather than "capped low."
    id: "Expeditionary Forces",
    standardCap: 0,
    requiresUnlock: true,
    raiseCapIf: function(priority, stance){ return stance === "Projecting" || stance === "Aggressive" || stance === "Combative"; },
    raisedCap: function(priority, stance){ return raisedExpeditionaryCap(priority); },
    raiseDescription: "Unlocks to 5 (7 with Specialized priority) with Projecting, Combative, or Aggressive stance.",
  },
  {
    id: "Paramilitary / Militia / Gendarmes / Reserves",
    // Not specially capped below the total budget - always tracks
    // whatever the current budget is (15/17/20). The special rule here is
    // the levelsPerPoint conversion, not a lower ceiling.
    standardCap: MILITARY_FOCUS_BASE_POINTS,
    raiseCapIf: function(){ return true; },
    raisedCap: function(priority, stance){ return militaryFocusBudget(stance); },
    levelsPerPoint: function(priority){ return priority === "Quality" ? 1 : 2; },
    raiseDescription: "Not capped below your total points budget. Each point buys 2 levels of strength, or 1 with Quality priority.",
  },
];


const SPECIALIZATION_COUNT = 5;

// ---- Energy Production adjustments from chosen specializations ----
//
// A Fuel specialization multiplies the Energy Production of whichever
// provinces rolled that same fuel type as their resource (see
// landbio.js's rollProvinceResources / RESOURCE_WEIGHTS_BY_CLIMATE) - not
// the claim's whole energy total. An Energy specialization instead adds a
// flat bonus to the total, regardless of which provinces have which
// resource. Both are keyed by RANK (which of the 5 export slots the
// specialization was chosen for), 1st being the strongest.
const FUEL_SPEC_TO_RESOURCE = {
  "Fuel - Coal Mining": "Coal",
  "Fuel - Natural Gas Extraction": "Natural Gas",
  "Fuel - Petroleum Extraction": "Oil",
  "Fuel - Uranium Extraction": "Uranium",
};
// Index 0 = 1st rank, index 4 = 5th rank.
const FUEL_MULTIPLIER_BY_RANK = [2.5, 2.25, 2, 1.75, 1.5];

// ---- Climate-gated specializations ----
//
// Some specializations only make sense given the right climate somewhere
// in the claim - Forestry's wood types being the clearest case (a
// softwood-timber industry needs actual softwood forest, not just any
// land). Keyed to real-world geography as a reasonable basis: softwood =
// cold/temperate coniferous forest, hardwood = temperate broadleaf
// forest, tropical hardwood = teak/mahogany-type tropical timber, rubber
// wood = rubber tree habitat (tropical, wetter). Pearling uses the same
// tropical/wet climates as rubber wood - pearl oysters need warm coastal
// water, the closest proxy this project has without a coastal/landlocked
// province flag. A specialization qualifies if the claim has AT LEAST ONE
// province in ANY of its listed climates - it doesn't need to dominate
// the claim.
const CLIMATE_SPEC_REQUIREMENTS = {
  "Forestry - Soft Wood":         ["Sub Arctic", "Highlands", "Oceanic", "Humid Continental"],
  "Forestry - Hard Wood":         ["Humid Continental", "Oceanic", "Mediterranean"],
  "Forestry - Tropical Hardwood": ["Tropical Rainforest"],
  "Forestry - Rubber":            ["Tropical Rainforest", "Tropical Wet Dry"],
  "Fishing - Pearling":           ["Tropical Rainforest", "Tropical Wet Dry"],
};

// ---- Primary sector specializations gated by a province's economic type ----
//
// Matched by name prefix (e.g. any "Agriculture - X" item) rather than
// listing every individual specialization out. Forestry and Fishing have
// no dedicated econ type of their own in this project (adding one would
// mean reworking the food/energy/population/GDP formulas AND reclassifying
// every existing province in data.js - a much bigger change than this),
// so both are grouped under Agriculture Focused/Oriented, matching how
// agriculture/forestry/fishing are commonly grouped as primary biological
// production in real-world classification. Mining requires Mineral
// Focused/Oriented. Fuel isn't listed here - it's already gated
// indirectly, since only Energy Focused/Oriented provinces roll a
// resource at all (see rollProvinceResources in landbio.js).
const PRIMARY_ECON_SECTOR_REQUIREMENTS = {
  "Agriculture": ["Agriculture Focused", "Agriculture Oriented"],
  "Fishing":     ["Agriculture Focused", "Agriculture Oriented"],
  "Forestry":    ["Agriculture Focused", "Agriculture Oriented"],
  "Mining":      ["Mineral Focused", "Mineral Oriented"],
};

// General-purpose "does this specialization's requirement check out"
// function, covering every kind of requirement this page enforces: a Fuel
// specialization needing a matching rolled resource somewhere in the
// claim, a climate-gated specialization (Forestry's wood types, Pearling)
// needing a matching climate somewhere in the claim, and a Primary-sector
// specialization needing a province of the matching economic type
// somewhere in the claim. Requirements can compound (Forestry's wood
// types need BOTH a matching climate AND an Agriculture-type province) -
// all applicable ones are checked, and any that fail are combined into
// one message. Returns null if the specialization has no requirement at
// all, true if it has one (or more) and all are met, or a description of
// what's missing otherwise.
function specializationRequirementStatus(name, availableResources, availableClimates, availableEconSectors){
  let hasAnyRequirement = false;
  const unmetReasons = [];

  const resource = FUEL_SPEC_TO_RESOURCE[name];
  if(resource){
    hasAnyRequirement = true;
    if(!availableResources[resource]) unmetReasons.push('requires ' + resource + ' in your claim');
  }

  const climates = CLIMATE_SPEC_REQUIREMENTS[name];
  if(climates){
    hasAnyRequirement = true;
    const climateMet = climates.some(function(c){ return availableClimates[c]; });
    if(!climateMet){
      unmetReasons.push('requires ' + (climates.length === 1 ? climates[0] : climates.join(' or ')) + ' climate in your claim');
    }
  }

  const sectorPrefix = Object.keys(PRIMARY_ECON_SECTOR_REQUIREMENTS).filter(function(p){
    return name.indexOf(p + ' - ') === 0;
  })[0];
  if(sectorPrefix){
    hasAnyRequirement = true;
    const econTypes = PRIMARY_ECON_SECTOR_REQUIREMENTS[sectorPrefix];
    const econMet = econTypes.some(function(e){ return (availableEconSectors || {})[e]; });
    if(!econMet){
      unmetReasons.push('requires ' + econTypes.join(' or ') + ' in your claim');
    }
  }

  if(!hasAnyRequirement) return null;
  if(unmetReasons.length === 0) return true;
  return unmetReasons.join('; ');
}

const ENERGY_SPEC_NAMES = ["Energy - Nuclear", "Energy - Renewable", "Energy - Fossil Fuels"];
const ENERGY_FLAT_BONUS_BY_RANK = [125, 100, 75, 50, 25];

// Applies both adjustments to a claim's per-province energy breakdown.
// perProvinceEnergy: [{ label, energy, resource }, ...] (from the bio
// page's snapshot hand-off). chosenSpecs: the 5 export-rank picks, in
// order (chosenSpecs[0] is 1st, etc. - may contain nulls for unfilled
// slots). Returns { adjustedTotal, originalTotal, appliedFuelBonuses,
// appliedEnergyBonuses } - the two "applied" arrays are for showing the
// player what actually kicked in, not just the final number.
function applyEnergySpecializationAdjustments(perProvinceEnergy, chosenSpecs){
  const originalTotal = perProvinceEnergy.reduce((sum, p) => sum + p.energy, 0);
  // Work on a copy keyed by label so multiple Fuel specs (unlikely to
  // both match the same province, but not impossible) compound correctly
  // rather than each recomputing from the original value.
  const working = {};
  perProvinceEnergy.forEach(p => { working[p.label] = p.energy; });

  const appliedFuelBonuses = [];
  const appliedEnergyBonuses = [];
  let flatBonusTotal = 0;

  (chosenSpecs || []).forEach((spec, i) => {
    if (!spec) return;
    const rank = i + 1;
    const resource = FUEL_SPEC_TO_RESOURCE[spec];
    if (resource) {
      const multiplier = FUEL_MULTIPLIER_BY_RANK[i];
      const matching = perProvinceEnergy.filter(p => p.resource === resource);
      matching.forEach(p => { working[p.label] = p.energy * multiplier; });
      appliedFuelBonuses.push({ spec, rank, resource, multiplier, provinces: matching.map(p => p.label) });
      return;
    }
    if (ENERGY_SPEC_NAMES.indexOf(spec) !== -1) {
      const bonus = ENERGY_FLAT_BONUS_BY_RANK[i];
      flatBonusTotal += bonus;
      appliedEnergyBonuses.push({ spec, rank, bonus });
    }
  });

  const adjustedTotal = Object.values(working).reduce((sum, v) => sum + v, 0) + flatBonusTotal;
  return { adjustedTotal, originalTotal, appliedFuelBonuses, appliedEnergyBonuses };
}


// Maps a World Exports rank's sector label (from landbio.js's
// buildWorldExports - "Services", "Consumer Goods", "Industrial Goods",
// "Raw Materials", combinations like "Services or Raw Materials", or
// "Any") to which SPECIALIZATION_POOLS keys it draws from. This is what
// ties each of the 5 Step 1 slots to the claim's actual generated export
// ranking, rather than letting the player freely pick from their whole
// economy type's pool.
const EXPORT_LABEL_TO_POOLS = {
  "Services":         ["Services"],
  "Consumer Goods":   ["Light Industry"],
  "Industrial Goods": ["Heavy Industry"],
  "Raw Materials":    ["Primary"],
};
const ALL_POOL_NAMES = ["Primary", "Services", "Light Industry", "Heavy Industry"];

function poolsForExportLabel(label){
  if(!label) return ALL_POOL_NAMES.slice();
  const trimmed = label.trim();
  if(trimmed === "Any") return ALL_POOL_NAMES.slice();
  if(EXPORT_LABEL_TO_POOLS[trimmed]) return EXPORT_LABEL_TO_POOLS[trimmed].slice();
  if(trimmed.indexOf(" or ") !== -1){
    let pools = [];
    trimmed.split(" or ").forEach(function(part){
      const mapped = EXPORT_LABEL_TO_POOLS[part.trim()];
      if(mapped) pools = pools.concat(mapped);
    });
    if(pools.length > 0) return pools;
  }
  // Unrecognized label (shouldn't normally happen) - fall back to
  // offering everything rather than leaving the slot with no options.
  return ALL_POOL_NAMES.slice();
}

// ---- Live Market Saturation (Google Sheet integration) ----
//
// The community's "Rylet Land Bio Data" sheet tracks, per specialization,
// how many finished land bios share that same World Export - the ST
// sheet's row 1 has the specialization names, row 3 has the resulting
// Market Saturation label (computed by the sheet itself; this file just
// displays whatever it says, it doesn't compute saturation itself).
// Fetched live so it stays current as more nations submit bios, rather
// than a snapshot that goes stale immediately - see fetchMarketSaturation
// below.
//
// NOTE: I could not do a live end-to-end test of this exact fetch from a
// real browser (no network access in the environment I built this in) -
// the CSV export URL format below is Google's standard, documented
// public-sheet export pattern, and the sheet loaded successfully when I
// fetched it directly to inspect its structure, but please confirm the
// live page actually pulls data correctly once deployed, and let me know
// if the sheet's sharing settings need adjusting for this to work.
const MARKET_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1GSaqRFLXAyr13NIPWLi-COP2618QG4gg8ki4y-4rqVk/export?format=csv&gid=1017667740";

// The six states, in ascending order of "how occupied" the market is.
// `fill` drives a small pie-style badge (see the CSS), `color` tints it -
// a simple green-to-red spectrum so the visual reads at a glance even
// before you know the exact label, with the label itself always in the
// legend and each badge's title/tooltip too.
const MARKET_SATURATION_LEVELS = [
  { id: "Untapped Market",     fill: "0%",   color: "#2e7d32" },
  { id: "Monopoly",            fill: "20%",  color: "#1565c0" },
  { id: "Rival Markets",       fill: "40%",  color: "#00897b" },
  { id: "Balanced Market",     fill: "60%",  color: "#c9a227" },
  { id: "Saturated Market",    fill: "80%",  color: "#ef6c00" },
  { id: "Oversaturated Market",fill: "100%", color: "#c62828" },
];

// Minimal CSV row parser (handles quoted fields, escaped quotes) - no
// external library, consistent with the rest of this static site.
function parseCsvLine(line){
  const result = [];
  let cur = "";
  let inQuotes = false;
  for(let i = 0; i < line.length; i++){
    const c = line[i];
    if(inQuotes){
      if(c === '"'){
        if(line[i+1] === '"'){ cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += c; }
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ",") { result.push(cur); cur = ""; }
      else cur += c;
    }
  }
  result.push(cur);
  return result;
}

// Fetches and parses the ST sheet, calling back with a map of
// { "Specialization Name": "Saturation Level" } on success, or
// callback(null, error) on failure (network error, sheet moved/private,
// unexpected format, etc.) - callers should degrade gracefully rather
// than block on this.
function fetchMarketSaturation(callback){
  fetch(MARKET_DATA_CSV_URL)
    .then(function(res){
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function(csvText){
      const rows = csvText.split(/\r?\n/).map(parseCsvLine);
      const nameRow = rows[0] || [];
      const saturationRow = rows[2] || []; // row 3 (0-indexed: row 2)
      const validLevels = MARKET_SATURATION_LEVELS.map(function(l){ return l.id; });
      const map = {};
      nameRow.forEach(function(name, i){
        const trimmedName = (name || "").trim();
        const trimmedSat = (saturationRow[i] || "").trim();
        if(trimmedName && validLevels.indexOf(trimmedSat) !== -1){
          map[trimmedName.toLowerCase()] = trimmedSat;
        }
      });
      callback(map, null);
    })
    .catch(function(err){ callback(null, err); });
}
