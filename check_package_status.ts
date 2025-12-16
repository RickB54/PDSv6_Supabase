
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

async function checkPackage() {
    console.log('Checking status of "premium-detail" in Supabase...');

    const { data, error } = await supabase
        .from('packages')
        .select('id, name, is_active')
        .eq('id', 'premium-detail');

    if (error) {
        console.error('Error fetching package:', error);
    } else {
        console.log('Package Data:', data);
        if (data && data.length > 0) {
            console.log(`is_active is: ${data[0].is_active}`);
        } else {
            console.log('Package "premium-detail" not found in DB.');
        }
    }
}

checkPackage();
