
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`Connecting to ${url}...`);

const supabase = createClient(url, key);

async function verify() {
    // 1. Check if we can read app_users
    const { data, error } = await supabase
        .from('app_users')
        .select('*');

    if (error) {
        console.error('Error reading app_users:', error);
        return;
    }

    console.log(`Found ${data.length} users in app_users.`);

    const admin = data.find(u => u.email === 'rberube54@gmail.com');
    const customer = data.find(u => u.email === 'retrorick54@gmail.com');

    if (admin) console.log('Found Admin: rberube54@gmail.com');
    else console.log('MISSING Admin: rberube54@gmail.com');

    if (customer) console.log(`Found Customer: retrorick54@gmail.com (Role: ${customer.role})`);
    else console.log('MISSING Customer: retrorick54@gmail.com');

    if (admin && customer) {
        console.log('SUCCESS: Connected to the correct project.');
    } else {
        console.log('WARNING: Users are missing. Might be wrong project or empty table.');
    }
}

verify();
