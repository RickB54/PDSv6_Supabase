import { UPSELL_SERVICES, UpsellService } from "@/data/upsell_data";

/**
 * Mock AI recommendation engine that maps complaints and goals to relevant upsell services
 */
export function generateRecommendations(
    complaints: string[],
    goals: string[],
    customComplaint?: string,
    customGoal?: string
): string[] {
    const recommendations = new Set<string>();

    // Map complaints to services
    const complaintMap: Record<string, string[]> = {
        "Stains": ["stain_treatment", "interior_deep"],
        "Scratches": ["scratch_repair", "paint_correction"],
        "Bad odor": ["odor_removal", "interior_deep"],
        "Dust buildup": ["interior_deep"],
        "Water spots": ["paint_correction"],
        "Faded paint": ["paint_correction", "ceramic"],
        "Mold or mildew": ["odor_removal", "interior_deep"],
        "Pet hair": ["pet_hair", "interior_deep"],
        "Dull paint": ["paint_correction", "ceramic"]
    };

    complaints.forEach(complaint => {
        const services = complaintMap[complaint];
        if (services) {
            services.forEach(s => recommendations.add(s));
        }
    });

    // Map goals to services
    const goalMap: Record<string, string[]> = {
        "Fast turnaround": [], // No specific upsells for speed
        "Deep interior cleaning": ["interior_deep", "stain_treatment", "odor_removal"],
        "Budget-friendly service": [], // Recommend fewer services
        "Eco-friendly products": ["eco_package"],
        "Premium detailing finish": ["ceramic", "paint_correction", "engine_detail"],
        "Paint enhancement": ["paint_correction", "ceramic"],
        "Odor elimination": ["odor_removal"],
        "Long-term protection": ["ceramic"]
    };

    goals.forEach(goal => {
        const services = goalMap[goal];
        if (services) {
            services.forEach(s => recommendations.add(s));
        }
    });

    // Analyze custom text for keywords
    const customText = `${customComplaint || ""} ${customGoal || ""}`.toLowerCase();

    const keywordMap: Record<string, string> = {
        "ceramic": "ceramic",
        "coating": "ceramic",
        "protection": "ceramic",
        "scratch": "scratch_repair",
        "paint": "paint_correction",
        "smell": "odor_removal",
        "odor": "odor_removal",
        "stink": "odor_removal",
        "stain": "stain_treatment",
        "spot": "stain_treatment",
        "pet": "pet_hair",
        "dog": "pet_hair",
        "cat": "pet_hair",
        "hair": "pet_hair",
        "eco": "eco_package",
        "green": "eco_package",
        "environment": "eco_package",
        "headlight": "headlight_restoration",
        "engine": "engine_detail"
    };

    Object.entries(keywordMap).forEach(([keyword, serviceId]) => {
        if (customText.includes(keyword)) {
            recommendations.add(serviceId);
        }
    });

    return Array.from(recommendations);
}

/**
 * Generate a personalized sales script based on customer data
 */
export function generateScript(
    clientName: string,
    vehicleType: string,
    condition: number,
    complaints: string[],
    goals: string[],
    selectedUpsells: UpsellService[],
    customComplaint?: string,
    customGoal?: string,
    additionalNotes?: string
): string {
    // Build complaints text
    let complaintsText = "";
    if (complaints.length > 0 || customComplaint) {
        const allComplaints = [...complaints];
        if (customComplaint) allComplaints.push(customComplaint);
        complaintsText = allComplaints.join(", ").toLowerCase();
    } else {
        complaintsText = "general wear and tear";
    }

    // Build goals text
    let goalsText = "";
    if (goals.length > 0 || customGoal) {
        const allGoals = [...goals];
        if (customGoal) allGoals.push(customGoal);
        goalsText = allGoals.join(" and ").toLowerCase();
    } else {
        goalsText = "maintaining your vehicle in top condition";
    }

    // Build upsells text
    const upsellsText = selectedUpsells.length > 0
        ? selectedUpsells.map(u => u.name).join(", ")
        : "a customized detailing package";

    // Calculate total price
    const totalPrice = selectedUpsells.reduce((sum, u) => sum + u.price, 0);

    // Generate condition-based intro
    let conditionText = "";
    if (condition <= 2) {
        conditionText = "I can see your vehicle needs some attention. ";
    } else if (condition === 3) {
        conditionText = "Your vehicle is in decent shape, but we can definitely improve it. ";
    } else {
        conditionText = "Your vehicle is in good condition, and we can make it even better. ";
    }

    // Build the script
    let script = `Hi ${clientName}, thank you for choosing us for your ${vehicleType}. `;
    script += conditionText;
    script += `I've noticed ${complaintsText}. `;

    if (goalsText) {
        script += `Since you're looking for ${goalsText}, `;
    }

    script += `I recommend the following services: ${upsellsText}. `;

    if (selectedUpsells.length > 0) {
        script += `\n\nHere's what each service will do for you:\n`;
        selectedUpsells.forEach(service => {
            script += `• ${service.name} ($${service.price}): ${service.description}\n`;
        });
        script += `\nTotal investment: $${totalPrice}`;
    }

    script += `\n\nThese services will address your concerns and help achieve your goals for the vehicle. `;

    if (additionalNotes) {
        script += `\n\nAdditional notes: ${additionalNotes}`;
    }

    script += `\n\nWould you like to proceed with these recommendations?`;

    return script;
}
