import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from("static_caddy_worksheet").select("*").eq("id", 1);
  console.log("Read error:", error);
  console.log("Read success:", JSON.stringify(data, null, 2));
}

run();
