
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env parser
const env = {};
try {
    const content = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            env[key] = value;
        }
    });
} catch (e) {
    console.log("No .env found or error reading it");
}

const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE vars");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Checking bookings table...");
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success.");
        if (data.length) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("Table exists, but empty.");
            // Check specific expected columns
            console.log("Probing for specific columns...");
            const checkCols = await supabase.from('bookings').select('status, end_time, is_archived, booking_vehicle, add_ons').limit(1);
            if (checkCols.error) {
                console.log("Column check ERROR:", checkCols.error.message);
            } else {
                console.log("Column check SUCCESS: found status, end_time, is_archived, booking_vehicle, add_ons");
            }
        }
    }
}

check();
