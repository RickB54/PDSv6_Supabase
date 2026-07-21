import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function run() {
    const { data: bookings } = await supabase.from('bookings').select('id, customer_id, customer, assignedEmployee, assigned_employee_id');
    console.log("Bookings:", bookings?.map(b => b.customer));
}
run();
