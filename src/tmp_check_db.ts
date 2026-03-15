
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: library } = await supabase.from('chemical_library').select('name, brand');
    const { data: inventory } = await supabase.from('chemicals').select('name, brand');
    
    console.log('--- LIBRARY ---');
    console.log(library);
    console.log('--- INVENTORY ---');
    console.log(inventory);
}

check();
