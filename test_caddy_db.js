import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Testing write...");
  const { data, error } = await supabase.from("static_caddy_worksheet").upsert({
    id: 1,
    interior: [],
    exterior: [],
    show_extra_slots: true
  }).select();

  if (error) {
    console.error("Write error:", error);
  } else {
    console.log("Write success:", data);
  }

  console.log("Testing read...");
  const { data: readData, error: readError } = await supabase.from("static_caddy_worksheet").select("*").eq("id", 1);
  if (readError) {
    console.error("Read error:", readError);
  } else {
    console.log("Read success:", readData);
  }
}

run();
