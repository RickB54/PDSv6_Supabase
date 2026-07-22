import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeBrandon() {
    console.log("Wiping Brandon's records...");
    
    // 1. Delete tax_expenses (Payroll category)
    const { data: exp, error: err1 } = await supabase
        .from('tax_expenses')
        .delete()
        .ilike('vendor', '%Brandon%');
    console.log("Tax expenses deleted:", err1 ? err1 : "Success");

    console.log("Done.");
}

wipeBrandon();
