# Inventory Sync & Badge Fix - Implementation Plan

## **Issue 1: Inventory Not Syncing Across Devices**

### **Problem:**
Inventory is currently stored in **localforage** (browser local storage), which is device-specific. Items added on phone don't appear on PC/tablet.

### **Solution:**
Migrate inventory storage from localforage to Supabase database.

---

## **Issue 2: Inventory Badge Always Shows**

### **Problem:**
The inventory badge in the menu shows a count even when there are no low-stock warnings.

**Current code (line 100):**
```typescript
badge: counts.inventoryCount > 0 ? counts.inventoryCount : undefined
```

This shows the badge whenever `inventoryCount > 0`, which is the total number of items, not low-stock items.

### **Solution:**
Change the badge to only show when there are items below threshold.

---

## **Implementation Steps:**

### **Step 1: Create Supabase Tables for Inventory**

Run this SQL in Supabase SQL Editor:

```sql
-- Create chemicals table
CREATE TABLE IF NOT EXISTS chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bottle_size TEXT,
  cost_per_bottle DECIMAL(10,2),
  threshold INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  subtype TEXT,
  quantity INTEGER DEFAULT 0,
  cost_per_item DECIMAL(10,2),
  notes TEXT,
  low_threshold INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  warranty TEXT,
  purchase_date DATE,
  price DECIMAL(10,2),
  life_expectancy TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_history table
CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chemical_id UUID REFERENCES chemicals(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  service_name TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  remaining_stock INTEGER,
  amount_used TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view their own chemicals" ON chemicals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chemicals" ON chemicals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chemicals" ON chemicals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chemicals" ON chemicals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own materials" ON materials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own materials" ON materials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own materials" ON materials
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own materials" ON materials
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tools" ON tools
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tools" ON tools
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tools" ON tools
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tools" ON tools
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage history" ON usage_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage history" ON usage_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own usage history" ON usage_history
  FOR DELETE USING (auth.uid() = user_id);
```

---

### **Step 2: Migrate Existing Data**

I'll create a migration function in the app that:
1. Reads data from localforage
2. Uploads to Supabase
3. Confirms success
4. Optionally clears localforage

---

### **Step 3: Update InventoryControl.tsx**

Modify the component to:
- Load data from Supabase instead of localforage
- Save data to Supabase instead of localforage
- Real-time sync across devices

---

### **Step 4: Fix Badge Logic**

Update `menu-config.ts` line 100 to only show badge for low-stock items.

---

## **Benefits:**

✅ **Cross-device sync** - Add on phone, see on PC
✅ **Cloud backup** - Data never lost
✅ **Real-time updates** - Changes sync instantly
✅ **Accurate badge** - Only shows when items are low
✅ **Better performance** - Supabase is faster than localforage

---

## **Next Steps:**

1. ✅ Run the SQL to create tables
2. ✅ I'll modify InventoryControl.tsx
3. ✅ I'll fix the badge logic
4. ✅ I'll create a migration tool
5. ✅ Test on multiple devices

---

**Ready to proceed? This will take about 30-45 minutes to implement fully.**
