import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data, error } = await supabase.from('app_users').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
    }
}
run();
