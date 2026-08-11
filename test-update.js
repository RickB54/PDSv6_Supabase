import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('chemicals').select('*');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  console.log(`Fetched ${data.length} chemicals.`);
  
  if (data.length > 0) {
    // Try to update one as a test
    const testId = data[0].id;
    const { data: updateData, error: updateError } = await supabase.from('chemicals')
      .update({ notes: 'test RLS update' })
      .eq('id', testId)
      .select();
      
    if (updateError) {
      console.error('RLS Blocked Update:', updateError);
    } else {
      console.log('Update successful, RLS allows it!', updateData);
    }
  }
}

run();
