const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf-8');

const toPatch = [
  'deleteEstimate',
  'deleteInvoice',
  'deleteExpense',
  'upsertSubContractor',
  'deleteSubContractor',
  'upsertClientUpsell',
  'deleteClientUpsell',
  'upsertClientEvaluation',
  'deleteClientEvaluation',
  'upsertDetailingVendor',
  'deleteDetailingVendor'
];

toPatch.forEach(fn => {
  const regex = new RegExp('(export async function ' + fn + '[^{]*\\{)');
  const match = content.match(regex);
  if (match) {
    if (!content.includes("blockDemo('" + fn + "')")) {
      const isUpsert = fn.startsWith('upsert');
      let retVal = isUpsert ? ' arguments[0] as any;' : ' return;';
      let injection = '\\n  if (blockDemo(\\'' + fn + '\\')) return' + retVal;
      
      content = content.replace(regex, match[1] + injection);
    }
  }
});

fs.writeFileSync('src/lib/db.ts', content);
