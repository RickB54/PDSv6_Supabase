import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateContent() {
    console.log('--- STARTING 2026 WEBSITE CONTENT MIGRATION ---');

    // 1. VEHICLE TYPES
    const vehicleTypes = [
        { id: 'compact', name: 'Compact/Sedan', description: 'Daily Driver: Small cars and sedans', multiplier: 100, has_pricing: true, is_active: true },
        { id: 'midsize', name: 'Mid-Size/SUV', description: 'Family SUV: Mid-size cars and SUVs', multiplier: 100, has_pricing: true, is_active: true },
        { id: 'truck', name: 'Truck/Van/Large SUV', description: 'Work Truck/Large SUV: Trucks, vans, large SUVs', multiplier: 100, has_pricing: true, is_active: true },
        { id: 'luxury', name: 'Luxury/High-End', description: 'Luxury/Large SUV (3rd Row): Premium and oversized vehicles', multiplier: 100, has_pricing: true, is_active: true },
    ];
    await supabase.from('content_vehicle_types').upsert(vehicleTypes);
    console.log('Vehicle types updated.');

    // 2. CONTACT INFO
    await supabase.from('content_contact').upsert({
        id: 1,
        hours: 'Mon–Sat: 8am – 6pm',
        phone: '321-438-7685',
        address: 'Brevard County, FL (Mobile Detailing)',
        email: 'Rick@PrimeDetailingFL.com'
    });
    console.log('Contact info updated.');

    // 3. FAQS
    const faqs = [
        { question: 'What is the "Essential" vs. "Elite" tier?', answer: 'The Essential tier focuses on maintenance-level care for vehicles in good condition. The Elite tier is a deeper service designed for restoration, paint decontamination, and high-level protection.', sort_order: 1 },
        { question: 'Do you need access to water or power?', answer: 'We are a fully mobile detailing unit. We carry our own filtered water and power, so we can detail your vehicle almost anywhere—at home, at work, or even at the gym!', sort_order: 2 },
        { question: 'How long does a detail take?', answer: 'It depends on the package and vehicle size. Essential services typically take 1.5–4 hours, while Elite services range from 4–6+ hours for a full restoration.', sort_order: 3 },
    ];
    await supabase.from('content_faqs').delete().gte('id', 0); // Clear old FAQs
    await supabase.from('content_faqs').insert(faqs);
    console.log('FAQs updated.');

    // 4. ABOUT
    const about = [
        { section_title: 'Our Mission', content: 'Our mission is to provide the highest-quality mobile detailing services in Brevard County. We treat every vehicle with the same care and precision as if it were our own, ensuring showroom-ready results and long-lasting protection.', sort_order: 1 },
        { section_title: 'Mobile Convenience', content: 'We bring the detail shop to you. Our fully equipped mobile units carry filtered water, power, and the highest-grade professional products, allowing us to perform premium detailing right in your driveway.', sort_order: 2 },
    ];
    await supabase.from('content_about').delete().gte('id', 0);
    await supabase.from('content_about').insert(about);
    console.log('About sections updated.');

    // 5. TESTIMONIALS
    const testimonials = [
        { name: 'John D.', quote: 'My SUV looks brand new. The Elite Full Detail removed stains I thought were permanent. Amazing!', role: 'SUV Owner', sort_order: 1 },
        { name: 'Sarah M.', quote: 'Best mobile service in Brevard. The Prime Essential package is perfect for keeping my car tidy every month.', role: 'Sedan Owner', sort_order: 2 },
    ];
    await supabase.from('content_testimonials').delete().gte('id', 0);
    await supabase.from('content_testimonials').insert(testimonials);
    console.log('Testimonials updated.');

    // 6. SERVICE DISCLAIMER
    await supabase.from('content_services_meta').upsert({
        key: 'disclaimer',
        description: 'Paint Protection & Ceramic Coating NOT included in Essential packages. We do NOT offer biological cleanup or emergency services. All prices are estimates based on standard vehicle conditions.'
    });
    console.log('Service disclaimer updated.');

    console.log('--- MIGRATION COMPLETE ---');
}

migrateContent();
