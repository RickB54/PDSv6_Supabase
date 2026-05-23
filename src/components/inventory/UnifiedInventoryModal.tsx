import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import localforage from "localforage";
import { Trash2, Upload, X, ImageIcon, Info, Save, Camera, Beaker, ExternalLink, Plus as PlusIcon, RefreshCw, Sparkles, HelpCircle } from "lucide-react";
import { compressImageForUpload } from "@/lib/image-compression";
import { supabase } from "@/lib/supa-data";
import { getChemicals as getLibraryChemicals, getChemicalById } from "@/lib/chemicals";
import { DilutionRatio } from "@/types/chemicals";
import { generateTemplate } from "@/lib/chemical-ai";
import { useDemoMode } from "@/contexts/DemoContext";
import { uploadFile } from "@/lib/storage-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Plus, Check } from "lucide-react";

// Updated naming: material → supply, tool → equipment
// Backward compatibility maintained in data layer
type Mode = 'chemical' | 'supply' | 'equipment' | 'material' | 'tool'; // material & tool kept for backward compat

interface ChemicalForm {
  id?: string;
  name: string;
  brand?: string;
  bottleSize: string;
  costPerBottle: string;
  currentStock: string;
  threshold: string;
  unitOfMeasure: string;
  consumptionRatePerJob: string;
  imageUrl?: string;
  chemicalLibraryId?: string;

  notes?: string;
  dilutionRatios: DilutionRatio[];
  wherePurchased?: string;
  updatedAt?: string;
  createdAt?: string;
}

// Renamed: Material → Supply
interface SupplyForm {
  id?: string;
  name: string;
  category: string;
  subtype: string;
  quantity: string; // numeric string
  costPerItem: string; // numeric string - MANDATORY
  notes: string;
  threshold: string; // maps to lowThreshold - MANDATORY
  unitOfMeasure: string; // e.g., "pads", "units"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;

  wherePurchased?: string;
  updatedAt?: string;
  createdAt?: string;
}

// Renamed: Tool → Equipment
interface EquipmentForm {
  id?: string;
  name: string;
  category: string;
  warranty: string;
  purchaseDate: string;
  price: string; // MANDATORY
  cost: string; // alias for price - MANDATORY
  quantity: string;
  threshold: string; // MANDATORY
  lifeExpectancy: string;
  notes: string;
  unitOfMeasure: string; // e.g., "units"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;

  wherePurchased?: string;
  updatedAt?: string;
  createdAt?: string;
}

type Props = {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSaved?: () => Promise<void> | void;
};



