// Client Evaluation Data Structures - NOW USING ACTUAL PRICING SYSTEM
import { servicePackages, addOns, type VehicleType } from "@/lib/services";

export const EVALUATION_COMPLAINTS = [
    "Stains",
    "Scratches",
    "Bad Odor",
    "Pet Hair",
    "Mud / Dirt buildup",
    "Water Spots",
    "Dull or Faded Paint",
    "Mold / Mildew",
    "Sticky Spills",
    "Smoke Smell",
    "Carpet Stains",
    "Seat Stains"
];

export const EVALUATION_GOALS = [
    "Fast Turnaround",
    "Deep Interior Cleaning",
    "Budget Friendly",
    "Maximum Shine",
    "Long-Term Protection",
    "Odor Removal",
    "Pet Hair Removal",
    "Restoration-Level Detail",
    "Best Possible Outcome",
    "Premium Detail / High-End Finish"
];

export interface EvaluationService {
    id: string;
    name: string;
    packageId?: string; // Maps to actual package/addon ID
    getPrice: (vehicleType?: VehicleType) => { price: number; priceRange?: string };
    description: string;
    category: string;
}

// Helper to get price from your ACTUAL pricing system
function getPriceForService(packageId: string, vehicleType?: VehicleType): { price: number; priceRange?: string } {
    // Check packages first
    const pkg = servicePackages.find(p => p.id === packageId);
    if (pkg) {
        if (vehicleType) {
            return { price: pkg.pricing[vehicleType] };
        } else {
            // No vehicle type - return range from lowest to highest
            const prices = [pkg.pricing.compact, pkg.pricing.midsize, pkg.pricing.truck, pkg.pricing.luxury];
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return { price: min, priceRange: min === max ? `$${min}` : `$${min}-$${max}` };
        }
    }

    // Check addons
    const addon = addOns.find(a => a.id === packageId);
    if (addon) {
        if (vehicleType) {
            return { price: addon.pricing[vehicleType] };
        } else {
            const prices = [addon.pricing.compact, addon.pricing.midsize, addon.pricing.truck, addon.pricing.luxury];
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return { price: min, priceRange: min === max ? `$${min}` : `$${min}-$${max}` };
        }
    }

    return { price: 0, priceRange: "$0" };
}

export const EVALUATION_SERVICES: EvaluationService[] = [
    {
        id: "essential-interior",
        name: "Prime Essential Interior",
        packageId: "prime-essential-interior",
        getPrice: (vt) => getPriceForService("prime-essential-interior", vt),
        description: "Standard interior refresh and vacuum",
        category: "Interior"
    },
    {
        id: "essential-full",
        name: "Prime Essential Full Detail",
        packageId: "prime-essential-full",
        getPrice: (vt) => getPriceForService("prime-essential-full", vt),
        description: "Complete maintenance interior and exterior",
        category: "Package"
    },
    {
        id: "elite-interior",
        name: "Prime Elite Interior",
        packageId: "prime-elite-interior",
        getPrice: (vt) => getPriceForService("prime-elite-interior", vt),
        description: "Deep steam cleaning and extraction",
        category: "Interior"
    },
    {
        id: "elite-full",
        name: "Prime Elite Full Detail",
        packageId: "prime-elite-full",
        getPrice: (vt) => getPriceForService("prime-elite-full", vt),
        description: "The ultimate showroom restoration",
        category: "Package"
    },
    {
        id: "pet-hair-removal",
        name: "Pet Hair Removal",
        packageId: "pet-hair",
        getPrice: (vt) => getPriceForService("pet-hair", vt),
        description: "Specialized pet hair extraction",
        category: "Interior"
    },
    {
        id: "odor-treatment",
        name: "Odor Elimination",
        packageId: "odor-treatment",
        getPrice: (vt) => getPriceForService("odor-treatment", vt),
        description: "Professional odor neutralization",
        category: "Interior"
    },
    {
        id: "headlight-restoration",
        name: "Headlight Restoration",
        packageId: "headlight-restoration",
        getPrice: (vt) => getPriceForService("headlight-restoration", vt),
        description: "Clear foggy headlights",
        category: "Exterior"
    },
    {
        id: "engine-bay",
        name: "Engine Bay Cleaning",
        packageId: "engine-detail",
        getPrice: (vt) => getPriceForService("engine-detail", vt),
        description: "Degrease and dress engine compartment",
        category: "Engine"
    },
    {
        id: "essential-exterior",
        name: "Prime Essential Exterior",
        packageId: "prime-essential-exterior",
        getPrice: (vt) => getPriceForService("prime-essential-exterior", vt),
        description: "Professional foam bath and hand dry",
        category: "Exterior"
    },
    {
        id: "elite-exterior",
        name: "Prime Elite Exterior",
        packageId: "prime-elite-exterior",
        getPrice: (vt) => getPriceForService("prime-elite-exterior", vt),
        description: "Clay bar decontamination and advanced protection",
        category: "Exterior"
    },
    {
        id: "paint-correction",
        name: "Paint Correction",
        packageId: "paint-correction",
        getPrice: (vt) => getPriceForService("paint-correction", vt),
        description: "Remove swirls and restore clarity",
        category: "Exterior"
    }
];

