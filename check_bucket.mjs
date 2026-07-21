import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data, error } = await supabase.storage.getBucket('employee-photos');
    console.log("Bucket:", data, error);
}
run();
