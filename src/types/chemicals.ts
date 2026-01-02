export type ChemicalCategory = 'Exterior' | 'Interior' | 'Dual-Use';

export type DamageRisk = 'Low' | 'Medium' | 'High';

export interface DilutionRatio {
    method: string; // e.g., "Spray Bottle", "Foam Cannon", "Bucket"
    ratio: string; // e.g., "1:10", "1oz/gal"
    soil_level: string; // e.g., "Maintenance", "Heavy Soil"
    notes?: string;
}

export interface ApplicationGuide {
    method: string;
    dwell_time_min?: number; // minutes
    dwell_time_max?: number; // minutes
    agitation: string; // "Soft Brush", "Microfiber", "None"
    rinse: string; // "Pressure Rinse", "Wipe Off"
    notes?: string;
}

export interface Chemical {
    id: string;
    name: string;
    brand?: string;
    category: ChemicalCategory;
    description: string;
    used_for: string[]; // Top 3-5 bullet points

    // Usage Context
    when_to_use: string;
    why_to_use: string;
    primary_uses: string;
    other_uses?: string;

    // Technical Data
    dilution_ratios: DilutionRatio[];
    application_guide: ApplicationGuide;

    // Safety & compatibility
    surface_compatibility: {
        safe: string[];
        risky: string[];
        avoid: string[];
    };
    interactions: {
        do_not_mix: string[];
        sequencing: string[]; // e.g., "Use before wax"
    };
    warnings: {
        risks: string[]; // e.g., "Etching if dried"
        damage_risk: DamageRisk;
    };

    // Aesthetic
    theme_color: string;
    primary_image_url?: string;
    gallery_image_urls?: string[];
    video_urls?: string[];

    // Extras
    pro_tips?: string[];
    compatible_chemicals?: string[]; // IDs or Names
    alternative_chemicals?: string[]; // IDs or Names
    user_notes?: string; // Admin-editable notes

    // System
    created_at?: string;
    updated_at?: string;

    // AI Tracking
    ai_generated?: boolean;
    manually_modified?: boolean;
}
