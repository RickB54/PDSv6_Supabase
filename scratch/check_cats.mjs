
const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';
const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` };

// Try inserting with different category values to find what's allowed
const testCats = ['Interior', 'Exterior', 'Paint', 'Detailing', 'Protection', 'Coating', 'Wash', 'Chemical', 'Other'];
for (const cat of testCats) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/chemical_library?select=category&limit=1`, { headers });
  const data = await r.json();
  // Just check existing categories from the 13 we already inserted
  if (Array.isArray(data) && data.length > 0) {
    console.log('Existing categories:', [...new Set(data.map(d => d.category))]);
    break;
  }
}

const r2 = await fetch(`${SUPABASE_URL}/rest/v1/chemical_library?select=category&limit=100`, { headers });
const data2 = await r2.json();
console.log('All categories in DB:', [...new Set((data2||[]).map(d=>d.category))]);
