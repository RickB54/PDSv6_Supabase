// Complaint options for customer vehicles
export const COMPLAINT_OPTIONS = [
    "Stains",
    "Scratches",
    "Bad odor",
    "Dust buildup",
    "Water spots",
    "Faded paint",
    "Mold or mildew",
    "Pet hair",
    "Dull paint"
];

// Goal options for customer priorities
export const GOAL_OPTIONS = [
    "Fast turnaround",
    "Deep interior cleaning",
    "Budget-friendly service",
    "Eco-friendly products",
    "Premium detailing finish",
    "Paint enhancement",
    "Odor elimination",
    "Long-term protection"
];

// Available upsell services
export interface UpsellService {
    id: string;
    name: string;
    price: number;
    description: string;
}

export const UPSELL_SERVICES: UpsellService[] = [
    {
        id: "ceramic",
        name: "Ceramic Coating",
        price: 500,
        description: "Long-lasting paint protection with hydrophobic properties"
    },
    {
        id: "interior_deep",
        name: "Deep Interior Detail",
        price: 150,
        description: "Thorough cleaning of all interior surfaces, carpets, and upholstery"
    },
    {
        id: "paint_correction",
        name: "Paint Correction",
        price: 300,
        description: "Remove swirls, scratches, and restore paint clarity"
    },
    {
        id: "odor_removal",
        name: "Odor Elimination Treatment",
        price: 100,
        description: "Professional ozone treatment to eliminate persistent odors"
    },
    {
        id: "pet_hair",
        name: "Pet Hair Removal",
        price: 75,
        description: "Specialized removal of embedded pet hair from all surfaces"
    },
    {
        id: "stain_treatment",
        name: "Stain Treatment",
        price: 80,
        description: "Professional stain removal for carpets and upholstery"
    },
    {
        id: "scratch_repair",
        name: "Scratch Repair",
        price: 200,
        description: "Minor scratch repair and touch-up"
    },
    {
        id: "eco_package",
        name: "Eco-Friendly Package",
        price: 120,
        description: "Complete detail using environmentally-safe products"
    },
    {
        id: "headlight_restoration",
        name: "Headlight Restoration",
        price: 90,
        description: "Restore clarity to oxidized and yellowed headlights"
    },
    {
        id: "engine_detail",
        name: "Engine Bay Detailing",
        price: 110,
        description: "Professional cleaning and dressing of engine compartment"
    }
];
