import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const { data: notes, error } = await supabase.from('personal_notes').select('id, tags');
    if (error) {
        console.error('Error fetching notes:', error);
        return;
    }
    
    let updated = 0;
    for (const note of notes) {
        if (note.tags && Array.isArray(note.tags)) {
            const hasOldTag = note.tags.includes('__sticky_notes__');
            if (hasOldTag) {
                const newTags = note.tags.map(t => t === '__sticky_notes__' ? '__sticky-notes__' : t);
                const { error: updateError } = await supabase.from('personal_notes').update({ tags: newTags }).eq('id', note.id);
                if (updateError) {
                    console.error('Error updating note:', note.id, updateError);
                } else {
                    updated++;
                }
            }
        }
    }
    console.log(`Successfully migrated ${updated} notes.`);
}

runMigration();
