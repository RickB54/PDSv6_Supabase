import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data: bookings } = await supabase.from('bookings').select('*');
    console.log("Bookings:", bookings?.length, bookings?.map(b => b.customer));
    
    const { data: estimates } = await supabase.from('estimates').select('*');
    console.log("Estimates:", estimates?.length, estimates?.map(e => e.customer_name));

    const { data: payroll } = await supabase.from('payroll_records').select('*');
    console.log("Payroll:", payroll?.length);
    
    const { data: customers } = await supabase.from('customers').select('*');
    console.log("Customers:", customers?.length);

    const { data: app_users } = await supabase.from('app_users').select('*');
    console.log("App Users:", app_users?.length);
}
run();
