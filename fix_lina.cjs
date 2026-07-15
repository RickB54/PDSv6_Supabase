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

async function run() {
    const targetEstNumber = '607091548';
    const { data: est, error } = await supabase.from('estimates').select('*').eq('estimate_number', targetEstNumber).single();
    
    // Calculate correct total from services
    let rawTotal = 0;
    if (est.services && Array.isArray(est.services)) {
        est.services.forEach(s => {
            if (s.price && !s.name.startsWith('VIRTUAL_')) {
                rawTotal += Number(s.price);
            }
        });
    }

    const newNotes = `[MENU_MODE]
[HIDE_VEHICLE_SUBTOTALS]
[SHOW_CATEGORY_SUBTOTALS]
Thank you for reaching out, Lina! It was great speaking with you.
Below you will find individual pricing options for each of your vehicles. This estimate is designed as a MENU — each vehicle is listed separately with three package tiers to choose from:
✦ EXTERIOR ONLY — Outside wash, decontamination, tire shine & protection
✦ INTERIOR ONLY — Full interior detail - vacuum, protection & cleaning
✦ FULL DETAIL   — Complete exterior + interior package (best value)
HOW TO READ THIS ESTIMATE: Look at each vehicle section (e.g., '--- 2021 Ford Bronco ---') and pick ONE of the three price lines that fits your needs for that vehicle. You do NOT pay all three — just the one you select per vehicle!
PLEASE NOTE: The pricing below reflects our standard rates for each service tier. Since this covers multiple vehicles I haven't yet inspected in person, I'll do a quick walk-around of each one before your appointment to confirm everything lines up — this just accounts for things like heavier dirt, pet hair, or extra buildup that can vary car to car. Any adjustment (if needed at all) will be confirmed with you before I start any work, so there won't be surprises.
A NOTE ON VEHICLE #6: I have pricing below for 5 of your vehicles. When you accept this estimate, please use the Special Requests / Notes field to send me the year/make/model of your 6th vehicle so I can get you an accurate quote for that one too!
ON SCHEDULING: As I mentioned on the phone, I'll be bringing on some extra help for weekend availability, which will let us knock out all 6 vehicles much faster than my usual solo pace. To build the right schedule for you, let me know in the Notes field what timeline works best for your family — for example, do you need all 6 done by a specific date, or would spreading them across a couple of weekends work fine?
TO ACCEPT: Click the ACCEPT button below. On the acceptance form, you'll see each vehicle listed with its own dropdown — please select which package (Exterior Only, Interior Only, or Full Detail) you'd like for each vehicle individually before submitting. Once you've made your selections, use the Special Requests / Notes field at the bottom for your 6th vehicle's info and your preferred timeline, and I'll confirm everything before your appointment.
Questions? Call or text me anytime at 978-566-1008.
— Rick Berube | Prime Auto Detail`;

    // 2. Update Lina's estimate
    const { error: updateError } = await supabase.from('estimates').update({
        status: 'sent',
        total: rawTotal,
        notes: newNotes
    }).eq('id', est.id);
    
    if (updateError) {
        console.error("Error updating estimate:", updateError);
    } else {
        console.log("AFTER ESTIMATE:", JSON.stringify({ id: est.id, status: 'sent', total: rawTotal, notes: newNotes }, null, 2));
    }

    // 3. Find and delete engagements
    const { data: eng, error: engErr } = await supabase.from('engagements').select('*').ilike('customer_name', '%Lina Ochoa-Hunter%').ilike('note', '%ACCEPTED%');
    if (!engErr && eng && eng.length > 0) {
        for (const e of eng) {
            await supabase.from('engagements').delete().eq('id', e.id);
            console.log(`DELETED ENGAGEMENT: ${e.id}`);
        }
    }
}
run();
