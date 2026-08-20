const DEFAULT_LOCATIONS = ['Detail Cart', 'Mobile Detail Bag', 'D1', 'D2', 'B1'];
const saved = '["Rails for Carport", "Small Bag", "Storage Cabinet", "Truck Bed", "Utility Closet Draw"]';
let availableLocations = [];
if (saved) {
  const parsed = JSON.parse(saved);
  availableLocations = Array.from(new Set([...DEFAULT_LOCATIONS, ...parsed]));
}

const itemLocs = ['Utility Closet Draw'];
availableLocations = Array.from(new Set([...availableLocations, ...itemLocs])).sort();

console.log(availableLocations);
