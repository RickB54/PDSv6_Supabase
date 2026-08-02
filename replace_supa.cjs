const fs = require('fs');
let code = fs.readFileSync('src/lib/supa-data.ts', 'utf8');

// 1. blockDemo
const idx1 = code.indexOf('const blockDemo = (action: string) => {');
if (idx1 !== -1) {
    const end1 = code.indexOf('};', idx1) + 2;
    code = code.substring(0, idx1) +
`const blockDemo = (action: string, entityName?: string) => {
    if (entityName === 'Rick Berube Test' || entityName === 'Rick Berube') return false;
    if (isDemoActive()) {
        window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action } }));
        return true;
    }
    return false;
};` + code.substring(end1);
}

// 2. upsertSupabaseCustomer
code = code.replace(
    'if (blockDemo(\'customer update\')) return { ...customer, id: customer.id || `demo_c_${Date.now()}` };',
    'if (blockDemo(\'customer update\', customer.name || customer.full_name)) return { ...customer, id: customer.id || `demo_c_${Date.now()}` };'
);

// 3. upsertSupabaseInvoice
code = code.replace(
    'if (isDemoActive()) return { ...invoice, id: invoice.id || `demo_inv_${Date.now()}` };',
    'if (isDemoActive() && invoice.customerName !== \'Rick Berube Test\' && invoice.customerName !== \'Rick Berube\') return { ...invoice, id: invoice.id || `demo_inv_${Date.now()}` };'
);

// 4. Also maybe update upsertSupabaseBooking just in case?
// No, the user only asked about quick pay.

fs.writeFileSync('src/lib/supa-data.ts', code);
