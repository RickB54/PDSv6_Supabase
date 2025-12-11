export interface DetailingMaterial {
    id: string;
    name: string;
    type: string;
    subtype: string;
    suggestedPrice: number;
    quantity: number;
    threshold: number;
    description: string;
}

export const DETAILING_MATERIALS: DetailingMaterial[] = [
    {
        id: "mat-mf-towels-300",
        name: "Microfiber Towels (300gsm)",
        type: "Towels",
        subtype: "General Purpose",
        suggestedPrice: 24.99,
        quantity: 1,
        threshold: 2,
        description: "Pack of 12 yellow microfiber towels, 16x16 inch."
    },
    {
        id: "mat-mf-towels-500",
        name: "Plush Microfiber Towels (500gsm)",
        type: "Towels",
        subtype: "Buffing",
        suggestedPrice: 34.99,
        quantity: 1,
        threshold: 2,
        description: "Pack of 6 plush towels for wax removal."
    },
    {
        id: "mat-app-pads-foam",
        name: "Foam Applicator Pads",
        type: "Pads",
        subtype: "Applicator",
        suggestedPrice: 8.99,
        quantity: 1,
        threshold: 3,
        description: "Pack of 12 yellow foam applicator pads."
    },
    {
        id: "mat-clay-bar-fine",
        name: "Clay Bar (Fine)",
        type: "Decontamination",
        subtype: "Clay",
        suggestedPrice: 19.99,
        quantity: 1,
        threshold: 1,
        description: "2x 100g fine grade clay bars."
    },
    {
        id: "mat-tape-masking",
        name: "Automotive Masking Tape",
        type: "Protection",
        subtype: "Tape",
        suggestedPrice: 5.99,
        quantity: 1,
        threshold: 2,
        description: "1 inch width, safe for car paint."
    },
    {
        id: "mat-gloves-nitrile",
        name: "Nitrile Gloves (Black)",
        type: "Safety",
        subtype: "Gloves",
        suggestedPrice: 14.99,
        quantity: 1,
        threshold: 1,
        description: "Box of 100 heavy duty nitrile gloves."
    },
    {
        id: "mat-polishing-pad-cut",
        name: "Cutting Foam Pad (5.5 inch)",
        type: "Pads",
        subtype: "Polishing",
        suggestedPrice: 12.99,
        quantity: 1,
        threshold: 2,
        description: "Orange medium-heavy cutting pad."
    },
    {
        id: "mat-polishing-pad-finish",
        name: "Finishing Foam Pad (5.5 inch)",
        type: "Pads",
        subtype: "Polishing",
        suggestedPrice: 12.99,
        quantity: 1,
        threshold: 2,
        description: "Black finishing pad for jeweling."
    }
];
