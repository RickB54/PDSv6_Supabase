// Client Evaluation Data Structures

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
    price: number;
    description: string;
    category: string;
}

export const EVALUATION_SERVICES: EvaluationService[] = [
    { id: "carpet-extraction", name: "Carpet Extraction", price: 75, description: "Deep clean carpets and remove embedded stains", category: "Interior" },
    { id: "ozone-treatment", name: "Ozone Odor Treatment", price: 100, description: "Eliminate odors at the molecular level", category: "Interior" },
    { id: "paint-correction", name: "Paint Correction", price: 300, description: "Remove scratches and swirl marks", category: "Exterior" },
    { id: "pet-hair-removal", name: "Pet Hair Removal Add-On", price: 50, description: "Thorough pet hair extraction", category: "Interior" },
    { id: "express-interior", name: "Express Interior Detail", price: 120, description: "Quick but thorough interior cleaning", category: "Interior" },
    { id: "polish-wax", name: "Polish & Wax", price: 150, description: "Restore shine and add protection", category: "Exterior" },
    { id: "ceramic-coating", name: "Ceramic Coating", price: 500, description: "Long-term paint protection", category: "Exterior" },
    { id: "leather-conditioning", name: "Leather Conditioning", price: 80, description: "Restore and protect leather surfaces", category: "Interior" },
    { id: "headlight-restoration", name: "Headlight Restoration", price: 60, description: "Clear foggy headlights", category: "Exterior" },
    { id: "engine-bay-detail", name: "Engine Bay Detail", price: 90, description: "Clean and dress engine compartment", category: "Engine" },
    { id: "full-interior-detail", name: "Full Interior Detail", price: 200, description: "Complete interior restoration", category: "Interior" },
    { id: "clay-bar-treatment", name: "Clay Bar Treatment", price: 75, description: "Remove contaminants from paint", category: "Exterior" }
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
                recommendations.add("carpet-extraction");
                recommendations.add("full-interior-detail");
                break;
            case "Bad Odor":
            case "Smoke Smell":
                recommendations.add("ozone-treatment");
                recommendations.add("full-interior-detail");
                break;
            case "Scratches":
                recommendations.add("paint-correction");
                recommendations.add("polish-wax");
                break;
            case "Pet Hair":
                recommendations.add("pet-hair-removal");
                recommendations.add("full-interior-detail");
                break;
            case "Mud / Dirt buildup":
                recommendations.add("full-interior-detail");
                recommendations.add("carpet-extraction");
                break;
            case "Water Spots":
                recommendations.add("clay-bar-treatment");
                recommendations.add("polish-wax");
                break;
            case "Dull or Faded Paint":
                recommendations.add("paint-correction");
                recommendations.add("polish-wax");
                recommendations.add("ceramic-coating");
                break;
            case "Mold / Mildew":
                recommendations.add("ozone-treatment");
                recommendations.add("full-interior-detail");
                break;
            case "Sticky Spills":
                recommendations.add("full-interior-detail");
                recommendations.add("carpet-extraction");
                break;
        }
    });

    // Goal-based recommendations
    goals.forEach(goal => {
        switch (goal) {
            case "Fast Turnaround":
                recommendations.add("express-interior");
                break;
            case "Deep Interior Cleaning":
                recommendations.add("full-interior-detail");
                recommendations.add("carpet-extraction");
                recommendations.add("ozone-treatment");
                break;
            case "Budget Friendly":
                recommendations.add("express-interior");
                recommendations.add("polish-wax");
                break;
            case "Maximum Shine":
                recommendations.add("paint-correction");
                recommendations.add("polish-wax");
                recommendations.add("ceramic-coating");
                break;
            case "Long-Term Protection":
                recommendations.add("ceramic-coating");
                recommendations.add("leather-conditioning");
                break;
            case "Odor Removal":
                recommendations.add("ozone-treatment");
                recommendations.add("full-interior-detail");
                break;
            case "Pet Hair Removal":
                recommendations.add("pet-hair-removal");
                recommendations.add("full-interior-detail");
                break;
            case "Restoration-Level Detail":
                recommendations.add("paint-correction");
                recommendations.add("full-interior-detail");
                recommendations.add("engine-bay-detail");
                break;
            case "Best Possible Outcome":
            case "Premium Detail / High-End Finish":
                recommendations.add("paint-correction");
                recommendations.add("ceramic-coating");
                recommendations.add("full-interior-detail");
                recommendations.add("leather-conditioning");
                break;
        }
    });

    // Custom text analysis
    const customText = `${customComplaint || ""} ${customGoal || ""}`.toLowerCase();
    if (customText.includes("scratch") || customText.includes("swirl")) {
        recommendations.add("paint-correction");
    }
    if (customText.includes("smell") || customText.includes("odor")) {
        recommendations.add("ozone-treatment");
    }
    if (customText.includes("stain")) {
        recommendations.add("carpet-extraction");
    }
    if (customText.includes("pet") || customText.includes("hair")) {
        recommendations.add("pet-hair-removal");
    }

    return Array.from(recommendations);
}

// Generate evaluation script
export function generateEvaluationScript(
    clientName: string,
    complaints: string[],
    goals: string[],
    services: EvaluationService[],
    customComplaint?: string,
    customGoal?: string
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

    // List recommended services
    services.forEach(service => {
        script += `• ${service.name} ($${service.price}) - ${service.description}\n`;
    });

    const total = services.reduce((sum, s) => sum + s.price, 0);
    script += `\nTotal Investment: $${total}\n\n`;

    // Closing
    script += "This combination will fully address the issues you described and help you achieve your desired outcome. ";
    script += "These services work together to provide comprehensive care for your vehicle. ";
    script += "Would you like to proceed with this package, or would you prefer to discuss any specific services in more detail?";

    return script;
}
