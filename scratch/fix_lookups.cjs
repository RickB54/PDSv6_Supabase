const fs = require('fs');
const file = 'c:\\Users\\rberu\\PDSv6_Supabase\\src\\components\\chemicals\\RicksTipsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add getChemDesc helper inside the component, near useMemo definitions
const helperStr = `
  const getChemDesc = (chemId: string) => {
    const chem = availableChemicals.find(c => String(c.id) === String(chemId));
    const searchId = chem?.chemical_library_id || chem?.id || chemId;
    return descriptions.find(d => String(d.id) === String(searchId) || String(d.id) === String(chemId));
  };
`;
// find `const DEFAULT_SCENARIOS = useMemo`
content = content.replace(/const DEFAULT_SCENARIOS = useMemo/, helperStr + '\n  const DEFAULT_SCENARIOS = useMemo');

// 2. Fix currentDesc useMemo
content = content.replace(
  /const found = descriptions\.find\(d => d\.id === selectedChemicalId\);/,
  `const found = getChemDesc(selectedChemicalId);`
);

// 3. Fix updateDescField
content = content.replace(
  /const existingIndex = descriptions\.findIndex\(d => d\.id === selectedChemicalId\);/,
  `
    const chem = availableChemicals.find(c => String(c.id) === String(selectedChemicalId));
    const searchId = chem?.chemical_library_id || chem?.id || selectedChemicalId;
    const existingIndex = descriptions.findIndex(d => String(d.id) === String(searchId) || String(d.id) === String(selectedChemicalId));
  `
);
content = content.replace(
  /newDescs\.push\(\{ \.\.\.currentDesc, \[field\]: value \}\);/,
  `newDescs.push({ ...currentDesc, id: searchId, [field]: value });`
);

// 4. Fix table print
content = content.replace(
  /descriptions\.find\(d => d\.id === c\.id\)\?/g,
  `getChemDesc(c.id)?`
);

// 5. Fix doc print loops and render loops
content = content.replace(
  /const desc = descriptions\.find\(d => d\.id === chem\.id\);/g,
  `const desc = getChemDesc(chem.id);`
);

fs.writeFileSync(file, content);
console.log('Fixed RicksTipsModal.tsx');
