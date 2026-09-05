import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: chems } = await supabase.from('chemicals').select('shelf, section');
  const { data: materials } = await supabase.from('materials').select('location, container_location');
  const { data: tools } = await supabase.from('tools').select('location, container_location');
  
  const allShelf = chems?.map(c => c.shelf).filter(Boolean) || [];
  const allSection = chems?.map(c => c.section).filter(Boolean) || [];
  const allMat = materials?.map(m => m.container_location).filter(Boolean) || [];
  const allTool = tools?.map(t => t.container_location).filter(Boolean) || [];
  
  const uniqueContLocs = [...new Set([...allShelf, ...allSection, ...allMat, ...allTool])];
  console.log("\n--- Unique Container Locations in DB ---");
  console.log(uniqueContLocs.sort());
  
  const allMatLoc = materials?.map(m => m.location?.split('|__CL__|')[0]).filter(Boolean) || [];
  const allToolLoc = tools?.map(t => t.location?.split('|__CL__|')[0]).filter(Boolean) || [];
  
  const uniqueLocs = [...new Set([...allMatLoc, ...allToolLoc])];
  console.log("\n--- Unique Primary Locations in DB ---");
  console.log(uniqueLocs.sort());
}
test();
