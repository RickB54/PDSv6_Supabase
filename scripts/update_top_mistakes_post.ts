import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function updateTopMistakesPost() {
    console.log('🔍 Finding "Top Mistakes" blog post...\n');

    // Find the post
    const { data: posts, error: fetchError } = await supabase
        .from('learning_library_items')
        .select('*')
        .ilike('title', '%Top Mistakes%Washing%');

    if (fetchError || !posts || posts.length === 0) {
        console.error('❌ Could not find the post:', fetchError);
        return;
    }

    const post = posts[0];
    console.log(`Found post: "${post.title}"\n`);

    // Expanded content covering all 5 mistakes from the infographic
    const expandedContent = `Your car is one of your biggest investments, and keeping it clean is essential for maintaining its value and appearance. However, many car owners unknowingly damage their vehicle's finish while trying to keep it clean. Here are the most common car washing mistakes people make—and how to avoid them to protect your paint and keep your car looking showroom-ready.

**1. WASHING IN DIRECT SUNLIGHT ☀️**

One of the most common mistakes is washing your car under direct sunlight or when the surface is hot. When you wash in the sun, the soap and water dry too quickly, leaving behind unsightly water spots, streaks, and soap residue that can be difficult to remove.

**Why this is a problem:** As water evaporates rapidly in the heat, minerals in the water are left behind, creating hard water spots that etch into your paint. Soap that dries on the surface can also leave streaks and create an uneven finish.

**The fix:** Always wash your car in the shade or during cooler parts of the day, such as early morning or late afternoon. If you can't find shade, work in sections and rinse each area immediately after washing to prevent soap and water from drying on the surface.

**2. USING DISH SOAP 🧴**

Many people reach for dish soap thinking it will cut through dirt and grime effectively. While dish soap is great for dishes, it's terrible for your car's paint. Dish detergents are formulated to strip away grease and oils—including the protective wax, sealants, and ceramic coatings on your vehicle.

**Why this is a problem:** Stripping away your car's protective layers leaves the paint vulnerable to UV damage, oxidation, and environmental contaminants. Over time, this accelerates paint degradation and dulls your finish.

**The fix:** Always use a pH-balanced car wash soap specifically designed for automotive paint. These products are formulated to clean effectively without removing protective coatings, and they often contain lubricants that help prevent scratching.

**3. CIRCULAR WASHING MOTIONS 🔄**

You might think circular motions help "scrub" the dirt off, but this washing technique is one of the biggest culprits behind swirl marks and fine scratches that become visible in direct light.

**Why this is a problem:** Circular motions trap dirt particles against the paint and grind them in multiple directions, creating visible swirl marks that reflect light in a spiderweb pattern. These imperfections are especially noticeable on dark-colored vehicles.

**The fix:** Always wash in straight, linear motions following the lines of the car. Use a two-bucket method (one for soapy water, one for rinsing your mitt) and rinse your wash mitt frequently to remove trapped dirt particles. This technique minimizes the risk of scratching and keeps your paint looking flawless.

**4. DIRTY SPONGES 🧽**

Reusing dirty sponges or wash mitts without proper cleaning is like using sandpaper on your paint. Sponges trap dirt, debris, and small rocks from previous washes, and when you reuse them, those particles act like abrasives that scratch and damage your paint.

**Why this is a problem:** Even a small piece of debris trapped in your sponge can create deep scratches as you drag it across the surface. Traditional sponges also lack the deep fibers needed to safely capture and release dirt particles.

**The fix:** Use a high-quality microfiber wash mitt instead of a sponge. Microfiber has deep, soft fibers that lift dirt away from the surface and are easy to clean. Rinse your mitt thoroughly after every wash, and replace it regularly. Better yet, use the two-bucket method and rinse your mitt in the clean water bucket after every panel.

**5. IMPROPER DRYING TECHNIQUES 💨**

How you dry your car is just as important as how you wash it. Many people make the mistake of using old bath towels, rough rags, or even letting the car air dry, which can introduce scratches and leave water spots all over the finish.

**Why this is a problem:** Rough or dirty towels create micro-scratches as you wipe the surface. Air drying allows water to evaporate naturally, leaving behind mineral deposits that etch into the paint. Even small water droplets can magnify sunlight and create spots.

**The fix:** Always use a clean, high-quality microfiber drying towel designed for automotive use. Gently blot the surface to absorb water rather than rubbing aggressively. For best results, use a forced-air dryer or leaf blower to remove water from crevices, mirrors, and trim without ever touching the paint.

**BONUS TIP: PROTECT YOUR INVESTMENT**

After washing your car the right way, consider applying a quality wax, sealant, or ceramic coating to add a protective barrier against the elements. Regular maintenance washes using professional techniques will keep your vehicle looking newer for longer and help maintain its resale value.

**Need Professional Help?**

If you want to ensure your car gets the care it deserves without the risk of damage, consider professional detailing services. At Prime Auto Detail, we use professional-grade products, proper techniques, and the latest equipment to deliver showroom results—without the risk of swirl marks, scratches, or damage.

**Protect your investment with proper care!**`;

    // Update the post
    const { error: updateError } = await supabase
        .from('learning_library_items')
        .update({
            title: 'Top Mistakes People Make When Washing Their Car at Home',
            description: expandedContent,
            content: expandedContent,
            resource_url: 'https://kqhaoyaermsqrilhsfxj.supabase.co/storage/v1/object/public/customer-photos/wrong_way_car_wash.png',
            thumbnail_url: 'https://kqhaoyaermsqrilhsfxj.supabase.co/storage/v1/object/public/customer-photos/wrong_way_car_wash.png',
            created_at: '2026-02-12T20:21:00-05:00',
            is_pinned: true,
            sort_order: 1
        })
        .eq('id', post.id);

    if (updateError) {
        console.error('❌ Update failed:', updateError);
    } else {
        console.log('✅ Successfully updated blog post!');
        console.log('📌 Post is now pinned to the top');
        console.log('📅 Date set to today (2026-02-12)');
        console.log('🖼️ New image applied');
        console.log('📝 Content expanded significantly');
    }
}

updateTopMistakesPost();
