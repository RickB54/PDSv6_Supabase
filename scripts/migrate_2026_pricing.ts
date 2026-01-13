import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('--- STARTING 2026 PRICING MIGRATION ---');

    // 1. Deactivate all existing 2025 packages
    const { data: existingPackages, error: fetchError } = await supabase
        .from('packages')
        .select('id, name');

    if (fetchError) {
        console.error('Error fetching existing packages:', fetchError);
        return;
    }

    if (existingPackages && existingPackages.length > 0) {
        console.log(`Deactivating ${existingPackages.length} existing packages...`);
        const { error: updateError } = await supabase
            .from('packages')
            .update({ is_active: false })
            .in('id', existingPackages.map(p => p.id));

        if (updateError) {
            console.error('Error deactivating packages:', updateError);
        } else {
            console.log('Successfully deactivated 2025 packages.');
        }
    }

    // 2. Prepare 2026 packages
    const packages2026 = [
        {
            id: 'prime-essential-exterior',
            name: 'Prime Essential Exterior',
            description: 'A high-quality exterior refresh designed to safely remove surface dirt and road grime while enhancing shine and protection. Ideal for regularly maintained vehicles.',
            compact_price: 90,
            midsize_price: 110,
            truck_price: 120,
            luxury_price: 130,
            is_active: true
        },
        {
            id: 'prime-essential-interior',
            name: 'Prime Essential Interior',
            description: 'A maintenance-level interior service designed to refresh vehicles in decent condition. Focuses on cleaning and tidying without deep extraction.',
            compact_price: 180,
            midsize_price: 200,
            truck_price: 210,
            luxury_price: 240,
            is_active: true
        },
        {
            id: 'prime-essential-full',
            name: 'Prime Essential Full Detail',
            description: 'A comprehensive refresh for both exterior and interior, ensuring your vehicle is clean, fresh, and well-maintained.',
            compact_price: 230,
            midsize_price: 270,
            truck_price: 290,
            luxury_price: 320,
            is_active: true
        },
        {
            id: 'prime-elite-exterior',
            name: 'Prime Elite Exterior',
            description: 'Designed to restore and protect paint by removing bonded contaminants and enhancing gloss with ceramic-infused protection.',
            compact_price: 160,
            midsize_price: 180,
            truck_price: 190,
            luxury_price: 210,
            is_active: true
        },
        {
            id: 'prime-elite-interior',
            name: 'Prime Elite Interior',
            description: 'A deep-clean service built for heavily used or neglected interiors. Includes steam cleaning and full extraction.',
            compact_price: 390,
            midsize_price: 475,
            truck_price: 495,
            luxury_price: 590,
            is_active: true
        },
        {
            id: 'prime-elite-full',
            name: 'Prime Elite Full Detail',
            description: 'The ultimate restoration and protection package. Showroom-ready results for every inch of your vehicle.',
            compact_price: 495,
            midsize_price: 595,
            truck_price: 695,
            luxury_price: 850,
            is_active: true
        }
    ];

    console.log('Inserting 2026 packages...');
    const { error: insertError } = await supabase
        .from('packages')
        .upsert(packages2026, { onConflict: 'id' });

    if (insertError) {
        console.error('Error inserting 2026 packages:', insertError);
    } else {
        console.log('Successfully inserted 2026 Pricing Packages.');
    }

    console.log('--- MIGRATION COMPLETE ---');
}

migrate();