export default function UnifiedInventoryModal({ mode: modeProp, open, onOpenChange, initial, onSaved }: Props) {
  // Normalize mode: map legacy names to new names
  const normalizeMode = (m: Mode): Mode => {
    if (m === 'material') return 'supply';
    if (m === 'tool') return 'equipment';
    return m;
  };
  
  const [mode, setMode] = useState<Mode>(normalizeMode(modeProp));

  useEffect(() => {
    setMode(normalizeMode(modeProp));
  }, [modeProp, open]);

  const [chemicalSizes, setChemicalSizes] = useState<any[]>([
    { bottleSize: "", costPerBottle: "", actualPrice: "", currentStock: "1", threshold: "1", purchaseDate: "", wherePurchased: "" }
  ]);
  const [supplyPurchases, setSupplyPurchases] = useState<any[]>([
    { quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }
  ]);
  const [equipmentPurchases, setEquipmentPurchases] = useState<any[]>([
    { quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }
  ]);

  const [form, setForm] = useState<ChemicalForm & SupplyForm & EquipmentForm>({
    id: undefined,
    name: "",
    brand: "", // NEW: Brand field
    bottleSize: "",
    costPerBottle: "",
    currentStock: "1",
    threshold: "1",
    category: "Other",
    subtype: "",
    quantity: "1",
    costPerItem: "",
    notes: "",
    warranty: "",
    purchaseDate: "",
    price: "",
    cost: "",
    lifeExpectancy: "",
    unitOfMeasure: "",
    consumptionRatePerJob: "0",
    imageUrl: "",
    chemicalLibraryId: "",

    dilutionRatios: [],
    wherePurchased: "",
    updatedAt: "",
    createdAt: "",
  });

  const [libraryOptions, setLibraryOptions] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getLibraryChemicals().then(setLibraryOptions).catch(err => console.error("Failed to load library", err));
      
      const fetchUniqueValues = async () => {
        try {
          const { getChemicals, getMaterials, getTools } = await import("@/lib/inventory-data");
          const chems = await getChemicals();
          const materials = await getMaterials();
          const tools = await getTools();

          // Brands
          const brands = Array.from(new Set(chems.map(c => c.brand).filter(Boolean))) as string[];
          setUniqueBrands(brands.sort((a, b) => a.localeCompare(b)));

          // Categories
          const materialCats = Array.from(new Set(materials.map(m => m.category).filter(Boolean))) as string[];
          const toolCats = Array.from(new Set(tools.map(t => t.category).filter(Boolean))) as string[];
          const newCats = { 
            supply: Array.from(new Set([...availableCategories.supply, ...materialCats])).sort(),
            equipment: Array.from(new Set([...availableCategories.equipment, ...toolCats])).sort()
          };
          setAvailableCategories(newCats);
          localStorage.setItem('inventory_preferred_categories', JSON.stringify(newCats));

          // Subtypes
          const materialSubtypes = Array.from(new Set(materials.map(m => m.subtype).filter(Boolean))) as string[];
          const newSubtypes = Array.from(new Set([...availableSubtypes, ...materialSubtypes])).sort();
          setAvailableSubtypes(newSubtypes);
          localStorage.setItem('inventory_preferred_subtypes', JSON.stringify(newSubtypes));

          // Purchased Locations
          const allItems = [...chems, ...materials, ...tools];
          const locations = Array.from(new Set(allItems.map(i => (i as any).wherePurchased).filter(Boolean))) as string[];
          const newPurchased = Array.from(new Set([...availablePurchased, ...locations])).sort();
          setAvailablePurchased(newPurchased);
          localStorage.setItem('inventory_preferred_purchased', JSON.stringify(newPurchased));

          // Units (merged with existing presets)
          const chemUnits = Array.from(new Set(chems.map(c => (c as any).unitOfMeasure || (c as any).unit_of_measure).filter(Boolean))) as string[];
          updateUnits(Array.from(new Set([...availableUnits, ...chemUnits])).sort());

          const matUnits = Array.from(new Set(materials.map(m => (m as any).unitOfMeasure || (m as any).unit_of_measure).filter(Boolean))) as string[];
          updateSupplyUnits(Array.from(new Set([...availableSupplyUnits, ...matUnits])).sort());

          const toolUnits = Array.from(new Set(tools.map(t => (t as any).unitOfMeasure || (t as any).unit_of_measure).filter(Boolean))) as string[];
          updateEquipmentUnits(Array.from(new Set([...availableEquipmentUnits, ...toolUnits])).sort());

        } catch (err) {
          console.error("Failed to fetch unique inventory values", err);
        }
      };
      fetchUniqueValues();
    }
  }, [mode, open]);

  const photoRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const recoveredRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);

  // Track if user selected "Custom" for dropdowns
  const [customCategory, setCustomCategory] = useState(false);
  const [customSubtype, setCustomSubtype] = useState(false);
  const [customUnit, setCustomUnit] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [customPurchased, setCustomPurchased] = useState(false);
  const [customBrand, setCustomBrand] = useState(false);
  const [customSize, setCustomSize] = useState(false);

  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [uniqueSizes, setUniqueSizes] = useState<string[]>([]);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  const DEFAULT_SIZES = ["1 unit", "1 gallon", "14 oz", "16 oz", "24 oz", "32 oz", "64 oz", "128 oz", "256 oz"];
  const DEFAULT_UNITS = ["oz", "mL", "Gallons", "Quarts", "Pints"];
  const DEFAULT_SUPPLY_UNITS = ["Units", "Pieces", "Pads", "Sheets", "Rolls", "Boxes", "lbs", "kg"];
  const DEFAULT_EQUIPMENT_UNITS = ["Units", "Pieces", "Sets"];
  const DEFAULT_PURCHASED = ["Amazon", "Home Depot", "Harbor Freight", "Oreilly's Auto Parts", "Queensboro.com", "VistaPrint.com"];
  const DEFAULT_CATEGORIES = {
    supply: ["Other", "Towels/Rags", "Bottle", "Business Item", "Safety Item", "Brush", "Tool", "Consumable", "Chemical", "PPE"],
    equipment: ["Power Tool", "Hand Tool", "Equipment", "Accessory", "Vehicle", "Other"]
  };
  const DEFAULT_SUBTYPES = ["Small", "Medium", "Large", "Extra Large"];

  const [availableSizes, setAvailableSizes] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_sizes');
    return saved ? JSON.parse(saved) : DEFAULT_SIZES;
  });

  const [availableUnits, setAvailableUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_units');
    return saved ? JSON.parse(saved) : DEFAULT_UNITS;
  });

  const [availableSupplyUnits, setAvailableSupplyUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_supply_units');
    return saved ? JSON.parse(saved) : DEFAULT_SUPPLY_UNITS;
  });

  const [availableEquipmentUnits, setAvailableEquipmentUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_equipment_units');
    return saved ? JSON.parse(saved) : DEFAULT_EQUIPMENT_UNITS;
  });

  const [availablePurchased, setAvailablePurchased] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_purchased');
    return saved ? JSON.parse(saved) : DEFAULT_PURCHASED;
  });

  const [availableCategories, setAvailableCategories] = useState<{supply: string[], equipment: string[]}>(() => {
    const saved = localStorage.getItem('inventory_preferred_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [availableSubtypes, setAvailableSubtypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_subtypes');
    return saved ? JSON.parse(saved) : DEFAULT_SUBTYPES;
  });

  const updateSizes = (newList: string[]) => {
    setAvailableSizes(newList);
    localStorage.setItem('inventory_preferred_sizes', JSON.stringify(newList));
  };

  const updateUnits = (newList: string[]) => {
    setAvailableUnits(newList);
    localStorage.setItem('inventory_preferred_units', JSON.stringify(newList));
  };

  const updateSupplyUnits = (newList: string[]) => {
    setAvailableSupplyUnits(newList);
    localStorage.setItem('inventory_preferred_supply_units', JSON.stringify(newList));
  };

  const updateEquipmentUnits = (newList: string[]) => {
    setAvailableEquipmentUnits(newList);
    localStorage.setItem('inventory_preferred_equipment_units', JSON.stringify(newList));
  };

  const updatePurchased = (newList: string[]) => {
    setAvailablePurchased(newList);
    localStorage.setItem('inventory_preferred_purchased', JSON.stringify(newList));
  };

  const updateCategories = (newList: {supply: string[], equipment: string[]}) => {
    setAvailableCategories(newList);
    localStorage.setItem('inventory_preferred_categories', JSON.stringify(newList));
  };

  const updateSubtypes = (newList: string[]) => {
    setAvailableSubtypes(newList);
    localStorage.setItem('inventory_preferred_subtypes', JSON.stringify(newList));
  };

  const getUnitOptions = () => {
    if (mode === 'chemical') return availableUnits;
    if (mode === 'equipment' || mode === 'tool') return availableEquipmentUnits;
    return availableSupplyUnits;
  };

  useEffect(() => {
    // If we've already recovered in this mount session, ignore prop changes that might overwrite our data
    if (recoveredRef.current) return;

    // CHECK RECOVERY FIRST - Always prioritize unsaved draft if modal is open
    const saved = localStorage.getItem('pending_inventory_form');
    if (saved && open) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode === mode) {
          // If we have an initial item, only recover if the IDs match exactly
          // This prevents an empty "Add New" draft from overwriting existing data when editing
          if (initial && initial.id) {
            if (parsed.form.id === initial.id) {
              console.log("Recovered unsaved draft state for item: " + initial.id);
              setForm(parsed.form);
              setCustomSubtype(parsed.customSubtype || false);
              setCustomUnit(parsed.customUnit || false);
              setCustomCategory(parsed.customCategory || false);
              setCustomPurchased(parsed.customPurchased || false);
              setCustomBrand(parsed.customBrand || false);
              setCustomSize(parsed.customSize || false);
              recoveredRef.current = true;
              return;
            }
          } else if (!initial && !parsed.form.id) {
            // Both are new items, safe to recover
            console.log("Recovered unsaved draft state for new item");
            setForm(parsed.form);
            setCustomSubtype(parsed.customSubtype || false);
            setCustomUnit(parsed.customUnit || false);
            setCustomCategory(parsed.customCategory || false);
            setCustomPurchased(parsed.customPurchased || false);
            setCustomBrand(parsed.customBrand || false);
            setCustomSize(parsed.customSize || false);
            recoveredRef.current = true;
            return;
          }
        }
      } catch (e) {
        console.error("Restore failed", e);
      }
    }

    if (initial) {
      const isGroup = Array.isArray(initial);
      const firstItem = isGroup ? initial[0] : initial;

      if (modeProp === 'chemical' && isGroup) {
        setChemicalSizes(initial.map(c => ({
          id: c.id,
          bottleSize: c.bottleSize || "",
          costPerBottle: String(c.costPerBottle || c.salePrice || ""),
          actualPrice: String(c.actualPrice || ""),
          currentStock: String(c.currentStock || "1"),
          threshold: String(c.threshold || "1"),
          purchaseDate: c.purchaseDate || "",
          wherePurchased: c.wherePurchased || ""
        })));
      } else if (modeProp === 'chemical') {
        setChemicalSizes([{
          id: firstItem.id,
          bottleSize: (firstItem as any).bottleSize || "",
          costPerBottle: firstItem?.costPerBottle ? String(firstItem.costPerBottle) : ((firstItem as any).costPerBottle || (firstItem as any).salePrice || ""),
          actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
          currentStock: firstItem?.currentStock ? String(firstItem.currentStock) : ((firstItem as any).currentStock || form.currentStock),
          threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
          purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
          wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || ""
        }]);
      } else if (modeProp === 'supply') {
        setSupplyPurchases([{
          id: firstItem.id,
          quantity: firstItem?.quantity ? String(firstItem.quantity) : ((firstItem as any).quantity || form.quantity),
          costPerItem: firstItem?.costPerItem ? String(firstItem.costPerItem) : ((firstItem as any).costPerItem || (firstItem as any).salePrice || ""),
          actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
          threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
          purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
          wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || ""
        }]);
      } else if (modeProp === 'equipment' || modeProp === 'tool') {
        setEquipmentPurchases([{
          id: firstItem.id,
          quantity: firstItem?.quantity ? String(firstItem.quantity) : ((firstItem as any).quantity || form.quantity),
          price: (firstItem as any).price ? String((firstItem as any).price) : ((firstItem as any).salePrice || ""),
          actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
          threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
          purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
          wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || ""
        }]);
      }

      const initialSubtype = (firstItem as any).subtype || "";
      const initialUnit = (firstItem as any).unitOfMeasure || "";
      const initialCat = (firstItem as any).category || "";
      setCustomCategory(initialCat && 
        (mode === 'equipment' || mode === 'tool' ? 
          !availableCategories.equipment.includes(initialCat) : 
          !availableCategories.supply.includes(initialCat)));
      setCustomSubtype(initialSubtype && !availableSubtypes.includes(initialSubtype));
      setCustomUnit(initialUnit && !getUnitOptions().includes(initialUnit));
      
      const initialPurchased = (firstItem as any).wherePurchased || "";
      setCustomPurchased(initialPurchased && !availablePurchased.includes(initialPurchased));

      setForm((f) => ({
        ...f,
        id: firstItem.id || f.id,
        name: firstItem.name || "",
        brand: (firstItem as any).brand || "",
        bottleSize: (firstItem as any).bottleSize || "",
        costPerBottle: firstItem?.costPerBottle ? String(firstItem.costPerBottle) : ((firstItem as any).costPerBottle || ""),
        currentStock: firstItem?.currentStock ? String(firstItem.currentStock) : ((firstItem as any).currentStock || f.currentStock),
        threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : f.threshold),
        category: (firstItem as any).category || f.category,
        subtype: initialSubtype,
        quantity: firstItem?.quantity ? String(firstItem.quantity) : ((firstItem as any).quantity || f.quantity),
        costPerItem: firstItem?.costPerItem ? String(firstItem.costPerItem) : ((firstItem as any).costPerItem || ""),
        notes: (firstItem as any).notes || "",
        warranty: (firstItem as any).warranty || "",
        purchaseDate: (firstItem as any).purchaseDate || "",
        price: (firstItem as any).price ? String((firstItem as any).price) : "",
        lifeExpectancy: (firstItem as any).lifeExpectancy || "",
        unitOfMeasure: initialUnit,
        imageUrl: (firstItem as any).imageUrl || f.imageUrl,
        chemicalLibraryId: (firstItem as any).chemicalLibraryId || "",
        dilutionRatios: (firstItem as any).dilutionRatios || [],
        wherePurchased: initialPurchased,
        updatedAt: (firstItem as any).updated_at || (firstItem as any).updatedAt || "",
        createdAt: (firstItem as any).createdAt || (firstItem as any).created_at || "",

        // Safety: Ensure all properties from initial are preserved even if not explicitly mapped
        ...((firstItem as any).purchase_date ? { purchaseDate: (firstItem as any).purchase_date } : {}),
        ...((firstItem as any).where_purchased ? { wherePurchased: (firstItem as any).where_purchased } : {}),
      }));
    } else {
      setCustomCategory(false);
      setCustomSubtype(false);
      setCustomUnit(false);
      setCustomPurchased(false);
      setCustomBrand(false);
      setCustomSize(false);
      setForm({
        id: undefined,
        name: "",
        bottleSize: "",
        costPerBottle: "",
        currentStock: "1",
        threshold: "1",
        category: "Other",
        subtype: "",
        quantity: "1",
        costPerItem: "",
        notes: "",
        warranty: "",
        purchaseDate: "",
        price: "",
        cost: "",
        lifeExpectancy: "",
        unitOfMeasure: mode === 'chemical' ? "oz" : mode === 'equipment' || mode === 'tool' ? "Units" : "Units",
        consumptionRatePerJob: "0",
        imageUrl: "",
        chemicalLibraryId: "",
        dilutionRatios: [],
        wherePurchased: "",

      });
      setChemicalSizes([{ bottleSize: "", costPerBottle: "", actualPrice: "", currentStock: "1", threshold: "1", purchaseDate: "", wherePurchased: "" }]);
      setSupplyPurchases([{ quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }]);
      setEquipmentPurchases([{ quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }]);
    }
  }, [initial, open, modeProp]); // Use modeProp for initial load stabilization

  // Clean up lock when modal closes
  useEffect(() => {
    if (!open) {
      recoveredRef.current = false;
    }
  }, [open]);

  // SESSION RECOVERY: Persist form state to SESSION STORAGE on every change
  // This allows the app to RE-OPEN the modal automatically if the browser reloads
  // after the user takes a picture (common mobile OOM crash)
  useEffect(() => {
    if (open) {
      localStorage.setItem('pending_inventory_form', JSON.stringify({
        form,
        mode,
        customCategory,
        customSubtype,
        customUnit,
        customBrand,
        customSize
      }));
    }
  }, [form, mode, customCategory, customSubtype, customUnit, customBrand, customSize, open]);

  const numeric = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploading(true);
      try {
        toast.info("Optimizing and uploading image...");
        const rawFile = e.target.files[0];

        // Explicitly compress before even sending to the upload utility 
        // to provide double-protection against OOM on high-end rear cameras
        const { compressImageForUpload } = await import('@/lib/image-compression');
        const compressed = await compressImageForUpload(rawFile);

        const publicUrl = await uploadFile('blog-media', compressed);

        setForm(prev => ({ ...prev, imageUrl: publicUrl }));
        toast.success("Image secured to cloud");
      } catch (err: any) {
        console.error(err);
        toast.error("Upload failed: " + (err.message || "Unknown error"));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, imageUrl: "" }));
  };

  const addDilution = () => {
    const newD: DilutionRatio = { method: "Spray", ratio: "1:10", soil_level: "General", notes: "" };
    setForm(f => ({ ...f, dilutionRatios: [...(f.dilutionRatios || []), newD] }));
  };

  const updateDilution = (index: number, field: keyof DilutionRatio, val: string) => {
    const arr = [...(form.dilutionRatios || [])];
    arr[index] = { ...arr[index], [field]: val };
    setForm(f => ({ ...f, dilutionRatios: arr }));
  };

  const removeDilution = (index: number) => {
    const arr = [...(form.dilutionRatios || [])];
    arr.splice(index, 1);
    setForm(f => ({ ...f, dilutionRatios: arr }));
  };

  const syncFromLibrary = async (libId: string) => {
    if (!libId) return;
    try {
      const libData = await getChemicalById(libId);
      if (libData && libData.dilution_ratios) {
        setForm(f => ({
          ...f,
          dilutionRatios: libData.dilution_ratios
        }));
        toast.success("Synced dilution ratios from library card");
      }
    } catch (err) {
      console.error("Failed to sync from library", err);
    }
  };

  const { isDemoMode } = useDemoMode();

  const save = async () => {
    try {
      // Validate required fields
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }

      if (isDemoMode) {
        toast.warning("Training Session: Persistent database writes are disabled.", {
          description: "Your changes were simulated locally but not saved to the permanent inventory."
        });
        onOpenChange(false);
        return;
      }

      // Calculate total cost
      const unitCost = mode === 'chemical' ? numeric(form.costPerBottle) :
        (mode === 'equipment' || mode === 'tool') ? numeric(form.price || form.cost) :
          numeric(form.costPerItem);
      
      const qty = mode === 'chemical' ? numeric(form.currentStock) : numeric(form.quantity);
      let totalCost = unitCost * qty;

      const isNew = !form.id; // Track if this is a new purchase
      const id = form.id || crypto.randomUUID();

      // MIGRATION LOGIC: Check if we are changing types
      const originalMode = initial ? normalizeMode(modeProp) : mode;
      const isModeChanging = !!initial && mode !== originalMode;

      console.log(`[UnifiedInventoryModal] Saving ${mode}:`, { id, isNew, name: form.name, isModeChanging, from: originalMode });

      let chemicalTotalCost = 0;

      if (mode === 'chemical') {
        const { saveChemical, deleteChemical } = await import("@/lib/inventory-data");
        
        // Handle deletions: if initial was an array, check if any ids were removed
        if (initial && Array.isArray(initial)) {
          const currentIds = chemicalSizes.map(s => s.id).filter(Boolean);
          const removedSizes = initial.filter(initSize => !currentIds.includes(initSize.id));
          for (const removed of removedSizes) {
            if (removed.id) {
              await deleteChemical(removed.id);
            }
          }
        }
        
        for (const size of chemicalSizes) {
          chemicalTotalCost += numeric(size.costPerBottle) * numeric(size.currentStock);
          const sizeId = size.id || crypto.randomUUID();
          
          const payload = {
            id: sizeId,
            name: form.name.trim(),
            brand: form.brand?.trim() || undefined,
            bottleSize: size.bottleSize.trim(),
            costPerBottle: numeric(size.costPerBottle),
            currentStock: Math.round(numeric(size.currentStock)),
            threshold: Math.round(numeric(size.threshold)),
            imageUrl: form.imageUrl,
            chemicalLibraryId: form.chemicalLibraryId || undefined,
            notes: form.notes || undefined,
            dilutionRatios: form.dilutionRatios,
            wherePurchased: size.wherePurchased?.trim() || undefined,
            purchaseDate: size.purchaseDate || undefined,
            actualPrice: numeric(size.actualPrice) || undefined,
            salePrice: numeric(size.costPerBottle) || undefined,
            unitOfMeasure: form.unitOfMeasure,
          };
          
          await saveChemical(payload, !size.id);
        }
      } else if (mode === 'equipment' || mode === 'tool') {
        const { saveTool, deleteTool } = await import("@/lib/inventory-data");
        
        // Handle deletions for equipment
        if (initial && Array.isArray(initial)) {
          const currentIds = equipmentPurchases.map(s => s.id).filter(Boolean);
          const removedPurchases = initial.filter(initSize => !currentIds.includes(initSize.id));
          for (const removed of removedPurchases) {
            if (removed.id) await deleteTool(removed.id);
          }
        }
        
        for (const purchase of equipmentPurchases) {
          totalCost += numeric(purchase.price) * numeric(purchase.quantity);
          const pId = purchase.id || crypto.randomUUID();
          
          const payload = {
            id: pId,
            name: form.name.trim(),
            category: form.category || 'General',
            warranty: form.warranty || "",
            purchaseDate: purchase.purchaseDate || "",
            price: numeric(purchase.price),
            actualPrice: numeric(purchase.actualPrice) || undefined,
            salePrice: numeric(purchase.price) || undefined,
            quantity: Math.round(numeric(purchase.quantity)),
            threshold: Math.round(numeric(purchase.threshold)),
            lifeExpectancy: form.lifeExpectancy || "",
            notes: form.notes || "",
            imageUrl: form.imageUrl,
            wherePurchased: purchase.wherePurchased?.trim() || undefined,
          };
          
          await saveTool(payload, !purchase.id);
        }
      } else { // supply or material
        const { saveMaterial, deleteMaterial } = await import("@/lib/inventory-data");
        
        // Handle deletions for supplies
        if (initial && Array.isArray(initial)) {
          const currentIds = supplyPurchases.map(s => s.id).filter(Boolean);
          const removedPurchases = initial.filter(initSize => !currentIds.includes(initSize.id));
          for (const removed of removedPurchases) {
            if (removed.id) await deleteMaterial(removed.id);
          }
        }
        
        for (const purchase of supplyPurchases) {
          totalCost += numeric(purchase.costPerItem) * numeric(purchase.quantity);
          const pId = purchase.id || crypto.randomUUID();
          
          const payload = {
            id: pId,
            name: form.name.trim(),
            category: form.category || 'Other',
            subtype: form.subtype || "",
            quantity: Math.round(numeric(purchase.quantity)),
            costPerItem: numeric(purchase.costPerItem),
            actualPrice: numeric(purchase.actualPrice) || undefined,
            salePrice: numeric(purchase.costPerItem) || undefined,
            notes: form.notes || undefined,
            lowThreshold: Math.round(numeric(purchase.threshold)),
            createdAt: new Date().toISOString(),
            imageUrl: form.imageUrl,
            wherePurchased: purchase.wherePurchased?.trim() || undefined,
            purchaseDate: purchase.purchaseDate || undefined,
          };
          
          await saveMaterial(payload, !purchase.id);
        }
      }

      // If mode changed, delete the record from the old table
      if (isModeChanging) {
        try {
          if (originalMode === 'chemical') {
            const { deleteChemical } = await import("@/lib/inventory-data");
            await deleteChemical(id);
          } else if (originalMode === 'equipment' || originalMode === 'tool') {
            const { deleteTool } = await import("@/lib/inventory-data");
            await deleteTool(id);
          } else {
            const { deleteMaterial } = await import("@/lib/inventory-data");
            await deleteMaterial(id);
          }
          console.log(`[Migration] Successfully removed item from ${originalMode}`);
        } catch (migrationErr) {
          console.error("Migration deletion failed:", migrationErr);
        }
      }

      // Invalidate session cache so InventoryControl re-fetches fresh data
      // (prevents stale localforage from overwriting the new imageUrl on the cards)
      sessionStorage.removeItem('inventory-loaded');

      toast.success("Item saved");

      onOpenChange(false);
      
      // EXPLICITLY clear recovery drafts on success to prevent 'ghosting'
      localStorage.removeItem('pending_inventory_form');
      localStorage.removeItem('pending_inventory_form_active');
      recoveredRef.current = false;

      if (onSaved) {
        console.log('[UnifiedInventoryModal] Notifying parent to refresh data...');
        await onSaved();
      }

      // Auto-open Card if we just linked one
      if (mode === 'chemical' && form.chemicalLibraryId) {
        // Small delay to ensure modal closes first
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: form.chemicalLibraryId }));
        }, 100);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Save failed: " + (err?.message || String(err)));
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;

    if (isDemoMode) {
      toast.error("Training Mode: Record deletion is disabled.");
      onOpenChange(false);
      return;
    }

    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;

    try {
      if (mode === 'chemical') {
        const { deleteChemical } = await import("@/lib/inventory-data");
        await deleteChemical(form.id);
      } else if (mode === 'equipment' || mode === 'tool') {
        const { deleteTool } = await import("@/lib/inventory-data");
        await deleteTool(form.id);
      } else {
        const { deleteMaterial } = await import("@/lib/inventory-data");
        await deleteMaterial(form.id);
      }
      
      toast.success("Item deleted successfully");
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete item: " + (error.message || "Unknown error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-white flex items-center">
            {mode === 'chemical' ? (form.id ? 'Edit Chemical' : 'Add Chemical') :
              (mode === 'equipment' || mode === 'tool') ? (form.id ? 'Edit Equipment' : 'Add Equipment') :
                (form.id ? 'Edit Supply' : 'Add Supply')}
            
            {mode === 'chemical' && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-help', {
                    detail: { topicId: 'chemical-inventory-modal' }
                  }));
                }}
                className="text-zinc-400 hover:text-emerald-400 transition-colors ml-2 flex items-center justify-center"
                title="Chemical Inventory Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            )}
          </DialogTitle>
          {(form.updatedAt || form.createdAt) && (
            <div className="absolute top-6 right-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
              {form.updatedAt ? `Last Updated: ${new Date(form.updatedAt).toLocaleString()}` : `Created: ${new Date(form.createdAt!).toLocaleString()}`}
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Upload - Compact at top */}
          <div className="flex justify-center">
            <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => !form.imageUrl && photoRef.current?.click()}>
              {form.imageUrl ? (
                <>
                  <img 
                    src={form.imageUrl} 
                    alt="Item" 
                    className="w-full h-full object-cover cursor-zoom-in" 
                    onClick={(e) => { e.stopPropagation(); setIsFullscreenImage(true); }}
                  />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors z-10">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </>
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="h-6 w-6 text-zinc-600 mx-auto mb-1" />
                  <span className="text-xs text-zinc-500">Photo</span>
                </div>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
              
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                {/* GALLERY BUTTON */}
                <button
                  type="button"
                  disabled={isUploading}
                  title="Upload from library"
                  className={`rounded-full p-1.5 border-2 border-zinc-900 cursor-pointer shadow-lg transition-colors ${isUploading ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    photoRef.current?.click(); 
                  }}
                >
                  <Upload className="h-3 w-3" />
                </button>

                {/* CAMERA BUTTON */}
                <button
                  type="button"
                  disabled={isUploading}
                  title="Take new photo"
                  className={`rounded-full p-1.5 border-2 border-zinc-900 cursor-pointer shadow-lg transition-colors ${isUploading ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // Pre-save state just before triggering camera
                    localStorage.setItem('pending_inventory_form', JSON.stringify({
                      form,
                      mode,
                      customCategory,
                      customSubtype,
                      customUnit,
                      customBrand,
                      customSize
                    }));
                    localStorage.setItem('pending_inventory_form_active', 'true');
                    photoCameraRef.current?.click(); 
                  }}
                >
                  {isUploading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-zinc-400">Item Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
                {mode === 'chemical' && (
                  <div>
                    <Label className="text-xs text-zinc-400">Brand</Label>
                    {!customBrand ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                          >
                            <span className="truncate">{form.brand || "Select Brand..."}</span>
                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                          <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                            {uniqueBrands.map(brand => (
                              <div key={brand} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                <span 
                                  className="flex-1 text-sm text-zinc-200" 
                                  onClick={() => setForm({...form, brand: brand})}
                                >
                                  {brand}
                                </span>
                                {form.brand === brand && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              </div>
                            ))}
                            <div className="h-px bg-zinc-800 my-1" />
                            <button 
                              type="button"
                              onClick={() => {
                                setCustomBrand(true);
                                setForm({...form, brand: ""});
                              }}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Add Custom Brand
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.brand || ""}
                          autoFocus
                          onChange={(e) => setForm({ ...form, brand: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setCustomBrand(false);
                            }
                          }}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter brand..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomBrand(false)}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                          title="Save and Return"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-zinc-400">Where Purchased</Label>
                  {!customPurchased ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                        >
                          <span className="truncate">{form.wherePurchased || "Select source..."}</span>
                          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                        <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                          {availablePurchased.map(source => (
                            <div key={source} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                              <span 
                                className="flex-1 text-sm text-zinc-200" 
                                onClick={() => setForm({...form, wherePurchased: source})}
                              >
                                {source}
                              </span>
                              {form.wherePurchased === source && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePurchased(availablePurchased.filter(s => s !== source));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all"
                                title="Remove from presets"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <div className="h-px bg-zinc-800 my-1" />
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomPurchased(true);
                              setForm({...form, wherePurchased: ""});
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Custom Source
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.wherePurchased}
                        autoFocus
                        onChange={(e) => setForm({ ...form, wherePurchased: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (form.wherePurchased && !availablePurchased.includes(form.wherePurchased)) {
                              updatePurchased([...availablePurchased, form.wherePurchased].sort());
                            }
                            setCustomPurchased(false);
                          }
                        }}
                        className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        placeholder="Enter store name..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (form.wherePurchased && !availablePurchased.includes(form.wherePurchased)) {
                            updatePurchased([...availablePurchased, form.wherePurchased].sort());
                          }
                          setCustomPurchased(false);
                        }}
                        className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        title="Save and Return"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">When Purchased</Label>
                  <Input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {(mode === 'supply' || mode === 'material') && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label className="text-xs text-zinc-400">Category</Label>
                  {!customCategory ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                        >
                          <span className="truncate">{form.category || "Select category..."}</span>
                          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                        <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                          {availableCategories.supply.map(cat => (
                            <div key={cat} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                              <span 
                                className="flex-1 text-sm text-zinc-200" 
                                onClick={() => setForm({...form, category: cat})}
                              >
                                {cat}
                              </span>
                              {form.category === cat && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCategories({ ...availableCategories, supply: availableCategories.supply.filter(c => c !== cat) });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all"
                                title="Remove from presets"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <div className="h-px bg-zinc-800 my-1" />
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomCategory(true);
                              setForm({...form, category: ""});
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Custom Category
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.category}
                        autoFocus
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (form.category && !availableCategories.supply.includes(form.category)) {
                              updateCategories({ ...availableCategories, supply: [...availableCategories.supply, form.category].sort() });
                            }
                            setCustomCategory(false);
                          }
                        }}
                        className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        placeholder="Enter custom category..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (form.category && !availableCategories.supply.includes(form.category)) {
                            updateCategories({ ...availableCategories, supply: [...availableCategories.supply, form.category].sort() });
                          }
                          setCustomCategory(false);
                        }}
                        className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        title="Save and Return"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Subtype / Size</Label>
                  {!customSubtype ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                        >
                          <span className="truncate">{form.subtype || "Select size..."}</span>
                          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                        <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                          {availableSubtypes.map(sub => (
                            <div key={sub} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                              <span 
                                className="flex-1 text-sm text-zinc-200" 
                                onClick={() => setForm({...form, subtype: sub})}
                              >
                                {sub}
                              </span>
                              {form.subtype === sub && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSubtypes(availableSubtypes.filter(s => s !== sub));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all"
                                title="Remove from presets"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <div className="h-px bg-zinc-800 my-1" />
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomSubtype(true);
                              setForm({...form, subtype: ""});
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Custom Size
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.subtype}
                        autoFocus
                        onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (form.subtype && !availableSubtypes.includes(form.subtype)) {
                              updateSubtypes([...availableSubtypes, form.subtype].sort());
                            }
                            setCustomSubtype(false);
                          }
                        }}
                        className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        placeholder="Enter custom size..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (form.subtype && !availableSubtypes.includes(form.subtype)) {
                            updateSubtypes([...availableSubtypes, form.subtype].sort());
                          }
                          setCustomSubtype(false);
                        }}
                        className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        title="Save and Return"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(mode === 'equipment' || mode === 'tool') && (
              <div className="mt-4">
                <Label className="text-xs text-zinc-400">Category</Label>
                {!customCategory ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                      >
                        <span className="truncate">{form.category || "Select category..."}</span>
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                      <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                        {availableCategories.equipment.map(cat => (
                          <div key={cat} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                            <span 
                              className="flex-1 text-sm text-zinc-200" 
                              onClick={() => setForm({...form, category: cat})}
                            >
                              {cat}
                            </span>
                            {form.category === cat && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCategories({ ...availableCategories, equipment: availableCategories.equipment.filter(c => c !== cat) });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all"
                              title="Remove from presets"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="h-px bg-zinc-800 my-1" />
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomCategory(true);
                            setForm({...form, category: ""});
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Custom Category
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={form.category}
                      autoFocus
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (form.category && !availableCategories.equipment.includes(form.category)) {
                            updateCategories({ ...availableCategories, equipment: [...availableCategories.equipment, form.category].sort() });
                          }
                          setCustomCategory(false);
                        }
                      }}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      placeholder="Enter custom category..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (form.category && !availableCategories.equipment.includes(form.category)) {
                          updateCategories({ ...availableCategories, equipment: [...availableCategories.equipment, form.category].sort() });
                        }
                        setCustomCategory(false);
                      }}
                      className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                      title="Save and Return"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stock & Pricing Section */}
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-emerald-300 mb-3">Stock & Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              {mode === 'chemical' ? (
                <div className="space-y-4 col-span-2">
                  {chemicalSizes.map((size, index) => (
                    <div key={index} className="grid grid-cols-2 gap-3 pb-4 border-b border-emerald-800/30 last:border-0 last:pb-0 relative group">
                      {chemicalSizes.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to remove this bottle size? This cannot be undone once saved.")) {
                              setChemicalSizes(chemicalSizes.filter((_, i) => i !== index));
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-full p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      
                      <div className="col-span-2">
                        <Label className="text-xs text-zinc-400">Bottle Size</Label>
                        <Input
                          value={size.bottleSize}
                          onChange={(e) => {
                            const newSizes = [...chemicalSizes];
                            newSizes[index].bottleSize = e.target.value;
                            setChemicalSizes(newSizes);
                          }}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="e.g., 32 oz"
                        />
                      </div>
                      
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Current Stock</Label>
                          <Input
                            type="number"
                            value={size.currentStock}
                            onChange={(e) => {
                              const newSizes = [...chemicalSizes];
                              newSizes[index].currentStock = e.target.value;
                              setChemicalSizes(newSizes);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Low Threshold</Label>
                          <Input
                            type="number"
                            value={size.threshold}
                            onChange={(e) => {
                              const newSizes = [...chemicalSizes];
                              newSizes[index].threshold = e.target.value;
                              setChemicalSizes(newSizes);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-zinc-400">Cost per Bottle</Label>
                        <Input
                          type="number"
                          step="1"
                          value={size.costPerBottle}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => {
                            const newSizes = [...chemicalSizes];
                            newSizes[index].costPerBottle = e.target.value;
                            setChemicalSizes(newSizes);
                          }}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        />
                        <div className="mt-1 text-[10px] text-zinc-500 flex justify-between font-bold uppercase tracking-tight">
                          <span>Total Value:</span>
                          <span className="text-emerald-400 font-black">
                            ${(numeric(size.costPerBottle) * numeric(size.currentStock)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Unit of Measure</Label>
                    {!customUnit ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                          >
                            <span className="truncate">{form.unitOfMeasure || "Select Unit..."}</span>
                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                          <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                            {getUnitOptions().map(unit => (
                              <div key={unit} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                <span 
                                  className="flex-1 text-sm text-zinc-200" 
                                  onClick={() => setForm({...form, unitOfMeasure: unit})}
                                >
                                  {unit}
                                </span>
                                {form.unitOfMeasure === unit && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                {mode === 'chemical' && availableUnits.includes(unit) && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateUnits(availableUnits.filter(u => u !== unit));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all"
                                    title="Remove from presets"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="h-px bg-zinc-800 my-1" />
                            <button 
                              type="button"
                              onClick={() => {
                                setCustomUnit(true);
                                setForm({...form, unitOfMeasure: ""});
                              }}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Add Custom Unit
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.unitOfMeasure}
                          autoFocus
                          onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (mode === 'chemical' && form.unitOfMeasure && !availableUnits.includes(form.unitOfMeasure)) {
                                updateUnits([...availableUnits, form.unitOfMeasure]);
                              }
                              setCustomUnit(false);
                            }
                          }}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter unit..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (mode === 'chemical' && form.unitOfMeasure && !availableUnits.includes(form.unitOfMeasure)) {
                              updateUnits([...availableUnits, form.unitOfMeasure]);
                            }
                            setCustomUnit(false);
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                          title="Save and Return"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-dashed border-emerald-700 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 text-sm mt-2"
                    onClick={() => setChemicalSizes([...chemicalSizes, { bottleSize: "", costPerBottle: "", currentStock: "1", threshold: "1" }])}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Another Bottle Size
                  </Button>
                </div>
              ) : (mode === 'equipment' || mode === 'tool') ? (
                <div className="space-y-4">
                  {equipmentPurchases.map((purchase, index) => (
                    <div key={index} className="relative bg-zinc-800/30 border border-zinc-700/50 p-3 rounded space-y-3 pt-6">
                      {equipmentPurchases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newP = [...equipmentPurchases];
                            newP.splice(index, 1);
                            setEquipmentPurchases(newP);
                          }}
                          className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Quantity</Label>
                          <Input
                            type="number"
                            value={purchase.quantity}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].quantity = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Low Threshold</Label>
                          <Input
                            type="number"
                            value={purchase.threshold}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].threshold = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Price / Cost (Sale)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={purchase.price}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].price = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Actual Price (MSRP)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={purchase.actualPrice || ""}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].actualPrice = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Where Purchased</Label>
                          <Input
                            value={purchase.wherePurchased || ""}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].wherePurchased = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Purchase Date</Label>
                          <Input
                            type="date"
                            value={purchase.purchaseDate || ""}
                            onChange={(e) => {
                              const newP = [...equipmentPurchases];
                              newP[index].purchaseDate = e.target.value;
                              setEquipmentPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>
                      {numeric(purchase.actualPrice) > numeric(purchase.price) && (
                        <div className="mt-1 text-[10px] text-green-400 flex justify-between font-bold uppercase tracking-tight bg-green-500/10 p-1.5 rounded border border-green-500/20">
                          <span>Savings on this purchase:</span>
                          <span className="font-black">
                            +${(numeric(purchase.actualPrice) - numeric(purchase.price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-dashed border-blue-700 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 text-sm mt-2"
                    onClick={() => setEquipmentPurchases([...equipmentPurchases, { quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }])}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Another Purchase
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {supplyPurchases.map((purchase, index) => (
                    <div key={index} className="relative bg-zinc-800/30 border border-zinc-700/50 p-3 rounded space-y-3 pt-6">
                      {supplyPurchases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newP = [...supplyPurchases];
                            newP.splice(index, 1);
                            setSupplyPurchases(newP);
                          }}
                          className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Quantity</Label>
                          <Input
                            type="number"
                            value={purchase.quantity}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].quantity = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Low Threshold</Label>
                          <Input
                            type="number"
                            value={purchase.threshold}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].threshold = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Cost per Item (Sale)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={purchase.costPerItem}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].costPerItem = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Actual Price (MSRP)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={purchase.actualPrice || ""}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].actualPrice = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Where Purchased</Label>
                          <Input
                            value={purchase.wherePurchased || ""}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].wherePurchased = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Purchase Date</Label>
                          <Input
                            type="date"
                            value={purchase.purchaseDate || ""}
                            onChange={(e) => {
                              const newP = [...supplyPurchases];
                              newP[index].purchaseDate = e.target.value;
                              setSupplyPurchases(newP);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>
                      {numeric(purchase.actualPrice) > numeric(purchase.costPerItem) && (
                        <div className="mt-1 text-[10px] text-green-400 flex justify-between font-bold uppercase tracking-tight bg-green-500/10 p-1.5 rounded border border-green-500/20">
                          <span>Savings on this purchase:</span>
                          <span className="font-black">
                            +${(numeric(purchase.actualPrice) - numeric(purchase.costPerItem)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-dashed border-blue-700 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 text-sm mt-2"
                    onClick={() => setSupplyPurchases([...supplyPurchases, { quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }])}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Another Purchase
                  </Button>
                </div>
              )}
            </div>
          </div>



          {/* Dilution Ratios Section */}
          {mode === 'chemical' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-blue-900/30 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Beaker className="w-4 h-4" /> Dilution Ratios
                </h3>
                {form.chemicalLibraryId && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => syncFromLibrary(form.chemicalLibraryId!)}
                    className="text-[10px] text-blue-400 p-0 h-auto"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Force Sync
                  </Button>
                )}
              </div>

              {/* Link Status & Actions */}
              <div className="mb-4 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-[10px] text-zinc-400 uppercase mb-1 block font-bold">Linked Knowledge Card</Label>
                    {form.chemicalLibraryId ? (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm text-yellow-500 font-semibold truncate">
                          {libraryOptions.find(l => l.id === form.chemicalLibraryId)?.brand} - {libraryOptions.find(l => l.id === form.chemicalLibraryId)?.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            onOpenChange(false);
                            window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: form.chemicalLibraryId }));
                          }}
                          className="h-5 w-5 text-zinc-500 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500 italic">Not linked to a library card.</span>
                    )}
                  </div>
                  
                  {(!form.dilutionRatios || form.dilutionRatios.length === 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isAiLoading}
                      onClick={async () => {
                        if (!form.name) {
                          toast.error("Please enter a chemical name first.");
                          return;
                        }
                        setIsAiLoading(true);
                        const toastId = toast.loading("Consulting AI Knowledge Base...");
                        try {
                          const template = await generateTemplate(form.name, 'Exterior');
                          let finalRatios = template.dilution_ratios || [];
                          
                          if (finalRatios.length === 0) {
                            finalRatios = [{ method: "Spray Bottle", ratio: "RTU", soil_level: "Any", notes: "Ready To Use" }];
                            toast.success(`AI determined ${form.name} is Ready-To-Use.`, { id: toastId });
                          } else {
                            toast.success("AI suggested ratios for this product.", { id: toastId });
                          }
                          
                          setForm(f => ({ ...f, dilutionRatios: finalRatios }));
                        } catch (error) {
                          toast.error("Failed to connect to AI.", { id: toastId });
                        } finally {
                          setIsAiLoading(false);
                        }
                      }}
                      className="h-8 text-[10px] bg-blue-900/20 border-blue-800/50 text-blue-300 hover:bg-blue-900/40"
                    >
                      {isAiLoading ? (
                        <div className="h-3 w-3 mr-1 animate-spin rounded-full border-b-2 border-blue-400" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      {isAiLoading ? "Analyzing..." : "AI Lookup"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {form.dilutionRatios?.map((ratio, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-zinc-900 p-2 rounded border border-zinc-700/50">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Method</Label>
                        <Input 
                          value={ratio.method} 
                          onChange={e => updateDilution(idx, 'method', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="Spray, Foam..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Ratio</Label>
                        <Input 
                          value={ratio.ratio} 
                          onChange={e => updateDilution(idx, 'ratio', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700 font-bold text-blue-300" 
                          placeholder="1:10, 1oz/gal..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Soil Level</Label>
                        <Input 
                          value={ratio.soil_level} 
                          onChange={e => updateDilution(idx, 'soil_level', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="General, Heavy..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Notes</Label>
                        <Input 
                          value={ratio.notes} 
                          onChange={e => updateDilution(idx, 'notes', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="Specific tips..."
                        />
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeDilution(idx)} 
                      className="mt-5 hover:text-red-500 h-8 w-8 text-zinc-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!form.dilutionRatios || form.dilutionRatios.length === 0) && (
                  <p className="text-xs text-zinc-500 italic">No dilution ratios defined for this inventory item.</p>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addDilution} 
                  className="mt-2 border-dashed border-zinc-700 text-zinc-400 hover:text-white"
                >
                  <PlusIcon className="w-3 h-3 mr-2" /> Add Ratio
                </Button>
              </div>
            </div>
          )}

          {/* Usage Tracking Section */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">Usage Tracking</h3>
            <div>
              <Label className="text-xs text-zinc-400">Consumption per Job</Label>
              <Input
                type="number"
                step="0.01"
                value={form.consumptionRatePerJob}
                onChange={(e) => setForm({ ...form, consumptionRatePerJob: e.target.value })}
                placeholder="e.g., 2"
                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
              />
            </div>
          </div>

          {/* Equipment-specific Details */}
          {(mode === 'equipment' || mode === 'tool') && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">Equipment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Warranty Info</Label>
                  <Input
                    value={form.warranty}
                    onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                    placeholder="e.g. 2 Years"
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Life Expectancy</Label>
                  <Input
                    value={form.lifeExpectancy}
                    onChange={(e) => setForm({ ...form, lifeExpectancy: e.target.value })}
                    placeholder="e.g. 5 Years"
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Additional Notes</h3>
            <div>
              <Label className="text-xs text-zinc-400">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => {
                  setForm({ ...form, notes: e.target.value });
                  // Auto-expand logic: Grow to fit but cap at 5 lines (approx 140px)
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="bg-zinc-900 border-zinc-700 text-white min-h-[60px] max-h-[140px] text-sm resize-none overflow-y-auto"
                placeholder="Any additional information..."
              />
            </div>
          </div>

          {/* Conversion Section - For Supply/Equipment switching */}
          {form.id && (mode === 'supply' || mode === 'equipment' || mode === 'tool') && (
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Change Inventory Category
              </h3>
              <p className="text-xs text-zinc-400 mb-3">
                Moved this item by mistake? You can switch it between Supplies and Equipment. 
                Data will be migrated when you click Save.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'supply' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('supply');
                    if (!form.costPerItem && form.price) setForm(f => ({ ...f, costPerItem: f.price }));
                    toast.info("Converted preview to Supply. Remember to Save.");
                  }}
                  className={mode === 'supply' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border-zinc-700 text-zinc-400'}
                >
                  Move to Supplies
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'equipment' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('equipment');
                    if (!form.price && form.costPerItem) setForm(f => ({ ...f, price: f.costPerItem }));
                    toast.info("Converted preview to Equipment. Remember to Save.");
                  }}
                  className={mode === 'equipment' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'border-zinc-700 text-zinc-400'}
                >
                  Move to Equipment
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between gap-2 mt-auto">
          <div className="flex gap-2">
            {form.id && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-800 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { try { window.location.href = '/reports?tab=inventory'; } catch { } }}
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              View Inventory Report
            </Button>
          </div>
          <Button
            onClick={save}
            disabled={isUploading}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
          >
            {isUploading ? 'Uploading...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {isFullscreenImage && form.imageUrl && (
      <div 
        className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 md:p-8 cursor-zoom-out animate-in fade-in duration-200"
        onClick={() => setIsFullscreenImage(false)}
      >
        <img 
          src={form.imageUrl} 
          alt="Fullscreen Preview" 
          className="max-w-full max-h-full object-contain rounded-md shadow-2xl ring-1 ring-white/10"
        />
        <button 
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full p-3 text-white transition-all hover:scale-110 active:scale-95"
          onClick={() => setIsFullscreenImage(false)}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    )}
  </>
  );
}
