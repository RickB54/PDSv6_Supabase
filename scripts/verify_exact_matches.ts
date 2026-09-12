import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));
const materials = dump.materials;
const tools = dump.tools;

// From user prompt:
// SUPPLIES (94 total):
// Towels & Microfiber (15)
// Brushes & Applicators (10)
// Tools & Accessories (32)
// Bottles & Containers (6)
// Safety & PPE (4)
// Business & Branding (20)
// Other (7)

// EQUIPMENT (83 total):
// Power Equipment & Systems (22)
// Hand Tools & Guns (20)
// Pump Sprayer & Foam Cannons (7)
// Storage & Organizers (10)
// Security & Office (5)
// Safety & PPE (2)
// Hoses, Cords & Reels (17)

console.log(`Current DB: ${materials.length} materials, ${tools.length} tools`);

// Let's write a matching algorithm to see every item
