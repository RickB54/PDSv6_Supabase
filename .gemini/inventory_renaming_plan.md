# Inventory Category Renaming Implementation Plan

## Overview
Renaming inventory categories system-wide:
- **Tools → Equipment**
- **Materials → Supplies**  
- **Chemicals** (unchanged)

## Status: PARTIALLY COMPLETE

### ✅ Completed Changes

#### 1. UnifiedInventoryModal.tsx
- ✅ Updated `Mode` type to include both old and new names for backward compatibility
- ✅ Renamed interfaces: `MaterialForm` → `SupplyForm`, `ToolForm` → `EquipmentForm`
- ✅ Added mode normalization function to map legacy names
- ✅ Updated unit option arrays: `materialUnits` → `supplyUnits`, `toolUnits` → `equipmentUnits`
- ✅ Updated all mode checks throughout the component to handle both old and new names
- ✅ Updated dialog title: "Add/Edit Tool" → "Add/Edit Equipment", "Add/Edit Material" → "Add/Edit Supply"
- ✅ Updated section headers: "Tool Details" → "Equipment Details"
- ✅ Updated tax expense category logic

### 🔄 In Progress / Remaining Changes

#### 2. InventoryControl.tsx (Main Page)
**Status:** NOT STARTED
**Required Changes:**
- Update type aliases (line 35-36):
  ```typescript
  type Equipment = inventoryData.Tool; // Alias for backward compat
  type Supply = inventoryData.Material; // Alias for backward compat
  ```
- Update state variable names and types
- Update all section headers:
  - "Tools" → "Equipment" (line ~686)
  - "Materials" → "Supplies" (line ~585)
- Update button labels:
  - "Add Tool" → "Add Equipment"
  - "Add Material" → "Add Supply"
- Update modal mode calls:
  - `openAddTool()` → `openAddEquipment()` (or keep function name but pass 'equipment')
  - `openAddMaterial()` → `openAddSupply()` (or keep function name but pass 'supply')
- Update all `mode` parameters in `openEdit()` calls
- Update table headers and labels
- Update mobile card view labels

#### 3. inventory-data.ts (Data Layer)
**Status:** NOT STARTED
**Required Changes:**
- Add type aliases for backward compatibility:
  ```typescript
  export type Equipment = Tool; // Backward compat alias
  export type Supply = Material; // Backward compat alias
  ```
- Keep existing function names (`saveTool`, `getMaterials`, etc.) for database compatibility
- Add comment headers explaining the naming

#### 4. InventoryImportModal.tsx
**Status:** NOT STARTED  
**Required Changes:**
- Update tab names: "Materials" → "Supplies", "Tools" → "Equipment"
- Add legacy name mapping in import logic:
  ```typescript
  const normalizeCategory = (cat: string) => {
    if (cat.toLowerCase() === 'material' || cat.toLowerCase() === 'materials') return 'supply';
    if (cat.toLowerCase() === 'tool' || cat.toLowerCase() === 'tools') return 'equipment';
    return cat;
  };
  ```
- Update UI labels and instructions
- Update validation messages

#### 5. Reports.tsx
**Status:** NOT STARTED
**Required Changes:**
- Update inventory report section labels
- Update any filters or dropdowns that reference categories
- Update chart/graph labels if applicable

#### 6. Help Documentation (helpData.ts)
**Status:** NOT STARTED
**Required Changes:**
- Update help text references from "Tools" to "Equipment"
- Update help text references from "Materials" to "Supplies"
- Update any screenshots or examples in help content

#### 7. MaterialsUsedModal.tsx (Checklist Component)
**Status:** NOT STARTED
**Required Changes:**
- Rename component to `SuppliesUsedModal.tsx` (optional, for consistency)
- Update all internal references and labels
- Update modal title: "Materials Used" → "Supplies Used"

#### 8. Budget/Accounting Components
**Status:** NOT STARTED
**Required Changes:**
- Update InventoryExpensesTab.tsx labels
- Update any category filters or groupings
- Ensure tax expense categories use "Equipment" and "Supplies"

#### 9. consumptionTracker.ts
**Status:** NOT STARTED
**Required Changes:**
- Update any category references in tracking logic
- Update log messages and comments

#### 10. inventory-ai.ts
**Status:** NOT STARTED
**Required Changes:**
- Update AI prompts and responses to use new terminology
- Update category classification logic

### 📋 Testing Checklist

After all changes are complete, test:

- [ ] Add new Chemical - verify it saves correctly
- [ ] Add new Supply (formerly Material) - verify it saves correctly  
- [ ] Add new Equipment (formerly Tool) - verify it saves correctly
- [ ] Edit existing items - verify they load and save correctly
- [ ] Import inventory with legacy column names ("Material", "Tool") - verify auto-mapping works
- [ ] Import inventory with new column names ("Supply", "Equipment") - verify it works
- [ ] View inventory reports - verify labels are correct
- [ ] Check usage history - verify category references are correct
- [ ] Verify tax expense tracking uses correct categories
- [ ] Check all mobile views for correct labels
- [ ] Verify help documentation is updated

### 🔧 Database Considerations

**IMPORTANT:** The database tables remain unchanged:
- `chemicals` table (unchanged)
- `materials` table (NOT renamed - stays as is)
- `tools` table (NOT renamed - stays as is)

The renaming is **UI/UX only**. The data layer functions (`saveMaterial`, `saveTool`, etc.) continue to work with the existing database schema. This ensures:
- No data migration needed
- No breaking changes to existing data
- Full backward compatibility

### 📝 Notes

1. **Mode Normalization Pattern:**
   All components that accept a `mode` prop should normalize it:
   ```typescript
   const normalizeMode = (m: Mode): Mode => {
     if (m === 'material') return 'supply';
     if (m === 'tool') return 'equipment';
     return m;
   };
   ```

2. **Conditional Checks Pattern:**
   Always check for both old and new names:
   ```typescript
   if (mode === 'equipment' || mode === 'tool') {
     // Equipment-specific logic
   }
   if (mode === 'supply' || mode === 'material') {
     // Supply-specific logic
   }
   ```

3. **Type Aliases:**
   Use type aliases for clarity while maintaining compatibility:
   ```typescript
   type Equipment = Tool;
   type Supply = Material;
   ```

## Next Steps

1. Continue with InventoryControl.tsx updates
2. Update all importer components
3. Update reports and analytics
4. Update help documentation
5. Run full testing suite
6. Update any API documentation if applicable
