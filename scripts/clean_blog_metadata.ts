import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function cleanBlogMetadata() {
    console.log('🧹 Cleaning blog post metadata...\n');

    // Fetch all blog items
    const { data: posts, error } = await supabase
        .from('learning_library_items')
        .select('*');

    if (error) {
        console.error('❌ Error fetching posts:', error);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log('No posts found.');
        return;
    }

    console.log(`Found ${posts.length} posts. Cleaning metadata...\n`);

    for (const post of posts) {
        let needsUpdate = false;
        let cleanedDescription = post.description || '';
        let cleanedContent = post.content || '';

        // Remove metadata pattern from description
        if (cleanedDescription.includes('[meta:')) {
            cleanedDescription = cleanedDescription.replace(/\[meta:[^\]]+\]\s*/g, '').trim();
            needsUpdate = true;
        }

        // Remove metadata pattern from content
        if (cleanedContent.includes('[meta:')) {
            cleanedContent = cleanedContent.replace(/\[meta:[^\]]+\]\s*/g, '').trim();
            needsUpdate = true;
        }

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('learning_library_items')
                .update({
                    description: cleanedDescription,
                    content: cleanedContent
                })
                .eq('id', post.id);

            if (updateError) {
                console.error(`❌ Failed to update "${post.title}":`, updateError.message);
            } else {
                console.log(`✅ Cleaned "${post.title}"`);
            }
        }
    }

    console.log('\n✨ Metadata cleanup complete!');
}

cleanBlogMetadata();
