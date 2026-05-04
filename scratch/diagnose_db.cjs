
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log("--- PACKAGES TABLE ---");
  const { data: pkgData, error: pkgError } = await supabase.from('packages').select('*').limit(1);
  if (pkgError) console.error("Packages Error:", pkgError);
  else console.log("Columns:", Object.keys(pkgData[0] || {}));

  console.log("\n--- ADD_ONS TABLE ---");
  const { data: addData, error: addError } = await supabase.from('add_ons').select('*').limit(1);
  if (addError) console.error("AddOns Error:", addError);
  else console.log("Columns:", Object.keys(addData[0] || {}));
}

diagnose();