// Recommendation Engine for Client Evaluation
export function generateEvaluationRecommendations(
    complaints: string[],
    goals: string[],
    customComplaint?: string,
    customGoal?: string
): string[] {
    const recommendations = new Set<string>();

    // Complaint-based recommendations
    complaints.forEach(complaint => {
        switch (complaint) {
            case "Stains":
            case "Carpet Stains":
            case "Seat Stains":
            case "Sticky Spills":
            case "Mud / Dirt buildup":
                recommendations.add("essential-interior");
                break;
            case "Bad Odor":
            case "Smoke Smell":
            case "Mold / Mildew":
                recommendations.add("odor-treatment");
                recommendations.add("essential-interior");
                break;
            case "Scratches":
            case "Dull or Faded Paint":
                recommendations.add("elite-exterior");
                break;
            case "Pet Hair":
                recommendations.add("pet-hair-removal");
                recommendations.add("essential-interior");
                break;
            case "Water Spots":
                recommendations.add("elite-exterior");
                break;
        }
    });

    // Goal-based recommendations
    goals.forEach(goal => {
        switch (goal) {
            case "Fast Turnaround":
            case "Budget Friendly":
                recommendations.add("essential-full");
                break;
            case "Deep Interior Cleaning":
                recommendations.add("elite-interior");
                recommendations.add("odor-treatment");
                break;
            case "Maximum Shine":
            case "Long-Term Protection":
                recommendations.add("elite-exterior");
                break;
            case "Odor Removal":
                recommendations.add("odor-treatment");
                recommendations.add("elite-interior");
                break;
            case "Pet Hair Removal":
                recommendations.add("pet-hair-removal");
                recommendations.add("essential-interior");
                break;
            case "Restoration-Level Detail":
            case "Best Possible Outcome":
            case "Premium Detail / High-End Finish":
                recommendations.add("elite-full");
                recommendations.add("engine-bay");
                break;
        }
    });

    // Custom text analysis
    const customText = `${customComplaint || ""} ${customGoal || ""}`.toLowerCase();
    if (customText.includes("scratch") || customText.includes("swirl")) {
        recommendations.add("paint-correction");
        recommendations.add("elite-exterior");
    }
    if (customText.includes("smell") || customText.includes("odor")) {
        recommendations.add("odor-treatment");
    }
    if (customText.includes("stain")) {
        recommendations.add("elite-interior");
    }
    if (customText.includes("pet") || customText.includes("hair")) {
        recommendations.add("pet-hair-removal");
    }

    return Array.from(recommendations);
}

// Generate evaluation script WITH ACCURATE PRICING
export function generateEvaluationScript(
    clientName: string,
    complaints: string[],
    goals: string[],
    services: EvaluationService[],
    customComplaint?: string,
    customGoal?: string,
    vehicleType?: VehicleType // Add vehicle type parameter
): string {
    let script = `Hi ${clientName},\n\n`;

    // Acknowledge complaints
    if (complaints.length > 0 || customComplaint) {
        script += "Based on what you've mentioned — specifically ";
        const allComplaints = [...complaints];
        if (customComplaint) allComplaints.push(customComplaint);

        if (allComplaints.length === 1) {
            script += `the ${allComplaints[0].toLowerCase()}`;
        } else if (allComplaints.length === 2) {
            script += `the ${allComplaints[0].toLowerCase()} and ${allComplaints[1].toLowerCase()}`;
        } else {
            const last = allComplaints[allComplaints.length - 1];
            const others = allComplaints.slice(0, -1);
            script += `the ${others.map(c => c.toLowerCase()).join(", ")}, and ${last.toLowerCase()}`;
        }
        script += " issues";
    }

    // Acknowledge goals
    if (goals.length > 0 || customGoal) {
        if (complaints.length > 0 || customComplaint) {
            script += " — and considering your goal";
        } else {
            script += "Considering your goal";
        }

        const allGoals = [...goals];
        if (customGoal) allGoals.push(customGoal);

        if (allGoals.length === 1) {
            script += ` of ${allGoals[0].toLowerCase()}`;
        } else {
            script += `s of ${allGoals.map(g => g.toLowerCase()).join(", ")}`;
        }
    }

    script += ", I recommend the following services:\n\n";

    // List recommended services WITH ACCURATE PRICING
    let total = 0;
    services.forEach(service => {
        const priceInfo = service.getPrice(vehicleType);
        const displayPrice = priceInfo.priceRange || `$${priceInfo.price}`;
        script += `• ${service.name} (${displayPrice}) - ${service.description}\n`;
        total += priceInfo.price;
    });

    // Show total or range
    if (vehicleType) {
        script += `\nTotal Investment: $${total}\n\n`;
    } else {
        script += `\nEstimated Total: $${total}+ (depends on vehicle size)\n`;
        script += `💡 Exact pricing available once we know your vehicle type\n\n`;
    }

    // Closing
    script += "This combination will fully address the issues you described and help you achieve your desired outcome. ";
    script += "These services work together to provide comprehensive care for your vehicle. ";
    script += "Would you like to proceed with this package, or would you prefer to discuss any specific services in more detail?";

    return script;
}
