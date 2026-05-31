const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';
const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` };

async function check() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/content_services_meta?key=eq.ricks_chemical_tips_v3&select=meta`, { headers });
  const data = await r.json();
  const descriptions = data[0]?.meta?.descriptions || [];
  
  const targetIds = [
    'a1000002-0000-0000-0000-000000000002', // APC
    'a1000005-0000-0000-0000-000000000005', // Armor All Wheel
    'a1000007-0000-0000-0000-000000000007', // Cerakote
    'a1000008-0000-0000-0000-000000000008', // Black Wax
    'a1000012-0000-0000-0000-000000000012', // Dark Fury
    'a1000015-0000-0000-0000-000000000015', // EZ Shine
    'a1000023-0000-0000-0000-000000000023', // Muscle Magic
    'a1000034-0000-0000-0000-000000000034', // Total Interior
    'a1000037-0000-0000-0000-000000000037', // Zap It
  ];
  
  console.log("Total descriptions stored:", descriptions.length);
  for (const id of targetIds) {
     const found = descriptions.find(d => d.id === id);
     console.log(`ID ${id}: Found? ${!!found}`);
  }
}
check();
