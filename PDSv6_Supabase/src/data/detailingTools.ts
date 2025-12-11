/**
 * Comprehensive Mobile Detailing Tools Database
 * Realistic pricing for truck/van mobile setups
 * Organized by category with space considerations
 */

export interface DetailingTool {
    id: string;
    name: string;
    category: 'wash-exterior' | 'vacuum-extraction' | 'power-tools' | 'interior-tools' | 'microfiber' | 'water-management' | 'electric-power' | 'storage';
    subcategory: string;
    priceRange: { min: number; max: number };
    suggestedPrice: number;
    essential: boolean;
    spaceRequirement: 'small' | 'medium' | 'large';
    placement: 'truck-bed' | 'back-seat' | 'van-shelving' | 'portable';
    brands: string[];
    description: string;
    warranty?: string;
    lifeExpectancy?: string;
}

export const DETAILING_TOOLS: DetailingTool[] = [
    // ========== WASH / EXTERIOR TOOLS ==========
    {
        id: 'tool-pressure-washer-electric',
        name: 'Electric Pressure Washer (1500-2000 PSI)',
        category: 'wash-exterior',
        subcategory: 'Pressure Washer',
        priceRange: { min: 150, max: 300 },
        suggestedPrice: 200,
        essential: true,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Sun Joe', 'Greenworks', 'Ryobi', 'AR Blue Clean'],
        description: 'Compact electric pressure washer ideal for mobile detailing',
        warranty: '2 years',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-pressure-washer-gas',
        name: 'Gas Pressure Washer (2500-3000 PSI)',
        category: 'wash-exterior',
        subcategory: 'Pressure Washer',
        priceRange: { min: 300, max: 600 },
        suggestedPrice: 400,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Simpson', 'Generac', 'Honda', 'DeWalt'],
        description: 'Heavy-duty gas pressure washer for professional use',
        warranty: '3 years',
        lifeExpectancy: '5-10 years',
    },
    {
        id: 'tool-pressure-hose-50ft',
        name: 'Pressure Washer Hose (50 ft)',
        category: 'wash-exterior',
        subcategory: 'Hose',
        priceRange: { min: 30, max: 60 },
        suggestedPrice: 45,
        essential: true,
        spaceRequirement: 'small',
        placement: 'truck-bed',
        brands: ['Simpson', 'Flexzilla', 'Tool Daily'],
        description: '50-foot high-pressure hose for extended reach',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },
    {
        id: 'tool-pressure-hose-100ft',
        name: 'Pressure Washer Hose (100 ft)',
        category: 'wash-exterior',
        subcategory: 'Hose',
        priceRange: { min: 50, max: 100 },
        suggestedPrice: 75,
        essential: false,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['Simpson', 'Flexzilla', 'Tool Daily'],
        description: '100-foot high-pressure hose for maximum reach',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },
    {
        id: 'tool-foam-cannon',
        name: 'Foam Cannon',
        category: 'wash-exterior',
        subcategory: 'Foam Application',
        priceRange: { min: 20, max: 60 },
        suggestedPrice: 35,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chemical Guys', 'MATCC', 'Fasmov'],
        description: 'Pressure washer foam cannon for pre-wash',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-pump-sprayer-1gal',
        name: 'Pump Sprayer (1 gallon)',
        category: 'wash-exterior',
        subcategory: 'Sprayer',
        priceRange: { min: 15, max: 30 },
        suggestedPrice: 22,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chapin', 'Smith', 'IK Foam Pro'],
        description: 'Hand pump sprayer for chemicals and detail spray',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },
    {
        id: 'tool-pump-sprayer-2gal',
        name: 'Pump Sprayer (2 gallon)',
        category: 'wash-exterior',
        subcategory: 'Sprayer',
        priceRange: { min: 25, max: 50 },
        suggestedPrice: 35,
        essential: false,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chapin', 'IK Foam Pro 2', 'Gloria'],
        description: 'Larger pump sprayer for extended use',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },
    {
        id: 'tool-wash-buckets',
        name: 'Wash Buckets with Grit Guards (2-pack)',
        category: 'wash-exterior',
        subcategory: 'Buckets',
        priceRange: { min: 20, max: 40 },
        suggestedPrice: 30,
        essential: true,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['Chemical Guys', 'Meguiar\'s', 'Mothers'],
        description: 'Two-bucket wash system with grit guards',
        warranty: 'N/A',
        lifeExpectancy: '5+ years',
    },
    {
        id: 'tool-wheel-brushes',
        name: 'Wheel & Barrel Brush Set',
        category: 'wash-exterior',
        subcategory: 'Brushes',
        priceRange: { min: 15, max: 35 },
        suggestedPrice: 25,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chemical Guys', 'Takavu', 'Relentless Drive'],
        description: 'Soft bristle brushes for wheels and barrels',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },

    // ========== VACUUM & EXTRACTION ==========
    {
        id: 'tool-shop-vac-4hp',
        name: 'Shop Vacuum (4-6 HP)',
        category: 'vacuum-extraction',
        subcategory: 'Vacuum',
        priceRange: { min: 80, max: 150 },
        suggestedPrice: 110,
        essential: true,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Shop-Vac', 'Craftsman', 'Ridgid'],
        description: 'Wet/dry shop vacuum for interior cleaning',
        warranty: '2 years',
        lifeExpectancy: '5-7 years',
    },
    {
        id: 'tool-shop-vac-6hp',
        name: 'Shop Vacuum (6+ HP, Professional)',
        category: 'vacuum-extraction',
        subcategory: 'Vacuum',
        priceRange: { min: 150, max: 250 },
        suggestedPrice: 200,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Ridgid Pro', 'DeWalt', 'Milwaukee'],
        description: 'Heavy-duty professional shop vacuum',
        warranty: '3 years',
        lifeExpectancy: '7-10 years',
    },
    {
        id: 'tool-carpet-extractor',
        name: 'Portable Carpet Extractor',
        category: 'vacuum-extraction',
        subcategory: 'Extractor',
        priceRange: { min: 150, max: 400 },
        suggestedPrice: 250,
        essential: true,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Bissell SpotClean Pro', 'Hoover PowerDash', 'Rug Doctor'],
        description: 'Hot water extraction for deep carpet cleaning',
        warranty: '2 years',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-drill-brush-kit',
        name: 'Drill Brush Attachment Kit',
        category: 'vacuum-extraction',
        subcategory: 'Brushes',
        priceRange: { min: 20, max: 50 },
        suggestedPrice: 30,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Drillbrush', 'Holikme', 'OXO'],
        description: 'Power drill brush attachments for scrubbing',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },

    // ========== POWER TOOLS ==========
    {
        id: 'tool-da-polisher',
        name: 'Dual Action Polisher',
        category: 'power-tools',
        subcategory: 'Polisher',
        priceRange: { min: 150, max: 300 },
        suggestedPrice: 200,
        essential: true,
        spaceRequirement: 'medium',
        placement: 'back-seat',
        brands: ['Griot\'s Garage', 'Chemical Guys Torq', 'Porter Cable'],
        description: 'Random orbital polisher for paint correction',
        warranty: '2 years',
        lifeExpectancy: '5-7 years',
    },
    {
        id: 'tool-mini-polisher',
        name: 'Mini Polisher (3-inch)',
        category: 'power-tools',
        subcategory: 'Polisher',
        priceRange: { min: 80, max: 150 },
        suggestedPrice: 110,
        essential: false,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Griot\'s Garage', 'Chemical Guys', 'Harbor Freight'],
        description: 'Compact polisher for tight areas and trim',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-polishing-pads',
        name: 'Polishing Pad Set (6-pack)',
        category: 'power-tools',
        subcategory: 'Pads',
        priceRange: { min: 30, max: 60 },
        suggestedPrice: 45,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Meguiar\'s', 'Chemical Guys Hex-Logic', 'Lake Country'],
        description: 'Foam pads for cutting, polishing, and finishing',
        warranty: 'N/A',
        lifeExpectancy: '1-2 years',
    },

    // ========== INTERIOR TOOLS ==========
    {
        id: 'tool-air-compressor',
        name: 'Portable Air Compressor',
        category: 'interior-tools',
        subcategory: 'Compressor',
        priceRange: { min: 100, max: 250 },
        suggestedPrice: 150,
        essential: true,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['DeWalt', 'Makita', 'Porter Cable'],
        description: 'Portable air compressor for blow-out and tools',
        warranty: '2 years',
        lifeExpectancy: '5-7 years',
    },
    {
        id: 'tool-tornador',
        name: 'Tornador Interior Cleaning Tool',
        category: 'interior-tools',
        subcategory: 'Cleaning Tool',
        priceRange: { min: 40, max: 100 },
        suggestedPrice: 60,
        essential: false,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Tornador', 'Chemical Guys', 'CarCarez'],
        description: 'Compressed air cleaning tool for vents and crevices',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-steam-cleaner',
        name: 'Portable Steam Cleaner',
        category: 'interior-tools',
        subcategory: 'Steam',
        priceRange: { min: 100, max: 300 },
        suggestedPrice: 180,
        essential: false,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['McCulloch', 'Dupray', 'Wagner'],
        description: 'Chemical-free steam cleaning for interiors',
        warranty: '2 years',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-detail-brush-set',
        name: 'Detail Brush Set (10-piece)',
        category: 'interior-tools',
        subcategory: 'Brushes',
        priceRange: { min: 20, max: 50 },
        suggestedPrice: 30,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chemical Guys', 'Takavu', 'Detail Factory'],
        description: 'Various brushes for vents, seams, and tight areas',
        warranty: '1 year',
        lifeExpectancy: '2-3 years',
    },

    // ========== MICROFIBER SYSTEM ==========
    {
        id: 'tool-microfiber-towels-bulk',
        name: 'Microfiber Towels (50-pack)',
        category: 'microfiber',
        subcategory: 'Towels',
        priceRange: { min: 30, max: 80 },
        suggestedPrice: 50,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Chemical Guys', 'Kirkland', 'The Rag Company'],
        description: 'Bulk microfiber towels for all detailing tasks',
        warranty: 'N/A',
        lifeExpectancy: '1-2 years',
    },
    {
        id: 'tool-waffle-weave-towels',
        name: 'Waffle Weave Drying Towels (3-pack)',
        category: 'microfiber',
        subcategory: 'Drying',
        priceRange: { min: 15, max: 30 },
        suggestedPrice: 22,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['The Rag Company', 'Chemical Guys', 'Meguiar\'s'],
        description: 'Large waffle weave towels for drying',
        warranty: 'N/A',
        lifeExpectancy: '2-3 years',
    },
    {
        id: 'tool-applicator-pads',
        name: 'Foam Applicator Pads (12-pack)',
        category: 'microfiber',
        subcategory: 'Applicators',
        priceRange: { min: 10, max: 25 },
        suggestedPrice: 15,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Meguiar\'s', 'Chemical Guys', 'Mothers'],
        description: 'Foam pads for applying waxes and sealants',
        warranty: 'N/A',
        lifeExpectancy: '1 year',
    },

    // ========== WATER MANAGEMENT ==========
    {
        id: 'tool-water-tank-50gal',
        name: 'Water Tank (50 gallon)',
        category: 'water-management',
        subcategory: 'Tank',
        priceRange: { min: 100, max: 200 },
        suggestedPrice: 150,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['RomoTech', 'Norwesco', 'Ace Roto-Mold'],
        description: 'Portable water tank for mobile operations',
        warranty: '1 year',
        lifeExpectancy: '5-10 years',
    },
    {
        id: 'tool-water-tank-100gal',
        name: 'Water Tank (100 gallon)',
        category: 'water-management',
        subcategory: 'Tank',
        priceRange: { min: 150, max: 300 },
        suggestedPrice: 220,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['RomoTech', 'Norwesco', 'Ace Roto-Mold'],
        description: 'Large water tank for extended mobile operations',
        warranty: '1 year',
        lifeExpectancy: '5-10 years',
    },
    {
        id: 'tool-water-pump',
        name: 'Water Pump (12V)',
        category: 'water-management',
        subcategory: 'Pump',
        priceRange: { min: 50, max: 150 },
        suggestedPrice: 90,
        essential: false,
        spaceRequirement: 'small',
        placement: 'truck-bed',
        brands: ['Shurflo', 'Flojet', 'Seaflo'],
        description: '12V water pump for tank systems',
        warranty: '2 years',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-hose-reel',
        name: 'Retractable Hose Reel',
        category: 'water-management',
        subcategory: 'Hose Storage',
        priceRange: { min: 30, max: 80 },
        suggestedPrice: 50,
        essential: false,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['Flexzilla', 'Giraffe Tools', 'Suncast'],
        description: 'Retractable hose reel for organized storage',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },

    // ========== ELECTRIC / POWER ==========
    {
        id: 'tool-power-inverter-1000w',
        name: 'Power Inverter (1000W)',
        category: 'electric-power',
        subcategory: 'Inverter',
        priceRange: { min: 100, max: 200 },
        suggestedPrice: 140,
        essential: true,
        spaceRequirement: 'small',
        placement: 'truck-bed',
        brands: ['BESTEK', 'Ampeak', 'POTEK'],
        description: 'DC to AC power inverter for tools',
        warranty: '2 years',
        lifeExpectancy: '5-7 years',
    },
    {
        id: 'tool-power-inverter-2000w',
        name: 'Power Inverter (2000W)',
        category: 'electric-power',
        subcategory: 'Inverter',
        priceRange: { min: 150, max: 300 },
        suggestedPrice: 220,
        essential: false,
        spaceRequirement: 'medium',
        placement: 'truck-bed',
        brands: ['Renogy', 'AIMS Power', 'GoWISE'],
        description: 'High-capacity inverter for multiple tools',
        warranty: '2 years',
        lifeExpectancy: '5-7 years',
    },
    {
        id: 'tool-generator-2000w',
        name: 'Portable Generator (2000W, Quiet)',
        category: 'electric-power',
        subcategory: 'Generator',
        priceRange: { min: 300, max: 600 },
        suggestedPrice: 450,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Honda EU2200i', 'Champion', 'WEN'],
        description: 'Quiet inverter generator for mobile power',
        warranty: '3 years',
        lifeExpectancy: '10+ years',
    },
    {
        id: 'tool-generator-3500w',
        name: 'Portable Generator (3500W)',
        category: 'electric-power',
        subcategory: 'Generator',
        priceRange: { min: 400, max: 800 },
        suggestedPrice: 600,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Honda', 'Generac', 'Champion'],
        description: 'Heavy-duty generator for professional setups',
        warranty: '3 years',
        lifeExpectancy: '10+ years',
    },
    {
        id: 'tool-extension-cords',
        name: 'Heavy-Duty Extension Cords (50ft, 2-pack)',
        category: 'electric-power',
        subcategory: 'Cords',
        priceRange: { min: 20, max: 50 },
        suggestedPrice: 35,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['Southwire', 'Iron Forge', 'US Wire'],
        description: '12-gauge outdoor extension cords',
        warranty: '1 year',
        lifeExpectancy: '5+ years',
    },

    // ========== STORAGE ==========
    {
        id: 'tool-trunk-organizer',
        name: 'Trunk Organizer (Collapsible)',
        category: 'storage',
        subcategory: 'Organizer',
        priceRange: { min: 30, max: 80 },
        suggestedPrice: 50,
        essential: true,
        spaceRequirement: 'medium',
        placement: 'back-seat',
        brands: ['Drive Auto', 'Starling\'s', 'Fortem'],
        description: 'Collapsible trunk organizer for supplies',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-truck-bed-box',
        name: 'Truck Bed Storage Box',
        category: 'storage',
        subcategory: 'Box',
        priceRange: { min: 50, max: 150 },
        suggestedPrice: 90,
        essential: false,
        spaceRequirement: 'large',
        placement: 'truck-bed',
        brands: ['Dee Zee', 'Better Built', 'UWS'],
        description: 'Lockable storage box for truck bed',
        warranty: '2 years',
        lifeExpectancy: '10+ years',
    },
    {
        id: 'tool-seat-back-organizer',
        name: 'Seat-Back Equipment Organizer',
        category: 'storage',
        subcategory: 'Organizer',
        priceRange: { min: 20, max: 60 },
        suggestedPrice: 35,
        essential: true,
        spaceRequirement: 'small',
        placement: 'back-seat',
        brands: ['Lusso Gear', 'Kick Mats', 'Oasser'],
        description: 'Hanging organizer for back of seats',
        warranty: '1 year',
        lifeExpectancy: '3-5 years',
    },
    {
        id: 'tool-tool-bag',
        name: 'Professional Tool Bag',
        category: 'storage',
        subcategory: 'Bag',
        priceRange: { min: 30, max: 100 },
        suggestedPrice: 60,
        essential: true,
        spaceRequirement: 'small',
        placement: 'portable',
        brands: ['DeWalt', 'Carhartt', 'Klein Tools'],
        description: 'Heavy-duty tool bag for equipment',
        warranty: '1 year',
        lifeExpectancy: '5+ years',
    },
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: DetailingTool['category']): DetailingTool[] {
    return DETAILING_TOOLS.filter(t => t.category === category);
}

