/*
 * NATIONAL SPECIALIZATION DATA
 * ----------------------------
 * The four category pools players choose from in Step 1, plus the
 * military-specific list used in Step 2. Defense items are pulled out of
 * the general Heavy Industry pool so they're reserved for the military
 * step rather than also being pickable as a regular specialization.
 *
 * SPECIALIZATION_ECONOMY_MAP decides which pool(s) a claim's Economic
 * Classification (see landbio.js's classifyEconomy) draws its Step 1
 * options from - pure sectors draw from one pool, blended economies draw
 * from the two pools matching their pair, and "Diversified Economy" (the
 * catch-all for claims too evenly split to classify) can draw from all
 * four.
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

// Which pool(s) each Economic Classification draws Step 1 options from.
// Matches classifyEconomy's ten named types one-for-one, keyed the same
// way landbio.js already keys ECONOMY_SECTOR_KEYS.
const SPECIALIZATION_ECONOMY_MAP = {
  "Service Economy":                     ["Services"],
  "Consumer Goods Economy":              ["Light Industry"],
  "Industrial Economy":                  ["Heavy Industry"],
  "Resource Economy":                    ["Primary"],
  "Consumer Goods & Services Economy":   ["Services", "Light Industry"],
  "Consumer Goods & Materials Economy":  ["Light Industry", "Primary"],
  "Manufacturing Economy":               ["Light Industry", "Heavy Industry"],
  "Industrial Goods & Services Economy": ["Heavy Industry", "Services"],
  "Industrial Goods & Materials Economy":["Heavy Industry", "Primary"],
  "Non-Industrial Economy":              ["Services", "Primary"],
  // Not one of classifyEconomy's ten named types - it's landbio.js's own
  // fallback for claims too evenly split to hit any threshold. Since
  // there's no single sector story to draw from, it can draw from
  // everything.
  "Diversified Economy":                 ["Primary", "Services", "Light Industry", "Heavy Industry"],
};

const SPECIALIZATION_COUNT = 5;
