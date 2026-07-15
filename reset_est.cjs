const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
    if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    }
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
// We will try updating. It might fail if RLS prevents anon from updating.
// Wait, the CustomerEstimatePage does anon update! So it should work!
supabase.from('estimates').update({
    status: 'pending',
    notes: '[MENU_MODE]\n[HIDE_VEHICLE_SUBTOTALS]\n[SHOW_CATEGORY_SUBTOTALS]'
}).eq('id', 'b8314ebd-eabe-455f-8601-65a3954a71dc').then(r => {
    console.log(r);
}).catch(console.error);
