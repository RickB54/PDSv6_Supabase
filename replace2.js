const fs = require('fs');
let code = fs.readFileSync('src/lib/supa-data.ts', 'utf8');

// Replace blockDemo
const idx1 = code.indexOf('const blockDemo = (action: string) => {');
if (idx1 !== -1) {
    const end1 = code.indexOf('};', idx1) + 2;
    code = code.substring(0, idx1) +
\const blockDemo = (action: string, entityName?: string) => {
    if (entityName === 'Rick Berube Test' || entityName === 'Rick Berube') return false;
    if (isDemoActive()) {
        window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action } }));
        return true;
    }
    return false;
};\ + code.substring(end1);
}

// Replace upsertSupabaseCustomer
const str2 = 'export const upsertSupabaseCustomer = async (customer: Partial<Customer> & { type?: string }) => {';
const idx2 = code.indexOf(str2);
if (idx2 !== -1) {
    const end2 = code.indexOf(';', idx2 + str2.length) + 1; // finds the first semi-colon
    const origLine = code.substring(idx2, end2);
    // Find the return line
    code = code.replace(
        'if (blockDemo(\'customer update\')) return { ...customer, id: customer.id || \demo_c_\\ };',
        'if (blockDemo(\'customer update\', customer.name || customer.full_name)) return { ...customer, id: customer.id || \demo_c_\\ };'
    );
}

// Replace upsertSupabaseInvoice
const str3 = 'export const upsertSupabaseInvoice = async (invoice: any) => {';
const idx3 = code.indexOf(str3);
if (idx3 !== -1) {
    code = code.replace(
        'if (isDemoActive()) return { ...invoice, id: invoice.id || \demo_inv_\\ };',
        'if (isDemoActive() && invoice.customerName !== \'Rick Berube Test\' && invoice.customerName !== \'Rick Berube\') return { ...invoice, id: invoice.id || \demo_inv_\\ };'
    );
}

fs.writeFileSync('src/lib/supa-data.ts', code);
