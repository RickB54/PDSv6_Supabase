import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    console.log("Checking tables...");
    const tables = ['bookings', 'invoices', 'estimates', 'manual_income', 'tax_expenses', 'payroll_records', 'customers'];
    for (const table of tables) {
        const { data, count, error } = await supabase.from(table).select('id', { count: 'exact' }).limit(5);
        console.log(`Table ${table} count:`, count);
        if (data && data.length > 0) {
            console.log(`First few in ${table}:`, data.slice(0, 2));
        }
    }
}
run();
