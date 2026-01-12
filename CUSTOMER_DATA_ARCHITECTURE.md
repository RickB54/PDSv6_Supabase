# Customer Data Architecture - DO NOT MODIFY

## ⚠️ CRITICAL: Single Source of Truth

All customer and prospect pages MUST use the same data source to prevent data inconsistencies.

### Current Architecture (WORKING - DO NOT CHANGE)

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  customers   │              │  app_users   │            │
│  │  (CRM data)  │              │  (Auth data) │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         getSupabaseCustomers() - Single Data Source         │
│              Located in: src/lib/supa-data.ts               │
└─────────────────────────────────────────────────────────────┘
                          ▼
        ┌─────────────────┴─────────────────┐
        ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Users & Roles│  │  Prospects   │  │  Customers   │
│     Page     │  │    Page      │  │    Page      │
│              │  │              │  │              │
│ Shows ALL    │  │ Filters by   │  │ Filters by   │
│ users        │  │ type='       │  │ type='       │
│              │  │ prospect'    │  │ customer'    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Rules to NEVER Break

### 1. Data Source Rules
- ✅ **DO**: Use `getSupabaseCustomers()` for all customer/prospect data
- ❌ **DON'T**: Use `getUnifiedCustomers()` - it has complex deduplication bugs
- ❌ **DON'T**: Create new data fetching functions without documenting here

### 2. Database Schema Rules
- ✅ Photos are stored in `customers` table (general_photos, before_photos, after_photos)
- ❌ Photos are NOT in `vehicles` table
- ✅ Vehicle data is in `vehicles` table (make, model, year, type, color, vin)
- ✅ Customer type field uses lowercase: 'customer' or 'prospect'

### 3. Filtering Rules
```typescript
// ✅ CORRECT - Prospects Page
const prospects = list.filter(c => {
  const customerType = (c.type || '').toLowerCase();
  return customerType === 'prospect';
});

// ✅ CORRECT - Customers Page
const customers = list.filter(c => {
  const customerType = (c.type || '').toLowerCase();
  return customerType === 'customer';
});
```

### 4. Users & Roles Page - PROTECTED
⚠️ **NEVER MODIFY** `src/pages/UserManagement.tsx` data fetching logic
- This page is the source of truth
- It correctly merges CRM and Auth data
- Any changes must be tested against this page

## What Changed (History)

### 2026-01-11 - Permanent Fix
**Problem**: Prospects and Customers pages showed 0 records
**Root Cause**: SQL query tried to fetch photo columns from vehicles table (they don't exist there)
**Fix**: 
1. Removed photo columns from vehicles join in getSupabaseCustomers()
2. Unified all pages to use getSupabaseCustomers() instead of getUnifiedCustomers()
3. Simplified deduplication to use only ID and Email matching

**Files Modified**:
- `src/lib/supa-data.ts` - Fixed SQL query
- `src/pages/Prospects.tsx` - Now uses getSupabaseCustomers()
- `src/pages/SearchCustomer.tsx` - Now uses getSupabaseCustomers()

## Testing Checklist

Before deploying ANY changes to customer data logic:

1. ✅ Check Users & Roles page shows all 6 users correctly
2. ✅ Check Prospects page shows 3 prospects (Jen, Forrest, Serge)
3. ✅ Check Customers page shows 1 customer (Rick)
4. ✅ Verify no SQL errors in browser console
5. ✅ Verify all pages use getSupabaseCustomers()
6. ✅ Test add/edit/delete on both Prospects and Customers pages

## Emergency Recovery

If data goes missing again:

1. **DON'T PANIC** - Data is in Supabase, not lost
2. Check browser console for SQL errors
3. Verify `getSupabaseCustomers()` query matches this schema:
   ```sql
   SELECT *, 
          vehicles(id, make, model, year, type, color, vin)
   FROM customers
   ```
4. Verify Pages use `getSupabaseCustomers()` NOT `getUnifiedCustomers()`
5. Check Users & Roles - if data shows there, it's a filtering issue

## Contact
If you need to modify this architecture, document changes here first.
