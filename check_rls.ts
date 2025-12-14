
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAccess() {
    console.log('Checking access to packages table...');
    const { data, error } = await supabase.from('packages').select('id, name, is_active').limit(5);

    if (error) {
        console.error('Error fetching packages:', error);
    } else {
        console.log('Successfully fetched packages:', data);
    }

    console.log('Checking access to add_ons table...');
    const { data: addons, error: error2 } = await supabase.from('add_ons').select('id, name, is_active').limit(5);
    if (error2) {
        console.error('Error fetching addons:', error2);
    } else {
        console.log('Successfully fetched addons:', addons);
    }
}

checkAccess();
