import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import { HelpTooltipPopup } from "@/components/ui/HelpTooltipPopup";
import {
  Truck,
  Package,
  Wrench,
  FlaskConical,
  Plus,
  Image as ImageIcon,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronsUp,
  Info,
  FolderOpen,
  Pencil,
  GripVertical,
  MoreVertical,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  X,
  Maximize2,
  ChevronLeft,
  ZoomIn,
  Download,
  ArrowLeft,
  FileText,
  Warehouse,
  Fuel,
  CheckSquare,
  Square,
  MapPin,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Zap,
  Search,
  SlidersHorizontal,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import {
  getChemicals,
  getMaterials,
  getTools,
  saveChemical,
  saveMaterial,
  saveTool,
  deleteTool,
  getSetupMedia,
  saveSetupMedia,
  deleteSetupMedia,
  uploadSetupMedia,
  getSetupCategories,
  saveSetupCategories,
  updateSetupMediaCategory,
  Chemical,
  Material,
  Tool,
  SetupMedia,
  SetupCategory,
} from "@/lib/inventory-data";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/contexts/DemoContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PreDepartureItem {
  id: string;
  name: string;
  category: "Chemicals" | "Supplies" | "Tools";
  location: string;
  checked: boolean;
  notes?: string;
  jobType: "full_detail" | "exterior" | "interior" | "add_ons" | "custom";
  quantity: number;
  restocked?: boolean;
}

// ─────────────────────────────────────────────────────────
// SOP-DERIVED MASTER CHECKLIST GENERATOR (Exact SOP Specs + Inventory Matching)
// ─────────────────────────────────────────────────────────
export function generateSopPreDepartureItems(
  chemicals?: Chemical[],
  materials?: Material[],
  tools?: Tool[]
): PreDepartureItem[] {
  const items: PreDepartureItem[] = [];

  const exteriorToolsSupplies = [
    { name: "Wheel Brush", category: "Tools" as const, quantity: 1 },
    { name: "Tire Scrub Brush", category: "Tools" as const, quantity: 1 },
    { name: "Pressure Washer", category: "Tools" as const, quantity: 1 },
    { name: "Bug Sponge", category: "Supplies" as const, quantity: 2 },
    { name: "Foam Cannon", category: "Tools" as const, quantity: 1 },
    { name: "Microfiber Mitts", category: "Supplies" as const, quantity: 4 },
    { name: "Grit Guard Buckets", category: "Tools" as const, quantity: 2 },
    { name: "Fine Clay Bar", category: "Supplies" as const, quantity: 1 },
    { name: "Clay Mitt", category: "Supplies" as const, quantity: 1 },
    { name: "Car Blower", category: "Tools" as const, quantity: 1 },
    { name: "Plush Drying Towel", category: "Supplies" as const, quantity: 2 },
    { name: "Microfiber Applicator", category: "Supplies" as const, quantity: 4 },
    { name: "Buffing Towel", category: "Supplies" as const, quantity: 6 },
  ];

  const exteriorChemicals = [
    { name: "Dark Fury (4:1 light / 7:1 heavy)", category: "Chemicals" as const, quantity: 1 },
    { name: "Dirt Buster / Muscle Magic", category: "Chemicals" as const, quantity: 1 },
    { name: "Road Warrior (4:1)", category: "Chemicals" as const, quantity: 1 },
    { name: "Meguiar's Gold Class / Cherry Foam (5:1)", category: "Chemicals" as const, quantity: 1 },
    { name: "Formula 4 (20:1)", category: "Chemicals" as const, quantity: 1 },
    { name: "Iron Remover", category: "Chemicals" as const, quantity: 1 },
    { name: "Tar Remover", category: "Chemicals" as const, quantity: 1 },
    { name: "Clay Lube", category: "Chemicals" as const, quantity: 1 },
    { name: "drying aid/spray wax", category: "Chemicals" as const, quantity: 1 },
    { name: "ceramic sealant/wax/coating", category: "Chemicals" as const, quantity: 1 },
    { name: "Cover All Tire Dressing", category: "Chemicals" as const, quantity: 1 },
  ];

  const interiorToolsSupplies = [
    { name: "Belongings Bag", category: "Supplies" as const, quantity: 10 },
    { name: "Pre-Inspection Form", category: "Supplies" as const, quantity: 5 },
    { name: "Air Blow Gun", category: "Tools" as const, quantity: 1 },
    { name: "Tornador", category: "Tools" as const, quantity: 1 },
    { name: "Shop Vac", category: "Tools" as const, quantity: 1 },
    { name: "Carpet Scrub Brush", category: "Tools" as const, quantity: 1 },
    { name: "Crevice Tool", category: "Tools" as const, quantity: 1 },
    { name: "Drill Brush", category: "Tools" as const, quantity: 2 },
    { name: "Detailing Brushes", category: "Supplies" as const, quantity: 5 },
    { name: "Microfiber Towel", category: "Supplies" as const, quantity: 12 },
    { name: "Horsehair Brush", category: "Tools" as const, quantity: 1 },
    { name: "Hot Water Extractor", category: "Tools" as const, quantity: 1 },
    { name: "Extractor Machine", category: "Tools" as const, quantity: 1 },
    { name: "Glass Microfiber Towel", category: "Supplies" as const, quantity: 6 },
    { name: "Reach Tool", category: "Tools" as const, quantity: 1 },
    { name: "Microfiber Applicator Pad", category: "Supplies" as const, quantity: 4 },
    { name: "Inspection Light", category: "Tools" as const, quantity: 1 },
  ];

  const interiorChemicals = [
    { name: "Carpet Bomber (7:1 std / 5:1 heavy)", category: "Chemicals" as const, quantity: 1 },
    { name: "Terminator / Zap It", category: "Chemicals" as const, quantity: 1 },
    { name: "SP Does It All Enzyme Cleaner", category: "Chemicals" as const, quantity: 1 },
    { name: "Pink Perfection (10:1)", category: "Chemicals" as const, quantity: 1 },
    { name: "Green All", category: "Chemicals" as const, quantity: 1 },
    { name: "P&S Xpress (3:1) / SP Cover All (4:1)", category: "Chemicals" as const, quantity: 1 },
    { name: "Invisible Glass", category: "Chemicals" as const, quantity: 1 },
  ];

  const addOnsItems = [
    { name: "Engine Bay Cleaner & Dressing", category: "Chemicals" as const, quantity: 1 },
    { name: "Headlight Oxidation & Polishing Kit", category: "Supplies" as const, quantity: 1 },
    { name: "Pet Hair Removal Rubber Brush & Pumice Block", category: "Tools" as const, quantity: 1 },
    { name: "Odor Fogger / Chlorine Dioxide Treatment", category: "Chemicals" as const, quantity: 2 },
    { name: "Ceramic Paint Coating Kit & Applicators", category: "Supplies" as const, quantity: 1 },
  ];

  let chemIdx = 0;
  let supIdx = 0;
  let toolIdx = 0;

  const getDefaultLoc = (cat: "Chemicals" | "Supplies" | "Tools"): string => {
    if (cat === "Chemicals") {
      chemIdx++;
      return chemIdx % 2 === 1 ? "Chemical Caddy 1" : "Chemical Caddy 2";
    }
    if (cat === "Supplies") {
      supIdx++;
      return supIdx % 2 === 1 ? "Driver Side Drawer" : "Passenger Side Compartment";
    }
    toolIdx++;
    return "Rear Bed Skid";
  };

  const findMatch = (
    itemName: string,
    cat: "Chemicals" | "Supplies" | "Tools"
  ): { location?: string; notes?: string } | null => {
    const normItem = itemName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    if (cat === "Chemicals" && chemicals && chemicals.length > 0) {
      const match = chemicals.find((c) => {
        const cName = (c.name || "").toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const cBrand = (c.brand || "").toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const fullName = `${cBrand} ${cName}`.trim();
        return (
          (cName && normItem.includes(cName)) ||
          (cName && cName.includes(normItem)) ||
          (fullName && normItem.includes(fullName)) ||
          (fullName && fullName.includes(normItem))
        );
      });
      if (match) {
        const loc = match.shelfLocation || match.shelf || "Chemical Caddy 1";
        const ratioStr = match.dilutionRatios && match.dilutionRatios.length > 0
          ? ` (${match.dilutionRatios.map(d => `${d.method || d.soil_level || 'Dilution'}: ${d.ratio}`).join(', ')})`
          : '';
        return { location: loc, notes: `Linked Inventory: ${match.brand ? `${match.brand} ` : ''}${match.name}${ratioStr}` };
      }
    }

    if (cat === "Supplies" && materials && materials.length > 0) {
      const match = materials.find((m) => {
        const mName = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return mName && (normItem.includes(mName) || mName.includes(normItem));
      });
      if (match) {
        return { location: match.location || "Driver Side Drawer", notes: `Linked Inventory: ${match.name}` };
      }
    }

    if (cat === "Tools" && tools && tools.length > 0) {
      const match = tools.find((t) => {
        const tName = (t.name || "").toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return tName && (normItem.includes(tName) || tName.includes(normItem));
      });
      if (match) {
        return { location: match.location || "Rear Bed Skid", notes: `Linked Inventory: ${match.name}` };
      }
    }

    return null;
  };

  const buildItem = (
    raw: { name: string; category: "Chemicals" | "Supplies" | "Tools"; quantity?: number },
    jobType: "exterior" | "interior" | "add_ons" | "full_detail"
  ): PreDepartureItem => {
    const match = findMatch(raw.name, raw.category);
    const cleanId = raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
      id: `sop-${jobType}-${cleanId}`,
      name: raw.name,
      category: raw.category,
      location: match?.location || getDefaultLoc(raw.category),
      checked: true,
      jobType,
      quantity: raw.quantity || 1,
      restocked: true,
      notes: match?.notes || `SOP Baseline Default (${jobType === 'full_detail' ? 'Full Detail' : jobType === 'exterior' ? 'Exterior Detail' : jobType === 'interior' ? 'Interior Detail' : 'Add-Ons'})`
    };
  };

  // 1. Exterior Loadout (24 items)
  exteriorToolsSupplies.forEach(raw => items.push(buildItem(raw, "exterior")));
  exteriorChemicals.forEach(raw => items.push(buildItem(raw, "exterior")));

  // 2. Interior Loadout (24 items)
  interiorToolsSupplies.forEach(raw => items.push(buildItem(raw, "interior")));
  interiorChemicals.forEach(raw => items.push(buildItem(raw, "interior")));

  // 3. Add-Ons Loadout (5 items)
  addOnsItems.forEach(raw => items.push(buildItem(raw, "add_ons")));

  // 4. Full Detail Loadout (Combined Exterior + Interior, no duplicates)
  const fullCombined = [
    ...exteriorToolsSupplies,
    ...exteriorChemicals,
    ...interiorToolsSupplies,
    ...interiorChemicals
  ];

  const seenFullNames = new Set<string>();
  fullCombined.forEach(raw => {
    if (!seenFullNames.has(raw.name)) {
      seenFullNames.add(raw.name);
      items.push(buildItem(raw, "full_detail"));
    }
  });

  return items;
}

