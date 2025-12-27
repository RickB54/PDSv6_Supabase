# Employee Permissions & Customer Intake Update

## Summary of Changes

### ✅ **What Was Updated:**

1. **Menu Structure** - Customer Intake section now available to employees
2. **Employee Permissions** - Clarified what employees can and cannot do
3. **Help Documentation** - Comprehensive updates for employee workflows
4. **Prospects Workflow** - Employees capture leads, admins convert to customers

---

## **Menu Changes:**

### **Customer Intake Section (Now Available to Employees):**
- ✅ Package Comparison
- ✅ Vehicle Classification
- ✅ Client Evaluation
- ✅ Addon Upsell Script
- ✅ **Prospects** (moved from Operations)

### **Operations Section:**
- ✅ Staff Schedule
- ✅ Bookings
- ✅ Analytics
- ✅ Service Checklist
- ✅ Tasks
- ✅ Customer Profiles (view-only for employees)
- ✅ **Users & Roles** (admin-only)

---

## **Employee Permissions:**

### **✅ Employees CAN:**
- View Customer Profiles (read-only)
- Add Prospects (full access)
- Use all Customer Intake tools
- Search for customers
- View customer vehicles
- View booking history
- Start service checklists

### **❌ Employees CANNOT:**
- Create customers (use Prospects instead)
- Edit customer information
- Delete customers
- Access Users & Roles page
- Access Company Employees page
- Manage user accounts

---

## **The New Employee Workflow:**

### **Scenario 1: Walk-In Prospect**
```
Potential customer shows interest
         ↓
Employee opens Prospects page
         ↓
Adds: Name, Phone, Vehicle Interest
         ↓
Saves as Prospect
         ↓
Admin reviews and converts when they book
```

### **Scenario 2: Existing Customer**
```
Customer arrives for appointment
         ↓
Employee opens Customer Profiles
         ↓
Searches by name/phone (view-only)
         ↓
Views customer details
         ↓
Starts service checklist
```

### **Scenario 3: Customer Consultation**
```
Customer asks about services
         ↓
Employee opens Customer Intake tools
         ↓
Uses Package Comparison to show options
         ↓
Uses Addon Upsell Script for add-ons
         ↓
Uses Vehicle Classification for pricing
```

---

## **Help Documentation Updates:**

### **New Employee Help Topics:**

1. **Customer Intake Tools**
   - Overview of all 5 tools
   - When to use each tool
   - How they help with sales

2. **Prospects**
   - How to add prospects
   - Employee role vs admin role
   - Workflow explanation
   - Pro tips

3. **Customer Profiles (Updated)**
   - Clarified view-only access
   - What employees can do
   - What employees cannot do
   - When to use Prospects instead

4. **Employee Dashboard (Updated)**
   - Added Customer Intake tools reference
   - Changed "Add Customer" to "Add Prospect"

---

## **Benefits:**

### **For Employees:**
✅ Clear tools for customer interactions
✅ Can capture walk-in leads immediately
✅ Professional sales tools at their fingertips
✅ No confusion about permissions
✅ Simple, focused workflow

### **For Admins:**
✅ Control over customer creation
✅ Review prospects before converting
✅ Maintain data quality
✅ Security and compliance
✅ Track lead sources

### **For the Business:**
✅ Don't lose walk-in leads
✅ Professional customer interactions
✅ Consistent sales process
✅ Better lead tracking
✅ Improved conversion rates

---

## **What Shows in Employee Menu:**

```
📱 Employee Menu
├── Employee Dashboard
├── 👥 Customer Intake (NEW!)
│   ├── Package Comparison
│   ├── Vehicle Classification
│   ├── Client Evaluation
│   ├── Addon Upsell Script
│   └── Prospects
├── 📋 Operations
│   ├── Staff Schedule
│   ├── Bookings
│   ├── Analytics
│   ├── Service Checklist
│   ├── Tasks
│   └── Customer Profiles (view-only)
├── 🎓 Prime Training Center
├── 📰 Company Blog
└── ⚙️ Settings
```

**Hidden from Employees:**
- ❌ Users & Roles
- ❌ Company Employees
- ❌ Website Administration
- ❌ Finance & Sales
- ❌ Inventory & Assets
- ❌ Staff Management

---

## **Testing Checklist:**

### **As Employee:**
- [ ] Can see Customer Intake in menu
- [ ] Can access all 5 Customer Intake tools
- [ ] Can add prospects
- [ ] Can view (but not edit) Customer Profiles
- [ ] Cannot see Users & Roles
- [ ] Cannot see Company Employees
- [ ] Help shows correct employee permissions

### **As Admin:**
- [ ] Can see everything employees see
- [ ] Plus Users & Roles
- [ ] Plus Company Employees
- [ ] Plus all admin-only features
- [ ] Help shows full admin documentation

---

## **Key Points to Remember:**

💡 **Employees capture leads** - Admins convert to customers
💡 **Customer Profiles is view-only** for employees
💡 **Customer Intake tools** help employees sell professionally
💡 **Prospects page** is the employee's customer creation tool
💡 **Help documentation** explains everything clearly

---

## **Files Modified:**

1. ✅ `src/components/menu-config.ts` - Menu structure
2. ✅ `src/components/help/helpData.ts` - Help documentation

---

**Everything is now configured for proper employee permissions and workflows!** 🎉

**Employees have the tools they need to:**
- Capture leads (Prospects)
- Guide customers (Customer Intake tools)
- Look up customers (Customer Profiles view-only)
- Do their job effectively

**Admins maintain control over:**
- Customer creation
- User management
- Data quality
- System configuration
