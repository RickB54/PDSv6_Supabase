import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpload() {
  const { data, error } = await supabase.storage.from('training-documents').upload('test.txt', 'test', { upsert: true });
  console.log('Upload Result:', data, error);
}
testUpload();