/**
 * Get essential tools only
 */
export function getEssentialTools(): DetailingTool[] {
    return DETAILING_TOOLS.filter(t => t.essential);
}

/**
 * Get tools by placement
 */
export function getToolsByPlacement(placement: DetailingTool['placement']): DetailingTool[] {
    return DETAILING_TOOLS.filter(t => t.placement === placement);
}

/**
 * Calculate total cost for a tool kit
 */
export function calculateToolKitCost(tools: DetailingTool[]): number {
    return tools.reduce((sum, tool) => sum + tool.suggestedPrice, 0);
}

/**
 * Get starter kit (essential tools only)
 */
export function getStarterKit(): {
    tools: DetailingTool[];
    totalCost: number;
    categories: Record<string, number>;
} {
    const tools = getEssentialTools();
    const totalCost = calculateToolKitCost(tools);
    const categories: Record<string, number> = {};

    tools.forEach(tool => {
        if (!categories[tool.category]) {
            categories[tool.category] = 0;
        }
        categories[tool.category] += tool.suggestedPrice;
    });

    return { tools, totalCost, categories };
}

/**
 * Get complete professional kit
 */
export function getCompleteKit(): {
    tools: DetailingTool[];
    totalCost: number;
    categories: Record<string, number>;
} {
    const tools = DETAILING_TOOLS;
    const totalCost = calculateToolKitCost(tools);
    const categories: Record<string, number> = {};

    tools.forEach(tool => {
        if (!categories[tool.category]) {
            categories[tool.category] = 0;
        }
        categories[tool.category] += tool.suggestedPrice;
    });

    return { tools, totalCost, categories };
}
