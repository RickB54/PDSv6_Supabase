import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_INTERIOR = [
    { slot: 1, name: "Pink Perfection", ratio: "10:1", purpose: "Standard Interior Plastics/Vinyl" },
    { slot: 2, name: "Pink Perfection", ratio: "4:1", purpose: "Heavy Interior Cleaner" },
    { slot: 3, name: "Carpet Bomber", ratio: "7:1", purpose: "Standard Fabric/Carpet/Seats" },
    { slot: 4, name: "Carpet Bomber", ratio: "5:1", purpose: "Heavy Fabric/Carpet" },
    { slot: 5, name: "P&S Xpress", ratio: "3:1", purpose: "Light Satin Finish" },
    { slot: 6, name: "P&S Xpress", ratio: "1:1", purpose: "Strong Satin Finish" },
    { slot: 7, name: "Terminator", ratio: "RTU", purpose: "Odors & Stains" },
    { slot: 8, name: "Dirt Buster", ratio: "10:1", purpose: "General Interior Cleaner" },
    { slot: "Extra 1", name: "", ratio: "", purpose: "" },
    { slot: "Extra 2", name: "", ratio: "", purpose: "" }
];

async function run() {
  console.log("Testing write with objects...");
  const { data, error } = await supabase.from("static_caddy_worksheet").upsert({
    id: 1,
    interior: DEFAULT_INTERIOR,
    exterior: DEFAULT_INTERIOR,
    show_extra_slots: false
  }).select();

  if (error) {
    console.error("Write error:", error);
  } else {
    console.log("Write success!");
  }
}

run();
