# How to Run the Customer Data Validation Script

## Quick Start

1. **Open your browser** and navigate to any page in your app (http://localhost:6066)

2. **Open Browser Console:**
   - Press `F12` OR
   - Right-click → "Inspect" → "Console" tab

3. **Copy and paste this code** into the console and press Enter:

```javascript
// Quick validation
const { getSupabaseCustomers } = await import('/src/lib/supa-data.ts');
const all = await getSupabaseCustomers();
const prospects = all.filter(c => c.type?.toLowerCase() === 'prospect');
const customers = all.filter(c => c.type?.toLowerCase() === 'customer');

console.log(`✅ Total Users: ${all.length}`);
console.log(`✅ Prospects: ${prospects.length} (${prospects.map(p => p.name).join(', ')})`);
console.log(`✅ Customers: ${customers.length} (${customers.map(c => c.name).join(', ')})`);
```

## Expected Results

You should see:
```
✅ Total Users: 6
✅ Prospects: 3 (Jen, Forrest Thompson, Serge Michaud)
✅ Customers: 1 (Rick)
```

## What to Do If Numbers Don't Match

1. **Check Users & Roles page first** - if data shows there, it's just a filtering issue
2. **Look for red error messages** in the console
3. **Check for SQL errors** - look for "column does not exist" or "400 Bad Request"
4. **Refer to** `CUSTOMER_DATA_ARCHITECTURE.md` for recovery steps

## Full Validation (Optional)

For a more comprehensive test, open the file `validate-customer-data.js` and copy the entire contents into the browser console. This will run all 6 validation tests.

## When to Run This

- ✅ After making changes to customer data logic
- ✅ If prospects/customers pages show 0 records
- ✅ After pulling updates from GitHub
- ✅ Weekly as a health check
