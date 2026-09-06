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

// Held out of the Heavy Industry pool above - these are Step 2's options
// (a single military specialization), not part of the general Step 1 pool.
const MILITARY_SPECIALIZATIONS = [
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