const DEFAULT_PREDEPARTURE: PreDepartureItem[] = [
  // Full Detail Loadout
  { id: "pd-1", name: "Wheel & Tire Cleaner", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-2", name: "All Purpose Cleaner (APC)", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-3", name: "Glass Cleaner (Streak Free)", category: "Chemicals", location: "Chemical Caddy 2", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-4", name: "Rinseless / Wash Soap", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-5", name: "Ceramic Sealant / Bead Maker", category: "Chemicals", location: "Chemical Caddy 2", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-6", name: "Leather / Vinyl Conditioner", category: "Chemicals", location: "Chemical Caddy 2", checked: false, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-7", name: "Microfiber Towels (Edgeless)", category: "Supplies", location: "Driver Side Drawer", checked: true, jobType: "full_detail", quantity: 12, restocked: true },
  { id: "pd-8", name: "Drying Towels (Gauntlet)", category: "Supplies", location: "Driver Side Drawer", checked: true, jobType: "full_detail", quantity: 4, restocked: true },
  { id: "pd-9", name: "Detailing Brushes & Drill Brushes", category: "Supplies", location: "Passenger Side Compartment", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-10", name: "Nitrile Gloves (Large/XL)", category: "Supplies", location: "Passenger Side Compartment", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-11", name: "50ft Commercial Extension Cord", category: "Supplies", location: "Rear Bed Skid", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-12", name: "Pressure Washer Hose Reel", category: "Tools", location: "Rear Bed Skid", checked: true, jobType: "full_detail", quantity: 1, restocked: true },
  { id: "pd-13", name: "Commercial Vacuum & Extractor", category: "Tools", location: "Rear Bed Skid", checked: true, jobType: "full_detail", quantity: 1, restocked: true },

  // Exterior Detail Loadout
  { id: "pd-14", name: "Heavy Duty Foam Cannon & Wash Soap", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "exterior", quantity: 1, restocked: true },
  { id: "pd-15", name: "Iron Decontamination Spray & Clay Bar", category: "Chemicals", location: "Chemical Caddy 2", checked: true, jobType: "exterior", quantity: 1, restocked: true },
  { id: "pd-16", name: "Tire Dressing & Applicators", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "exterior", quantity: 1, restocked: true },
  { id: "pd-17", name: "Gauntlet Drying Towels", category: "Supplies", location: "Driver Side Drawer", checked: true, jobType: "exterior", quantity: 4, restocked: true },
  { id: "pd-18", name: "Pressure Washer & 50ft Hose", category: "Tools", location: "Rear Bed Skid", checked: true, jobType: "exterior", quantity: 1, restocked: true },

  // Interior Detail Loadout
  { id: "pd-19", name: "Interior APC & Carpet Cleaner", category: "Chemicals", location: "Chemical Caddy 1", checked: true, jobType: "interior", quantity: 1, restocked: true },
  { id: "pd-20", name: "Leather Clean & Protect", category: "Chemicals", location: "Chemical Caddy 2", checked: true, jobType: "interior", quantity: 1, restocked: true },
  { id: "pd-21", name: "Steam Extractor & Drill Brushes", category: "Tools", location: "Rear Bed Skid", checked: true, jobType: "interior", quantity: 1, restocked: true },
  { id: "pd-22", name: "Microfiber & Glass Towels", category: "Supplies", location: "Driver Side Drawer", checked: true, jobType: "interior", quantity: 12, restocked: true },
  { id: "pd-23", name: "Pet Hair Removal Brushes", category: "Supplies", location: "Passenger Side Compartment", checked: true, jobType: "interior", quantity: 1, restocked: true },
];

const RIG_LOCATIONS = [
  "Driver Side Drawer",
  "Passenger Side Compartment",
  "Rear Bed Skid",
  "Chemical Caddy 1",
  "Chemical Caddy 2",
  "Under-Seat Storage"
];

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
const MobileSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { isDemoMode } = useDemoMode();
  const isAdmin = user?.role === 'admin' || isDemoMode;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<SetupMedia[]>([]);
  const [categories, setCategories] = useState<SetupCategory[]>([]);

  // Single Unified SOP Checklist state
  const [sopChecklist, setSopChecklist] = useState<PreDepartureItem[]>(() => {
    try {
      const saved = localStorage.getItem("f150_sop_predeparture_checklist");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return generateSopPreDepartureItems();
  });

  // Workflow mode: "packing" (Pre-Departure) vs "restock" (Post-Job Return & Refill)
  const [checklistMode, setChecklistMode] = useState<"packing" | "restock">("packing");

  const checklist = sopChecklist;

  const setChecklist = (updater: PreDepartureItem[] | ((prev: PreDepartureItem[]) => PreDepartureItem[])) => {
    setSopChecklist((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem("f150_sop_predeparture_checklist", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem("f150_sop_predeparture_checklist", JSON.stringify(sopChecklist));
    } catch (e) {
      console.error("Failed to save SOP checklist to local storage", e);
    }
  }, [sopChecklist]);

  // Dynamic custom rig locations list
  const [customRigLocations, setCustomRigLocations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("f150_custom_rig_locations");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allRigLocations = useMemo(() => {
    const combined = [...RIG_LOCATIONS, ...customRigLocations];
    return Array.from(new Set(combined));
  }, [customRigLocations]);

  // User-saved loadout snapshot for Reset functionality
  const [userSavedSnapshot, setUserSavedSnapshot] = useState<PreDepartureItem[]>(() => {
    try {
      const saved = localStorage.getItem("f150_saved_loadout_snapshot");
      return saved ? JSON.parse(saved) : generateSopPreDepartureItems();
    } catch {
      return generateSopPreDepartureItems();
    }
  });

  const [equipmentSubTab, setEquipmentSubTab] = useState<"checklist" | "locations" | "condition">("checklist");
  const [selectedJobType, setSelectedJobType] = useState<"full_detail" | "exterior" | "interior" | "add_ons" | "custom" | "all">("full_detail");
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>("all");
  
  // Storage Locations Search state
  const [locationSearch, setLocationSearch] = useState("");

  // Condition & Fuel Search/Filter state
  const [conditionSearch, setConditionSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState<"all" | "good" | "worn" | "needs_replacement">("all");
  const [editingToolId, setEditingToolId] = useState<string | null>(null);

  // Modal State for Adding Pre-Departure Checklist Items with Custom Field Support
  const [addChecklistOpen, setAddChecklistOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState<{
    name: string;
    category: string;
    customCategory: string;
    location: string;
    customLocation: string;
    jobType: string;
    customJobType: string;
    quantity: number;
  }>({
    name: "",
    category: "Supplies",
    customCategory: "",
    location: "Driver Side Drawer",
    customLocation: "",
    jobType: "full_detail",
    customJobType: "",
    quantity: 1,
  });

  // Modal State for Adding Equipment (Condition & Fuel Tab)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState<{
    name: string;
    category: string;
    customCategory: string;
    location: string;
    customLocation: string;
    conditionStatus: "good" | "worn" | "needs_replacement" | "new";
    fuelLevel: "full" | "3/4" | "1/2" | "1/4" | "low" | "n/a";
    conditionNote: string;
  }>({
    name: "",
    category: "Tools & Equipment",
    customCategory: "",
    location: "Rear Bed Skid",
    customLocation: "",
    conditionStatus: "good",
    fuelLevel: "full",
    conditionNote: "",
  });

  // Search Results across Master Inventory (Chemicals, Materials, Tools)
  const masterSearchResults = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return [];

    const chemMatches = chemicals
      .filter((c) => (c.name || "").toLowerCase().includes(q) || (c.brand || "").toLowerCase().includes(q))
      .map((c) => ({
        id: `chem-${c.id}`,
        name: c.brand ? `${c.brand} ${c.name}` : c.name,
        category: "Chemicals" as const,
        defaultLoc: c.shelfLocation || c.shelf || "Chemical Caddy 1",
      }));

    const matMatches = materials
      .filter((m) => (m.name || "").toLowerCase().includes(q))
      .map((m) => ({
        id: `mat-${m.id}`,
        name: m.name,
        category: "Supplies" as const,
        defaultLoc: m.location || "Driver Side Drawer",
      }));

    const toolMatches = tools
      .filter((t) => (t.name || "").toLowerCase().includes(q))
      .map((t) => ({
        id: `tool-${t.id}`,
        name: t.name,
        category: "Tools" as const,
        defaultLoc: t.location || "Rear Bed Skid",
      }));

    return [...chemMatches, ...matMatches, ...toolMatches];
  }, [locationSearch, chemicals, materials, tools]);

  // Curated Tools list for Condition & Fuel tab
  const curatedTools = useMemo(() => {
    return tools.filter((t) => {
      const matchSearch = !conditionSearch || (t.name || "").toLowerCase().includes(conditionSearch.toLowerCase().trim());
      const matchFilter = conditionFilter === "all" || t.conditionStatus === conditionFilter;
      return matchSearch && matchFilter;
    });
  }, [tools, conditionSearch, conditionFilter]);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const selectAllChecklist = (jobType?: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        !jobType || jobType === "all" || item.jobType === jobType ? { ...item, checked: true } : item
      )
    );
  };

  const uncheckAllChecklist = (jobType?: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        !jobType || jobType === "all" || item.jobType === jobType ? { ...item, checked: false } : item
      )
    );
  };

  const saveCurrentLoadoutSnapshot = () => {
    try {
      localStorage.setItem("f150_saved_loadout_snapshot", JSON.stringify(checklist));
      setUserSavedSnapshot(checklist);
      toast({
        title: "Loadout Snapshot Saved",
        description: "Saved current rig checklist as your custom user baseline.",
      });
    } catch {
      toast({ title: "Save Error", description: "Could not save loadout snapshot.", variant: "destructive" });
    }
  };

  const resetToUserSavedSnapshot = () => {
    setChecklist(userSavedSnapshot);
    toast({
      title: "Reset to Saved Baseline",
      description: "Restored checklist to your last saved snapshot.",
    });
  };

  const toggleItemRestockStatus = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, restocked: item.restocked === false ? true : false } : item))
    );
  };

  const markAllRestocked = (jobType?: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        !jobType || jobType === "all" || item.jobType === jobType ? { ...item, restocked: true } : item
      )
    );
    toast({
      title: "All Restocked & Full",
      description: "Marked all loadout items as restocked and ready for the next job.",
    });
  };

  const updateItemQuantity = (id: string, qty: number) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const restoreFactoryDefaults = () => {
    const fresh = generateSopPreDepartureItems(chemicals, materials, tools);
    setChecklist(fresh);
    toast({
      title: "Restored to SOP Baseline",
      description: "Restored checklist to original SOP baseline.",
    });
  };

  const handleAddMasterItemToChecklist = (
    item: { name: string; category: "Chemicals" | "Supplies" | "Tools"; defaultLoc: string },
    targetJobType: "full_detail" | "exterior" | "interior" | "add_ons" | "custom"
  ) => {
    const newItem: PreDepartureItem = {
      id: `pd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: item.name,
      category: item.category,
      location: item.defaultLoc,
      checked: false,
      jobType: targetJobType,
      quantity: 1,
      restocked: true,
    };
    setChecklist((prev) => [...prev, newItem]);
    setLocationSearch("");
    toast({
      title: "Added to Checklist",
      description: `${item.name} added to ${targetJobType.replace("_", " ").toUpperCase()} checklist.`,
    });
  };

  const handleRemoveItemFromChecklist = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Item Removed", description: "Item removed from rig checklist." });
  };

  const handleUpdateChecklistItemLocation = (id: string, newLocation: string) => {
    if (newLocation === "custom") {
      const customVal = prompt("Enter new custom rig location name:");
      if (!customVal || !customVal.trim()) return;
      const cleanVal = customVal.trim();
      if (!customRigLocations.includes(cleanVal)) {
        const updated = [...customRigLocations, cleanVal];
        setCustomRigLocations(updated);
        localStorage.setItem("f150_custom_rig_locations", JSON.stringify(updated));
      }
      setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, location: cleanVal } : item)));
      toast({ title: "Custom Location Saved", description: `Item assigned to ${cleanVal}` });
      return;
    }
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, location: newLocation } : item)));
    toast({ title: "Location Updated", description: `Item assigned to ${newLocation}` });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.name.trim()) return;

    let finalCategory = newChecklistItem.category;
    if (finalCategory === "custom") {
      finalCategory = newChecklistItem.customCategory.trim() || "Supplies";
    }

    let finalJobType: any = newChecklistItem.jobType;
    if (finalJobType === "custom_input") {
      finalJobType = "custom";
    }

    let finalLocation = newChecklistItem.location;
    if (finalLocation === "custom") {
      finalLocation = newChecklistItem.customLocation.trim() || "Driver Side Drawer";
      if (newChecklistItem.customLocation.trim() && !customRigLocations.includes(newChecklistItem.customLocation.trim())) {
        const updatedLocs = [...customRigLocations, newChecklistItem.customLocation.trim()];
        setCustomRigLocations(updatedLocs);
        localStorage.setItem("f150_custom_rig_locations", JSON.stringify(updatedLocs));
      }
    }

    const item: PreDepartureItem = {
      id: `pd-${Date.now()}`,
      name: newChecklistItem.name.trim(),
      category: finalCategory as any,
      location: finalLocation,
      checked: false,
      jobType: finalJobType,
      quantity: newChecklistItem.quantity || 1,
      restocked: true,
    };

    setChecklist((prev) => [...prev, item]);
    setNewChecklistItem({
      name: "",
      category: "Supplies",
      customCategory: "",
      location: "Driver Side Drawer",
      customLocation: "",
      jobType: "full_detail",
      customJobType: "",
      quantity: 1,
    });
    setAddChecklistOpen(false);
    toast({ title: "Item Added", description: `${item.name} added to pre-departure checklist.` });
  };

  const handleAddEquipmentEntry = async () => {
    if (!newEquipment.name.trim()) return;

    let finalLoc = newEquipment.location;
    if (finalLoc === "custom") {
      finalLoc = newEquipment.customLocation.trim() || "Rear Bed Skid";
      if (newEquipment.customLocation.trim() && !customRigLocations.includes(newEquipment.customLocation.trim())) {
        const updated = [...customRigLocations, newEquipment.customLocation.trim()];
        setCustomRigLocations(updated);
        localStorage.setItem("f150_custom_rig_locations", JSON.stringify(updated));
      }
    }

    let finalCat = newEquipment.category;
    if (finalCat === "custom") {
      finalCat = newEquipment.customCategory.trim() || "Tools & Equipment";
    }

    const newToolObj: Tool = {
      id: `tool-${Date.now()}`,
      name: newEquipment.name.trim(),
      category: finalCat,
      location: finalLoc,
      conditionStatus: newEquipment.conditionStatus,
      fuelLevel: newEquipment.fuelLevel,
      conditionNote: newEquipment.conditionNote.trim(),
      notes: newEquipment.conditionNote.trim() || "Added via Mobile Setup",
      purchaseDate: new Date().toISOString().split("T")[0],
      warranty: "N/A",
      lifeExpectancy: "2 Years",
      price: 0,
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTools((prev) => [newToolObj, ...prev]);
    try {
      await saveTool(newToolObj, true);
      toast({ title: "Equipment Entry Added", description: `${newToolObj.name} added to rig inventory.` });
    } catch {
      toast({ title: "Save Error", description: "Could not save equipment entry to database.", variant: "destructive" });
    }

    setAddEquipmentOpen(false);
    setNewEquipment({
      name: "",
      category: "Tools & Equipment",
      customCategory: "",
      location: "Rear Bed Skid",
      customLocation: "",
      conditionStatus: "good",
      fuelLevel: "full",
      conditionNote: "",
    });
  };

  const handleDeleteEquipmentEntry = async (toolId: string, toolName: string) => {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
    try {
      await deleteTool(toolId);
      toast({ title: "Equipment Deleted", description: `${toolName} removed from rig inventory.` });
    } catch {
      toast({ title: "Delete Error", description: "Could not delete tool from database.", variant: "destructive" });
    }
  };

  const handleUpdateToolCondition = async (toolId: string, updates: Partial<Tool>) => {
    const target = tools.find((t) => t.id === toolId);
    if (!target) return;
    const updated: Tool = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setTools((prev) => prev.map((t) => (t.id === toolId ? updated : t)));
    try {
      await saveTool(updated, true);
      toast({ title: "Equipment Specs Saved", description: `${target.name} condition and fuel updated.` });
    } catch {
      toast({ title: "Save Error", description: "Could not update tool data.", variant: "destructive" });
    }
  };

  const handleUpdateItemLocation = async (itemType: "chemical" | "material" | "tool", itemId: string, newLocation: string) => {
    try {
      if (itemType === "chemical") {
        const target = chemicals.find(c => c.id === itemId);
        if (target) {
          const updated = { ...target, shelfLocation: newLocation, updatedAt: new Date().toISOString() };
          setChemicals(prev => prev.map(c => c.id === itemId ? updated : c));
          await saveChemical(updated, true);
        }
      } else if (itemType === "material") {
        const target = materials.find(m => m.id === itemId);
        if (target) {
          const updated = { ...target, location: newLocation, updatedAt: new Date().toISOString() };
          setMaterials(prev => prev.map(m => m.id === itemId ? updated : m));
          await saveMaterial(updated, true);
        }
      } else {
        const target = tools.find(t => t.id === itemId);
        if (target) {
          const updated = { ...target, location: newLocation, updatedAt: new Date().toISOString() };
          setTools(prev => prev.map(t => t.id === itemId ? updated : t));
          await saveTool(updated, true);
        }
      }
      toast({ title: "Location Updated", description: `Storage location changed to ${newLocation}` });
    } catch {
      toast({ title: "Error", description: "Could not update storage location.", variant: "destructive" });
    }
  };

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>("all");

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addType, setAddType] = useState<"chemical" | "material" | "tool">("tool");
  const [newItem, setNewItem] = useState({ name: "", brand: "", category: "Supplies" });

  // Category Manager
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<SetupCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [savingCats, setSavingCats] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Derived: visual media in display order (exclude PDFs for the photo lightbox)
  const visualMedia = useMemo(() => {
    const result: SetupMedia[] = [];
    const sortedCats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // 1. Items in sorted categories
    sortedCats.forEach(cat => {
      const catMedia = media.filter(m => m.category === cat.id && m.type !== 'pdf');
      result.push(...catMedia);
    });
    
    // 2. Uncategorized items (no category, 'none', or missing category)
    const uncategorizedItems = media.filter(m => 
      m.type !== 'pdf' && 
      (!m.category || m.category === 'none' || !categories.find(c => c.id === m.category))
    );
    result.push(...uncategorizedItems);
    
    return result;
  }, [media, categories]);

  const toggleCatCollapse = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const moveCatToTop = async (idx: number) => {
    if (idx <= 0) return;
    const updated = [...categories];
    const [cat] = updated.splice(idx, 1);
    updated.unshift(cat);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    await saveSetupCategories(reordered);
  };

  // ─── Load ─────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [c, m, t, savedMedia, savedCats] = await Promise.all([
        getChemicals(),
        getMaterials(),
        getTools(),
        getSetupMedia(),
        getSetupCategories(),
      ]);
      setChemicals(c);
      setMaterials(m);
      setTools(t);
      setMedia(savedMedia || []);
      setCategories(savedCats || []);

      // Auto-link SOP pre-departure checklist against loaded inventory
      const sopLinked = generateSopPreDepartureItems(c, m, t);
      setSopChecklist(sopLinked);
      try {
        localStorage.setItem("f150_sop_predeparture_checklist", JSON.stringify(sopLinked));
      } catch {}
      // Default to "all" to show the full list in natural order
      if (selectedCategoryForUpload === "none") {
        setSelectedCategoryForUpload("all");
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Upload Multiple ──────────────────────────────────
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      files.map(async (file) => {
        try {
          const isPdf = file.type === "application/pdf";
          const type = isPdf ? "pdf" : file.type.startsWith("video") ? "video" : "image";
          const publicUrl = await uploadSetupMedia(file);
          if (!publicUrl) throw new Error(`No URL for ${file.name}`);

          const newMedia: SetupMedia = {
            id: crypto.randomUUID(),
            type: type as "image" | "video" | "pdf",
            url: publicUrl,
            caption: file.name,
            category: selectedCategoryForUpload === "none" ? undefined : selectedCategoryForUpload,
            createdAt: new Date().toISOString()
          };

          await saveSetupMedia(newMedia);
          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          failCount++;
        } finally {
          setUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
        }
      })
    );

    const updated = await getSetupMedia();
    setMedia(updated);

    if (successCount > 0 && failCount === 0) {
      toast({ title: `${successCount} Photo${successCount > 1 ? "s" : ""} Uploaded`, description: "Synced to Supabase." });
    } else if (successCount > 0) {
      toast({ title: "Partial Upload", description: `${successCount} ok, ${failCount} failed.`, variant: "destructive" });
    } else {
      toast({ title: "Upload Failed", description: `${failCount} file(s) could not upload.`, variant: "destructive" });
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Reassign category ────────────────────────────────
  const handleReassign = async (mediaId: string, newCatId: string) => {
    try {
      await updateSetupMediaCategory(mediaId, newCatId);
      setMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, category: newCatId } : m)));
    } catch {
      toast({ title: "Error", description: "Could not reassign category.", variant: "destructive" });
    }
  };

  // ─── Remove media ─────────────────────────────────────
  const removeMedia = async (id: string) => {
    if (isDemoMode) {
      toast({ title: "Permission Denied", description: "Read-only mode active.", variant: "destructive" });
      return;
    }
    try {
      if (!confirm("Are you sure you want to delete this media from the mobile setup?")) return;
      await deleteSetupMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Photo Removed", description: "Deleted from Supabase." });
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const openLightbox = (id: string) => {
    const index = visualMedia.findIndex(m => m.id === id);
    if (index !== -1) {
      setCurrentMediaIndex(index);
      setLightboxOpen(true);
    }
  };

  const nextMedia = () => setCurrentMediaIndex((prev) => (prev + 1) % visualMedia.length);
  const prevMedia = () => setCurrentMediaIndex((prev) => (prev - 1 + visualMedia.length) % visualMedia.length);

  // ─── Category CRUD ────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCats(true);
    try {
      const newCat: SetupCategory = {
        id: `cat_${Date.now()}`,
        name: newCatName.trim(),
        order: categories.length,
      };
      const updated = [...categories, newCat];
      await saveSetupCategories(updated);
      setCategories(updated);
      setNewCatName("");
      toast({ title: "Category Added", description: newCat.name });
    } catch {
      toast({ title: "Error", description: "Could not add category.", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const handleRenameCategory = async () => {
    if (!editingCat || !newCatName.trim()) return;
    setSavingCats(true);
    try {
      const updated = categories.map((c) =>
        c.id === editingCat.id ? { ...c, name: newCatName.trim() } : c
      );
      await saveSetupCategories(updated);
      setCategories(updated);
      setEditingCat(null);
      setNewCatName("");
      toast({ title: "Renamed", description: newCatName });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const handleDeleteCategory = async (cat: SetupCategory) => {
    const usedCount = media.filter((m) => m.category === cat.id).length;
    if (usedCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `Move or delete the ${usedCount} photo(s) in "${cat.name}" first.`,
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"? This action cannot be undone.`)) {
      return;
    }

    setSavingCats(true);
    try {
      const updated = categories.filter((c) => c.id !== cat.id).map((c, i) => ({ ...c, order: i }));
      await saveSetupCategories(updated);
      setCategories(updated);
      toast({ title: `"${cat.name}" deleted` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const moveCat = async (idx: number, dir: -1 | 1) => {
    const updated = [...categories];
    const swap = idx + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    await saveSetupCategories(reordered);
  };

  // ─── Quick Add inventory ──────────────────────────────
  const handleQuickAdd = async () => {
    if (!newItem.name) return;
    try {
      if (addType === "tool") {
        await saveTool({ name: newItem.name, notes: newItem.brand || "", warranty: "1 Year", purchaseDate: new Date().toISOString().split("T")[0], price: 0, lifeExpectancy: "2 Years" }, true);
      } else if (addType === "material") {
        await saveMaterial({ name: newItem.name, category: newItem.category || "Supplies", quantity: 1, costPerItem: 0 }, true);
      } else {
        await saveChemical({ name: newItem.name, brand: newItem.brand, bottleSize: "32oz", threshold: 2, currentStock: 1, costPerBottle: 0 }, true);
      }
      toast({ title: "Inventory Updated", description: `${newItem.name} added to Supabase.` });
      setQuickAddOpen(false);
      loadData();
      setNewItem({ name: "", brand: "", category: "Supplies" });
    } catch {
      toast({ title: "Error", description: "Could not add item.", variant: "destructive" });
    }
  };

  // ─── Derived: media grouped by category (Excluding PDFs for Visual Gallery) ──────────────
  const uncategorized = media.filter((m) => 
    m.type !== 'pdf' && (!m.category || !categories.find((c) => c.id === m.category))
  );

  const getMediaForCat = (catId: string) => media.filter((m) => m.category === catId && m.type !== 'pdf');

  const displayCategories = useMemo(() => {
    // Basic list of categories
    let list = [...categories];
    
    // Add "Uncategorized" to the list if there are any uncategorized items
    if (uncategorized.length > 0) {
      list.push({ id: 'none', name: 'General Area', order: 999 });
    }

    if (!selectedCategoryForUpload || selectedCategoryForUpload === 'all') return list;
    
    const selected = list.find(c => c.id === selectedCategoryForUpload);
    if (!selected) return list;
    
    const others = list.filter(c => c.id !== selectedCategoryForUpload);
    return [selected, ...others];
  }, [categories, selectedCategoryForUpload, uncategorized.length]);

  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-indigo-500/30 w-full overflow-x-hidden">
      <PageHeader title="F150 Command Center" />

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">

        {/* Hero Header */}
        <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 shadow-2xl overflow-hidden p-6 md:p-10">
          <div className="absolute inset-0 bg-[url('/MoblieSetup.jpg')] opacity-50 bg-cover bg-[position:center_40%]" />
          
          <div className="relative z-10 flex flex-col items-center text-center xl:text-left xl:items-start xl:flex-row gap-6 md:gap-8">
            <div className="relative h-16 w-16 md:h-20 md:w-20 flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group shrink-0">
              <Truck className="h-8 w-8 md:h-10 md:w-10 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
            </div>

            <div className="flex-1 w-full min-w-[250px]">
              <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-2 md:mb-3 leading-tight">F150 Command Center</h1>
              <p className="text-zinc-400 text-xs sm:text-sm md:text-lg font-medium max-w-2xl mx-auto xl:mx-0 leading-relaxed">
                Professional mobile detailing configuration. Real-time equipment inventory and visual setup documentation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center xl:justify-start gap-3 md:gap-4 w-full xl:w-auto items-center">
              <HelpTooltipPopup
                title="Mobile Setup Instructions"
                subtitle="F-150 detailing rig setup & pre-departure loadouts"
                triggerLabel="Mobile Setup Guide"
                side="bottom"
                align="end"
                steps={[
                  {
                    title: "1. Mobile Rig Configuration",
                    desc: "Manage mobile detailing truck equipment, drawer storage locations, condition status, and fuel levels."
                  },
                  {
                    title: "2. Visual Rig Setup",
                    desc: "Upload photos of driver drawers, passenger compartments, and rear bed skids for visual technician orientation."
                  },
                  {
                    title: "3. Pre-Departure Checklists",
                    desc: "Verify loadouts before leaving the shop to prevent forgotten gear on job sites."
                  }
                ]}
              />
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm flex-1 sm:flex-none"
                onClick={(e) => { e.stopPropagation(); setCatManagerOpen(true); }}
              >
                <FolderOpen className="h-4 w-4 md:h-5 md:w-5" /> Manage Categories
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm flex-1 sm:flex-none"
                  onClick={() => navigate("/shop-setup")}
                >
                  <Warehouse className="h-4 w-4 md:h-5 md:w-5" /> Switch to Shop
                </Button>
              )}
              <Button
                disabled={uploading}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest px-8 md:px-10 h-12 md:h-14 shadow-xl shadow-indigo-600/40 active:scale-95 transition-all flex-1 sm:flex-none"
              >
                {uploading && uploadProgress
                  ? <><span className="mr-2 animate-bounce">↑</span> {uploadProgress.done}/{uploadProgress.total}</>
                  : <><Plus className="mr-2 h-5 w-5 md:h-6 md:w-6" />Add Rig Photos</>}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="gallery" className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-auto w-full justify-center flex-wrap gap-1">
            <TabsTrigger value="gallery" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px]">
              <ImageIcon className="mr-2 h-4 w-4" /> Visual Setup
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px]">
              <Package className="mr-2 h-4 w-4" /> Equipment Pool
            </TabsTrigger>
          </TabsList>

          {/* ── GALLERY TAB ─────────────────────────────── */}
          <TabsContent value="gallery" className="mt-0 space-y-12">

            <div className="flex flex-col md:flex-row items-center gap-4 p-5 md:p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl w-full relative z-10">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Quick Gear Tag:</span>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-600 hover:text-indigo-400 bg-black/20"
                    onClick={() => setCatManagerOpen(true)}
                    title="Manage Categories"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                <Select value={selectedCategoryForUpload} onValueChange={setSelectedCategoryForUpload}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm font-bold h-12 w-full md:w-72">
                    <SelectValue placeholder="Filter by area" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectItem value="all" className="text-sm font-bold">Show All Areas</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm font-bold">{c.name}</SelectItem>
                    ))}
                    <SelectItem value="none" className="text-sm text-zinc-500">— Uncategorized —</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="lg"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] h-12 w-full md:w-auto border border-zinc-800"
                >
                  {uploading ? `Processing ${uploadProgress?.done}...` : "Select From Device"}
                </Button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*,application/pdf"
              multiple
              onChange={handleMediaUpload}
            />

            {/* If no media at all */}
            {media.length === 0 && (
              <Card className="bg-zinc-900/30 border-dashed border-zinc-800 p-20 text-center rounded-3xl">
                <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No setup views yet</h3>
                <p className="text-zinc-500 mb-6">Upload photos or walk-around videos of your mobile rig.</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-zinc-800 text-zinc-400 hover:text-white">
                  Start Building Your Setup
                </Button>
              </Card>
            )}

            {/* Category rows mapped to vertical grid */}
            {displayCategories.map((cat) => {
              const isUncategorized = cat.id === 'none';
              const catMedia = isUncategorized ? uncategorized : getMediaForCat(cat.id);
              const catIdx = isUncategorized ? -1 : categories.findIndex(c => c.id === cat.id);
              return (
                <section key={cat.id} className="space-y-4">
                  {/* Category Header - Indigo Theme to match Equipment Pool */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isUncategorized ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-white"
                      onClick={() => toggleCatCollapse(cat.id)}
                    >
                      {collapsedCats.has(cat.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {isUncategorized ? <ImageIcon className="h-5 w-5 text-zinc-500 shrink-0" /> : <FolderOpen className="h-5 w-5 text-indigo-400 shrink-0" />}
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-indigo-200">
                      {isUncategorized ? 'General Area' : cat.name}
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isUncategorized ? 'text-zinc-600 bg-zinc-800' : 'text-indigo-500/60 bg-indigo-500/10'}`}>
                      {catMedia.length}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move To Top"
                        onClick={() => moveCatToTop(catIdx)}
                        disabled={catIdx === 0}
                      >
                        <ChevronsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move up"
                        onClick={() => moveCat(catIdx, -1)}
                        disabled={catIdx === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move down"
                        onClick={() => moveCat(catIdx, 1)}
                        disabled={catIdx === categories.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Vertical Grid for Photos */}
                  <div className={collapsedCats.has(cat.id) 
                    ? "flex overflow-x-auto pb-2 gap-3 custom-scrollbar" 
                    : "grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3"
                  }>
                    {catMedia.map((item) => {
                      const globalIndex = media.findIndex(m => m.id === item.id);
                      return (
                        <div key={item.id} className={collapsedCats.has(cat.id) ? "min-w-[120px] max-w-[120px] sm:min-w-[150px] sm:max-w-[150px]" : ""}>
                          <MediaCard
                            item={item}
                            categories={categories}
                            onDelete={isAdmin ? removeMedia : undefined}
                            onReassign={isAdmin ? handleReassign : undefined}
                            onOpenGallery={() => openLightbox(item.id)}
                          />
                        </div>
                      );
                    })}
                    {/* Add-to-this-category slot */}
                    {!isUncategorized && (
                      <button
                        onClick={() => {
                          setSelectedCategoryForUpload(cat.id);
                          fileInputRef.current?.click();
                        }}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group ${
                          collapsedCats.has(cat.id) ? "min-w-[120px] h-[90px] sm:min-w-[150px] sm:h-[112px]" : "aspect-[4/3]"
                        }`}
                      >
                        <Plus className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-indigo-400">Add View</span>
                      </button>
                    )}
                  </div>
                </section>
              );
            })}


          </TabsContent>

          {/* ── INVENTORY TAB (Pre-Departure Checklist & Rig Location / Condition System) ── */}
          <TabsContent value="inventory" className="mt-0 space-y-8">
            {/* Top Navigation Pills with Help Tooltip Popups on Each Button */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <HelpTooltipPopup
                  title="Equipment Pool Overview"
                  subtitle="Mobile detailing rig equipment & inventory system"
                  triggerLabel="Equipment Pool Guide"
                  side="bottom"
                  align="start"
                  steps={[
                    {
                      title: "1. Equipment Pool Purpose",
                      desc: "Serves as the master inventory hub for all tools, chemicals, and supplies assigned to the mobile detailing truck."
                    },
                    {
                      title: "2. Three Operational Submenus",
                      desc: "Switch between Service Loadouts & Checklists, Rig Storage Locations, and Equipment Condition & Fuel tracking."
                    },
                    {
                      title: "3. Real-Time Status Monitoring",
                      desc: "Keep gas generators fueled, track polisher maintenance, and reassign gear between truck compartments."
                    }
                  ]}
                />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setEquipmentSubTab("checklist")}
                    className={`h-11 px-4 rounded-xl font-black uppercase tracking-wider text-xs gap-2 transition-all ${
                      equipmentSubTab === "checklist"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ClipboardCheck className="h-4 w-4" /> Service Loadouts & Checklist
                  </Button>
                  <HelpTooltipPopup
                    title="Service Loadouts & Checklist Instructions"
                    subtitle="SOP-derived master list, quantity control, Add-Ons & Restock tracking"
                    side="bottom"
                    align="start"
                    steps={[
                      {
                        title: "1. Unified SOP Checklist",
                        desc: "Single SOP-derived master list automatically matched with your real chemical/tool storage locations & dilutions."
                      },
                      {
                        title: "2. Item Quantity Steppers",
                        desc: "Adjust packed item counts (microfiber towels, spray bottles, pads) directly using the +/- quantity controls on each card."
                      },
                      {
                        title: "3. Package & Add-On Loadouts",
                        desc: "Filter items by Full Detail, Exterior, Interior, Custom, or special Add-On packages (Engine Bay, Headlights, Pet Hair, Odor, Ceramic)."
                      },
                      {
                        title: "4. Pre-Departure vs Restock Modes",
                        desc: "Toggle between Pre-Departure Rig Packing to verify gear before leaving, and Post-Job Restock & Refill to flag emptied bottles for refilling."
                      },
                      {
                        title: "5. Responsive 2/4-Column Layout",
                        desc: "Optimized 2-column mobile and 4-column desktop card grid for dense, efficient gear visibility."
                      }
                    ]}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setEquipmentSubTab("locations")}
                    className={`h-11 px-4 rounded-xl font-black uppercase tracking-wider text-xs gap-2 transition-all ${
                      equipmentSubTab === "locations"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <MapPin className="h-4 w-4" /> Rig Storage Locations
                  </Button>
                  <HelpTooltipPopup
                    title="Rig Storage Locations Instructions"
                    subtitle="Truck compartment organization & item assignment"
                    side="bottom"
                    align="start"
                    steps={[
                      {
                        title: "1. Compartment View",
                        desc: "View gear organized by truck location: Driver Side Drawer, Passenger Compartment, Rear Bed Skid, Chemical Caddies."
                      },
                      {
                        title: "2. Location Reassignment",
                        desc: "Use location dropdowns to move items between compartments or create custom truck storage locations."
                      },
                      {
                        title: "3. Master Inventory Search",
                        desc: "Search central inventory to assign new chemicals, supplies, or tools directly to a rig storage location."
                      }
                    ]}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setEquipmentSubTab("condition")}
                    className={`h-11 px-4 rounded-xl font-black uppercase tracking-wider text-xs gap-2 transition-all ${
                      equipmentSubTab === "condition"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Gauge className="h-4 w-4" /> Equipment Condition & Fuel ({curatedTools.length})
                  </Button>
                  <HelpTooltipPopup
                    title="Equipment Condition & Fuel Instructions"
                    subtitle="Generator, pressure washer & tool health monitoring"
                    side="bottom"
                    align="start"
                    steps={[
                      {
                        title: "1. Health Status Tracking",
                        desc: "Flag equipment as Good, Worn, or Needs Replacement to schedule maintenance before field breakdown."
                      },
                      {
                        title: "2. Fuel Level Monitoring",
                        desc: "Track gas levels (Full, 3/4, 1/2, 1/4, Low) for generators, pressure washers, and gas extractors."
                      },
                      {
                        title: "3. Maintenance Logging",
                        desc: "Record service notes, oil change dates, or damaged hose alerts for quick technician reference."
                      }
                    ]}
                  />
                </div>
              </div>

              {equipmentSubTab === "checklist" && (
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveCurrentLoadoutSnapshot}
                    className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 h-9 text-[10px] font-black uppercase tracking-widest gap-1"
                    title="Save current checklist layout as your customized default"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Save My Loadout
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 text-zinc-300 hover:text-white h-9 text-[10px] font-black uppercase tracking-widest gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset Options <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                      <DropdownMenuItem onClick={resetToUserSavedSnapshot} className="text-xs font-bold cursor-pointer">
                        <RotateCcw className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Reset to My Saved Snapshot
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={restoreFactoryDefaults}
                        className="text-xs font-bold text-indigo-300 hover:text-white cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Reset to Original SOP Baseline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    onClick={() => setAddChecklistOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 text-[10px] font-black uppercase tracking-widest gap-1 shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Custom Item
                  </Button>
                </div>
              )}
            </div>

            {/* SUB-VIEW 1: PRE-DEPARTURE SERVICE CHECKLISTS */}
            {equipmentSubTab === "checklist" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Workflow Mode Selector Bar: Packing vs Restock */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/90 p-3.5 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-950/20">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                        Checklist Workflow Mode:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setChecklistMode("packing")}
                        className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          checklistMode === "packing"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        📦 Pre-Departure Rig Packing
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setChecklistMode("restock")}
                        className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          checklistMode === "restock"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        🔄 End-of-Day Restock & Refill
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-right">
                    {checklistMode === "packing" ? (
                      <span className="text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        Verify & check off loaded gear before leaving
                      </span>
                    ) : (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        Flag emptied bottles & supplies for refilling
                      </span>
                    )}
                  </div>
                </div>

                {/* Restock Mode Header Banner */}
                {checklistMode === "restock" && (
                  <Card className="bg-zinc-950/80 border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <RotateCcw className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          End-of-Day Restock & Depletion Tracker
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          Click items to mark them as 🔴 Needs Refill or 🟢 Restocked & Full. Use "Mark All Restocked" when finished.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllRestocked(selectedJobType)}
                        className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 h-8 text-[10px] font-black uppercase tracking-widest gap-1"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Mark All Restocked & Full
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Job Type Selector Pills */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-2 flex items-center gap-1.5 shrink-0">
                      <Truck className="h-3.5 w-3.5 text-indigo-400" /> Package Filter:
                    </span>
                    {(
                      [
                        { id: "full_detail", label: "Full Detail" },
                        { id: "exterior", label: "Exterior Detail" },
                        { id: "interior", label: "Interior Detail" },
                        { id: "add_ons", label: "Add-Ons Package" },
                        { id: "custom", label: "Custom Loadout" },
                        { id: "all", label: "All Combined" },
                      ] as const
                    ).map((pkg) => (
                      <Button
                        key={pkg.id}
                        variant="ghost"
                        onClick={() => setSelectedJobType(pkg.id)}
                        className={`h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          selectedJobType === pkg.id
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {pkg.label} (
                        {
                          checklist.filter((i) => pkg.id === "all" || i.jobType === pkg.id).length
                        })
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {checklistMode === "packing" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectAllChecklist(selectedJobType)}
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10"
                        >
                          Check All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => uncheckAllChecklist(selectedJobType)}
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800"
                        >
                          Uncheck All
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllRestocked(selectedJobType)}
                        className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10"
                      >
                        Restock All
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Meter */}
                {(() => {
                  const activeItems = checklist.filter((i) => selectedJobType === "all" || i.jobType === selectedJobType);
                  if (checklistMode === "packing") {
                    const packedCount = activeItems.filter((i) => i.checked).length;
                    const pct = activeItems.length > 0 ? Math.round((packedCount / activeItems.length) * 100) : 0;
                    return (
                      <Card className="bg-zinc-950/60 border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                              Rig Packing Status: {packedCount} of {activeItems.length} Items Loaded
                            </span>
                            <span className="font-black text-indigo-400">{pct}% Ready</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </Card>
                    );
                  } else {
                    const restockedCount = activeItems.filter((i) => i.restocked !== false).length;
                    const needsRefillCount = activeItems.filter((i) => i.restocked === false).length;
                    const pct = activeItems.length > 0 ? Math.round((restockedCount / activeItems.length) * 100) : 0;
                    return (
                      <Card className="bg-zinc-950/60 border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                              Supply Restock Status: {needsRefillCount} Need Refill | {restockedCount} Restocked
                            </span>
                            <span className={`font-black ${needsRefillCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>{pct}% Fully Stocked</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all duration-300 ${needsRefillCount > 0 ? "bg-gradient-to-r from-amber-500 to-emerald-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </Card>
                    );
                  }
                })()}

                {/* Checklist items list: 2-Column Mobile / 4-Column Desktop Layout */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {checklist
                    .filter((item) => selectedJobType === "all" || item.jobType === selectedJobType)
                    .map((item) => {
                      const isRestockView = checklistMode === "restock";
                      return (
                        <Card
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                            isRestockView
                              ? item.restocked === false
                                ? "bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/40"
                                : "bg-emerald-950/20 border-emerald-500/30"
                              : item.checked
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-1.5">
                              <div
                                className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                                onClick={() =>
                                  isRestockView ? toggleItemRestockStatus(item.id) : toggleChecklistItem(item.id)
                                }
                              >
                                <div
                                  className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                    isRestockView
                                      ? item.restocked === false
                                        ? "bg-red-500 text-white font-black"
                                        : "bg-emerald-500 text-black font-black"
                                      : item.checked
                                      ? "bg-emerald-500 text-black"
                                      : "border border-zinc-700 text-transparent"
                                  }`}
                                >
                                  {isRestockView ? (
                                    item.restocked === false ? (
                                      <X className="h-3.5 w-3.5" />
                                    ) : (
                                      <CheckSquare className="h-3.5 w-3.5" />
                                    )
                                  ) : (
                                    item.checked && <CheckSquare className="h-3.5 w-3.5" />
                                  )}
                                </div>
                                <h4
                                  className={`text-xs font-bold leading-tight truncate ${
                                    !isRestockView && item.checked ? "line-through text-emerald-300/70" : "text-white"
                                  }`}
                                  title={item.name}
                                >
                                  {item.name}
                                </h4>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItemFromChecklist(item.id)}
                                className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-zinc-400 pt-1.5 border-t border-zinc-800/60">
                              <span className="font-bold text-zinc-400 truncate max-w-[100px]" title={item.location}>
                                📍 {item.location}
                              </span>

                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md px-1 py-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateItemQuantity(item.id, (item.quantity || 1) - 1);
                                  }}
                                  className="text-zinc-400 hover:text-white px-1 text-xs font-bold leading-none"
                                  title="Decrease Quantity"
                                >
                                  -
                                </button>
                                <span className="text-[10px] font-black text-indigo-300 min-w-[14px] text-center">
                                  x{item.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateItemQuantity(item.id, (item.quantity || 1) + 1);
                                  }}
                                  className="text-zinc-400 hover:text-white px-1 text-xs font-bold leading-none"
                                  title="Increase Quantity"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {item.notes && (
                              <p className="text-[9px] text-zinc-500 italic truncate" title={item.notes}>
                                {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Restock View Action Bar */}
                          {isRestockView && (
                            <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                              <span
                                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                  item.restocked === false
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {item.restocked === false ? "⚠️ Refill Needed" : "✅ Stocked"}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleItemRestockStatus(item.id)}
                                className="text-[9px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 underline"
                              >
                                {item.restocked === false ? "Mark Stocked" : "Flag Refill"}
                              </button>
                            </div>
                          )}
                        </Card>
                      );
                    })}

                  {checklist.filter((item) => selectedJobType === "all" || item.jobType === selectedJobType).length === 0 && (
                    <div className="col-span-full py-12 text-center space-y-3 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-3xl">
                      <Package className="h-8 w-8 text-zinc-600 mx-auto" />
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">No items in this loadout package yet.</p>
                      <p className="text-[11px] text-zinc-600">Click "+ Add Custom Item" above to add gear to this list.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: RIG STORAGE LOCATIONS & MASTER INVENTORY SEARCH */}
            {equipmentSubTab === "locations" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Search Bar for 212 Master Inventory Items */}
                <Card className="bg-zinc-950/80 border-indigo-500/30 p-5 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Search Master Inventory</h3>
                        <p className="text-[10px] text-zinc-500 font-medium">Search chemicals, supplies, or tools by name to add directly to a service loadout checklist.</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                    <Input
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Type to search 212 inventory items (e.g., Ceramic, APC, Towels, DA Polisher)..."
                      className="bg-zinc-900 border-zinc-800 text-white pl-10 pr-10 h-11 text-xs font-medium rounded-xl focus:border-indigo-500"
                    />
                    {locationSearch && (
                      <button
                        onClick={() => setLocationSearch("")}
                        className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Instant Search Results Box */}
                  {locationSearch.trim() !== "" && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800/80 max-h-[300px] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Search Results ({masterSearchResults.length})</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {masterSearchResults.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 transition-all"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <h4 className="text-xs font-bold text-white truncate">{res.name}</h4>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">{res.category}</span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 text-[9px] font-black uppercase tracking-wider px-2.5 rounded-lg gap-1">
                                  + Add to Checklist <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                                <DropdownMenuItem onClick={() => handleAddMasterItemToChecklist(res, "full_detail")} className="text-xs font-bold cursor-pointer">
                                  Add to Full Detail Loadout
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddMasterItemToChecklist(res, "exterior")} className="text-xs font-bold cursor-pointer">
                                  Add to Exterior Detail Loadout
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddMasterItemToChecklist(res, "interior")} className="text-xs font-bold cursor-pointer">
                                  Add to Interior Detail Loadout
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddMasterItemToChecklist(res, "custom")} className="text-xs font-bold cursor-pointer">
                                  Add to Custom Rig Loadout
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}

                        {masterSearchResults.length === 0 && (
                          <p className="text-xs text-zinc-500 py-4 text-center col-span-full">No inventory items matched "{locationSearch}".</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Storage Zone Filter & Checklist Location Map */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Curated Rig Storage Location Map</h3>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      {checklist.length} Total Rig Items Assigned
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pb-2">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedLocFilter("all")}
                      className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        selectedLocFilter === "all" ? "bg-indigo-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                      }`}
                    >
                      All Rig Zones ({checklist.length})
                    </Button>
                    {allRigLocations.map((loc) => {
                      const count = checklist.filter((item) => item.location === loc).length;
                      return (
                        <Button
                          key={loc}
                          variant="ghost"
                          onClick={() => setSelectedLocFilter(loc)}
                          className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            selectedLocFilter === loc ? "bg-indigo-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                          }`}
                        >
                          {loc} ({count})
                        </Button>
                      );
                    })}
                  </div>

                  {/* Rig items grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {checklist
                      .filter((item) => selectedLocFilter === "all" || item.location === selectedLocFilter)
                      .map((item) => (
                        <Card key={item.id} className="bg-zinc-950/60 border-zinc-800 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                {item.category === "Chemicals" ? (
                                  <FlaskConical className="h-4 w-4 text-emerald-400" />
                                ) : item.category === "Tools" ? (
                                  <Wrench className="h-4 w-4 text-indigo-400" />
                                ) : (
                                  <Package className="h-4 w-4 text-amber-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                  {item.jobType ? item.jobType.replace("_", " ").toUpperCase() : "GENERAL LOADOUT"}
                                </span>
                              </div>
                            </div>

                            <Select
                              value={item.location}
                              onValueChange={(val) => handleUpdateChecklistItemLocation(item.id, val)}
                            >
                              <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[10px] font-bold text-indigo-300 w-[140px] shrink-0">
                                <SelectValue placeholder="Set Location" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                                {allRigLocations.map((l) => (
                                  <SelectItem key={l} value={l} className="text-xs font-bold">
                                    {l}
                                  </SelectItem>
                                ))}
                                <SelectItem value="custom" className="text-xs font-bold text-indigo-400">
                                  + Custom Location...
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </Card>
                      ))}

                    {checklist.filter((item) => selectedLocFilter === "all" || item.location === selectedLocFilter).length === 0 && (
                      <p className="text-xs text-center text-zinc-600 py-8 col-span-full">No items assigned to this rig storage zone.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: CURATED CONDITION & FUEL TRACKING */}
            {equipmentSubTab === "condition" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Search & Filter Header for Condition & Fuel */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-3xl">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        value={conditionSearch}
                        onChange={(e) => setConditionSearch(e.target.value)}
                        placeholder="Filter active rig equipment..."
                        className="bg-zinc-900 border-zinc-800 text-white pl-10 pr-10 h-10 text-xs font-medium rounded-xl"
                      />
                      {conditionSearch && (
                        <button onClick={() => setConditionSearch("")} className="absolute right-3.5 top-3 text-zinc-500 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "good", label: "Operational" },
                          { id: "worn", label: "Service Soon" },
                          { id: "needs_replacement", label: "Out of Order" },
                        ] as const
                      ).map((st) => (
                        <Button
                          key={st.id}
                          variant="ghost"
                          onClick={() => setConditionFilter(st.id)}
                          className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            conditionFilter === st.id ? "bg-indigo-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                          }`}
                        >
                          {st.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => setAddEquipmentOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 text-[10px] font-black uppercase tracking-wider px-4 rounded-xl gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="h-4 w-4" /> Add Equipment Entry
                  </Button>
                </div>

                {/* Curated Equipment Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {curatedTools.map((tool) => {
                    const fuel = tool.fuelLevel || "full";
                    const fuelColor =
                      fuel === "full"
                        ? "bg-emerald-500 text-emerald-400"
                        : fuel === "3/4" || fuel === "1/2"
                        ? "bg-amber-500 text-amber-400"
                        : fuel === "1/4" || fuel === "low"
                        ? "bg-red-500 text-red-400 animate-pulse"
                        : "bg-zinc-700 text-zinc-400";

                    const isEditingThisToolName = editingToolId === tool.id;

                    return (
                      <Card key={tool.id} className="bg-zinc-950/60 border-zinc-800 p-6 rounded-3xl space-y-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                              {tool.imageUrl ? (
                                <img src={tool.imageUrl} className="h-full w-full object-cover rounded-2xl" />
                              ) : (
                                <Wrench className="h-6 w-6" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              {isEditingThisToolName ? (
                                <Input
                                  defaultValue={tool.name}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && e.target.value.trim() !== tool.name) {
                                      handleUpdateToolCondition(tool.id, { name: e.target.value.trim() });
                                    }
                                    setEditingToolId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="h-8 bg-zinc-900 border-indigo-500 text-white font-black uppercase text-xs"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center gap-1.5 group">
                                  <h4 className="text-base font-black uppercase text-white truncate max-w-[180px]">{tool.name}</h4>
                                  <button
                                    onClick={() => setEditingToolId(tool.id)}
                                    className="text-zinc-600 hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"
                                    title="Edit tool name"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* Editable Rig Location Selector */}
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Location:</span>
                                <Select
                                  value={tool.location || "Rear Bed Skid"}
                                  onValueChange={(val) => {
                                    if (val === "custom") {
                                      const customLoc = prompt("Enter new custom storage location:");
                                      if (customLoc && customLoc.trim()) {
                                        const cleanLoc = customLoc.trim();
                                        if (!customRigLocations.includes(cleanLoc)) {
                                          const updated = [...customRigLocations, cleanLoc];
                                          setCustomRigLocations(updated);
                                          localStorage.setItem("f150_custom_rig_locations", JSON.stringify(updated));
                                        }
                                        handleUpdateItemLocation("tool", tool.id, cleanLoc);
                                      }
                                      return;
                                    }
                                    handleUpdateItemLocation("tool", tool.id, val);
                                  }}
                                >
                                  <SelectTrigger className="h-6 bg-zinc-900/80 border-zinc-800 text-[9px] font-bold text-indigo-300 w-[140px] px-2 rounded-md">
                                    <SelectValue placeholder="Location" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                                    {allRigLocations.map((l) => (
                                      <SelectItem key={l} value={l} className="text-xs font-bold">
                                        {l}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="custom" className="text-xs font-bold text-indigo-400">
                                      + Custom Location...
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Condition Status Selector */}
                            <Select
                              value={tool.conditionStatus || "good"}
                              onValueChange={(val) => handleUpdateToolCondition(tool.id, { conditionStatus: val as any })}
                            >
                              <SelectTrigger className={`h-8 border text-[10px] font-black uppercase tracking-wider px-3 rounded-full w-[125px] ${
                                tool.conditionStatus === "needs_replacement"
                                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                                  : tool.conditionStatus === "worn"
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs font-bold">
                                <SelectItem value="good">✓ Operational</SelectItem>
                                <SelectItem value="worn">⚠️ Service Soon</SelectItem>
                                <SelectItem value="needs_replacement">⛔ Out of Order</SelectItem>
                                <SelectItem value="new">★ Brand New</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Delete Tool Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEquipmentEntry(tool.id, tool.name)}
                              className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                              title="Delete equipment entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Fuel Level Selector Bar */}
                        <div className="space-y-2 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                              <Fuel className="h-3.5 w-3.5 text-amber-400" /> Fuel / Energy Level:
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${fuelColor.split(" ")[1]}`}>
                              {fuel.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-6 gap-1 pt-1">
                            {(["full", "3/4", "1/2", "1/4", "low", "n/a"] as const).map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => handleUpdateToolCondition(tool.id, { fuelLevel: lvl })}
                                className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                  fuel === lvl
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Condition & Maintenance Note */}
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Maintenance & Service Notes</Label>
                          <Input
                            defaultValue={tool.conditionNote || tool.notes || ""}
                            onBlur={(e) => handleUpdateToolCondition(tool.id, { conditionNote: e.target.value })}
                            placeholder="e.g. Oil changed 8/15, 89 Octane Gas..."
                            className="bg-zinc-900 border-zinc-800 text-white h-10 font-medium text-xs"
                          />
                        </div>
                      </Card>
                    );
                  })}

                  {curatedTools.length === 0 && (
                    <div className="col-span-full py-12 text-center space-y-3 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-3xl">
                      <Gauge className="h-8 w-8 text-zinc-600 mx-auto" />
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">No equipment entries found.</p>
                      <Button
                        size="sm"
                        onClick={() => setAddEquipmentOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[10px] px-4"
                      >
                        + Add First Equipment Entry
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="container mx-auto px-4 py-12 border-t border-zinc-900">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <Info className="h-5 w-5 text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Prime Auto Detail Mobile Command Center v2.0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supabase Sync: Active</span>
          </div>
        </div>
      </footer>

      {/* ── ADD PRE-DEPARTURE ITEM MODAL (WITH CUSTOM DROPDOWN OPTIONS FOR EVERY FIELD) ────────────────── */}
      <Dialog open={addChecklistOpen} onOpenChange={setAddChecklistOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" /> Add Pre-Departure Item
              </DialogTitle>
              <HelpTooltipPopup
                title="Add Pre-Departure Item Help"
                subtitle="Configuring custom checklist items"
                side="bottom"
                align="end"
                steps={[
                  {
                    title: "1. Name & Category",
                    desc: "Enter the item name and assign it to Chemicals, Supplies, Tools, or a custom category."
                  },
                  {
                    title: "2. Target Job Loadout",
                    desc: "Bind the item to Full Detail, Exterior, Interior, or a custom job loadout."
                  },
                  {
                    title: "3. Rig Compartment Location",
                    desc: "Select where the item belongs on the truck (e.g., Driver Side Drawer, Rear Bed Skid) or create a new custom location."
                  }
                ]}
              />
            </div>
            <DialogDescription className="text-zinc-500 text-xs">Add supplies, chemicals, or equipment to your rig departure checklist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Item Name</Label>
              <Input
                value={newChecklistItem.name}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, name: e.target.value })}
                placeholder="e.g. Clay Bars, Spot Light, APC..."
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-11"
              />
            </div>

            {/* Category Dropdown with Custom Option */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Category</Label>
              <Select
                value={newChecklistItem.category}
                onValueChange={(val) => setNewChecklistItem({ ...newChecklistItem, category: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="Chemicals">Chemicals</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Tools">Tools & Equipment</SelectItem>
                  <SelectItem value="custom" className="text-indigo-400 font-bold">+ Custom Category...</SelectItem>
                </SelectContent>
              </Select>
              {newChecklistItem.category === "custom" && (
                <Input
                  value={newChecklistItem.customCategory}
                  onChange={(e) => setNewChecklistItem({ ...newChecklistItem, customCategory: e.target.value })}
                  placeholder="Type custom category name..."
                  className="bg-zinc-900 border-indigo-500/50 text-white font-medium h-10 text-xs mt-1.5"
                />
              )}
            </div>

            {/* Service Loadout / Job Type Dropdown with Custom Option */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Service Loadout / Job Type</Label>
              <Select
                value={newChecklistItem.jobType}
                onValueChange={(val) => setNewChecklistItem({ ...newChecklistItem, jobType: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="full_detail">Full Detail Loadout</SelectItem>
                  <SelectItem value="exterior">Exterior Detail Loadout</SelectItem>
                  <SelectItem value="interior">Interior Detail Loadout</SelectItem>
                  <SelectItem value="add_ons">Add-Ons Package</SelectItem>
                  <SelectItem value="custom">Custom Rig Loadout</SelectItem>
                  <SelectItem value="custom_input" className="text-indigo-400 font-bold">+ Custom Job Type Name...</SelectItem>
                </SelectContent>
              </Select>
              {newChecklistItem.jobType === "custom_input" && (
                <Input
                  value={newChecklistItem.customJobType}
                  onChange={(e) => setNewChecklistItem({ ...newChecklistItem, customJobType: e.target.value })}
                  placeholder="Type custom job type name..."
                  className="bg-zinc-900 border-indigo-500/50 text-white font-medium h-10 text-xs mt-1.5"
                />
              )}
            </div>

            {/* Item Quantity */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Item Quantity / Count</Label>
              <Input
                type="number"
                min="1"
                value={newChecklistItem.quantity || 1}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                placeholder="1"
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-11"
              />
            </div>

            {/* Rig Location Dropdown with Custom Option */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rig Location</Label>
              <Select
                value={newChecklistItem.location}
                onValueChange={(val) => setNewChecklistItem({ ...newChecklistItem, location: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  {allRigLocations.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-indigo-400 font-bold">+ Custom Storage Location...</SelectItem>
                </SelectContent>
              </Select>
              {newChecklistItem.location === "custom" && (
                <Input
                  value={newChecklistItem.customLocation}
                  onChange={(e) => setNewChecklistItem({ ...newChecklistItem, customLocation: e.target.value })}
                  placeholder="Type custom storage location (e.g., Roof Rack Skid)..."
                  className="bg-zinc-900 border-indigo-500/50 text-white font-medium h-10 text-xs mt-1.5"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddChecklistOpen(false)} className="text-zinc-500">Cancel</Button>
            <Button onClick={handleAddChecklistItem} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-6">Add to Rig Checklist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD EQUIPMENT ENTRY MODAL (FOR CONDITION & FUEL SECTION) ────────────────── */}
      <Dialog open={addEquipmentOpen} onOpenChange={setAddEquipmentOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Add Equipment Entry
              </DialogTitle>
              <HelpTooltipPopup
                title="Add Equipment Entry Help"
                subtitle="Logging generator, washer & polisher specs"
                side="bottom"
                align="end"
                steps={[
                  {
                    title: "1. Equipment Name & Category",
                    desc: "Specify tool model (e.g. Honda EU2200i) and select equipment category."
                  },
                  {
                    title: "2. Operational Health & Gas",
                    desc: "Set initial condition status (Operational, Service Soon, Out of Order) and fuel level (Full to Low)."
                  },
                  {
                    title: "3. Maintenance Logging",
                    desc: "Add initial maintenance notes such as oil change due date or pump inspection."
                  }
                ]}
              />
            </div>
            <DialogDescription className="text-zinc-500 text-xs">Add new tools, generators, or pressure washers to rig condition tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipment / Tool Name</Label>
              <Input
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                placeholder="e.g. Honda EU2200i Generator, Flex PE14-2..."
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-11"
              />
            </div>

            {/* Category Selector with Custom */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Category</Label>
              <Select
                value={newEquipment.category}
                onValueChange={(val) => setNewEquipment({ ...newEquipment, category: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="Tools & Equipment">Tools & Equipment</SelectItem>
                  <SelectItem value="Pressure Washers">Pressure Washers</SelectItem>
                  <SelectItem value="Generators & Power">Generators & Power</SelectItem>
                  <SelectItem value="Polishers & Lighting">Polishers & Lighting</SelectItem>
                  <SelectItem value="custom" className="text-indigo-400 font-bold">+ Custom Category...</SelectItem>
                </SelectContent>
              </Select>
              {newEquipment.category === "custom" && (
                <Input
                  value={newEquipment.customCategory}
                  onChange={(e) => setNewEquipment({ ...newEquipment, customCategory: e.target.value })}
                  placeholder="Type custom category name..."
                  className="bg-zinc-900 border-indigo-500/50 text-white font-medium h-10 text-xs mt-1.5"
                />
              )}
            </div>

            {/* Rig Location Selector with Custom */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rig Location</Label>
              <Select
                value={newEquipment.location}
                onValueChange={(val) => setNewEquipment({ ...newEquipment, location: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  {allRigLocations.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-indigo-400 font-bold">+ Custom Storage Location...</SelectItem>
                </SelectContent>
              </Select>
              {newEquipment.location === "custom" && (
                <Input
                  value={newEquipment.customLocation}
                  onChange={(e) => setNewEquipment({ ...newEquipment, customLocation: e.target.value })}
                  placeholder="Type custom storage location..."
                  className="bg-zinc-900 border-indigo-500/50 text-white font-medium h-10 text-xs mt-1.5"
                />
              )}
            </div>

            {/* Initial Condition Status Selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Initial Operational Status</Label>
              <Select
                value={newEquipment.conditionStatus}
                onValueChange={(val: any) => setNewEquipment({ ...newEquipment, conditionStatus: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="good">✓ Operational</SelectItem>
                  <SelectItem value="worn">⚠️ Service Soon</SelectItem>
                  <SelectItem value="needs_replacement">⛔ Out of Order</SelectItem>
                  <SelectItem value="new">★ Brand New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fuel / Energy Level</Label>
              <div className="grid grid-cols-6 gap-1 pt-1">
                {(["full", "3/4", "1/2", "1/4", "low", "n/a"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNewEquipment({ ...newEquipment, fuelLevel: lvl })}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      newEquipment.fuelLevel === lvl
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Maintenance & Service Notes</Label>
              <Input
                value={newEquipment.conditionNote}
                onChange={(e) => setNewEquipment({ ...newEquipment, conditionNote: e.target.value })}
                placeholder="e.g. Purchased 2025, 89 Octane Gas..."
                className="bg-zinc-900 border-zinc-800 text-white font-medium h-10 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddEquipmentOpen(false)} className="text-zinc-500">Cancel</Button>
            <Button onClick={handleAddEquipmentEntry} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-6">Save Equipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CATEGORY MANAGER MODAL ─────────────────────── */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
              <FolderPlus className="h-6 w-6" /> Manage Categories
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Add, rename, reorder, or delete your photo categories.</DialogDescription>
          </DialogHeader>

          {/* Existing categories */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 my-4">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 group">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="h-4 w-4 text-zinc-700 shrink-0" />
                  {editingCat?.id === cat.id ? (
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(); if (e.key === "Escape") { setEditingCat(null); setNewCatName(""); } }}
                      className="h-9 bg-zinc-800 border-zinc-700 text-white text-sm font-bold flex-1"
                      autoFocus
                      placeholder="New name..."
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-white truncate">{cat.name}</span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                  <span className="text-[10px] text-zinc-600 font-bold shrink-0">{getMediaForCat(cat.id).length} photos</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400/50 hover:text-white" onClick={() => moveCatToTop(idx)} disabled={idx === 0} title="Move to Top"><ChevronsUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => moveCat(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => moveCat(idx, 1)} disabled={idx === categories.length - 1}><ArrowDown className="h-4 w-4" /></Button>

                    {editingCat?.id === cat.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300" onClick={handleRenameCategory} disabled={savingCats}>✓</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" onClick={() => { setEditingCat(null); setNewCatName(""); }}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => { setEditingCat(cat); setNewCatName(cat.name); }}><Pencil className="h-4 w-4" /></Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-red-400" onClick={() => handleDeleteCategory(cat)} disabled={savingCats}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-center text-zinc-600 py-6">No categories yet. Add one below.</p>
            )}
          </div>

          {/* Add new category */}
          <div className="border-t border-zinc-800 pt-4">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">New Category Name</Label>
            <div className="flex gap-2">
              <Input
                value={newCatName && !editingCat ? newCatName : ""}
                onChange={(e) => { if (!editingCat) setNewCatName(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !editingCat) handleAddCategory(); }}
                placeholder="e.g. Water Tank Setup"
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-10 flex-1"
              />
              <Button
                onClick={handleAddCategory}
                disabled={savingCats || !newCatName.trim() || !!editingCat}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest h-10 px-4 gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCatManagerOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">Save & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD INVENTORY MODAL ──────────────────── */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400">
              Add to {addType.charAt(0).toUpperCase() + addType.slice(1)}s
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Quickly register new equipment into shop inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Item Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder={`e.g. ${addType === "tool" ? "DA Polisher" : addType === "chemical" ? "Wheel Cleaner" : "Microfiber Towels"}`} className="bg-zinc-900 border-zinc-800 text-white font-bold h-12" />
            </div>
            {addType !== "material" ? (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brand / Notes</Label>
                <Input value={newItem.brand} onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })} placeholder="e.g. Rupes / Meguiars" className="bg-zinc-900 border-zinc-800 text-white font-bold h-12" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Category</Label>
                <Select value={newItem.category} onValueChange={(val) => setNewItem({ ...newItem, category: val })}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-12 uppercase text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Tires">Tires</SelectItem>
                    <SelectItem value="Towels">Towels</SelectItem>
                    <SelectItem value="Brushes">Brushes</SelectItem>
                    <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickAddOpen(false)} className="text-zinc-500">Cancel</Button>
            <Button onClick={handleQuickAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">Add to Shop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PhotoGalleryLightbox
        photos={visualMedia.map(m => ({ url: m.url, label: m.caption, type: m.type as "image" | "video" }))}
        initialIndex={currentMediaIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        isAdmin={isAdmin}
        onDelete={isAdmin ? (idx) => {
          const item = visualMedia[idx];
          if (item && confirm('Delete this photo?')) {
            removeMedia(item.id);
            setLightboxOpen(false);
          }
        } : undefined}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Media Card Sub-Component
// ─────────────────────────────────────────────────────────
function MediaCard({
  item,
  categories,
  onDelete,
  onReassign,
  onOpenGallery,
}: {
  item: SetupMedia;
  categories: SetupCategory[];
  onDelete?: (id: string) => void;
  onReassign?: (id: string, catId: string) => void;
  onOpenGallery: () => void;
}) {
  return (
    <div className="relative group rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 aspect-[4/3] shadow-lg hover:border-indigo-500/40 hover:shadow-indigo-500/20 transition-all duration-300">
      <div 
        className="absolute inset-0 z-10 cursor-pointer" 
        onClick={(e) => {
          e.stopPropagation();
          if (item.type === 'pdf') {
            window.open(item.url, '_blank');
          } else {
            onOpenGallery();
          }
        }}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1.5 backdrop-blur-sm border border-white/10">
          <Maximize2 className="h-4 w-4 text-white" />
        </div>
      </div>

      {item.type === "pdf" ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 gap-4 p-8">
          <div className="h-16 w-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-100 truncate max-w-[120px]">{item.caption || "Document"}</p>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">PDF • View Source</span>
          </div>
        </div>
      ) : item.type === "video" ? (
        <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <img src={item.url} alt={item.caption || "Setup photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      )}

      {/* Overlay controls - Using pointer-events-none to let clicks pass through to the gallery trigger below, except for the buttons */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black flex flex-col justify-end p-2 h-20 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/50 truncate max-w-[80%] mb-1">
          {categories.find((c) => c.id === item.category)?.name || "Uncategorized"}
        </span>

        <div className="flex gap-0.5 shrink-0 pointer-events-auto">
          {/* Move to category menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="bg-zinc-900 border-zinc-800 text-white text-xs min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Move to category</p>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReassign(item.id, cat.id);
                  }}
                  className={`cursor-pointer font-bold text-xs ${item.category === cat.id ? "text-indigo-400" : "text-white"}`}
                >
                  {item.category === cat.id && "✓ "}{cat.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onReassign(item.id, "none");
                }} 
                className="text-zinc-500 cursor-pointer text-xs"
              >
                — Uncategorized
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileSetup;
