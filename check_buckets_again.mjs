import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data: b1 } = await supabase.storage.getBucket('customer-photos');
    console.log("customer-photos:", b1);
    const { data: b2 } = await supabase.storage.getBucket('images');
    console.log("images:", b2);
    const { data: b3 } = await supabase.storage.getBucket('public');
    console.log("public:", b3);
}
run();
