import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data: bookings } = await supabase.from('bookings').select('*');
    console.log("Bookings:", bookings?.length);
    if (bookings?.length) console.log(bookings.map(b => b.title || b.customer_id || b.id));

    const { data: payroll } = await supabase.from('payroll_records').select('*');
    console.log("Payroll:", payroll?.length);

    const { data: customers } = await supabase.from('customers').select('*');
    console.log("Customers:", customers?.length);
}
run();
