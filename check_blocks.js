import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBlocks() {
    console.log('Fetching availability_blocks for Jan 31st...');
    const { data, error } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('date', '2026-01-31');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Blocks found for 1/31:', JSON.stringify(data, null, 2));
    }

    console.log('\nFetching all recent blocks...');
    const { data: allData, error: allErr } = await supabase
        .from('availability_blocks')
        .select('*')
        .gte('date', '2026-01-01')
        .order('date');

    if (allErr) {
        console.error('Error:', allErr);
    } else {
        console.log('Total blocks count since Jan 1:', allData?.length);
        console.log('All blocks:', JSON.stringify(allData, null, 2));
    }
}

checkBlocks();
