const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const leakingFiles = [];
walkDir('src/pages', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const hasDB = content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'");
  const hasSupa = content.includes('from "@/lib/supa-data"') || content.includes("from '@/lib/supa-data'");
  const hasSupabase = content.includes('from "@/lib/supabase"') || content.includes("from '@/lib/supabase'");
  
  if (hasDB || hasSupa || hasSupabase) {
    const hasDemoCheck = content.includes('useDemoMode');
    if (!hasDemoCheck) {
      leakingFiles.push(filePath);
    }
  }
});
console.log('UNGUARDED PAGES WITH DB ACCESS:', leakingFiles);
