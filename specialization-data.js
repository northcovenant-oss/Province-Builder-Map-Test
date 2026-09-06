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
    "Agriculture - Vegetables",
    "Fishing - Aquaculture",
    "Fishing - Commercial",
    "Forestry",
    "Mining",
    "Fuel - Coal Mining",
    "Fuel - Natural Gas Extraction",
    "Fuel - Petroleum Extraction",
    "Fuel - Uranium Extraction",
  ],
  Services: [
    "Hospitality - Cultural Activities",
    "Hospitality - Food Service",
    "Hospitality - Hotels",
    "Hospitality - Sex Work",
    "Hospitality - Tourism",
    "Mass Media - Printing & Publishing",
    "Mass Media - Film Industry",
    "Mass Media - Broadcast (News & TV)",
    "Mass Media - Music Industry",
    "Mass Media - Digital Media",
    "Public Health",
    "Information Technology",
    "Consulting",
    "Gambling",
    "Retailer - Online Store",
    "Retailer - Superstore",
    "Retail Sales - Luxury Brand",
    "Financial Services - Banking",
    "Financial Services - Insurance",
    "Financial Services - Investment Management",
    "Professional Services - Accounting",
    "Professional Services - Legal Services",
    "Professional Services - Management Consulting",
    "Cargo Transportation - Air",
    "Cargo Transportation - Ship",
    "Cargo Transportation - Rail",
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
    "Leather Industry",
    "Attire - Accessories",
    "Attire - Clothing",
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
    "Electronics - Semiconductor",
    "Energy - Nuclear",
    "Energy - Renewable",
    "Energy - Fossil Fuels",
    "Engineering - Civil",
    "Engineering - Environmental",
    "Engineering - Robotics",
    "Locomotive - Rapid Transit & Light Rail",
    "Locomotive - Freight & Passenger",
    "Metals - Alloys",
    "Metals - Refined Metals",
    "Metals - Steel",
    "Pulp and Paper Industry",
    "Shipbuilding - Commercial Large",
    "Shipbuilding - Commercial Small",
    "Shipbuilding - Private",
    "Telecommunication",
    "Waste - Disposal",
    "Waste - Recycling",
  ],
};

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
  return MILITARY_FOCUS_BASE_POINTS;
}

// Each branch's standard cap, an optional raised cap unlocked by specific
// Doctrine choices, and any special allocation rule. Where the source
// material gave a raised cap as "7+"/"8+"/"6+" without an explicit
// ceiling, the raised cap is treated as the player's whole budget (no
// additional per-branch ceiling beyond what they have to spend) - flagged
// here since that's my own reading of an open-ended figure, not a given
// number.
const MILITARY_BRANCHES = [
  {
    id: "Navy",
    standardCap: 5,
    raiseCapIf: function(priority, stance){ return stance === "Projecting" || priority === "Specialized"; },
  },
  {
    id: "Army",
    standardCap: 6,
    raiseCapIf: function(priority, stance){ return priority === "Quantity"; },
  },
  {
    id: "Air Force",
    standardCap: 4,
    raiseCapIf: function(priority, stance){ return priority === "Quality" || priority === "Specialized"; },
  },
  {
    id: "Expeditionary Forces",
    // No standard cap was given for this branch at all - unlike the
    // other four, it isn't just "harder to max out," it's unavailable
    // entirely without the right Doctrine. standardCap of 0 plus
    // requiresUnlock models "locked out" rather than "capped low."
    standardCap: 0,
    requiresUnlock: true,
    raiseCapIf: function(priority, stance){ return stance === "Projecting" || stance === "Aggressive"; },
  },
  {
    id: "Paramilitary / Militia / Gendarmes",
    // Not specially capped below the total budget - always tracks
    // whatever the current budget is (15/17/20), same as any branch
    // whose cap is "raised." The special rule here is the levelsPerPoint
    // conversion, not a lower ceiling.
    standardCap: MILITARY_FOCUS_BASE_POINTS,
    raiseCapIf: function(){ return true; },
    levelsPerPoint: function(priority){ return priority === "Quality" ? 1 : 2; },
  },
];


const SPECIALIZATION_COUNT = 5;

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

