import { upsert as upsertPackage } from "../services/supabase/packages";
import { upsert as upsertAddOn } from "../services/supabase/addOns";

// Local API helpers
const api = {
  // Vehicle types
  async seedVehicleTypes() {
    try {
      const res = await fetch("/api/vehicle-types", { method: "GET" });
      const data = await res.json();
      const existing = Array.isArray(data?.data) ? data.data : [];
      const baseTypes = [
        {
          id: "compact",
          name: "Compact",
          description: "Small cars and coupes",
          size: "compact",
          multiplier: 1,
          is_active: true,
        },
        {
          id: "midsize",
          name: "Midsize",
          description: "Sedans and crossovers",
          size: "midsize",
          multiplier: 1.15,
          is_active: true,
        },
        {
          id: "truck",
          name: "Truck/SUV",
          description: "Pickup trucks and full-sized SUVs",
          size: "truck",
          multiplier: 1.3,
          is_active: true,
        },
        {
          id: "luxury",
          name: "Luxury/Exotic",
          description: "High-end and exotic vehicles",
          size: "luxury",
          multiplier: 1.5,
          is_active: true,
        },
      ];

      // Insert any missing base types
      for (const vt of baseTypes) {
        if (!existing.find((e: any) => e.id === vt.id)) {
          await fetch("/api/vehicle-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vt),
          });
        }
      }

      // Push live sync
      try {
        await fetch("/api/vehicle-types/live", { method: "GET" });
      } catch {}
    } catch (e) {
      console.error("seedVehicleTypes error", e);
    }
  },

  // FAQs
  async seedFaqs() {
    try {
      // Reset to defaults via local API helper
      await fetch("/api/faqs/reset", { method: "POST" });
      // Dispatch browser event so listeners refresh
      window.dispatchEvent(
        new CustomEvent("content-changed", { detail: { kind: "faqs" } })
      );
    } catch (e) {
      console.error("seedFaqs error", e);
    }
  },

  // Contact info
  async seedContact() {
    try {
      await fetch("/api/contact/reset", { method: "POST" });
      window.dispatchEvent(
        new CustomEvent("content-changed", { detail: { kind: "contact" } })
      );
      // Push live
      try {
        await fetch("/api/contact/live", { method: "GET" });
      } catch {}
    } catch (e) {
      console.error("seedContact error", e);
    }
  },

  // About sections, features, testimonials
  async seedAbout() {
    try {
      await fetch("/api/about/reset", { method: "POST" });
      await fetch("/api/features/reset", { method: "POST" });
      await fetch("/api/testimonials/reset", { method: "POST" });
      window.dispatchEvent(
        new CustomEvent("content-changed", { detail: { kind: "about" } })
      );
    } catch (e) {
      console.error("seedAbout error", e);
    }
  },
};

// Pricing defaults for packages and add-ons mapped to Supabase schema
const defaultPackages: Array<{
  id: string;
  name: string;
  description?: string;
  compact_price?: number;
  midsize_price?: number;
  truck_price?: number;
  luxury_price?: number;
}> = [
  {
    id: "basic-wash",
    name: "Basic Wash",
    description: "Exterior hand wash and dry",
    compact_price: 35,
    midsize_price: 40,
    truck_price: 50,
    luxury_price: 60,
  },
  {
    id: "full-detail",
    name: "Full Detail",
    description: "Interior and exterior deep clean",
    compact_price: 199,
    midsize_price: 229,
    truck_price: 259,
    luxury_price: 299,
  },
  {
    id: "ceramic-coating",
    name: "Ceramic Coating",
    description: "Multi-year paint protection",
    compact_price: 799,
    midsize_price: 899,
    truck_price: 1099,
    luxury_price: 1299,
  },
];

const defaultAddOns: Array<{
  id: string;
  name: string;
  description?: string;
  compact_price?: number;
  midsize_price?: number;
  truck_price?: number;
  luxury_price?: number;
}> = [
  {
    id: "pet-hair",
    name: "Pet Hair Removal",
    description: "Remove embedded pet hair from interior",
    compact_price: 35,
    midsize_price: 45,
    truck_price: 55,
    luxury_price: 65,
  },
  {
    id: "headlight-restoration",
    name: "Headlight Restoration",
    description: "Polish and seal headlight lenses",
    compact_price: 60,
    midsize_price: 60,
    truck_price: 60,
    luxury_price: 60,
  },
  {
    id: "ozone-treatment",
    name: "Ozone Treatment",
    description: "Eliminate persistent interior odors",
    compact_price: 99,
    midsize_price: 99,
    truck_price: 119,
    luxury_price: 139,
  },
];

async function seedPricingSupabase() {
  try {
    // Upsert packages
    for (const pkg of defaultPackages) {
      await upsertPackage(pkg);
    }
    // Upsert add-ons
    for (const addon of defaultAddOns) {
      await upsertAddOn(addon);
    }
  } catch (e) {
    console.warn("Supabase pricing upsert failed (optional)", e);
  }
}

async function seedPricingLocal() {
  try {
    // Push the local pricing payload to the live sync API used by BookNow
    const payload = {
      packages: defaultPackages,
      addOns: defaultAddOns,
    };
    await fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Trigger listeners and live sync
    window.dispatchEvent(
      new CustomEvent("content-changed", { detail: { kind: "packages" } })
    );
    try {
      await fetch("/api/pricing/live", { method: "GET" });
    } catch {}
  } catch (e) {
    console.error("seedPricingLocal error", e);
  }
}

export async function restoreDefaults(): Promise<void> {
  // Seed website content
  await Promise.all([
    api.seedVehicleTypes(),
    api.seedFaqs(),
    api.seedContact(),
    api.seedAbout(),
  ]);

  // Seed pricing both locally and Supabase (if configured)
  await seedPricingLocal();
  await seedPricingSupabase();
}

