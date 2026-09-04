import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import localforage from "localforage";
import { Trash2, Upload, X, ImageIcon, Info, Save, Camera, Beaker, ExternalLink, Plus as PlusIcon, RefreshCw, Sparkles, HelpCircle, AlertTriangle, Pencil } from "lucide-react";
import { compressImageForUpload } from "@/lib/image-compression";
import { supabase } from "@/lib/supa-data";
import { getChemicals as getLibraryChemicals, getChemicalById } from "@/lib/chemicals";
import { DilutionRatio } from "@/types/chemicals";
import { generateTemplate } from "@/lib/chemical-ai";
import { useDemoMode } from "@/contexts/DemoContext";
import { uploadFile } from "@/lib/storage-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Plus, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  hideFromIac?: boolean;
  updatedAt?: string;
  createdAt?: string;
  shelf?: string;
  section?: string;
  category?: string;
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
  hideFromIac?: boolean;
  createdAt?: string;
  location?: string;
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
  hideFromIac?: boolean;
  createdAt?: string;
  location?: string;
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
    { bottleSize: "", containerType: "", costPerBottle: "", actualPrice: "", currentStock: "1", threshold: "1", purchaseDate: "", wherePurchased: "", shelf: "", section: "" }
  ]);
  const [supplyPurchases, setSupplyPurchases] = useState<any[]>([
    { quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }
  ]);
  const [equipmentPurchases, setEquipmentPurchases] = useState<any[]>([
    { quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "" }
  ]);

  const [customLocationSupply, setCustomLocationSupply] = useState<Record<number, boolean>>({});
  const [customLocationEquip, setCustomLocationEquip] = useState<Record<number, boolean>>({});
  const [customContainerLocationEquip, setCustomContainerLocationEquip] = useState<Record<number, boolean>>({});
  const [customContainerLocationSupply, setCustomContainerLocationSupply] = useState<Record<number, boolean>>({});

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
    shelf: "",
    section: "",
    hideFromIac: false,
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
          const purLocs = Array.from(new Set(allItems.map(i => (i as any).wherePurchased).filter(Boolean))) as string[];
          const newPurchased = Array.from(new Set([...availablePurchased, ...purLocs])).sort();
          setAvailablePurchased(newPurchased);
          localStorage.setItem('inventory_preferred_purchased', JSON.stringify(newPurchased));

          // Item Locations (Shelves, Vans, etc.)
          const itemLocs = Array.from(new Set([...materials, ...tools].map(i => (i as any).location).filter(Boolean))) as string[];
          setAvailableLocations(prev => Array.from(new Set([...prev, ...itemLocs])).sort());

          // Container Locations (Sub-drawers, specific spots)
          const contLocs = Array.from(new Set([...materials, ...tools].map(i => (i as any).containerLocation).filter(Boolean))) as string[];
          setAvailableContainerLocations(prev => Array.from(new Set([...prev, ...contLocs])).sort());

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
  const [customShelf, setCustomShelf] = useState(false);
  const [customSection, setCustomSection] = useState(false);
  const [customLocation, setCustomLocation] = useState(false);

  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [uniqueSizes, setUniqueSizes] = useState<string[]>([]);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsFullscreenImage(false);
    }
  }, [open]);

  const DEFAULT_CONTAINER_TYPES = ["Spray Bottle", "Squeeze Bottle", "Aerosol Spray Can", "Pump Sprayer – Hand (56 oz)", "Pump Sprayer – Medium (1 gal)", "Pump Sprayer – Large (2 gal)", "Gallon Jug", "Bottle"];
  const [availableContainerTypes, setAvailableContainerTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_container_types');
    return saved ? JSON.parse(saved) : DEFAULT_CONTAINER_TYPES;
  });
  const updateContainerTypes = (newList: string[]) => {
    setAvailableContainerTypes(newList);
    localStorage.setItem('inventory_preferred_container_types', JSON.stringify(newList));
  };
  const [customContainerType, setCustomContainerType] = useState<Record<number, boolean>>({});
  const [customBottleSizeMap, setCustomBottleSizeMap] = useState<Record<number, boolean>>({});

  const DEFAULT_SIZES = ["1 unit", "1 gallon", "14 oz", "16 oz", "24 oz", "32 oz", "64 oz", "128 oz", "256 oz"];
  const DEFAULT_UNITS = ["oz", "mL", "Gallons", "Quarts", "Pints"];
  const DEFAULT_SUPPLY_UNITS = ["Units", "Pieces", "Pads", "Sheets", "Rolls", "Boxes", "lbs", "kg"];
  const DEFAULT_EQUIPMENT_UNITS = ["Units", "Pieces", "Sets"];
  const DEFAULT_PURCHASED = ["Amazon", "Home Depot", "Harbor Freight", "Lowe's", "Vevor", "Walmart", "Oreilly's Auto Parts", "Queensboro.com", "VistaPrint.com"];
  const DEFAULT_CATEGORIES = {
    supply: ["Bottles & Containers", "Brushes & Applicators", "Business & Branding", "Clay & Decontamination", "Other", "Safety & PPE", "Tools & Accessories", "Towels & Microfiber"],
    equipment: ["Accessories & Carts", "Hand Tools & Guns", "Power Equipment & Systems", "Security & Office", "Storage & Organizers"],
    chemical: ["APCs & Degreasers", "Car Washes & Soaps", "Glass Cleaners", "Interior & Carpet Care", "Polishes & Protectants", "Wheel & Tire Care", "General Chemicals"]
  };
  const DEFAULT_SUBTYPES = ["Small", "Medium", "Large", "Extra Large"];
  const DEFAULT_SHELVES = ["Bottom Shelf", "2nd Shelf", "3rd Shelf", "4th Shelf", "Top Shelf", "Small Rack - Shelf 3", "Specialty Caddy", "Interior Caddy", "Exterior Caddy"];
  const DEFAULT_SECTIONS = [
    "Left Side", "Middle", "Right Side",
    ...Array.from({ length: 8 }, (_, i) => `Interior Caddy ${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `Exterior Caddy ${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `Specialty Caddy ${i + 1}`)
  ];
  const DEFAULT_LOCATIONS = [
    "Medium Grey Rack",
    "Small Brown Rack",
    "1 x 4 Back Wall Shelf"
  ];
  const DEFAULT_CONTAINER_LOCATIONS: string[] = [
    "Bottom Shelf",
    "2nd Shelf",
    "3rd Shelf",
    "4th Shelf",
    "5th Shelf",
    "Top Shelf"
  ];

  const getSecondaryLocationsForRack = (rackName?: string): string[] => {
    if (rackName === "Medium Grey Rack") {
      return ["Bottom Shelf", "2nd Shelf", "3rd Shelf", "4th Shelf", "5th Shelf", "Top Shelf"];
    }
    if (rackName === "Small Brown Rack") {
      return ["Bottom Shelf", "2nd Shelf", "3rd Shelf", "Top Shelf"];
    }
    if (rackName === "1 x 4 Back Wall Shelf") {
      return ["Bottom Shelf", "Top Shelf"];
    }
    return DEFAULT_CONTAINER_LOCATIONS;
  };

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

  const [availableShelves, setAvailableShelves] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_shelves');
    return saved ? JSON.parse(saved) : DEFAULT_SHELVES;
  });

  const [availableSections, setAvailableSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_sections');
    return saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
  });

  const [availableLocations, setAvailableLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_locations');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const valid = parsed.filter(l => DEFAULT_LOCATIONS.includes(l));
        return Array.from(new Set([...DEFAULT_LOCATIONS, ...valid]));
      } catch {
        return DEFAULT_LOCATIONS;
      }
    }
    return DEFAULT_LOCATIONS;
  });

  const [availableContainerLocations, setAvailableContainerLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('inventory_preferred_container_locations');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const valid = parsed.filter(c => DEFAULT_CONTAINER_LOCATIONS.includes(c));
        return Array.from(new Set([...DEFAULT_CONTAINER_LOCATIONS, ...valid]));
      } catch {
        return DEFAULT_CONTAINER_LOCATIONS;
      }
    }
    return DEFAULT_CONTAINER_LOCATIONS;
  });

  const [availableCategories, setAvailableCategories] = useState<{supply: string[], equipment: string[], chemical?: string[]}>(() => {
    const saved = localStorage.getItem('inventory_preferred_categories');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    if (!parsed.chemical) parsed.chemical = DEFAULT_CATEGORIES.chemical;
    return parsed;
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

  const updateShelves = (newList: string[]) => {
    setAvailableShelves(newList);
    localStorage.setItem('inventory_preferred_shelves', JSON.stringify(newList));
  };

  const updateSections = (newList: string[]) => {
    setAvailableSections(newList);
    localStorage.setItem('inventory_preferred_sections', JSON.stringify(newList));
  };

  const updateLocations = (newList: string[]) => {
    setAvailableLocations(newList);
    localStorage.setItem('inventory_preferred_locations', JSON.stringify(newList));
  };

  const [pendingDelete, setPendingDelete] = useState<{type: string, action: () => void} | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    typeLabel: string;
    fieldKind: 'category_supply' | 'category_equipment' | 'category_chemical' | 'location' | 'container_location';
    oldValue: string;
    newValue: string;
  } | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const handleConfirmBatchEdit = async () => {
    if (!pendingEdit || !pendingEdit.newValue.trim() || pendingEdit.newValue.trim() === pendingEdit.oldValue) {
      setPendingEdit(null);
      return;
    }

    const { fieldKind, oldValue, newValue: rawNewValue } = pendingEdit;
    const newValue = rawNewValue.trim();
    setIsBatchUpdating(true);

    try {
      const { batchUpdateCategory, batchUpdateLocation, batchUpdateContainerLocation } = await import("@/lib/inventory-data");

      if (fieldKind === 'category_supply') {
        const updatedList = availableCategories.supply.map(c => c === oldValue ? newValue : c);
        updateCategories({ ...availableCategories, supply: Array.from(new Set(updatedList)).sort() });
        await batchUpdateCategory(oldValue, newValue, 'supply');
        if (form.category === oldValue) {
          setForm(prev => ({ ...prev, category: newValue }));
        }
      } else if (fieldKind === 'category_equipment') {
        const updatedList = availableCategories.equipment.map(c => c === oldValue ? newValue : c);
        updateCategories({ ...availableCategories, equipment: Array.from(new Set(updatedList)).sort() });
        await batchUpdateCategory(oldValue, newValue, 'equipment');
        if (form.category === oldValue) {
          setForm(prev => ({ ...prev, category: newValue }));
        }
      } else if (fieldKind === 'category_chemical') {
        const chemCats = availableCategories.chemical || DEFAULT_CATEGORIES.chemical;
        const updatedList = chemCats.map(c => c === oldValue ? newValue : c);
        updateCategories({ ...availableCategories, chemical: Array.from(new Set(updatedList)).sort() });
        await batchUpdateCategory(oldValue, newValue, 'chemical');
        if (form.chemicalCategory === oldValue) {
          setForm(prev => ({ ...prev, chemicalCategory: newValue }));
        }
      } else if (fieldKind === 'location') {
        const updatedList = availableLocations.map(l => l === oldValue ? newValue : l);
        updateLocations(Array.from(new Set(updatedList)).sort());
        await batchUpdateLocation(oldValue, newValue, mode);

        if (mode === 'supply' || mode === 'material') {
          setSupplyPurchases(prev => prev.map(p => p.location === oldValue ? { ...p, location: newValue } : p));
        } else {
          setEquipmentPurchases(prev => prev.map(p => p.location === oldValue ? { ...p, location: newValue } : p));
        }
        if (form.location === oldValue) setForm(prev => ({ ...prev, location: newValue }));
      } else if (fieldKind === 'container_location') {
        const updatedList = availableContainerLocations.map(c => c === oldValue ? newValue : c);
        updateContainerLocations(Array.from(new Set(updatedList)).sort());
        await batchUpdateContainerLocation(oldValue, newValue, mode);

        if (mode === 'supply' || mode === 'material') {
          setSupplyPurchases(prev => prev.map(p => p.containerLocation === oldValue ? { ...p, containerLocation: newValue } : p));
        } else {
          setEquipmentPurchases(prev => prev.map(p => p.containerLocation === oldValue ? { ...p, containerLocation: newValue } : p));
        }
      }

      sessionStorage.removeItem('inventory-loaded');
      if (onSaved) await onSaved();
      toast.success(`Updated "${oldValue}" to "${newValue}" across all items`);
    } catch (err: any) {
      console.error("Batch update failed:", err);
      toast.error("Failed to update items: " + (err.message || String(err)));
    } finally {
      setIsBatchUpdating(false);
      setPendingEdit(null);
    }
  };

  const safeDeleteOption = (type: string, action: () => void) => {
    setPendingDelete({ type, action });
  };

  const handleDeleteLocation = async (e: React.MouseEvent, loc: string) => {
    e.stopPropagation();
    setPendingDelete({
      type: `location "${loc}"`,
      action: async () => {
        const newLocs = availableLocations.filter(l => l !== loc);
        updateLocations(newLocs);
        
        if (mode === 'supply') {
          try {
            await api.patch(`/api/materials/location`, { location: loc, newLocation: '' });
          } catch (err) {
            console.error(err);
          }
        } else {
          try {
            await api.patch(`/api/equipment/location`, { location: loc, newLocation: '' });
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
  };

  const updateContainerLocations = (newList: string[]) => {
    setAvailableContainerLocations(newList);
    localStorage.setItem('inventory_preferred_container_locations', JSON.stringify(newList));
  };

  const handleDeleteContainerLocation = async (e: React.MouseEvent, loc: string) => {
    e.stopPropagation();
    setPendingDelete({
      type: `container "${loc}"`,
      action: async () => {
        const newLocs = availableContainerLocations.filter(l => l !== loc);
        updateContainerLocations(newLocs);
        
        if (mode === 'supply') {
          setSupplyPurchases(prev => prev.map(p => p.containerLocation === loc ? { ...p, containerLocation: "" } : p));
        } else if (mode === 'equipment' || mode === 'tool') {
          setEquipmentPurchases(prev => prev.map(p => p.containerLocation === loc ? { ...p, containerLocation: "" } : p));
        }
      }
    });
  };

  const updateCategories = (newList: {supply: string[], equipment: string[], chemical?: string[]}) => {
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
          containerType: c.containerType || "",
          costPerBottle: String(c.costPerBottle || c.salePrice || ""),
          actualPrice: String(c.actualPrice || ""),
          currentStock: String(c.currentStock || "1"),
          threshold: String(c.threshold || "1"),
          purchaseDate: c.purchaseDate || "",
          wherePurchased: c.wherePurchased || "",
          shelf: c.shelf || "",
          section: c.section || ""
        })));
      } else if (modeProp === 'chemical') {
        setChemicalSizes([{
          id: firstItem.id,
          bottleSize: (firstItem as any).bottleSize || "",
          containerType: (firstItem as any).containerType || "",
          costPerBottle: firstItem?.costPerBottle ? String(firstItem.costPerBottle) : ((firstItem as any).costPerBottle || (firstItem as any).salePrice || ""),
          actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
          currentStock: firstItem?.currentStock ? String(firstItem.currentStock) : ((firstItem as any).currentStock || form.currentStock),
          threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
          purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
          wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || "",
          shelf: (firstItem as any).shelf || "",
          section: (firstItem as any).section || ""
        }]);
      } else if (modeProp === 'supply') {
        if (isGroup) {
          setSupplyPurchases(initial.map((m: any) => ({
            id: m.id,
            quantity: String(m.quantity || "1"),
            costPerItem: String(m.costPerItem || m.salePrice || ""),
            actualPrice: String(m.actualPrice || ""),
            threshold: String(m.threshold || m.lowThreshold || "1"),
            purchaseDate: m.purchaseDate || m.purchase_date || "",
            wherePurchased: m.wherePurchased || m.where_purchased || "",
            location: m.location || "",
            containerLocation: m.containerLocation || m.container_location || ""
          })));
        } else {
          setSupplyPurchases([{
            id: firstItem.id,
            quantity: firstItem?.quantity ? String(firstItem.quantity) : ((firstItem as any).quantity || form.quantity),
            costPerItem: firstItem?.costPerItem ? String(firstItem.costPerItem) : ((firstItem as any).costPerItem || (firstItem as any).salePrice || ""),
            actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
            threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
            purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
            wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || "",
            location: (firstItem as any).location || "",
            containerLocation: (firstItem as any).containerLocation || (firstItem as any).container_location || ""
          }]);
        }
      } else if (modeProp === 'equipment' || modeProp === 'tool') {
        setEquipmentPurchases([{
          id: firstItem.id,
          quantity: firstItem?.quantity ? String(firstItem.quantity) : ((firstItem as any).quantity || form.quantity),
          price: (firstItem as any).price ? String((firstItem as any).price) : ((firstItem as any).salePrice || ""),
          actualPrice: (firstItem as any).actualPrice ? String((firstItem as any).actualPrice) : "",
          threshold: (firstItem as any).threshold ? String((firstItem as any).threshold) : ((firstItem as any).lowThreshold ? String((firstItem as any).lowThreshold) : form.threshold),
          purchaseDate: (firstItem as any).purchaseDate || (firstItem as any).purchase_date || "",
          wherePurchased: (firstItem as any).wherePurchased || (firstItem as any).where_purchased || "",
          location: (firstItem as any).location || "",
          containerLocation: (firstItem as any).containerLocation || (firstItem as any).container_location || ""
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
        shelf: (firstItem as any).shelf || "",
        section: (firstItem as any).section || "",
        hideFromIac: (firstItem as any).hideFromIac || false,

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
        shelf: "",
        section: "",
        hideFromIac: false,
      });
      setChemicalSizes([{ bottleSize: "", containerType: "", costPerBottle: "", actualPrice: "", currentStock: "1", threshold: "1", purchaseDate: "", wherePurchased: "", shelf: "", section: "" }]);
      setSupplyPurchases([{ quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "", location: "", containerLocation: "" }]);
      setEquipmentPurchases([{ quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "", location: "", containerLocation: "" }]);
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
            containerType: size.containerType?.trim() || undefined,
            costPerBottle: numeric(size.costPerBottle),
            currentStock: numeric(size.currentStock),
            threshold: numeric(size.threshold),
            imageUrl: form.imageUrl,
            chemicalLibraryId: form.chemicalLibraryId || undefined,
            notes: form.notes || undefined,
            dilutionRatios: form.dilutionRatios,
            wherePurchased: form.wherePurchased?.trim() || undefined,
            purchaseDate: form.purchaseDate || undefined,
            actualPrice: numeric(size.actualPrice) || undefined,
            salePrice: numeric(size.costPerBottle) || undefined,
            unitOfMeasure: form.unitOfMeasure,
            shelf: size.shelf?.trim() || undefined,
            section: size.section?.trim() || undefined,
            category: form.category || undefined,
            chemicalCategory: form.chemicalCategory || undefined,
            hideFromIac: form.hideFromIac,
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
            location: purchase.location || undefined,
            containerLocation: purchase.containerLocation || undefined,
            hideFromIac: form.hideFromIac,
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
            location: purchase.location || undefined,
            containerLocation: purchase.containerLocation || undefined,
            hideFromIac: form.hideFromIac,
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

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Basic Information
              </h3>
              <label className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 px-2 py-1 rounded border border-red-900/30 cursor-pointer hover:bg-red-900/20 transition-colors">
                <input 
                  type="checkbox" 
                  checked={form.hideFromIac || false}
                  onChange={(e) => setForm({ ...form, hideFromIac: e.target.checked })}
                  className="rounded border-zinc-700 text-red-500 focus:ring-red-500 bg-zinc-900 w-3 h-3"
                />
                Do NOT Show in IAC
              </label>
            </div>
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
                {mode === 'chemical' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-zinc-400">Chemical Category (Functional Group)</Label>
                      {!customCategory ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                            >
                              <span className="truncate">{form.chemicalCategory || "Select Chemical Category..."}</span>
                              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                            <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                              {(availableCategories.chemical || DEFAULT_CATEGORIES.chemical).map(cat => (
                                <div key={cat} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                  <span 
                                    className="flex-1 text-sm text-zinc-200" 
                                    onClick={() => setForm({...form, chemicalCategory: cat})}
                                  >
                                    {cat}
                                  </span>
                                  {form.chemicalCategory === cat && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingEdit({
                                          typeLabel: "Chemical Category",
                                          fieldKind: "category_chemical",
                                          oldValue: cat,
                                          newValue: cat
                                        });
                                      }}
                                      className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                      title="Edit category for ALL chemical items"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const chemCats = availableCategories.chemical || DEFAULT_CATEGORIES.chemical;
                                        safeDeleteOption("category", () => updateCategories({ ...availableCategories, chemical: chemCats.filter(c => c !== cat) }));
                                      }}
                                      className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                      title="Remove from presets"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="h-px bg-zinc-800 my-1" />
                              <button 
                                type="button"
                                onClick={() => {
                                  setCustomCategory(true);
                                  setForm({...form, chemicalCategory: ""});
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
                            value={form.chemicalCategory || ""}
                            autoFocus
                            onChange={(e) => setForm({ ...form, chemicalCategory: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const chemCats = availableCategories.chemical || DEFAULT_CATEGORIES.chemical;
                                if (form.chemicalCategory && !chemCats.includes(form.chemicalCategory)) {
                                  updateCategories({ ...availableCategories, chemical: [...chemCats, form.chemicalCategory].sort() });
                                }
                                setCustomCategory(false);
                              }
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                            placeholder="Enter custom chemical category..."
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const chemCats = availableCategories.chemical || DEFAULT_CATEGORIES.chemical;
                              if (form.chemicalCategory && !chemCats.includes(form.chemicalCategory)) {
                                updateCategories({ ...availableCategories, chemical: [...chemCats, form.chemicalCategory].sort() });
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
                      <Label className="text-xs text-zinc-400">Usage Type (Exterior/Interior/Both)</Label>
                      <Input
                        value={form.category || ""}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        placeholder="e.g. exterior, interior, both"
                      />
                    </div>
                  </div>
                )}
              </div>
              {mode === 'chemical' ? (
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
                          <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
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
              ) : (
                <div className="space-y-3">
                  <div className="h-full flex items-center justify-center p-4 border border-dashed border-zinc-700/50 rounded bg-zinc-800/20">
                    <p className="text-xs text-zinc-500 text-center">Purchase data is managed per-item below in Stock & Pricing.</p>
                  </div>
                </div>
              )}
            </div>

            {(mode === 'supply' || mode === 'material') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
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
                        <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                          {availableCategories.supply.map(cat => (
                            <div key={cat} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                              <span 
                                className="flex-1 text-sm text-zinc-200" 
                                onClick={() => setForm({...form, category: cat})}
                              >
                                {cat}
                              </span>
                              {form.category === cat && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingEdit({
                                      typeLabel: "Category",
                                      fieldKind: "category_supply",
                                      oldValue: cat,
                                      newValue: cat
                                    });
                                  }}
                                  className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                  title="Edit category for ALL items"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    safeDeleteOption("category", () => updateCategories({ ...availableCategories, supply: availableCategories.supply.filter(c => c !== cat) }));
                                  }}
                                  className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                  title="Remove from presets"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
                        <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
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
                                  safeDeleteOption("subtype", () => updateSubtypes(availableSubtypes.filter(s => s !== sub)));
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
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
                          {availableCategories.equipment.map(cat => (
                            <div key={cat} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                              <span 
                                className="flex-1 text-sm text-zinc-200" 
                                onClick={() => setForm({...form, category: cat})}
                              >
                                {cat}
                              </span>
                              {form.category === cat && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingEdit({
                                      typeLabel: "Category",
                                      fieldKind: "category_equipment",
                                      oldValue: cat,
                                      newValue: cat
                                    });
                                  }}
                                  className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                  title="Edit category for ALL items"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    safeDeleteOption("category", () => updateCategories({ ...availableCategories, equipment: availableCategories.equipment.filter(c => c !== cat) }));
                                  }}
                                  className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                  title="Remove from presets"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
                <div>
                  <Label className="text-xs text-zinc-400">Storage Location</Label>
                  <Input
                    value={form.location || ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    placeholder="e.g. Mobile Rig - Cabinet A"
                  />
                </div>
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
                      
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Bottle Size</Label>
                          {customBottleSizeMap[index] ? (
                            <div className="flex gap-2">
                              <Input
                                value={size.bottleSize || ""}
                                onChange={(e) => {
                                  const newSizes = [...chemicalSizes];
                                  newSizes[index].bottleSize = e.target.value;
                                  setChemicalSizes(newSizes);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm flex-1"
                                placeholder="Custom size..."
                              />
                              <Button
                                type="button"
                                variant="icon"
                                size="icon"
                                className="h-9 w-9 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 shrink-0"
                                onClick={() => {
                                  if (size.bottleSize && !availableSizes.includes(size.bottleSize)) {
                                    updateSizes([...availableSizes, size.bottleSize]);
                                  }
                                  setCustomBottleSizeMap(prev => ({ ...prev, [index]: false }));
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                                  <span className="truncate">{size.bottleSize || "Select size..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  {Array.from(new Set([...availableSizes, ...(size.bottleSize ? [size.bottleSize] : [])])).map(sz => (
                                    <div key={sz} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newSizes = [...chemicalSizes];
                                          newSizes[index].bottleSize = sz;
                                          setChemicalSizes(newSizes);
                                        }}
                                      >
                                        {sz}
                                      </span>
                                      {size.bottleSize === sz && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <button 
                                        type="button" 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          safeDeleteOption("bottle size", () => updateSizes(availableSizes.filter(s => s !== sz))); 
                                        }} 
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all" 
                                        title="Remove preset"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <div 
                                    className="flex items-center group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors"
                                    onClick={() => {
                                      setCustomBottleSizeMap(prev => ({ ...prev, [index]: true }));
                                      const newSizes = [...chemicalSizes];
                                      newSizes[index].bottleSize = "";
                                      setChemicalSizes(newSizes);
                                    }}
                                  >
                                    <PlusIcon className="h-3.5 w-3.5 text-blue-400 mr-2" />
                                    <span className="text-sm text-blue-400 font-medium">Add Custom</span>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Container Type</Label>
                          {customContainerType[index] ? (
                            <div className="flex gap-2">
                              <Input
                                value={size.containerType || ""}
                                onChange={(e) => {
                                  const newSizes = [...chemicalSizes];
                                  newSizes[index].containerType = e.target.value;
                                  setChemicalSizes(newSizes);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm flex-1"
                                placeholder="Custom container..."
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                onClick={() => {
                                  if (size.containerType && !availableContainerTypes.includes(size.containerType)) {
                                    updateContainerTypes([...availableContainerTypes, size.containerType].sort());
                                  }
                                  setCustomContainerType(prev => ({ ...prev, [index]: false }));
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                                  <span className="truncate">{size.containerType || "Select type..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  {availableContainerTypes.map(t => (
                                    <div key={t} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newSizes = [...chemicalSizes];
                                          newSizes[index].containerType = t;
                                          setChemicalSizes(newSizes);
                                        }}
                                      >
                                        {t}
                                      </span>
                                      {size.containerType === t && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <button 
                                        type="button" 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          safeDeleteOption("container type", () => updateContainerTypes(availableContainerTypes.filter(s => s !== t))); 
                                        }} 
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all" 
                                        title="Remove preset"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <div 
                                    className="flex items-center group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors"
                                    onClick={() => {
                                      setCustomContainerType(prev => ({ ...prev, [index]: true }));
                                      const newSizes = [...chemicalSizes];
                                      newSizes[index].containerType = "";
                                      setChemicalSizes(newSizes);
                                    }}
                                  >
                                    <PlusIcon className="h-3.5 w-3.5 text-purple-400 mr-2" />
                                    <span className="text-sm text-purple-400 font-bold">Add Custom Type</span>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
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
                      <div className="col-span-2 grid grid-cols-2 gap-3">
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
                          <Label className="text-xs text-zinc-400">Actual Price (MSRP)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={size.actualPrice || ""}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            onChange={(e) => {
                              const newSizes = [...chemicalSizes];
                              newSizes[index].actualPrice = e.target.value;
                              setChemicalSizes(newSizes);
                            }}
                            className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          />
                          {numeric(size.actualPrice) > numeric(size.costPerBottle) && (
                            <div className="mt-1 text-[10px] text-green-400 flex justify-between font-bold uppercase tracking-tight">
                              <span>Saved:</span>
                              <span className="font-black">
                                +${((numeric(size.actualPrice) - numeric(size.costPerBottle)) * numeric(size.currentStock)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>


                      {/* Per-row Shelf & Section */}
                      <div className="col-span-2 grid grid-cols-2 gap-3 pt-1 mt-1 border-t border-emerald-800/20">
                        <div>
                          <Label className="text-xs text-zinc-400">Shelf Location</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                                <span className="truncate">{size.shelf || "None"}</span>
                                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                              <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[260px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                  <span className="flex-1 text-sm text-zinc-200" onClick={() => { const ns = [...chemicalSizes]; ns[index].shelf = ""; setChemicalSizes(ns); }}>None</span>
                                  {!size.shelf && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                </div>
                                {availableShelves.map(shelf => (
                                  <div key={shelf} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const ns = [...chemicalSizes]; ns[index].shelf = shelf; setChemicalSizes(ns); }}>{shelf}</span>
                                    {size.shelf === shelf && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                    <button type="button" onClick={(e) => { e.stopPropagation(); safeDeleteOption("shelf", () => updateShelves(availableShelves.filter(s => s !== shelf))); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all" title="Remove preset"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                ))}
                                <div className="h-px bg-zinc-800 my-1" />
                                <div className="px-2 py-1">
                                  <Input
                                    placeholder="+ Custom shelf..."
                                    className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const v = (e.target as HTMLInputElement).value.trim();
                                        if (v) { if (!availableShelves.includes(v)) updateShelves([...availableShelves, v].sort()); const ns = [...chemicalSizes]; ns[index].shelf = v; setChemicalSizes(ns); (e.target as HTMLInputElement).value = ""; }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Section</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                                <span className="truncate">{size.section || "None"}</span>
                                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                              <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[260px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                  <span className="flex-1 text-sm text-zinc-200" onClick={() => { const ns = [...chemicalSizes]; ns[index].section = ""; setChemicalSizes(ns); }}>None</span>
                                  {!size.section && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                </div>
                                {availableSections.map(section => (
                                  <div key={section} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const ns = [...chemicalSizes]; ns[index].section = section; setChemicalSizes(ns); }}>{section}</span>
                                    {size.section === section && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                    <button type="button" onClick={(e) => { e.stopPropagation(); safeDeleteOption("section", () => updateSections(availableSections.filter(s => s !== section))); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-all" title="Remove preset"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                ))}
                                <div className="h-px bg-zinc-800 my-1" />
                                <div className="px-2 py-1">
                                  <Input
                                    placeholder="+ Custom section..."
                                    className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const v = (e.target as HTMLInputElement).value.trim();
                                        if (v) { if (!availableSections.includes(v)) updateSections([...availableSections, v].sort()); const ns = [...chemicalSizes]; ns[index].section = v; setChemicalSizes(ns); (e.target as HTMLInputElement).value = ""; }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                    </div>
                  ))}

                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-dashed border-emerald-700 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 text-sm mt-2"
                    onClick={() => setChemicalSizes([...chemicalSizes, { bottleSize: "", containerType: "", costPerBottle: "", currentStock: "1", threshold: "1", shelf: "", section: "" }])}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Another Bottle Size
                  </Button>
                </div>
              ) : (mode === 'equipment' || mode === 'tool') ? (
                <div className="space-y-4 col-span-2">
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
                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs text-zinc-400">Location</Label>
                          {!customLocationEquip[index] ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.location || "Select location..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const newP = [...equipmentPurchases]; newP[index].location = ""; setEquipmentPurchases(newP); }}>None</span>
                                    {!purchase.location && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                  </div>
                                  {availableLocations.map(loc => (
                                    <div key={loc} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...equipmentPurchases];
                                          newP[index].location = loc;
                                          setEquipmentPurchases(newP);
                                        }}
                                      >
                                        {loc}
                                      </span>
                                      {purchase.location === loc && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingEdit({
                                              typeLabel: "Location",
                                              fieldKind: "location",
                                              oldValue: loc,
                                              newValue: loc
                                            });
                                          }}
                                          className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                          title="Edit location for ALL items"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            handleDeleteLocation(e, loc);
                                          }}
                                          className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                          title="Remove preset"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setCustomLocationEquip({ ...customLocationEquip, [index]: true });
                                      const newP = [...equipmentPurchases];
                                      newP[index].location = "";
                                      setEquipmentPurchases(newP);
                                    }}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Custom Location
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                value={purchase.location || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...equipmentPurchases];
                                  newP[index].location = e.target.value;
                                  setEquipmentPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.location && !availableLocations.includes(purchase.location)) {
                                      updateLocations([...availableLocations, purchase.location].sort());
                                    }
                                    setCustomLocationEquip({ ...customLocationEquip, [index]: false });
                                  }
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                                placeholder="Enter custom location..."
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (purchase.location && !availableLocations.includes(purchase.location)) {
                                    updateLocations([...availableLocations, purchase.location].sort());
                                  }
                                  setCustomLocationEquip({ ...customLocationEquip, [index]: false });
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
                          <Label className="text-xs text-zinc-400">Container Location</Label>
                          {!customContainerLocationEquip[index] ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.containerLocation || "Select container..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const newP = [...equipmentPurchases]; newP[index].containerLocation = ""; setEquipmentPurchases(newP); }}>None</span>
                                    {!purchase.containerLocation && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                  </div>
                                  {getSecondaryLocationsForRack(purchase.location).map(loc => (
                                    <div key={loc} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...equipmentPurchases];
                                          newP[index].containerLocation = loc;
                                          setEquipmentPurchases(newP);
                                        }}
                                      >
                                        {loc}
                                      </span>
                                      {purchase.containerLocation === loc && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingEdit({
                                              typeLabel: "Container Location",
                                              fieldKind: "container_location",
                                              oldValue: loc,
                                              newValue: loc
                                            });
                                          }}
                                          className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                          title="Edit container location for ALL items"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            handleDeleteContainerLocation(e, loc);
                                          }}
                                          className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                          title="Remove preset"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setCustomContainerLocationEquip({ ...customContainerLocationEquip, [index]: true });
                                      const newP = [...equipmentPurchases];
                                      newP[index].containerLocation = "";
                                      setEquipmentPurchases(newP);
                                    }}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Custom Container
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                value={purchase.containerLocation || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...equipmentPurchases];
                                  newP[index].containerLocation = e.target.value;
                                  setEquipmentPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.containerLocation && !availableContainerLocations.includes(purchase.containerLocation)) {
                                      updateContainerLocations([...availableContainerLocations, purchase.containerLocation].sort());
                                    }
                                    setCustomContainerLocationEquip({ ...customContainerLocationEquip, [index]: false });
                                  }
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                                placeholder="e.g. Interior Carry Bag"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (purchase.containerLocation && !availableContainerLocations.includes(purchase.containerLocation)) {
                                    updateContainerLocations([...availableContainerLocations, purchase.containerLocation].sort());
                                  }
                                  setCustomContainerLocationEquip({ ...customContainerLocationEquip, [index]: false });
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                          {!customPurchased ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.wherePurchased || "Select source..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  {availablePurchased.map(source => (
                                    <div key={source} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...equipmentPurchases];
                                          newP[index].wherePurchased = source;
                                          setEquipmentPurchases(newP);
                                        }}
                                      >
                                        {source}
                                      </span>
                                      {purchase.wherePurchased === source && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
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
                                      const newP = [...equipmentPurchases];
                                      newP[index].wherePurchased = "";
                                      setEquipmentPurchases(newP);
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
                                value={purchase.wherePurchased || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...equipmentPurchases];
                                  newP[index].wherePurchased = e.target.value;
                                  setEquipmentPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.wherePurchased && !availablePurchased.includes(purchase.wherePurchased)) {
                                      updatePurchased([...availablePurchased, purchase.wherePurchased].sort());
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
                                  if (purchase.wherePurchased && !availablePurchased.includes(purchase.wherePurchased)) {
                                    updatePurchased([...availablePurchased, purchase.wherePurchased].sort());
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
                    className="w-full border-dashed border-purple-700 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 text-sm mt-2"
                    onClick={() => setEquipmentPurchases([...equipmentPurchases, { quantity: "1", price: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "", location: "", containerLocation: "" }])}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Another Purchase
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 col-span-2">
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
                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs text-zinc-400">Location</Label>
                          {!customLocationSupply[index] ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.location || "Select location..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const newP = [...supplyPurchases]; newP[index].location = ""; setSupplyPurchases(newP); }}>None</span>
                                    {!purchase.location && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                  </div>
                                  {availableLocations.map(loc => (
                                    <div key={loc} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...supplyPurchases];
                                          newP[index].location = loc;
                                          setSupplyPurchases(newP);
                                        }}
                                      >
                                        {loc}
                                      </span>
                                      {purchase.location === loc && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingEdit({
                                              typeLabel: "Location",
                                              fieldKind: "location",
                                              oldValue: loc,
                                              newValue: loc
                                            });
                                          }}
                                          className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                          title="Edit location for ALL items"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            handleDeleteLocation(e, loc);
                                          }}
                                          className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                          title="Remove preset"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setCustomLocationSupply({ ...customLocationSupply, [index]: true });
                                      const newP = [...supplyPurchases];
                                      newP[index].location = "";
                                      setSupplyPurchases(newP);
                                    }}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Custom Location
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                value={purchase.location || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...supplyPurchases];
                                  newP[index].location = e.target.value;
                                  setSupplyPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.location && !availableLocations.includes(purchase.location)) {
                                      updateLocations([...availableLocations, purchase.location].sort());
                                    }
                                    setCustomLocationSupply({ ...customLocationSupply, [index]: false });
                                  }
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                                placeholder="Enter custom location..."
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (purchase.location && !availableLocations.includes(purchase.location)) {
                                    updateLocations([...availableLocations, purchase.location].sort());
                                  }
                                  setCustomLocationSupply({ ...customLocationSupply, [index]: false });
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
                          <Label className="text-xs text-zinc-400">Container Location</Label>
                          {!customContainerLocationSupply[index] ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.containerLocation || "Select container..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }} className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  <div className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                    <span className="flex-1 text-sm text-zinc-200" onClick={() => { const newP = [...supplyPurchases]; newP[index].containerLocation = ""; setSupplyPurchases(newP); }}>None</span>
                                    {!purchase.containerLocation && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                  </div>
                                  {getSecondaryLocationsForRack(purchase.location).map(loc => (
                                    <div key={loc} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...supplyPurchases];
                                          newP[index].containerLocation = loc;
                                          setSupplyPurchases(newP);
                                        }}
                                      >
                                        {loc}
                                      </span>
                                      {purchase.containerLocation === loc && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingEdit({
                                              typeLabel: "Container Location",
                                              fieldKind: "container_location",
                                              oldValue: loc,
                                              newValue: loc
                                            });
                                          }}
                                          className="p-1 hover:text-amber-400 text-zinc-500 transition-all"
                                          title="Edit container location for ALL items"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            handleDeleteContainerLocation(e, loc);
                                          }}
                                          className="p-1 hover:text-red-400 text-zinc-500 transition-all"
                                          title="Remove preset"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="h-px bg-zinc-800 my-1" />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setCustomContainerLocationSupply({ ...customContainerLocationSupply, [index]: true });
                                      const newP = [...supplyPurchases];
                                      newP[index].containerLocation = "";
                                      setSupplyPurchases(newP);
                                    }}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-zinc-800 rounded font-medium transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Custom Container
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                value={purchase.containerLocation || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...supplyPurchases];
                                  newP[index].containerLocation = e.target.value;
                                  setSupplyPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.containerLocation && !availableContainerLocations.includes(purchase.containerLocation)) {
                                      updateContainerLocations([...availableContainerLocations, purchase.containerLocation].sort());
                                    }
                                    setCustomContainerLocationSupply({ ...customContainerLocationSupply, [index]: false });
                                  }
                                }}
                                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                                placeholder="e.g. Interior Carry Bag"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (purchase.containerLocation && !availableContainerLocations.includes(purchase.containerLocation)) {
                                    updateContainerLocations([...availableContainerLocations, purchase.containerLocation].sort());
                                  }
                                  setCustomContainerLocationSupply({ ...customContainerLocationSupply, [index]: false });
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                          {!customPurchased ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-between h-9 bg-zinc-900 border-zinc-700 text-white font-normal px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  <span className="truncate">{purchase.wherePurchased || "Select source..."}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-zinc-900 border-zinc-700 shadow-xl" align="start">
                                <div className="flex flex-col p-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                  {availablePurchased.map(source => (
                                    <div key={source} className="flex items-center justify-between group hover:bg-zinc-800 rounded px-2 py-1.5 cursor-pointer transition-colors">
                                      <span 
                                        className="flex-1 text-sm text-zinc-200" 
                                        onClick={() => {
                                          const newP = [...supplyPurchases];
                                          newP[index].wherePurchased = source;
                                          setSupplyPurchases(newP);
                                        }}
                                      >
                                        {source}
                                      </span>
                                      {purchase.wherePurchased === source && <Check className="h-3.5 w-3.5 text-blue-400 mr-2" />}
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
                                      const newP = [...supplyPurchases];
                                      newP[index].wherePurchased = "";
                                      setSupplyPurchases(newP);
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
                                value={purchase.wherePurchased || ""}
                                autoFocus
                                onChange={(e) => {
                                  const newP = [...supplyPurchases];
                                  newP[index].wherePurchased = e.target.value;
                                  setSupplyPurchases(newP);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (purchase.wherePurchased && !availablePurchased.includes(purchase.wherePurchased)) {
                                      updatePurchased([...availablePurchased, purchase.wherePurchased].sort());
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
                                  if (purchase.wherePurchased && !availablePurchased.includes(purchase.wherePurchased)) {
                                    updatePurchased([...availablePurchased, purchase.wherePurchased].sort());
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
                    onClick={() => setSupplyPurchases([...supplyPurchases, { quantity: "1", costPerItem: "", actualPrice: "", threshold: "1", purchaseDate: "", wherePurchased: "", location: "", containerLocation: "" }])}
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
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-zinc-500 uppercase">Method</Label>
                        </div>
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
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              Cancel
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
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete this {pendingDelete?.type}? Any items assigned to this {pendingDelete?.type} will lose their assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (pendingDelete) {
                  pendingDelete.action();
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingEdit} onOpenChange={(open) => !open && setPendingEdit(null)}>
        <AlertDialogContent className="bg-zinc-950 border-amber-500/40 text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Batch Update {pendingEdit?.typeLabel}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 space-y-3 pt-2 text-sm">
              <p>
                Renaming <strong className="text-white">"{pendingEdit?.oldValue}"</strong> will update this {pendingEdit?.typeLabel.toLowerCase()} for <strong className="text-amber-300 font-semibold">ALL inventory items</strong> currently assigned to it across your database.
              </p>
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold text-zinc-400">New {pendingEdit?.typeLabel} Name</Label>
                <Input
                  value={pendingEdit?.newValue || ""}
                  onChange={(e) => setPendingEdit(prev => prev ? { ...prev, newValue: e.target.value } : null)}
                  className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm focus:border-amber-500"
                  placeholder="Enter new name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmBatchEdit();
                    }
                  }}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBatchUpdating || !pendingEdit?.newValue.trim() || pendingEdit?.newValue.trim() === pendingEdit?.oldValue}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBatchEdit();
              }}
              className="bg-amber-600 text-white hover:bg-amber-500 font-semibold shadow-md disabled:opacity-50"
            >
              {isBatchUpdating ? "Updating All Items..." : "Confirm & Update All Items"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
    
    {isFullscreenImage && form.imageUrl && (
      <div 
        className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 md:p-8 cursor-zoom-out animate-in fade-in duration-200"
        onClick={(e) => { e.stopPropagation(); setIsFullscreenImage(false); }}
      >
        <img 
          src={form.imageUrl} 
          alt="Fullscreen Preview" 
          className="max-w-full max-h-full object-contain rounded-md shadow-2xl ring-1 ring-white/10"
        />
        <button 
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full p-3 text-white transition-all hover:scale-110 active:scale-95"
          onClick={(e) => { e.stopPropagation(); setIsFullscreenImage(false); }}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    )}
  </>
  );
}
