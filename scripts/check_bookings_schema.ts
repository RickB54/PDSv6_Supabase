
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manually since we are running via node (ts-node might not be setup for this specific path)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY; // or SERVICE_ROLE if needed, but ANON usually has select on info schema maybe?

if (!url || !key) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkSchema() {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        console.log("Error querying bookings:", error);
        // If table doesn't exist, we'll know.
    } else {
        console.log("Bookings table sample query success.");
        if (data.length > 0) {
            console.log("Existing keys:", Object.keys(data[0]));
        } else {
            console.log("Table exists but is empty. Cannot infer columns from data.");
        }
    }

    // Check information schema (this might be blocked by RLS for anon, but worth a try)
    // RPC or raw query is not available via client directly unless rpc is set up.
    // BUT we can try to Insert a dummy row with all keys we want and see if it errors? 
    // No, that's messy.

    // Let's rely on the Select * error or result.
}

checkSchema();
