# Users & Roles Page - Customers & Prospects Separation

## Summary of Changes

### 1. ✅ Fixed `loadCustomers` to Include `type` Field
- Now fetches: `id, full_name, email, phone, type, created_at`
- This enables the badge colors to show properly

### 2. ✅ Added Separate Filtering
- `filteredCustomers` - Only shows records where `type !== 'prospect'`
- `filteredProspects` - Only shows records where `type === 'prospect'`

### 3. ✅ Updated Stats Header (5 Cards)
- Admins (Amber)
- Employees (Blue)
- **Customers (Purple)** - Shows `filteredCustomers.length`
- **Prospects (Orange)** - Shows `filteredProspects.length`
- Total Users (Emerald)

### 4. ✅ Updated Subtitle
- Changed from: "Admin • Employees • Customers"
- Changed to: "Admin • Employees • Customers • Prospects"

---

## Next Steps (To Complete)

### 5. ⏳ Remove Type Column from Customers Table
Since we're separating them into different sections, we don't need the Type badge in the Customers table anymore.

**Change:**
- Remove "Type" column header
- Remove Type badge cell
- Update colspan from 6 to 5

### 6. ⏳ Update Customer Edit Button
**Current:** Goes to `/search-customer?id=${c.id}`
**Keep as is** - This is correct!

### 7. ⏳ Create Separate Prospects Section
Add a new section after Customers with:
- Orange theme (matching stats card)
- "Prospects" title
- Search bar
- "Add New Prospect" accordion
- Prospects table with columns: Name, Email, Phone, Registered, Actions
- Edit button goes to `/prospects` page
- Delete button (same as customers)

---

## Color Scheme

| Section | Primary Color | Badge/Icon Color |
|---------|--------------|------------------|
| Admins | Amber | 🟡 `text-amber-400` |
| Employees | Blue | 🔵 `text-blue-400` |
| Customers | Purple | 🟣 `text-purple-400` |
| **Prospects** | **Orange** | **🟠 `text-orange-400`** |
| Total | Emerald | 🟢 `text-emerald-400` |

---

## Page Structure (Final)

```
Users & Roles
├── Refresh Button
├── Stats (5 cards)
│   ├── Admins (🟡)
│   ├── Employees (🔵)
│   ├── Customers (🟣)
│   ├── Prospects (🟠) ← NEW
│   └── Total (🟢)
├── Administrators Section
│   ├── Add New Administrator (accordion)
│   └── Admins Table
├── Active Employees Section
│   ├── Onboard New Employee (accordion)
│   └── Employees Table
├── Customers Section (🟣)
│   ├── Add New Customer (accordion)
│   └── Customers Table (NO Type column)
│       └── Edit → /search-customer
└── Prospects Section (🟠) ← NEW
    ├── Add New Prospect (accordion)
    └── Prospects Table
        └── Edit → /prospects
```

---

## Benefits

✅ **Clear Separation** - Customers and Prospects are in different sections
✅ **Consistent Navigation** - Edit buttons go to the right pages
✅ **Color Coded** - Easy to identify each section
✅ **No Confusion** - No more Type badges needed
✅ **Better Organization** - Each section is self-contained

---

## Implementation Status

- [x] Load `type` field from database
- [x] Filter customers and prospects separately
- [x] Update stats to show 5 cards
- [x] Update subtitle
- [ ] Remove Type column from Customers table
- [ ] Create Prospects section
- [ ] Update edit button navigation for prospects

---

**The colored badges will now show properly because we're fetching the `type` field!** 🎉

**Next: I'll complete the remaining changes to fully separate Customers and Prospects.**
