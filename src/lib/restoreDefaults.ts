import { upsert as upsertPackage } from "../services/supabase/packages";
import { upsert as upsertAddOn } from "../services/supabase/addOns";
import { servicePackages, addOns } from "@/lib/services";
import localforage from "localforage";

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
      } catch { }
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
      } catch { }
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

// Helper to construct pricing map key
const getKey = (type: "package" | "addon", id: string, size: string) => `${type}:${id}:${size}`;

export async function restorePackages() {
  try {
    // 1. Restore to Supabase
    for (const pkg of servicePackages) {
      await upsertPackage([{
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        compact_price: pkg.pricing.compact,
        midsize_price: pkg.pricing.midsize,
        truck_price: pkg.pricing.truck,
        luxury_price: pkg.pricing.luxury,
        is_active: true,
      }]);
    }

    // 2. Clear deletion flags and restore visibility for all built-in packages
    const packageMeta = JSON.parse(localStorage.getItem('packageMeta') || '{}');
    servicePackages.forEach(pkg => {
      // Remove deleted flag and ensure visible
      if (packageMeta[pkg.id]) {
        delete packageMeta[pkg.id].deleted;
        packageMeta[pkg.id].visible = true;
      } else {
        packageMeta[pkg.id] = { id: pkg.id, visible: true };
      }
    });
    localStorage.setItem('packageMeta', JSON.stringify(packageMeta));

    // 3. Restore to Local State (savedPrices)
    const currentSaved = (await localforage.getItem<Record<string, string>>("savedPrices")) || {};
    const updated = { ...currentSaved };

    servicePackages.forEach(p => {
      updated[getKey("package", p.id, "compact")] = String(p.pricing.compact);
      updated[getKey("package", p.id, "midsize")] = String(p.pricing.midsize);
      updated[getKey("package", p.id, "truck")] = String(p.pricing.truck);
      updated[getKey("package", p.id, "luxury")] = String(p.pricing.luxury);
    });

    await localforage.setItem("savedPrices", updated);

    // 3. Sync to Backend/Live
    try {
      await fetch("http://localhost:6061/api/packages/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn("Live sync failed (non-critical)", err);
    }

    window.dispatchEvent(new CustomEvent("content-changed", { detail: { kind: "packages" } }));
    try { await fetch("/api/pricing/live", { method: "GET" }); } catch { }

  } catch (e) {
    console.error("restorePackages error", e);
    throw e;
  }
}

export async function restoreAddons() {
  try {
    // 1. Restore to Supabase
    for (const addon of addOns) {
      await upsertAddOn([{
        id: addon.id,
        name: addon.name,
        description: addon.description,
        compact_price: addon.pricing.compact,
        midsize_price: addon.pricing.midsize,
        truck_price: addon.pricing.truck,
        luxury_price: addon.pricing.luxury,
        is_active: true,
      }]);
    }

    // 2. Clear deletion flags and restore visibility for all built-in add-ons
    const addOnMeta = JSON.parse(localStorage.getItem('addOnMeta') || '{}');
    addOns.forEach(addon => {
      // Remove deleted flag and ensure visible
      if (addOnMeta[addon.id]) {
        delete addOnMeta[addon.id].deleted;
        addOnMeta[addon.id].visible = true;
      } else {
        addOnMeta[addon.id] = { id: addon.id, visible: true };
      }
    });
    localStorage.setItem('addOnMeta', JSON.stringify(addOnMeta));

    // 3. Restore to Local State (savedPrices)
    const currentSaved = (await localforage.getItem<Record<string, string>>("savedPrices")) || {};
    const updated = { ...currentSaved };

    addOns.forEach(a => {
      updated[getKey("addon", a.id, "compact")] = String(a.pricing.compact);
      updated[getKey("addon", a.id, "midsize")] = String(a.pricing.midsize);
      updated[getKey("addon", a.id, "truck")] = String(a.pricing.truck);
      updated[getKey("addon", a.id, "luxury")] = String(a.pricing.luxury);
    });

    await localforage.setItem("savedPrices", updated);

    // 3. Sync to Backend/Live
    try {
      await fetch("http://localhost:6061/api/packages/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn("Live sync failed (non-critical)", err);
    }

    window.dispatchEvent(new CustomEvent("content-changed", { detail: { kind: "packages" } })); // Addons also trigger package/pricing updates
    try { await fetch("/api/pricing/live", { method: "GET" }); } catch { }

  } catch (e) {
    console.error("restoreAddons error", e);
    throw e;
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

  // Restore both Packages and Addons
  await restorePackages();
  await restoreAddons();
}
