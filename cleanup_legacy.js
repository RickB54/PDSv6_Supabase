import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    const legacyIds = [
        'basic-exterior', 'express-wax', 'full-exterior', 'interior-cleaning', 'full-detail', 'premium-detail'
    ];

    console.log('Archiving legacy packages in Supabase...', legacyIds);
    const { error } = await supabase
        .from('packages')
        .update({ is_active: false })
        .in('id', legacyIds);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Successfully archived legacy packages.');
    }
}

cleanup();
