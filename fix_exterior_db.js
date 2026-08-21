import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_EXTERIOR = [
    { slot: 1, name: "Dark Fury", ratio: "4:1", purpose: "Wheels & Tires Cleaner (All Levels)" },
    { slot: 2, name: "Road Warrior", ratio: "4:1", purpose: "Bug & Grime Pre-Treat" },
    { slot: 3, name: "Formula 4", ratio: "20:1", purpose: "Drying Aid" },
    { slot: 4, name: "Spray Wax", ratio: "RTU", purpose: "Paint Protection & Shine" },
    { slot: 5, name: "Aqua Gloss", ratio: "4:1", purpose: "Standard Tire Dressing" },
    { slot: 6, name: "Meguiar's APC", ratio: "4:1", purpose: "Heavy Degreaser (Engine Bay)" },
    { slot: 7, name: "Dirt Buster", ratio: "7:1", purpose: "Exterior General Cleaner" },
    { slot: 8, name: "Cover All", ratio: "RTU", purpose: "Tire Dressing (Aerosol)" },
    { slot: "Extra 1", name: "", ratio: "", purpose: "" },
    { slot: "Extra 2", name: "", ratio: "", purpose: "" }
];

async function run() {
  const { data: currentData } = await supabase.from("static_caddy_worksheet").select("*").eq("id", 1).maybeSingle();
  if (currentData) {
      console.log("Restoring exterior to defaults...");
      const { data, error } = await supabase.from("static_caddy_worksheet").upsert({
        id: 1,
        interior: currentData.interior,
        exterior: DEFAULT_EXTERIOR,
        show_extra_slots: currentData.show_extra_slots,
        updated_at: new Date().toISOString()
      }).select();

      if (error) {
        console.error("Write error:", error);
      } else {
        console.log("Write success!");
      }
  }
}

run();
