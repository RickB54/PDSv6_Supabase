import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data } = await supabase.from('app_users').select('documents_on_file').limit(1);
    console.log("documents_on_file type:", typeof data?.[0]?.documents_on_file, data?.[0]?.documents_on_file);
}
run();
