import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useDemoMode } from "@/contexts/DemoContext";
import { getCurrentUser } from "@/lib/auth";
import { auditEmployeeAction } from "@/lib/audit";
import { MOCK_INVENTORY, MOCK_EMPLOYEES } from "@/lib/demoMockData";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, AlertTriangle, Printer, Save, Trash2, TrendingUp, Package, ChevronDown, ChevronUp, FileText, HelpCircle, RefreshCw, Unlink as UnlinkIcon, Pencil, Info, Search, Download, Tag, Eye, EyeOff, Settings, ArrowRight, Calculator, MonitorSmartphone, Smartphone, Copy, ShieldAlert, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { useAlertsStore } from "@/store/alerts";
import * as inventoryData from "@/lib/inventory-data";
import api from "@/lib/api";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import UnifiedInventoryModal from "@/components/inventory/UnifiedInventoryModal";
import ImportWizardModal from "@/components/inventory/ImportWizardModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { getSupabaseEmployees } from "@/lib/supa-data"; // NEW IMPORT
import localforage from "localforage";
import { ChemicalDetail } from "@/components/chemicals/ChemicalDetail";
import { LinkChemicalModal } from "@/components/inventory/LinkChemicalModal";
import { getChemicalById, getChemicals as getLibraryChemicals } from "@/lib/chemicals";
import { InventoryImportModal } from "@/components/inventory/InventoryImportModal";
import { InventoryCleanupModal } from "@/components/inventory/InventoryCleanupModal";
import { generateTemplate } from "@/lib/chemical-ai";
import { Chemical as LibraryChemical, DilutionRatio } from "@/types/chemicals";
import { ChemicalLabelMaker } from "@/components/chemicals/ChemicalLabelMaker";
import { RatiosOnlyChart } from "@/components/dilution/RatiosOnlyChart";

// Import types from inventory-data
type Chemical = inventoryData.Chemical;
type UsageHistory = inventoryData.UsageHistory;
type Equipment = inventoryData.Tool; // Renamed: Tool → Equipment (DB table still 'tools')
type Supply = inventoryData.Material; // Renamed: Material → Supply (DB table still 'materials')
// Legacy aliases for backward compatibility
type Tool = Equipment;
type MaterialItem = Supply;

// Display Helper for Dilution Ratios (Reverses 1:X to X:1 per user request)
const transformRatio = (r: string) => {
  if (!r) return r;
  const normalized = r.trim();
  if (normalized.toLowerCase() === 'rtu' || normalized.toLowerCase().includes('direct')) return normalized;
  const match = normalized.match(/^1[:/](\d+)$/);
  if (match) return `${match[1]}:1`;
  return normalized;
};

/**
 * Context to manage a single active zoomed thumbnail across all inventory lists
 */
const ThumbnailZoomContext = createContext<{
  activeId: string | null;
}>({ activeId: null });

/**
 * Enhanced Thumbnail that auto-zooms when its parent row is centered (Mobile)
 * and supports manual hover/touch zoom on all devices.
 */
const InventoryThumbnail = ({ id, src, alt, className, activeBorderClass }: { id: string, src: string, alt: string, className?: string, activeBorderClass?: string }) => {
  const { activeId } = useContext(ThumbnailZoomContext);
  const isAutoZoomed = activeId === id;

  return (
    <img
      src={src}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      className={`${className} transition-all duration-300 md:hover:scale-[2.5] md:group-hover:scale-[2.5] md:active:scale-[3] md:hover:z-40 md:group-hover:z-40 md:active:z-40 md:hover:shadow-2xl md:group-hover:shadow-2xl ${isAutoZoomed ? `scale-[2.2] z-40 shadow-xl ${activeBorderClass}` : ''} cursor-zoom-in touch-none`}
    />
  );
};


const InventoryControl = () => {
  const { isDemoMode } = useDemoMode();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || isDemoMode;
  const stickyTop = isDemoMode ? "top-[112px]" : "top-[72px]";

  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]); // Renamed from materials
  const [equipment, setEquipment] = useState<Equipment[]>([]); // Renamed from tools
  // Legacy aliases for compatibility
  const materials = supplies;
  const setMaterials = setSupplies;
  const tools = equipment;
  const setTools = setEquipment;
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);

  const calculateCategoryTotal = (type: 'chemical' | 'material' | 'tool') => {
    if (type === 'chemical') {
      return (chemicals || []).reduce((a, c) => a + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
    } else if (type === 'material') {
      return (materials || []).reduce((a, m) => a + (((m as any).costPerItem || (m as any).price || 0) * (m.quantity || 0)), 0);
    } else {
      return (tools || []).reduce((a, t) => a + (((t as any).price || (t as any).cost || 0) * (t.quantity || 1)), 0);
    }
  };

  const getCategoryStats = (type: 'chemical' | 'material' | 'tool') => {
    let totalCost = 0;
    let totalActualPrice = 0;

    if (type === 'chemical') {
      (chemicals || []).forEach(c => {
        const qty = c.currentStock || 0;
        const cost = c.costPerBottle || 0;
        const actual = c.actualPrice || cost;
        totalCost += cost * qty;
        totalActualPrice += actual * qty;
      });
    } else if (type === 'material') {
      (materials || []).forEach(m => {
        const qty = m.quantity || 0;
        const cost = (m as any).costPerItem || (m as any).price || 0;
        const actual = (m as any).actualPrice || cost;
        totalCost += cost * qty;
        totalActualPrice += actual * qty;
      });
    } else {
      (tools || []).forEach(t => {
        const qty = t.quantity || 1;
        const cost = (t as any).price || (t as any).cost || 0;
        const actual = (t as any).actualPrice || cost;
        totalCost += cost * qty;
        totalActualPrice += actual * qty;
      });
    }

    const savings = Math.max(0, totalActualPrice - totalCost);
    return {
      totalCost,
      totalActualPrice,
      savings
    };
  };

  const renderHeaderStats = (type: 'chemical' | 'material' | 'tool', isMobile: boolean) => {
    const stats = getCategoryStats(type);
    if (isMobile) {
      return (
        <div className="flex flex-col gap-1 bg-zinc-900/60 p-2 rounded border border-zinc-800/80 text-[10px] whitespace-nowrap leading-tight mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 font-bold uppercase tracking-tight">Cost vs Price:</span>
            <span className="text-zinc-300 font-mono">${stats.totalCost.toFixed(2)} vs ${stats.totalActualPrice.toFixed(2)}</span>
          </div>
          {stats.savings > 0 && (
            <div className="flex justify-between gap-4 border-t border-zinc-800/50 pt-1">
              <span className="text-green-500 font-bold uppercase tracking-tight">Savings:</span>
              <span className="text-green-400 font-mono font-bold">${stats.savings.toFixed(2)}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Cost:</span>
          <span className="text-zinc-300 font-mono text-[10px] font-semibold">${stats.totalCost.toFixed(2)}</span>
        </div>
        <span className="text-zinc-700 font-normal">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Price:</span>
          <span className="text-zinc-300 font-mono text-[10px] font-semibold">${stats.totalActualPrice.toFixed(2)}</span>
        </div>
        {stats.savings > 0 && (
          <>
            <span className="text-zinc-700 font-normal">|</span>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
              <span className="text-green-500 font-extrabold uppercase tracking-wider text-[9px]">Savings:</span>
              <span className="text-green-400 font-mono text-[10px] font-bold">${stats.savings.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // --- Thumbnail Auto-Zoom Logic (Mobile) ---
  const [activeThumbnailId, setActiveThumbnailId] = useState<string | null>(null);
  const rowObserver = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (window.innerWidth >= 768) return;

    // Use a single observer for all rows to ensure mutual exclusivity
    rowObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveThumbnailId(entry.target.getAttribute('data-id'));
          }
        });
      },
      {
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0
      }
    );

    return () => rowObserver.current?.disconnect();
  }, []);

  const registerRow = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el && rowObserver.current) {
      el.setAttribute('data-id', id);
      rowObserver.current.observe(el);
    }
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [inventoryImportOpen, setInventoryImportOpen] = useState(false);
  const [inventoryCleanupOpen, setInventoryCleanupOpen] = useState(false);
  const [bulkCleanupWarningOpen, setBulkCleanupWarningOpen] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<"chemicals" | "supplies" | "equipment" | "tools" | "materials">("chemicals");
  const [modalMode, setModalMode] = useState<'chemical' | 'supply' | 'equipment'>('chemical');
  const [editing, setEditing] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [autoOpenedFromQuery, setAutoOpenedFromQuery] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateChecklistText, setUpdateChecklistText] = useState("");
  const [updateEmployee, setUpdateEmployee] = useState<string>("");
  const [updateChemId, setUpdateChemId] = useState<string>("");

  // Search queries for each category
  const [chemicalSearch, setChemicalSearch] = useState("");
  const [supplySearch, setSupplySearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [updateChemFraction, setUpdateChemFraction] = useState<string>("");
  const [updateMatId, setUpdateMatId] = useState<string>("");
  const [updateMatQtyNote, setUpdateMatQtyNote] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardTab, setImportWizardTab] = useState<"chemicals" | "tools" | "materials">("chemicals");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  // Usage Edit State
  const [usageEditOpen, setUsageEditOpen] = useState(false);
  const [usageEditItem, setUsageEditItem] = useState<UsageHistory | null>(null);
  const [usageEditNotes, setUsageEditNotes] = useState("");
  // Sorting states
  const [chemicalSort, setChemicalSort] = useState<string | "brand" | "alphabetical" | "low_stock" | "no_cost" | "updated_at" | "where_purchased">(() => {
    return localStorage.getItem('prime_inv_chem_sort') || "brand";
  });
  const [supplySort, setSupplySort] = useState<"name" | "category" | "low_stock" | "no_cost" | "updated_at" | "where_purchased">(() => {
    return (localStorage.getItem('prime_inv_sup_sort') as any) || "name";
  });
  const [equipmentSort, setEquipmentSort] = useState<"name" | "purchaseDate" | "low_stock" | "no_cost" | "updated_at" | "where_purchased">(() => {
    return (localStorage.getItem('prime_inv_eq_sort') as any) || "name";
  });

  useEffect(() => {
    localStorage.setItem('prime_inv_chem_sort', chemicalSort);
  }, [chemicalSort]);

  useEffect(() => {
    localStorage.setItem('prime_inv_sup_sort', supplySort);
  }, [supplySort]);

  useEffect(() => {
    localStorage.setItem('prime_inv_eq_sort', equipmentSort);
  }, [equipmentSort]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDilutionModalOpen, setIsDilutionModalOpen] = useState(false);
  const [chartOrientation, setChartOrientation] = useState<"portrait" | "landscape">(window.innerWidth < 768 ? "portrait" : "landscape");
  const [savingChart, setSavingChart] = useState(false);
  const [hiddenChemicalIds, setHiddenChemicalIds] = useState<string[]>([]);
  const [confirmHideId, setConfirmHideId] = useState<string | null>(null);
  const [chartSort, setChartSort] = useState<string>('brand');
  const [isRatiosOnlyModalOpen, setIsRatiosOnlyModalOpen] = useState(false);
  const [gallonSize, setGallonSize] = useState<number>(128);

  // Expanded state for sections
  const [expandedSections, setExpandedSections] = useState({
    chemicals: false,
    materials: false,
    tools: false,
  });

  // AUTO-SCROLL LOGIC: Ensure section top is visible when expanded or filtered
  const scrollToSection = (id: string) => {
    // Small timeout to allow React to render the new list state before scrolling
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;

      // Find the main scrollable container (the flex-1 overflow-auto from App.tsx)
      const scrollContainer = el.closest('.overflow-auto');
      
      const offset = isDemoMode ? 112 : 72; // Align with the sticky header 'top' values

      if (scrollContainer) {
        // Calculate offset relative to the scroll container
        let actualTop = 0;
        let curr: HTMLElement | null = el;
        while (curr && curr !== scrollContainer) {
          actualTop += curr.offsetTop;
          curr = curr.offsetParent as HTMLElement;
        }
        
        scrollContainer.scrollTo({
          top: actualTop - offset,
          behavior: 'smooth'
        });
      } else {
        // Fallback to window scroll
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.pageYOffset;
        window.scrollTo({
          top: absoluteTop - offset,
          behavior: 'smooth'
        });
      }
    }, 150); // Slightly longer timeout to ensure full list re-flow
  };

  useEffect(() => {
    if (expandedSections.chemicals) {
      scrollToSection('container-chemicals');
    }
  }, [expandedSections.chemicals, chemicalSort]);

  useEffect(() => {
    if (expandedSections.materials) {
      scrollToSection('container-materials');
    }
  }, [expandedSections.materials, supplySort]);

  useEffect(() => {
    if (expandedSections.tools) {
      scrollToSection('container-equipment');
    }
  }, [expandedSections.tools, equipmentSort]);

  // Chemical Card View State
  const [viewCardId, setViewCardId] = useState<string | null>(null);
  const [viewChemical, setViewChemical] = useState<LibraryChemical | null>(null);
  const [libMap, setLibMap] = useState<Record<string, LibraryChemical>>({});

  // Linker Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTargetItem, setLinkTargetItem] = useState<Chemical | null>(null);

  // Label Maker State
  const [labelMakerOpen, setLabelMakerOpen] = useState(false);
  const [labelMakerChemical, setLabelMakerChemical] = useState<LibraryChemical | null>(null);

  // Consolidated Delete/Unlink Alert State
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    type: 'delete' | 'unlink';
    mode?: 'chemical' | 'material' | 'tool';
    id: string;
    name: string;
    item?: any;
  }>({ open: false, type: 'delete', id: '', name: '' });

  useEffect(() => {
    const handleOpenDetail = async (e: CustomEvent<string>) => {
      const id = e.detail;
      if (!id) return;
      try {
        const data = await getChemicalById(id);
        if (data) {
          setViewChemical(data);
          setViewCardId(id);
        } else {
          toast({ title: "Error", description: "Could not load chemical card details.", variant: "destructive" });
        }
      } catch (err) {
        console.error("Failed to load card", err);
      }
    };

    window.addEventListener('open-chemical-detail', handleOpenDetail as EventListener);
    return () => {
      window.removeEventListener('open-chemical-detail', handleOpenDetail as EventListener);
    };
  }, []);

  useEffect(() => {
    // Check if we've already fetched fresh data in this session
    const hasLoaded = sessionStorage.getItem('inventory-loaded');

    if (isDemoMode) {
      loadData();
    } else {
      // Always load from localforage first (fast, cached data)
      loadDataFromCache();
      // Only fetch from database if we haven't loaded it yet (first visit in this session)
      if (!hasLoaded) {
        loadData();
        sessionStorage.setItem('inventory-loaded', 'true');
      }
    }

    // SESSION RECOVERY: Check if we were in the middle of an edit when the app reloaded
    // (Common on mobile after OS kills browser to free memory for the Camera app)
    const checkRecovery = () => {
      const pendingActive = localStorage.getItem('pending_inventory_form_active');
      const pendingForm = localStorage.getItem('pending_inventory_form');
      if (pendingActive && pendingForm) {
        try {
          const parsed = JSON.parse(pendingForm);
          setModalMode(parsed.mode);
          
          // Re-open modal
          setModalOpen(true);
          
          // If we were editing an existing item, try to find it in the current lists
          // so editing state is properly restored
          if (parsed.form && parsed.form.id) {
            const allItems = [...(chemicals || []), ...(supplies || []), ...(equipment || [])];
            const found = allItems.find(item => item.id === parsed.form.id);
            if (found) {
              setEditing(found);
            }
          }
          
          console.log("Recovered inventory modal after mobile camera reload");
          toast({ title: "Session Recovered", description: "Returning you to your inventory update." });
        } catch (e) {
          console.error("Recovery failed", e);
        }
      }
      localStorage.removeItem('pending_inventory_form_active');
    };

    checkRecovery();

    // Persist date filter
    const saved = localStorage.getItem('inventory-date-filter');
    if (saved) setDateFilter(saved as any);
    (async () => {
      if (isDemoMode) {
        setEmployees(MOCK_EMPLOYEES);
        return;
      }
      const emps = await getSupabaseEmployees();
      setEmployees(emps as any[]);
    })();

    // Listen for external open requests (e.g. from Label Maker)
    const handleOpenChart = () => setIsDilutionModalOpen(true);
    window.addEventListener('open-dilution-chart', handleOpenChart);
    return () => window.removeEventListener('open-dilution-chart', handleOpenChart);
  }, [isDemoMode]);

  // Auto-open Material Updates modal ONCE when `?updates=true` or `?updates` is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("updates");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("updates"));
    if (shouldOpen && !autoOpenedFromQuery) {
      setUpdatesModalOpen(true);
      setAutoOpenedFromQuery(true);
    }
    const chart = params.get("chart");
    if (chart === "interactive" || chart === "modal" || chart === "print" || chart === "pdf") {
      setIsDilutionModalOpen(true);
    } else if (chart === "reference") {
      setIsRatiosOnlyModalOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem('inventory-date-filter', dateFilter);
  }, [dateFilter]);

  // Update menu badge count whenever low stock changes
  useEffect(() => {
    const lowStockCount = (chemicals || []).filter(c => c && (c.currentStock || 0) < (c.threshold || 0)).length +
      (materials || []).filter(m => m && typeof m.lowThreshold === 'number' && (m.quantity || 0) < (m.lowThreshold || 0)).length;
    try {
      localStorage.setItem('inventory_low_count', String(lowStockCount));
      // Trigger sidebar refresh
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to update inventory badge:', e);
    }
  }, [chemicals, materials]);

  // Load data from localforage cache (instant)
  const loadDataFromCache = async () => {
    try {
      const [chems, mats, tls, usage] = await Promise.all([
        inventoryData.getChemicals(),
        inventoryData.getMaterials(),
        inventoryData.getTools(),
        inventoryData.getUsageHistory()
      ]);

      setChemicals(chems);
      setMaterials(mats);
      setTools(tls);
      setUsageHistory(usage);
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const loadData = async () => {
    setIsRefreshing(true);
    // Always clear the session cache flag so fresh data is re-fetched on next visit
    // This prevents stale localforage cache from overwriting newly saved imageUrls
    sessionStorage.removeItem('inventory-loaded');
    if (isDemoMode) {
      setChemicals((MOCK_INVENTORY as any).chemicals || []);
      setSupplies((MOCK_INVENTORY as any).materials || []);
      setEquipment((MOCK_INVENTORY as any).tools || (MOCK_INVENTORY as any).equipment || []); // Handle different mock naming
      setUsageHistory([]);
      setIsRefreshing(false);
      return;
    }
    try {
      const [chems, mats, tls, usage, libChems] = await Promise.all([
        inventoryData.getChemicals(),
        inventoryData.getMaterials(),
        inventoryData.getTools(),
        inventoryData.getUsageHistory(),
        getLibraryChemicals()
      ]);

      const map: Record<string, LibraryChemical> = {};
      libChems.forEach(c => map[c.id] = c);
      setLibMap(map);

      setChemicals(chems);
      setMaterials(mats);
      setTools(tls);
      setUsageHistory(usage);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load inventory from database.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const saveChemicals = async (data: Chemical[]) => {
    // This function is deprecated - UnifiedInventoryModal now saves directly
    // Just update local state
    setChemicals(data);
  };

  const openAddChemical = () => {
    setEditing(null);
    setModalMode('chemical');
    setModalOpen(true);
  };

  const openAddMaterial = () => {
    setEditing(null);
    setModalMode('supply'); // Updated: material → supply
    setModalOpen(true);
  };

  const openAddTool = () => {
    setEditing(null);
    setModalMode('equipment'); // Updated: tool → equipment
    setModalOpen(true);
  };

  const openLabelMaker = async (item: Chemical) => {
    if (!item.chemicalLibraryId) {
      toast({ 
        title: "Link Required", 
        description: "Please link this item to a Library Card first to generate a label.",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure other modals are closed for a focused experience
    setViewCardId(null);
    setModalOpen(false);
    
    try {
      const chem = await getChemicalById(item.chemicalLibraryId);
      if (chem) {
        setLabelMakerChemical(chem);
        setLabelMakerOpen(true);
      } else {
        toast({ title: "Error", description: "Could not find the linked library chemical.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to load chemical for label", err);
      toast({ title: "Error", description: "Failed to load chemical data.", variant: "destructive" });
    }
  };

  const openEdit = (item: any, mode: 'chemical' | 'supply' | 'equipment' | 'material' | 'tool') => {
    setEditing(item);
    // Normalize legacy mode names
    const normalizedMode = mode === 'material' ? 'supply' : mode === 'tool' ? 'equipment' : mode;
    setModalMode(normalizedMode as 'chemical' | 'supply' | 'equipment');
    setModalOpen(true);
  };

  // Filter and Sort functions
  // Dynamic brand list for jump-to functionality
  const allAvailableBrands = Array.from(new Set(chemicals.map(c => c.brand || "Other / No Brand"))).sort((a, b) => {
    if (a === "Other / No Brand") return 1;
    if (b === "Other / No Brand") return -1;
    return a.localeCompare(b);
  });

  const allSupplyVendors = Array.from(new Set(supplies.map(s => s.wherePurchased || "Other / Unknown"))).sort((a, b) => {
    if (a === "Other / Unknown") return 1;
    if (b === "Other / Unknown") return -1;
    return a.localeCompare(b);
  });

  const allEquipmentVendors = Array.from(new Set(equipment.map(e => e.wherePurchased || "Other / Unknown"))).sort((a, b) => {
    if (a === "Other / Unknown") return 1;
    if (b === "Other / Unknown") return -1;
    return a.localeCompare(b);
  });

  const getSortedChemicals = () => {
    let baseFiltered = (chemicals || []).filter(c =>
      c && ((c.name || '').toLowerCase().includes((chemicalSearch || '').toLowerCase()) ||
      (c.brand && c.brand.toLowerCase().includes((chemicalSearch || '').toLowerCase())))
    );

    // BRAND FILTER: If a specific brand is selected from the Jump-to list
    const specialModes = ["brand", "alphabetical", "low_stock", "no_cost", "updated_at", "where_purchased"];
    if (!specialModes.includes(chemicalSort)) {
      baseFiltered = baseFiltered.filter(c => (c.brand || "Other / No Brand") === chemicalSort);
    }

    // MODES that use the Grouped-by-Brand view
    if (chemicalSort === "brand") {
      return [...baseFiltered].sort((a, b) => {
        const brandA = (a.brand || "Z - No Brand").toLowerCase();
        const brandB = (b.brand || "Z - No Brand").toLowerCase();
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        return a.name.localeCompare(b.name);
      });
    }

    // MODES that use the Flat List view
    if (chemicalSort === "low_stock") {
      return [...baseFiltered]
        .filter(c => c.currentStock < c.threshold)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (chemicalSort === "no_cost") {
      return [...baseFiltered]
        .filter(a => !a.costPerBottle || a.costPerBottle === 0)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (chemicalSort === "updated_at") {
      return [...baseFiltered].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA; // Descending
        return a.name.localeCompare(b.name);
      });
    }
    if (chemicalSort === "where_purchased") {
      return [...baseFiltered].sort((a, b) => {
        const valA = (a.wherePurchased || "ZZZZ").toLowerCase();
        const valB = (b.wherePurchased || "ZZZZ").toLowerCase();
        if (valA !== valB) return valA.localeCompare(valB);
        return a.name.localeCompare(b.name);
      });
    }
    if (chemicalSort === "alphabetical") {
      return [...baseFiltered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...baseFiltered].sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSortedSupplies = () => {
    let filtered = (supplies || []).filter(s =>
      s && ((s.name || '').toLowerCase().includes((supplySearch || '').toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes((supplySearch || '').toLowerCase())))
    );
    
    // Vendor filtering (Jump to Vendor)
    if (!["name", "category", "low_stock", "no_cost", "updated_at", "where_purchased"].includes(supplySort)) {
      filtered = filtered.filter(s => (s.wherePurchased || "Other / Unknown") === supplySort);
    }
    
    if (supplySort === "no_cost") {
      filtered = filtered.filter(s => !s.costPerItem || s.costPerItem === 0);
    }

    if (supplySort === "low_stock") {
      filtered = filtered.filter(s => typeof s.lowThreshold === 'number' && s.quantity < (s.lowThreshold || 0));
    }
    
    return [...filtered].sort((a, b) => {
      if (supplySort === "updated_at") {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
      }
      if (supplySort === "category") {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
      }
      if (supplySort === "where_purchased") {
        const valA = (a.wherePurchased || "ZZZZ").toLowerCase();
        const valB = (b.wherePurchased || "ZZZZ").toLowerCase();
        if (valA !== valB) return valA.localeCompare(valB);
      }
      return a.name.localeCompare(b.name);
    });
  };

  const getSortedEquipment = () => {
    let filtered = (equipment || []).filter(e =>
      e && (e.name || '').toLowerCase().includes((equipmentSearch || '').toLowerCase())
    );

    // Vendor filtering (Jump to Vendor)
    if (!["name", "purchaseDate", "low_stock", "no_cost", "updated_at", "where_purchased"].includes(equipmentSort)) {
      filtered = filtered.filter(e => (e.wherePurchased || "Other / Unknown") === equipmentSort);
    }

    if (equipmentSort === "no_cost") {
      filtered = filtered.filter(e => !e.price || e.price === 0);
    }

    if (equipmentSort === "low_stock") {
      filtered = filtered.filter(e => typeof e.lowThreshold === 'number' && (e.quantity || 0) < e.lowThreshold);
    }

    return [...filtered].sort((a, b) => {
      if (equipmentSort === "purchaseDate") {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
      }
      if (equipmentSort === "updated_at") {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
      }
      if (equipmentSort === "where_purchased") {
        const valA = (a.wherePurchased || "ZZZZ").toLowerCase();
        const valB = (b.wherePurchased || "ZZZZ").toLowerCase();
        if (valA !== valB) return valA.localeCompare(valB);
      }
      return a.name.localeCompare(b.name);
    });
  };

  const filteredChemicals = getSortedChemicals();
  const filteredSupplies = getSortedSupplies();
  const filteredEquipment = getSortedEquipment();

  // Group by Product (Name + Brand) matching Rick's Tips deduplication precisely
  const productGroups = Object.values(filteredChemicals.reduce((acc, chem) => {
    let effectiveName = chem.name || '';
    let effectiveBrand = chem.brand || '';

    let libMatch = chem.chemicalLibraryId ? libMap[chem.chemicalLibraryId] : null;
    if (!libMatch) {
      libMatch = Object.values(libMap).find(l => 
        (l.name || '').toLowerCase().trim() === effectiveName.toLowerCase().trim() &&
        (l.brand || '').toLowerCase().trim() === effectiveBrand.toLowerCase().trim()
      ) || null;
    }

    if (libMatch) {
      effectiveName = libMatch.name || '';
      effectiveBrand = libMatch.brand || '';
    }

    const key = `${(effectiveName || '').trim().toLowerCase()}_${(effectiveBrand || '').trim().toLowerCase()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(chem);
    return acc;
  }, {} as Record<string, Chemical[]>));

  const supplyGroups = Object.values(filteredSupplies.reduce((acc, m) => {
    const key = (m.name || '').trim().toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, any[]>));

  // Helper for brand grouping
  const groupedChemicals = productGroups.reduce((acc, group) => {
    const brand = group.find((g: any) => g.brand)?.brand || "Other / No Brand";
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(group);
    return acc;
  }, {} as Record<string, Chemical[][]>);

  const sortedBrands = Object.keys(groupedChemicals).sort((a, b) => {
    if (a === "Other / No Brand") return 1;
    if (b === "Other / No Brand") return -1;
    return a.localeCompare(b);
  });

  // PDF Download - creates actual PDF file
  const downloadInventoryPDF = async (category: 'chemicals' | 'supplies' | 'equipment') => {
    const items = category === 'chemicals' ? filteredChemicals :
      category === 'supplies' ? filteredSupplies : filteredEquipment;

    const color = category === 'chemicals' ? [234, 179, 8] :
      category === 'supplies' ? [59, 130, 246] : [168, 85, 247];

    const categoryName = category === 'chemicals' ? 'Chemicals' :
      category === 'supplies' ? 'Supplies' : 'Equipment';

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos: number = 20;

    try {
      // Header
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${categoryName} Inventory Report`, pageWidth / 2, 28, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} - Prime Auto Detail`, pageWidth / 2, 36, { align: 'center' });

    yPos = 55;

    // Summary Box
      const totalValue = category === 'chemicals' ?
      (items as any[]).reduce((a, c: any) => a + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0) :
      category === 'supplies' ?
        (items as any[]).reduce((a, m: any) => a + (((m as any).costPerItem || m.price || 0) * (m.quantity || 0)), 0) :
        (items as any[]).reduce((a, t: any) => a + ((t.price || t.cost || 0) * (t.quantity || 1)), 0);

    autoTable(pdf, {
      startY: yPos,
      head: [[`Category: ${categoryName}`, `Total Items: ${items.length}`, `Total Value: $${totalValue.toFixed(2)}`]],
      styles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      theme: 'grid'
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Items
    items.forEach((item: any, idx) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 20;
      }

      // Title/Name Bar
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const itemName = category === 'chemicals' && item.brand ? `${item.brand} / ${item.name}` : item.name;
      pdf.text(itemName, 15, yPos + 7);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos + 10, pageWidth - margin, yPos + 10);
      
      yPos += 15;

      // Draw Item Details table using autoTable
      const body = category === 'chemicals' ? [
        ['Brand', item.brand || '-'],
        ['Product', item.name],
        ['Bottle Size', item.bottleSize],
        ['Current Stock', `${item.currentStock} bottles`],
        ['Cost/Bottle', `$${(item.costPerBottle || 0).toFixed(2)}`],
        ['Purchased From', item.wherePurchased || '-'],
        ['Total Value', `$${((item.costPerBottle || 0) * (item.currentStock || 0)).toFixed(2)}`]
      ] : category === 'supplies' ? [
        ['Name', item.name],
        ['Category', item.category],
        ['Quantity', `${item.quantity} units`],
        ['Cost/Item', `$${(item.costPerItem || 0).toFixed(2)}`],
        ['Purchased From', item.wherePurchased || '-'],
      ] : [
        ['Name', item.name],
        ['Price', `$${(item.price || 0).toFixed(2)}`],
        ['Quantity', `${item.quantity || 1}`],
        ['Purchased From', item.wherePurchased || '-'],
        ['Notes', item.notes || '-']
      ];

      autoTable(pdf, {
        startY: yPos,
        margin: { left: 15 },
        tableWidth: pageWidth - 30,
        body: body,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
      });

      const lastY = (pdf as any).lastAutoTable?.finalY;
      yPos = (typeof lastY === 'number' ? lastY : yPos) + 5;

      // Dilution Ratios for chemicals
      if (category === 'chemicals') {
        const libCard = item.chemicalLibraryId ? libMap[item.chemicalLibraryId] : null;
        const ratios = (libCard?.dilution_ratios && libCard.dilution_ratios.length > 0)
          ? libCard.dilution_ratios
          : (item.dilutionRatios && item.dilutionRatios.length > 0) 
            ? item.dilutionRatios 
            : [];

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(`Dilution Ratios ${!item.dilutionRatios || item.dilutionRatios.length === 0 ? '(AI Suggested)' : ''}:`, 15, yPos + 5);
        yPos += 8;

        autoTable(pdf, {
          startY: yPos,
          margin: { left: 15 },
          tableWidth: pageWidth - 30,
          head: [['Method', 'Ratio', 'Soil Level']],
          body: ratios.map((r: any) => [r.method, transformRatio(r.ratio), r.soil_level]),
          theme: 'striped',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 9 }
        });
        
        const lastAutoTable = (pdf as any).lastAutoTable;
        yPos = (lastAutoTable && typeof lastAutoTable.finalY === 'number' ? lastAutoTable.finalY : yPos) + 15;
      } else {
        yPos += 10;
      }
    });

    pdf.save(`${categoryName}_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({ 
        title: "PDF Error", 
        description: "An error occurred while generating the PDF. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  /**
   * Clones an existing inventory item into a new record
   */
  const handleDuplicate = async (item: any, mode: 'chemical' | 'material' | 'tool') => {
    if (isDemoMode) {
      toast({ 
        title: "Training Mode", 
        description: "Duplication is disabled during simulation session.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const copy = { ...item, id: undefined, name: `${item.name} (Copy)` };
      delete copy.id;
      delete copy.updatedAt;
      delete copy.createdAt;
      delete copy.updated_at;
      delete copy.created_at;

      toast({ title: "Duplicating...", description: `Creating a copy of ${item.name}` });

      if (mode === 'chemical') {
        const { saveChemical } = await import("@/lib/inventory-data");
        await saveChemical(copy, true);
      } else if (mode === 'tool') {
        const { saveTool } = await import("@/lib/inventory-data");
        await saveTool(copy, true);
      } else {
        const { saveMaterial } = await import("@/lib/inventory-data");
        await saveMaterial(copy, true);
      }

      await loadData();
      toast({ title: "Items Cloned", description: "A copy has been added to your inventory." });
    } catch (error: any) {
      console.error("Duplicate error:", error);
      toast({ title: "Duplication Failed", description: error.message || "Failed to clone item", variant: "destructive" });
    }
  };

  // Print Preview - opens print dialog
  const printInventory = (category: 'chemicals' | 'supplies' | 'equipment') => {
    const items = category === 'chemicals' ? filteredChemicals :
      category === 'supplies' ? filteredSupplies : filteredEquipment;

    const color = category === 'chemicals' ? '#eab308' :
      category === 'supplies' ? '#3b82f6' : '#a855f7';

    const categoryName = category === 'chemicals' ? 'Chemicals' :
      category === 'supplies' ? 'Supplies' : 'Equipment';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${categoryName} Inventory Report</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            .page-break { page-break-before: always; }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            color: #1f2937;
          }
          .header {
            border-left: 4px solid ${color};
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
            background: #fdfdfd;
            border: 1px solid #eee;
          }
          h1 { 
            color: ${color}; 
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .meta { 
            color: #6b7280; 
            font-size: 14px;
          }
          .item {
            border: 2px solid ${color}33;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #f9fafb;
            break-inside: avoid;
          }
          .item-header {
            border-bottom: 2px solid ${color};
            color: #111;
            padding: 12px 0;
            margin: -20px -20px 16px -20px;
            font-size: 18px;
            font-weight: bold;
            padding-left: 20px;
          }
          .field {
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .field:last-child { border-bottom: none; }
          .field-label {
            font-weight: 600;
            color: #4b5563;
          }
          .field-value {
            color: #1f2937;
          }
          .low-stock {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding-left: 12px;
          }
          .summary {
            background: ${color}11;
            border: 2px solid ${color};
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: ${color};
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${categoryName} Inventory Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          <div class="meta">Total Items: ${items.length}</div>
        </div>
        
        ${category === 'chemicals' ? `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${items.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Value</div>
              <div class="summary-value">$${(items as any[]).reduce((a, c) => a + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Low Stock</div>
              <div class="summary-value" style="color: #ef4444;">${(items as any[]).filter(c => c.currentStock < c.threshold).length}</div>
            </div>
          </div>
          ${(items as any[]).map((c, idx) => `
            <div class="item ${c.currentStock < c.threshold ? 'low-stock' : ''}">
              <div class="item-header">${c.brand ? `${c.brand} / ` : ''}${c.name}</div>
              ${c.brand ? `<div class="field"><div class="field-label">Brand</div><div class="field-value">${c.brand}</div></div>` : ''}
              <div class="field"><div class="field-label">Product Name</div><div class="field-value">${c.name}</div></div>
              <div class="field"><div class="field-label">Bottle Size</div><div class="field-value">${c.bottleSize}</div></div>
              <div class="field"><div class="field-label">Cost Per Bottle</div><div class="field-value">$${(c.costPerBottle || 0).toFixed(2)}</div></div>
              <div class="field"><div class="field-label">Current Stock</div><div class="field-value" style="${c.currentStock < c.threshold ? 'color: #ef4444; font-weight: bold;' : ''}">${c.currentStock} bottles</div></div>
              <div class="field"><div class="field-label">Low Threshold</div><div class="field-value">${c.threshold} bottles</div></div>
              <div class="field"><div class="field-label">Purchased From</div><div class="field-value">${c.wherePurchased || '-'}</div></div>
              <div class="field"><div class="field-label">Total Value</div><div class="field-value">$${((c.costPerBottle || 0) * (c.currentStock || 0)).toFixed(2)}</div></div>
              
              ${(() => {
                const libCard = c.chemicalLibraryId ? libMap[c.chemicalLibraryId] : null;
                const ratios = (libCard?.dilution_ratios && libCard.dilution_ratios.length > 0)
                  ? libCard.dilution_ratios
                  : (c.dilutionRatios && c.dilutionRatios.length > 0) 
                    ? c.dilutionRatios 
                    : [];
                  
                if (ratios.length === 0) return '';
                
                return `
                <div style="margin-top: 15px;">
                  <div class="field-label" style="margin-bottom: 8px; color: ${color};">Dilution Ratios ${!c.dilutionRatios || c.dilutionRatios.length === 0 ? '<span style="font-size: 10px; opacity: 0.7;">(AI Suggested)</span>' : ''}</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                      <tr style="background: ${color}11; border-bottom: 2px solid ${color}33;">
                        <th style="padding: 4px; text-align: left;">Method</th>
                        <th style="padding: 4px; text-align: left;">Ratio</th>
                        <th style="padding: 4px; text-align: left;">Soil Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${ratios.map((r: any) => `
                        <tr style="border-bottom: 1px solid #eee;">
                          <td style="padding: 4px;">${r.method}</td>
                          <td style="padding: 4px; font-weight: bold; color: ${color};">${transformRatio(r.ratio)}</td>
                          <td style="padding: 4px;">${r.soil_level}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>`;
              })()}
              
              ${c.chemicalLibraryId ? `<div class="field" style="margin-top: 10px;"><div class="field-label">Linked to Library</div><div class="field-value">Yes</div></div>` : ''}
              ${c.notes ? `<div class="field"><div class="field-label">Notes</div><div class="field-value">${c.notes}</div></div>` : ''}
            </div>
            ${(idx + 1) % 3 === 0 && idx < items.length - 1 ? '<div class="page-break"></div>' : ''}
          `).join('')}
        ` : category === 'supplies' ? `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${items.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Value</div>
              <div class="summary-value">$${(items as any[]).reduce((a, m) => a + ((m.costPerItem || 0) * (m.quantity || 0)), 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Low Stock</div>
              <div class="summary-value" style="color: #ef4444;">${(items as any[]).filter(m => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold).length}</div>
            </div>
          </div>
          ${(items as any[]).map((m, idx) => `
            <div class="item ${typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold ? 'low-stock' : ''}">
              <div class="item-header">${m.name}</div>
              <div class="field"><div class="field-label">Name</div><div class="field-value">${m.name}</div></div>
              <div class="field"><div class="field-label">Category</div><div class="field-value">${m.category}</div></div>
              ${m.subtype ? `<div class="field"><div class="field-label">Subtype/Size</div><div class="field-value">${m.subtype}</div></div>` : ''}
              <div class="field"><div class="field-label">Cost Per Item</div><div class="field-value">$${(m.costPerItem || 0).toFixed(2)}</div></div>
              <div class="field"><div class="field-label">Quantity</div><div class="field-value" style="${typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold ? 'color: #ef4444; font-weight: bold;' : ''}">${m.quantity} units</div></div>
              ${typeof m.lowThreshold === 'number' ? `<div class="field"><div class="field-label">Low Threshold</div><div class="field-value">${m.lowThreshold} units</div></div>` : ''}
              <div class="field"><div class="field-label">Purchased From</div><div class="field-value">${m.wherePurchased || '-'}</div></div>
              <div class="field"><div class="field-label">Total Value</div><div class="field-value">$${((m.costPerItem || 0) * (m.quantity || 0)).toFixed(2)}</div></div>
              ${m.notes ? `<div class="field"><div class="field-label">Notes</div><div class="field-value">${m.notes}</div></div>` : ''}
            </div>
            ${(idx + 1) % 3 === 0 && idx < items.length - 1 ? '<div class="page-break"></div>' : ''}
          `).join('')}
        ` : `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${items.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Value</div>
              <div class="summary-value">$${(items as any[]).reduce((a, t) => a + (t.price || 0), 0).toFixed(2)}</div>
            </div>
          </div>
          ${(items as any[]).map((t, idx) => `
            <div class="item">
              <div class="item-header">${t.name}</div>
              <div class="field"><div class="field-label">Name</div><div class="field-value">${t.name}</div></div>
              <div class="field"><div class="field-label">Price</div><div class="field-value">$${(t.price || 0).toFixed(2)}</div></div>
              <div class="field"><div class="field-label">Quantity</div><div class="field-value">${t.quantity || 1}</div></div>
              <div class="field"><div class="field-label">Purchased From</div><div class="field-value">${t.wherePurchased || '-'}</div></div>
              ${t.purchaseDate ? `<div class="field"><div class="field-label">Purchase Date</div><div class="field-value">${new Date(t.purchaseDate).toLocaleDateString()}</div></div>` : ''}
              ${t.warranty ? `<div class="field"><div class="field-label">Warranty</div><div class="field-value">${t.warranty}</div></div>` : ''}
              ${t.lifeExpectancy ? `<div class="field"><div class="field-label">Life Expectancy</div><div class="field-value">${t.lifeExpectancy}</div></div>` : ''}
              ${t.notes ? `<div class="field"><div class="field-label">Notes</div><div class="field-value">${t.notes}</div></div>` : ''}
            </div>
            ${(idx + 1) % 3 === 0 && idx < items.length - 1 ? '<div class="page-break"></div>' : ''}
          `).join('')}
        `}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const calculateAmounts = (ratioStr: string | undefined | null, bottleOz: number) => {
    const normalized = ratioStr?.toLowerCase().trim();
    if (!normalized) return null;
    let parts = 0;
    if (normalized === 'rtu' || normalized.includes('direct') || normalized === '1:0' || normalized === '0:1' || normalized === '1/0' || normalized === '0/1') {
      return { chem: bottleOz.toString(), water: "0.0" };
    } else {
      const match = normalized.match(/(\d+)[:\/]1/);
      if (match) {
        parts = parseInt(match[1]);
      } else {
        const matchReverse = normalized.match(/1[:\/](\d+)/);
        if (matchReverse) parts = parseInt(matchReverse[1]);
        else return null;
      }
    }
    const totalParts = parts + 1;
    const chem = bottleOz / totalParts;
    const water = bottleOz - chem;
    return {
      chem: chem < 1 ? chem.toFixed(2) : chem.toFixed(1),
      water: water < 1 ? water.toFixed(2) : water.toFixed(1)
    };
  };

  const getMasterRatios = (c: Chemical): DilutionRatio[] => {
    // 1. Check for manual overrides in the Inventory (The Master Chart edits)
    // Map View and Inventory edits specifically update dilutionRatios (camelCase)
    const inventoryRatios = c.dilutionRatios && c.dilutionRatios.length > 0 ? c.dilutionRatios : (c as any).dilution_ratios;
    if (inventoryRatios && inventoryRatios.length > 0) return inventoryRatios;
    
    // 2. Fallback to Library technical card (if linked)
    const libCard = c.chemicalLibraryId ? libMap[c.chemicalLibraryId] : null;
    if (libCard) {
      const libRatios = libCard.dilutionRatios || libCard.dilution_ratios;
      if (libRatios && libRatios.length > 0) return libRatios;
    }
    
    // 3. Last resort AI Template
    return [];
  };

  const handleChartCellEdit = async (chemicalId: string, soilLevel: string, field: 'ratio' | 'chem' | 'water', newValue: string, ozSize?: number) => {
    if (!isAdmin) {
      toast({ title: 'Access Denied', description: 'Only admins can edit chart values.', variant: 'destructive' });
      return;
    }
    const chem = chemicals.find(c => c.id === chemicalId);
    if (!chem) return;

    let updatedRatios = [...(chem.dilutionRatios || [])];
    const index = updatedRatios.findIndex(r => (r.soil_level || '').toLowerCase().includes((soilLevel || '').toLowerCase()));
    
    let targetRatio = index >= 0 ? updatedRatios[index] : { method: soilLevel, ratio: 'RTU', soil_level: soilLevel };
    
    if (field === 'ratio') {
      targetRatio.ratio = newValue;
    } else if (field === 'chem' && ozSize) {
      // Back-calculate ratio from chemical amount: (ozSize - chem) / chem : 1
      const chemAmt = parseFloat(newValue);
      if (chemAmt > 0 && chemAmt <= ozSize) {
         if (chemAmt === ozSize) {
           targetRatio.ratio = 'RTU';
         } else {
           const parts = (ozSize - chemAmt) / chemAmt;
           targetRatio.ratio = `${parts.toFixed(1).replace(/\.0$/, '')}:1`;
         }
      }
    } else if (field === 'water' && ozSize) {
      // Back-calculate ratio from water amount: water / (ozSize - water) : 1
      const waterAmt = parseFloat(newValue);
      if (waterAmt >= 0 && waterAmt < ozSize) {
        if (waterAmt === 0) {
          targetRatio.ratio = 'RTU';
        } else {
          const chemAmt = ozSize - waterAmt;
          const parts = waterAmt / chemAmt;
          targetRatio.ratio = `${parts.toFixed(1).replace(/\.0$/, '')}:1`;
        }
      }
    }

    (targetRatio as any).custom = true; // Mark as custom for color coding

    if (index >= 0) {
      updatedRatios[index] = targetRatio;
    } else {
      updatedRatios.push(targetRatio);
    }

    // Persist to state immediately
    setChemicals(prev => prev.map(c => c.id === chemicalId ? { ...c, dilutionRatios: updatedRatios } : c));

    // Persist to Supabase if not in demo mode
    if (!isDemoMode) {
      try {
        await inventoryData.saveChemical({ ...chem, dilutionRatios: updatedRatios }, false);
      } catch (err) {
        console.error("Failed to save chart update", err);
      }
    }
  };

    const downloadDilutionPDF = () => {
    try {
      const pdf = new jsPDF(chartOrientation);
      const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text("CHEMICAL DILUTION QUICK REFERENCE CHART", pageWidth / 2, 22, { align: 'center' });
    
    // Yellow underline
    pdf.setDrawColor(250, 204, 21);
    pdf.setLineWidth(1.5);
    pdf.line(pageWidth / 2 - 80, 25, pageWidth / 2 + 80, 25);

    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 32, { align: 'center' });

    const rows = filteredChemicals.map(c => {
      let ratios = (c.dilutionRatios && c.dilutionRatios.length > 0) ? c.dilutionRatios : [];
      const sorted = [...(ratios || [])].sort((a,b) => {
          if (!a?.ratio || !b?.ratio) return 0;
          const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
          const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
          return pA - pB;
      });
      const standard = sorted.find(r => (r.soil_level || '').toLowerCase().includes('standard')) || sorted[0];
      const more = sorted.find(r => (r.soil_level || '').toLowerCase().includes('heavy'));
      const less = sorted.find(r => (r.soil_level || '').toLowerCase().includes('light'));

      const s16 = calculateAmounts(standard?.ratio || '', 16);
      const s24 = calculateAmounts(standard?.ratio || '', 24);
      const s32 = calculateAmounts(standard?.ratio || '', 32);
      
      const m16 = calculateAmounts(more?.ratio || '', 16);
      const m24 = calculateAmounts(more?.ratio || '', 24);
      const m32 = calculateAmounts(more?.ratio || '', 32);
      
      const l16 = calculateAmounts(less?.ratio || '', 16);
      const l24 = calculateAmounts(less?.ratio || '', 24);
      const l32 = calculateAmounts(less?.ratio || '', 32);

      return [
        { content: `${c.name}\n${c.brand || ''}\n\nChemical Amount:\nWater Amount:`, styles: { fontStyle: 'bold', fontSize: 8, valign: 'bottom' } },
        // Standard
        { content: standard ? transformRatio(standard.ratio) : '-', styles: { valign: 'middle', fontSize: 10, fontStyle: 'bold' } },
        s16 ? { content: `${s16.chem}oz\n${s16.water}oz`, styles: { textColor: [16, 185, 129], fontStyle: 'bold', fontSize: 9 } } : '-',
        s24 ? { content: `${s24.chem}oz\n${s24.water}oz`, styles: { textColor: [59, 130, 246], fontStyle: 'bold', fontSize: 9 } } : '-',
        s32 ? { content: `${s32.chem}oz\n${s32.water}oz`, styles: { textColor: [147, 51, 234], fontStyle: 'bold', fontSize: 9 } } : '-',
        // More
        { content: more ? transformRatio(more.ratio) : '-', styles: { valign: 'middle', fontSize: 10, fontStyle: 'bold' } },
        m16 ? { content: `${m16.chem}oz\n${m16.water}oz`, styles: { textColor: [16, 185, 129], fontStyle: 'bold', fontSize: 9 } } : '-',
        m24 ? { content: `${m24.chem}oz\n${m24.water}oz`, styles: { textColor: [59, 130, 246], fontStyle: 'bold', fontSize: 9 } } : '-',
        m32 ? { content: `${m32.chem}oz\n${m32.water}oz`, styles: { textColor: [147, 51, 234], fontStyle: 'bold', fontSize: 9 } } : '-',
        // Less
        { content: less ? transformRatio(less.ratio) : '-', styles: { valign: 'middle', fontSize: 10, fontStyle: 'bold' } },
        l16 ? { content: `${l16.chem}oz\n${l16.water}oz`, styles: { textColor: [16, 185, 129], fontStyle: 'bold', fontSize: 9 } } : '-',
        l24 ? { content: `${l24.chem}oz\n${l24.water}oz`, styles: { textColor: [59, 130, 246], fontStyle: 'bold', fontSize: 9 } } : '-',
        l32 ? { content: `${l32.chem}oz\n${l32.water}oz`, styles: { textColor: [147, 51, 234], fontStyle: 'bold', fontSize: 9 } } : '-'
      ];
    });

    autoTable(pdf, {
      startY: 42,
      head: [
        [
          { content: 'PRODUCT (BRAND / NAME)', rowSpan: 2, styles: { halign: 'left' } },
          { content: 'STANDARD', colSpan: 4, styles: { halign: 'center', fillColor: [248, 250, 252] } },
          { content: 'HEAVY DUTY', colSpan: 4, styles: { halign: 'center', fillColor: [255, 251, 235] } },
          { content: 'MAINTENANCE', colSpan: 4, styles: { halign: 'center', fillColor: [240, 249, 255] } }
        ],
        ['RATIO', '16OZ', '24OZ', '32OZ', 'RATIO', '16OZ', '24OZ', '32OZ', 'RATIO', '16OZ', '24OZ', '32OZ']
      ],
      body: rows as any,
      theme: 'grid',
      headStyles: { textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center', textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [150, 150, 150] },
      columnStyles: { 
        0: { cellWidth: 45, halign: 'left', fontStyle: 'bold', lineWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.5 } },
        4: { lineWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.5 } },
        8: { lineWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.5 } }
      }
    });

    pdf.save(`Chemical_Dilution_Reference_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
       console.error("PDF Error:", error);
    }
  };

   const printDilutionChart = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
      <head>
        <title>Chemical Dilution Quick Reference Chart</title>
        <style>
          @media print {
            @page { size: ${chartOrientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 5mm; }
            body { margin: 0; padding: 0; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; padding: 20px; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 25px; }
          .header h1 { font-weight: 800; font-size: 28px; margin: 0; text-transform: uppercase; color: #111; border-bottom: 4px solid #facc15; display: inline-block; padding-bottom: 5px; letter-spacing: -0.02em; }
          .header p { color: #888; font-size: 10px; margin-top: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #ddd; table-layout: fixed; }
          th, td { border: 1px solid #ddd; padding: 4px 2px; text-align: center; color: #000; word-wrap: break-word; overflow: hidden; }
          th { background-color: #f8fafc; font-weight: 800; font-size: 9px; text-transform: uppercase; color: #475569; }
          .product-cell { text-align: left; border-right: 2px solid #cbd5e1; padding-left: 6px; vertical-align: bottom; width: 140px; }
          .product-name { font-weight: 800; font-size: 11px; margin-bottom: 1px; color: #0f172a; }
          .brand-name { font-size: 8px; color: #94a3b8; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; }
          .labels-block { font-size: 7px; font-weight: 800; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px; }
          .labels-block div { height: 16px; display: flex; align-items: center; justify-content: space-between; }
          .ratio-cell { vertical-align: middle; font-weight: 800; font-size: 10px; color: #334155; }
          .amount-cell { vertical-align: bottom; padding: 0; }
          .amount-cell div { height: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #1e293b; }
          .chem-row { border-bottom: 1px solid #f8fafc; color: #0f172a; }
          .thick-right { border-right: 2px solid #cbd5e1; }
          .bg-std { background-color: #f8fafc; }
          .bg-heavy { background-color: #fffbeb; }
          .bg-light { background-color: #f0f9ff; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CHEMICAL DILUTION QUICK REFERENCE CHART</h1>
          <p>Generated: ${new Date().toLocaleDateString()} — Prime Auto Detail</p>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2" class="product-cell">PRODUCT (BRAND / NAME)</th>
              <th colspan="4" class="thick-right bg-std" style="border-bottom: 2px solid #94a3b8;">STANDARD</th>
              <th colspan="4" class="thick-right bg-heavy" style="border-bottom: 2px solid #f59e0b;">HEAVY DUTY</th>
              <th colspan="4" class="bg-light" style="border-bottom: 2px solid #0ea5e9;">MAINTENANCE</th>
            </tr>
            <tr>
              <th class="bg-std">RATIO</th>
              <th class="bg-std" style="color: #10b981;">16OZ</th><th class="bg-std" style="color: #3b82f6;">24OZ</th><th class="thick-right bg-std" style="color: #9333ea;">32OZ</th>
              <th class="bg-heavy">RATIO</th>
              <th class="bg-heavy" style="color: #10b981;">16OZ</th><th class="bg-heavy" style="color: #3b82f6;">24OZ</th><th class="thick-right bg-heavy" style="color: #9333ea;">32OZ</th>
              <th class="bg-light">RATIO</th>
              <th class="bg-light" style="color: #10b981;">16OZ</th><th class="bg-light" style="color: #3b82f6;">24OZ</th><th class="bg-light" style="color: #9333ea;">32OZ</th>
            </tr>
          </thead>
          <tbody>
            ${filteredChemicals.map(c => {
               const ratios = getMasterRatios(c);
               const sorted = [...ratios].sort((a,b) => {
                  const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                  const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                  return pA - pB;
               });
               const s = sorted.find(r => (r.soil_level || '').toLowerCase().includes('standard')) || (sorted.length > 0 ? sorted[0] : null);
               const h = sorted.find(r => (r.soil_level || '').toLowerCase().includes('heavy duty') || (r.soil_level || '').toLowerCase().includes('heavy')) || (sorted.length > 1 ? sorted[sorted.length-1] : null);
               const m = sorted.find(r => (r.soil_level || '').toLowerCase().includes('maintenance') || (r.soil_level || '').toLowerCase().includes('light')) || (sorted.length > 2 ? sorted[1] : null);

               const renderCellHtml = (r: any, oz: number, isLast: boolean = false) => {
                  const amts = r ? calculateAmounts(r.ratio, oz) : null;
                  return amts ? `
                    <td class="amount-cell ${isLast ? 'thick-right' : ''}">
                       <div class="chem-row">${amts.chem}oz</div>
                       <div>${amts.water}oz</div>
                    </td>
                  ` : `<td class="${isLast ? 'thick-right' : ''}">-</td>`;
               };

               return `
                 <tr>
                    <td class="product-cell">
                       <div class="product-name">${c.name}</div>
                       <div class="brand-name">${c.brand || ''}</div>
                       <div class="labels-block">
                          <div><span>Chemical:</span> <span style="font-size: 6px">(C)</span></div>
                          <div><span>Water:</span> <span style="font-size: 6px">(W)</span></div>
                       </div>
                    </td>
                    <td class="ratio-cell">${s ? transformRatio(s.ratio) : '-'}</td>
                    ${renderCellHtml(s, 16)}
                    ${renderCellHtml(s, 24)}
                    ${renderCellHtml(s, 32, true)}
                    <td class="ratio-cell">${h ? transformRatio(h.ratio) : '-'}</td>
                    ${renderCellHtml(h, 16)}
                    ${renderCellHtml(h, 24)}
                    ${renderCellHtml(h, 32, true)}
                    <td class="ratio-cell">${m ? transformRatio(m.ratio) : '-'}</td>
                    ${renderCellHtml(m, 16)}
                    ${renderCellHtml(m, 24)}
                    ${renderCellHtml(m, 32)}
                 </tr>
               `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Force a slight delay to ensure styles are applied before print dialog
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDelete = (id: string, mode: 'chemical' | 'material' | 'tool', itemName: string) => {
    setDeleteState({ open: true, type: 'delete', mode, id, name: itemName });
  };

  const handleUnlinkRequest = (item: Chemical) => {
    setDeleteState({ open: true, type: 'unlink', mode: 'chemical', id: item.id, name: item.name, item });
  };

  const handleConfirmAction = async () => {
    const { id, mode, type, name, item } = deleteState;
    if (!id || !type) return;

    if (isDemoMode) {
      toast({ 
        title: "Read-Only Mode", 
        description: `This is a training session. Changes to the permanent inventory (like ${type}ing ${name}) are disabled.`,
        variant: "destructive"
      });
      setDeleteState(prev => ({ ...prev, open: false }));
      return;
    }

    try {
      if (type === 'delete') {
        if (!mode) return;
        if (mode === 'chemical') {
          await inventoryData.deleteChemical(id);
          toast({ title: "Chemical Deleted", description: `${name} removed from inventory.` });
        } else if (mode === 'material') {
          await inventoryData.deleteMaterial(id);
          toast({ title: "Material Deleted", description: `${name} removed from inventory.` });
        } else {
          await inventoryData.deleteTool(id);
          toast({ title: "Tool Deleted", description: `${name} removed from inventory.` });
        }
        await loadData();
      } else if (type === 'unlink' && item) {
        await inventoryData.saveChemical({ ...item, chemicalLibraryId: null }, false);
        loadData();
        toast({ title: "Unlinked", description: "Card link removed." });
      }
    } catch (error) {
      console.error('Error actioning item:', error);
      toast({ title: "Action Failed", description: "Failed to update database.", variant: "destructive" });
    } finally {
      setDeleteState(prev => ({ ...prev, open: false }));
    }
  };

  const filterByDate = (item: UsageHistory) => {
    const d = new Date(item.date);
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    let passQuick = true;
    if (dateFilter === "daily") passQuick = now.getTime() - d.getTime() < dayMs;
    if (dateFilter === "weekly") passQuick = now.getTime() - d.getTime() < 7 * dayMs;
    if (dateFilter === "monthly") passQuick = now.getTime() - d.getTime() < 30 * dayMs;

    let passRange = true;
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0, 0, 0, 0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23, 59, 59, 999));

    return passQuick && passRange;
  };

  const filteredHistory = usageHistory.filter(filterByDate);

  const lowStockChemicals = chemicals.filter(c => c.currentStock < c.threshold);
  const lowStockMaterials = materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity < (m.lowThreshold as number));
  const lowStockTotal = lowStockChemicals.length + lowStockMaterials.length;

  // Push admin alert when low inventory changes (dedup by hash incl. quantities)
  // Expanded state for sections

  const toggleSection = (sec: 'chemicals' | 'materials' | 'tools') => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandAll = () => setExpandedSections({ chemicals: true, materials: true, tools: true });
  const collapseAll = () => setExpandedSections({ chemicals: false, materials: false, tools: false });

  // Metrics
  const uniqueChemicalCount = new Set(chemicals.map(chem => {
    let effectiveName = chem.name || '';
    let effectiveBrand = chem.brand || '';
    let libMatch = chem.chemicalLibraryId ? libMap[chem.chemicalLibraryId] : null;
    if (!libMatch) {
      libMatch = Object.values(libMap).find(l => 
        (l.name || '').toLowerCase().trim() === (effectiveName || '').toLowerCase().trim() &&
        (l.brand || '').toLowerCase().trim() === (effectiveBrand || '').toLowerCase().trim()
      ) || null;
    }
    if (libMatch) {
      effectiveName = libMatch.name || '';
      effectiveBrand = libMatch.brand || '';
    }
    return `${(effectiveName || '').trim().toLowerCase()}_${(effectiveBrand || '').trim().toLowerCase()}`;
  })).size;
  const totalItems = uniqueChemicalCount + materials.length + tools.length;
  const lowStockCount = chemicals.filter(c => c.currentStock < c.threshold).length +
    materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity < (m.lowThreshold || 0)).length +
    tools.filter(t => (t as any).lowThreshold && (t.quantity || 0) < (t as any).lowThreshold).length;
  // Approximating value if cost exists
  const totalValue =
    chemicals.reduce((acc, c) => acc + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0) +
    materials.reduce((acc, m) => acc + ((m.costPerItem || 0) * (m.quantity || 0)), 0) +
    tools.reduce((acc, t) => acc + ((t.price || 0) * (t.quantity || 1)), 0);

  // Helper to get formatted fraction/qty string
  const getUsageAmount = (item: any) => {
    if (item.fraction) return item.fraction; // Chemical fraction string
    if (item.amountUsed) {
      const n = Number(item.amountUsed);
      // If small decimal, might be fraction converted
      if (n < 1 && n > 0) return item.fraction || `${(n * 100).toFixed(0)}%`;
      return n.toFixed(1).replace(/\.0$/, '');
    }
    return '-';
  };

  const renderChemicalRow = (group: Chemical[]) => {
    const c = group[0];
    const isRTU = group.some(x => (x.name || '').toLowerCase().includes('rtu') || (x.brand || '').toLowerCase().includes('rtu') || (x.bottleSize || '').toLowerCase().includes('rtu'));
    
    // Combine bottle sizes
    const sizesStr = Array.from(new Set(group.map(x => x.bottleSize || 'N/A'))).join(', ');
    
    const totalGroupValue = group.reduce((sum, x) => sum + ((x.costPerBottle || 0) * (x.currentStock || 0)), 0);

    // Combine stock info
    const totalStock = group.reduce((sum, x) => sum + (x.currentStock || 0), 0);
    const anyStockLeft = group.some(x => x.currentStock > 0);
    const isLowStock = !anyStockLeft; // "If there is at least one size of the same product... it should not be counted as Low Threshold"

    // Combine wherePurchased
    const vendors = Array.from(new Set(group.map(x => x.wherePurchased).filter(Boolean))).join(', ');

    return (
    <TableRow
      key={c.id}
      ref={registerRow(c.id)}
      className="border-yellow-500/10 hover:bg-yellow-500/5 cursor-pointer group transition-colors"
      onClick={() => openEdit(group, 'chemical')}
    >
      <TableCell className="font-medium flex items-center gap-2 text-white py-3">
        {c.imageUrl && (
          <InventoryThumbnail 
            id={c.id}
            src={c.imageUrl} 
            alt={c.name} 
            activeBorderClass="border-yellow-500/50"
            className="h-8 w-8 rounded object-cover border border-zinc-700 shrink-0 relative" 
          />
        )}
        <div className="flex flex-col">
          <span>
            {c.brand ? `${c.brand} / ${c.name}` : c.name}
            {isRTU && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">RTU</span>}
          </span>
          {(() => {
            const ratios = getMasterRatios(c);
            if (!ratios || ratios.length === 0 || isRTU) return null;
            return (
              <div className="flex flex-wrap gap-1 mt-1">
                {ratios.map((r, i) => r.ratio && r.ratio.trim() !== '' ? (
                  <span key={i} className="text-[9px] px-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded truncate max-w-[100px]" title={`${r.method}: ${transformRatio(r.ratio)}`}>
                    {r.method}: {transformRatio(r.ratio)}
                  </span>
                ) : null)}
              </div>
            );
          })()}
        </div>
      </TableCell>
      <TableCell className="text-zinc-300">{sizesStr}</TableCell>
      <TableCell className={`font-medium ${group.some(x => !x.costPerBottle || x.costPerBottle === 0) ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
        <div className="flex flex-col gap-2">
          {group.map((x, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span>{!x.costPerBottle ? '⚠ $0.00' : `$${(x.costPerBottle).toFixed(2)}`}</span>
                {x.actualPrice && x.actualPrice > x.costPerBottle && (
                  <span className="text-[10px] text-zinc-500 line-through mr-1">${(x.actualPrice).toFixed(2)}</span>
                )}
              </div>
              {x.actualPrice && x.actualPrice > x.costPerBottle && (
                <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1 py-0.5 rounded w-fit border border-green-500/20">
                  Save ${(x.actualPrice - x.costPerBottle).toFixed(2)}
                </span>
              )}
            </div>
          ))}
          {totalGroupValue > 0 && (
            <span className="text-[10px] text-zinc-500 font-bold italic pt-1 border-t border-zinc-800">Total: ${(totalGroupValue).toFixed(2)}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {chemicalSort === 'updated_at' ? (
          <span className="text-xs text-zinc-400 font-mono">
            {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Never'}
          </span>
        ) : (
          <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {isLowStock && <AlertTriangle className="h-3 w-3 mr-1 fill-red-500/20" />}
            {totalStock} remaining
          </span>
        )}
      </TableCell>
      <TableCell className="py-1">
        <span className="text-[11px] text-zinc-400 font-bold italic">{vendors || '-'}</span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {c.chemicalLibraryId ? (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: c.chemicalLibraryId }));
                }}
                title="View Technical Card"
              >
                <FileText className="h-4 w-4 mr-1" /> Card
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-purple-400 hover:text-purple-300" onClick={(e) => { e.stopPropagation(); openLabelMaker(c); }}>
                <Tag className="h-4 w-4 mr-1" /> Label
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-amber-500 hover:text-amber-400 bg-amber-500/5 border border-amber-500/10"
              onClick={(e) => {
                e.stopPropagation();
                setLinkTargetItem(c);
                setLinkModalOpen(true);
              }}
            >
              <UnlinkIcon className="h-4 w-4 mr-1" /> Link
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(group, 'chemical'); }} className="h-8 w-8 p-0" title="Edit Item"><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(c, 'chemical'); }} className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400" title="Duplicate"><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id, 'chemical', c.name); }} className="h-8 w-8 p-0 text-red-500" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
    );
  };;

  const renderChemicalCard = (group: Chemical[]) => {
    const c = group[0];
    const isRTU = group.some(x => (x.name || '').toLowerCase().includes('rtu') || (x.brand || '').toLowerCase().includes('rtu') || (x.bottleSize || '').toLowerCase().includes('rtu'));
    
    const sizesStr = group.map(x => `${x.bottleSize || 'N/A'}`).join(' / ');
    const itemizedPricesStr = group.map(x => `${x.bottleSize || 'N/A'}: $${(x.costPerBottle || 0).toFixed(2)}`).join(' • ');
    const totalGroupValue = group.reduce((sum, x) => sum + ((x.costPerBottle || 0) * (x.currentStock || 0)), 0);
    const totalStock = group.reduce((sum, x) => sum + (x.currentStock || 0), 0);
    const isLowStock = !group.some(x => x.currentStock > 0);
    const vendors = Array.from(new Set(group.map(x => x.wherePurchased).filter(Boolean))).join(', ');

    return (
    <div
      key={c.id}
      ref={registerRow(c.id)}
      className="bg-zinc-900 border border-yellow-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-yellow-500/5 transition-colors group"
      onClick={() => openEdit(group, 'chemical')}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white flex items-center gap-2">
            {c.imageUrl && (
              <InventoryThumbnail 
                id={c.id}
                src={c.imageUrl} 
                alt={c.name} 
                activeBorderClass="border-yellow-500/50"
                className="h-8 w-8 rounded object-cover border border-zinc-700 relative" 
              />
            )}
            {c.brand ? `${c.brand} / ${c.name}` : c.name}
            {isRTU && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">RTU</span>}
          </div>
          <div className="text-sm text-zinc-300 mt-1">
            {chemicalSort === 'updated_at' ? (
              <span className="text-xs text-yellow-400 font-bold italic">
                Last Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Never'}
              </span>
            ) : (
              <>
                {itemizedPricesStr}
                <span className="ml-1 text-[10px] text-zinc-500 font-bold italic">(Total Value: ${totalGroupValue.toFixed(2)})</span>
              </>
            )}
          </div>
          {vendors && <div className="text-[10px] text-zinc-400 mt-1 italic">Purchased at: {vendors}</div>}
          {(() => {
            const ratios = getMasterRatios(c);
            if (ratios.length === 0 || isRTU) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ratios.map((r, i) => r.ratio && r.ratio.trim() !== '' ? (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded">
                    {r.method}: {transformRatio(r.ratio)}
                  </span>
                ) : null)}
              </div>
            );
          })()}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {totalStock} left
        </span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-yellow-500/10 gap-2 flex-wrap">
        <div className="flex gap-1">
          {c.chemicalLibraryId ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-blue-400 hover:text-blue-300 px-2" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: c.chemicalLibraryId })); }}>
                <FileText className="h-4 w-4 mr-1" /> Card
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-purple-400 hover:text-purple-300 px-2" onClick={(e) => { e.stopPropagation(); openLabelMaker(c); }}>
                <Tag className="h-4 w-4 mr-1" /> Label
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-amber-500 hover:text-amber-400 bg-amber-500/5 border border-amber-500/10"
              onClick={(e) => {
                e.stopPropagation();
                setLinkTargetItem(c);
                setLinkModalOpen(true);
              }}
            >
              <UnlinkIcon className="h-4 w-4 mr-1" /> Link
            </Button>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(group, 'chemical'); }} className="h-8 px-2" title="Edit Item">
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(c, 'chemical'); }} className="h-8 px-2 text-amber-500 hover:text-amber-400" title="Duplicate">
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id, 'chemical', c.name); }} className="h-8 text-red-500 px-2" title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
    );
  };


  const renderInteractiveChart = () => (
<Dialog open={isDilutionModalOpen} onOpenChange={(val) => {
        setIsDilutionModalOpen(val);
        if (!val) {
          const params = new URLSearchParams(window.location.search);
          if (params.has("chart")) {
            // Check if we can go back specifically to where we came from
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/chemical-training");
            }
          }
        }
      }}>
        <DialogContent className="max-w-[98vw] 2xl:max-w-[1700px] w-full h-[98vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none shadow-2xl rounded-2xl">
          {/* PREMIUM DARK HEADER (Matching Dilution Ratio Chart style) */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-zinc-900 border-b border-zinc-800 gap-3 shrink-0 uppercase">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-hidden">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                    <DialogTitle className="text-sm sm:text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-0.5 sm:mb-1 truncate">Prime Dilution Chart</DialogTitle>
                </div>
                <div className="hidden sm:block px-2 text-[8px] font-black text-zinc-600 border-l border-zinc-800 ml-2 uppercase tracking-[0.2em] italic">Generated: ${new Date().toLocaleDateString()}</div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end no-print">
                <div className="flex flex-col items-center gap-0.5 shrink-0 opacity-80">
                    <span className="text-[6px] font-black uppercase text-zinc-500 tracking-widest leading-none">Units</span>
                    <div className="bg-zinc-800/80 p-1 rounded-md border border-zinc-700 h-6 flex items-center px-2 text-[8px] font-black text-indigo-400">OZ ONLY</div>
                </div>

                <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-800">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setChartOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                            {chartOrientation === 'landscape' ? <Smartphone className="h-4 w-4" /> : <MonitorSmartphone className="h-4 w-4 rotate-90" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Switch Orientation</TooltipContent>
                      </Tooltip>

                      <div className="w-px h-4 bg-zinc-800 mx-1" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setIsRatiosOnlyModalOpen(true)} className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Show Ratios Only</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { if (typeof printDilutionChart === 'function') printDilutionChart(); }} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Print Chart</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { if (typeof downloadDilutionPDF === 'function') downloadDilutionPDF(); }} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export PDF</TooltipContent>
                      </Tooltip>

                      <div className="w-px h-4 bg-zinc-800 mx-1" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { setIsDilutionModalOpen(false); navigate('/dilution-calculator'); }} className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Calculator</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
                
                <Select value={chartSort} onValueChange={setChartSort}>
                    <SelectTrigger className="w-[110px] sm:w-[140px] h-8 bg-zinc-900 border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] tracking-widest rounded-lg hover:bg-zinc-800 hover:text-white">
                        <div className="flex items-center gap-1.5">
                             <TrendingUp className="h-3 w-3 text-indigo-400" />
                             <span className="truncate uppercase">{chartSort.startsWith('brand:') ? chartSort.split(':')[1] : 'SORT'}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-900 text-white">
                        <SelectItem value="brand" className="text-[10px] font-bold uppercase tracking-widest">Brand</SelectItem>
                        <SelectItem value="name" className="text-[10px] font-bold uppercase tracking-widest">A-Z Name</SelectItem>
                        <SelectItem value="low_stock" className="text-[10px] font-bold uppercase tracking-widest text-red-500">Low Stock</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="flex-1 p-1 sm:p-2 bg-zinc-50/50 flex flex-col min-h-0 overflow-hidden">
            <div className={`${chartOrientation === 'landscape' ? 'max-w-full' : 'max-w-4xl'} mx-auto w-full bg-white shadow-sm border border-zinc-200 rounded-xl overflow-hidden p-1 flex flex-col min-h-0`}>
              {/* TOP SYNC SCROLLBAR */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div 
                  className={`overflow-x-auto h-4 bg-zinc-100 border border-zinc-200 rounded-sm shrink-0 chart-top-scroll-container flex-1`} 
                  onScroll={(e) => {
                    const bottom = e.currentTarget.parentElement?.nextElementSibling?.querySelector('.chart-bottom-scroll-container');
                    if (bottom) bottom.scrollLeft = e.currentTarget.scrollLeft;
                  }}
                >
                  <div style={{ width: chartOrientation === 'landscape' ? '1100px' : '700px', height: '1px' }} />
                </div>
                {hiddenChemicalIds.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setHiddenChemicalIds([])}
                    className="ml-2 h-6 px-2 text-[8px] font-black text-indigo-400 hover:text-indigo-600 bg-indigo-50/50 uppercase"
                  >
                    Show {hiddenChemicalIds.length} Hidden
                  </Button>
                )}
              </div>
              
              <div 
                className="flex-1 overflow-auto border border-zinc-300 rounded-lg chart-bottom-scroll-container pb-4"
                onScroll={(e) => {
                  const top = e.currentTarget.parentElement?.querySelector('.chart-top-scroll-container');
                  if (top) top.scrollLeft = e.currentTarget.scrollLeft;
                }}
              >
                <table className={`w-full border-collapse border border-zinc-300 ${chartOrientation === 'landscape' ? 'text-[9px] min-w-[1100px]' : 'text-[10px] min-w-[390px]'}`}>
                  <thead className="sticky top-0 z-30 bg-white shadow-sm ring-1 ring-zinc-300">
                    <tr className="bg-zinc-100 font-bold uppercase border-b-2 border-zinc-300">
                      <th rowSpan={2} className={`p-1 border border-zinc-300 text-left sticky left-0 z-40 bg-zinc-100 ${chartOrientation === 'landscape' ? 'w-[12%]' : 'w-[80px]'}`}>Product</th>
                      <th colSpan={5} className="p-1 border-l-4 border-r border-zinc-300 text-center bg-zinc-100/50 text-zinc-700">Standard</th>
                      <th colSpan={5} className="p-1 border-x-4 border-zinc-400 text-center bg-zinc-100/50 text-zinc-700">Heavy Duty</th>
                      <th colSpan={5} className="p-1 border-l-4 border-r border-zinc-300 text-center bg-zinc-100/50 text-zinc-700">Maintenance</th>
                    </tr>
                    <tr className="bg-zinc-50 text-[10px] text-center font-bold">
                      <th className={`p-1 border border-zinc-300 ${chartOrientation === 'landscape' ? 'w-auto' : 'w-[45px]'}`}>Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10 min-w-[50px] sm:min-w-[60px]">
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="flex items-center no-print">
                            <input 
                              type="number"
                              disabled={!isAdmin}
                              step="0.1"
                              value={gallonSize / 128}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                   const next = val * 128;
                                   setGallonSize(next);
                                   localforage.setItem("pds_custom_gallon_v1", next);
                                }
                              }}
                              className="w-8 sm:w-10 bg-transparent border-none text-[9px] sm:text-[11px] font-black text-amber-900 p-0 text-center focus:ring-0"
                            />
                            <span className="text-[7px] font-bold text-amber-800/60 no-print">GAL</span>
                          </div>
                          <span className="text-[6px] font-black text-amber-700 leading-none pb-0.5">CUSTOM</span>
                        </div>
                      </th>
                      <th className="p-1 border-l-4 border-zinc-300/80 border-r border-zinc-300">Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10">
                        <span className="text-[9px] font-black text-amber-900 leading-none">{gallonSize/128}G</span>
                      </th>
                      <th className="p-1 border-l-4 border-zinc-300/80 border-r border-zinc-300">Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10">
                        <span className="text-[9px] font-black text-amber-900 leading-none">{gallonSize/128}G</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(chemicals || [])]
                      .filter(c => {
                        if (!c) return false;
                        const baseFilter = !hiddenChemicalIds.includes(c.id);
                        if (!baseFilter) return false;
                        if (chartSort.startsWith('brand:')) {
                           const target = chartSort.split(':')[1];
                           if (target === 'Other') return !c.brand;
                           return c.brand === target;
                        }
                        return true;
                      })
                      .sort((a,b) => {
                        if (chartSort === 'brand' || chartSort.startsWith('brand:')) {
                           const bA = (a.brand || '').toLowerCase();
                           const bB = (b.brand || '').toLowerCase();
                           if (bA !== bB) return bA.localeCompare(bB);
                        }
                        if (chartSort === 'low_stock') {
                           const sA = a.currentStock / (a.threshold || 1);
                           const sB = b.currentStock / (b.threshold || 1);
                           if (sA !== sB) return sA - sB;
                        }
                        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
                      })
                      .map((c, i) => {
                       const ratios = getMasterRatios(c);
                       const sorted = [...(ratios || [])].sort((a,b) => {
                          if (!a?.ratio || !b?.ratio) return 0;
                          const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                          const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                          return pA - pB;
                       });
                       const standard = sorted.find(r => (r.soil_level || '').toLowerCase().includes('standard')) || (sorted.length > 0 ? sorted[0] : null);
                       const heavy = sorted.find(r => (r.soil_level || '').toLowerCase().includes('heavy duty') || (r.soil_level || '').toLowerCase().includes('heavy')) || (sorted.length > 1 ? sorted[sorted.length-1] : (sorted.length > 0 ? sorted[0] : null));
                       const light = sorted.find(r => (r.soil_level || '').toLowerCase().includes('maintenance') || (r.soil_level || '').toLowerCase().includes('light')) || (sorted.length > 2 ? sorted[1] : (sorted.length > 0 ? sorted[0] : null));

                       const renderEditableCell = (r: any, soilLevel: string, field: 'ratio' | 'chem' | 'water', ozSize?: number, extraClass: string = '') => {
                          const amts = r ? calculateAmounts(r.ratio, ozSize || 0) : null;
                          const isCustom = r?.custom === true;
                          const displayVal = field === 'ratio' ? transformRatio(r?.ratio || '-') : (field === 'chem' ? amts?.chem : amts?.water);
                          
                          return (
                            <td className={`p-0 border border-zinc-300 text-center align-middle group ${extraClass}`}>
                               {r ? (
                                 <input 
                                   defaultValue={displayVal}
                                   disabled={!isAdmin}
                                   onBlur={(e) => {
                                       if (e.target.value !== displayVal) {
                                         if (window.confirm("Are you sure you want to change this value? This will update the system's dilution ratio for this chemical.")) {
                                            handleChartCellEdit(c.id, soilLevel, field, e.target.value, ozSize);
                                         } else {
                                            e.target.value = displayVal;
                                         }
                                       }
                                     }}
                                   className={`w-full h-full bg-transparent border-none text-center font-bold px-1 outline-none focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 transition-all ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')} ${field === 'ratio' ? 'text-[11px]' : 'text-[10px]'}`}
                                 />
                               ) : '-'}
                            </td>
                          );
                       };

                       const renderOzCompoundCell = (r: any, ozSize: number, soilLevel: string, extraClass: string = '') => {
                          const amts = r ? calculateAmounts(r.ratio, ozSize) : null;
                          const isCustom = (r as any)?.custom === true;

                          return (
                            <td className={`p-0 border border-zinc-300 text-center align-bottom ${extraClass}`}>
                               {r ? (
                                 <>
                                   <div className="h-[16px] flex items-center justify-center border-b border-zinc-100 bg-white group relative">
                                       <input 
                                          key={`${c.id}-${soilLevel}-${ozSize}-chem`}
                                          defaultValue={amts?.chem || ''}
                                          disabled={!isAdmin}
                                          onBlur={(e) => {
                                              if (e.target.value !== (amts?.chem || '')) {
                                                if (window.confirm("Are you sure you want to change this value?")) {
                                                   handleChartCellEdit(c.id, soilLevel, 'chem', e.target.value, ozSize);
                                                } else {
                                                   e.target.value = amts?.chem || '';
                                                }
                                              }
                                           }}
                                          className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[11px] focus:bg-indigo-50 ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')}`}
                                        />
                                       <span className="absolute right-0.5 text-[7px] text-zinc-300 font-normal pointer-events-none">oz</span>
                                   </div>
                                   <div className="h-[16px] flex items-center justify-center bg-white group relative">
                                       <input 
                                          key={`${c.id}-${soilLevel}-${ozSize}-water`}
                                          defaultValue={amts?.water || ''}
                                          disabled={!isAdmin}
                                          onBlur={(e) => {
                                              if (e.target.value !== (amts?.water || '')) {
                                                if (window.confirm("Are you sure you want to change this value?")) {
                                                   handleChartCellEdit(c.id, soilLevel, 'water', e.target.value, ozSize);
                                                } else {
                                                   e.target.value = amts?.water || '';
                                                }
                                              }
                                           }}
                                          className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[11px] focus:bg-indigo-50 ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')}`}
                                        />
                                       <span className="absolute right-0.5 text-[7px] text-zinc-300 font-normal pointer-events-none">oz</span>
                                   </div>
                                 </>
                               ) : '-'}
                            </td>
                          );
                       };
                       return (
                          <tr 
                            key={i} 
                            className={`${i % 2 === 0 ? 'bg-white font-sans' : 'bg-zinc-50 font-sans'} ${hiddenChemicalIds.includes(c.id) ? 'hidden' : ''}`}
                          >
                            <td 
                              className={`p-1 border border-zinc-300 align-bottom bg-white cursor-pointer hover:bg-red-50 group/prod transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${chartOrientation === 'landscape' ? 'min-w-[120px]' : 'w-[80px]'}`}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to hide "${c.name}" from the chart and printout?`)) {
                                  setHiddenChemicalIds(prev => [...prev, c.id]);
                                }
                              }}
                            >
                               <div className="flex items-center justify-between">
                                 <div className="font-bold text-zinc-900 leading-tight text-[12px] sm:text-[13px] mb-1">{c.name}</div>
                                 <div className="opacity-0 group-hover/prod:opacity-100 text-red-500 transition-opacity">
                                   <EyeOff className="w-3 h-3" />
                                 </div>
                               </div>
                               <div className="text-[9px] text-zinc-400 font-bold uppercase mb-3 tracking-wider">{c.brand || ''}</div>
                              <div className="flex flex-col gap-0 text-[8px] font-bold text-zinc-500 border-t border-zinc-100 pt-2 opacity-80 overflow-hidden">
                                 <div className="h-[14px] flex items-center justify-between whitespace-nowrap">
                                    <span className="scale-[0.85] origin-left">CHEM AMOUNT:</span>
                                 </div>
                                 <div className="h-[14px] flex items-center justify-between whitespace-nowrap">
                                    <span className="scale-[0.85] origin-left">WATER AMOUNT:</span>
                                 </div>
                              </div>
                           </td>
                           <td className="p-0 border-l-4 border-r border-zinc-300 group align-middle">
                              <input 
                                 defaultValue={standard ? transformRatio(standard.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'standard', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(standard as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(standard, 16, 'standard', 'bg-green-50/10')}
                           {renderOzCompoundCell(standard, 24, 'standard', 'bg-blue-50/10')}
                           {renderOzCompoundCell(standard, 32, 'standard', 'bg-purple-50/10')}
                           {renderOzCompoundCell(standard, gallonSize, 'standard', 'bg-amber-500/10 border-r-2 border-r-zinc-400')}

                           <td className="p-0 border-l-4 border-zinc-300 group align-middle bg-zinc-50/5">
                              <input 
                                 defaultValue={heavy ? transformRatio(heavy.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'heavy', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(heavy as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(heavy, 16, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, 24, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, 32, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, gallonSize, 'heavy', 'bg-amber-500/10 border-r-2 border-r-zinc-300')}

                           <td className="p-0 border-l-4 border-zinc-300 group align-middle bg-zinc-50/5">
                              <input 
                                 defaultValue={light ? transformRatio(light.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'maintenance', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(light as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(light, 16, 'maintenance', 'bg-green-50/10')}
                           {renderOzCompoundCell(light, 24, 'maintenance', 'bg-blue-50/10')}
                           {renderOzCompoundCell(light, 32, 'maintenance', 'bg-purple-50/10')}
                           {renderOzCompoundCell(light, gallonSize, 'maintenance', 'bg-amber-500/10')}
                         </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100 pt-4">
                 <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest no-print">
                   <div className="flex items-center gap-2 text-emerald-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" /> 
                     16oz
                   </div>
                   <div className="flex items-center gap-2 text-blue-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" /> 
                     24oz
                   </div>
                   <div className="flex items-center gap-2 text-purple-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.3)]" /> 
                     32oz
                   </div>
                    <div className="flex items-center gap-2 text-amber-600">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> ${(gallonSize/128).toFixed(2)} GAL
                    </div>
                 </div>
                 <div className="flex items-center gap-2 text-[8px] font-bold text-indigo-400 bg-indigo-500/5 px-3 py-1.5 rounded-full border border-indigo-500/10 uppercase tracking-tighter no-print">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Editable Grid: Changes in Indigo are custom overrides
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        {renderInteractiveChart()}
        <RatiosOnlyChart open={isRatiosOnlyModalOpen} onOpenChange={(v) => { setIsRatiosOnlyModalOpen(v); if(!v) navigate('/dashboard/employee'); }} chemicals={filteredChemicals} />
        {!isRatiosOnlyModalOpen && !isDilutionModalOpen && (
          <div className="flex flex-col items-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-zinc-400 mb-6 text-center">You do not have permission to view the Inventory Control page.</p>
            <Button onClick={() => navigate('/dashboard/employee')}>Return to Dashboard</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ThumbnailZoomContext.Provider value={{ activeId: activeThumbnailId }}>
      <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Inventory Control" />

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Inventory Summary (Top, Non-Collapsible) */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Inventory Summary</h2>
                <p className="text-zinc-400 text-sm">Overview of all assets and stock levels</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full md:w-auto">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Items</p>
                <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Value</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8 relative">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Low Stock</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className={`text-3xl font-bold ${lowStockCount > 0 ? "text-red-500" : "text-zinc-400"}`}>{lowStockCount}</p>
                  {lowStockCount > 0 && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {isAdmin && (
          /* Data Management Actions */
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setInventoryImportOpen(true)}
              variant="outline"
              className="h-12 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-amber-500/50 group"
            >
              <FileText className="h-5 w-5 mr-2 text-amber-500 group-hover:text-amber-400" />
              <div className="text-left">
                <div className="font-semibold text-sm">Import Inventory</div>
              </div>
            </Button>
  
            <Button
              onClick={() => setBulkCleanupWarningOpen(true)}
              variant="outline"
              className="h-12 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-red-500/50 group"
            >
              <Trash2 className="h-5 w-5 mr-2 text-red-500 group-hover:text-red-400" />
              <div className="text-left">
                <div className="font-semibold text-sm">Bulk Cleanup</div>
              </div>
            </Button>
          </div>
        )}

        {/* Global Expand/Collapse Controls */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>

        {/* Chemicals Section (Yellow) */}
        <div id="container-chemicals" className="border border-yellow-500/30 rounded-xl bg-zinc-900/50">
          <div
            id="section-chemicals"
            className="p-4 bg-zinc-950 sticky z-50 border-b border-yellow-500/20 flex flex-wrap items-center justify-between cursor-pointer hover:bg-zinc-950 transition-colors shadow-lg rounded-t-xl gap-3"
            style={{ top: isDemoMode ? '112px' : '72px' }}
            onClick={() => toggleSection('chemicals')}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`h-2 w-2 rounded-full ${chemicals.some(c => c.currentStock < c.threshold) ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              <h3 className="text-lg font-semibold text-yellow-100">Chemicals</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-4 w-4 text-zinc-400 hover:text-yellow-300 cursor-pointer transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-zinc-900 border-yellow-500/30" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-yellow-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Chemicals Inventory
                    </h4>
                    <p className="text-sm text-zinc-300">
                      Track all detailing chemicals, cleaners, polishes, waxes, and coatings used in your business.
                    </p>
                    <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-700">
                      <p><strong className="text-zinc-300">Sorting Options:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li><strong className="text-zinc-300">By Brand (Default)</strong>: Groups items by brand (e.g., Meguiar’s, P&S) and sorts chemicals A-Z within each group.</li>
                        <li><strong className="text-zinc-300">Jump to Brand</strong>: Use the brand dropdown in the sort picker to instantly filter the view to a specific brand. This makes it easy to jump directly to any product in your inventory without scrolling.</li>
                        <li><strong className="text-zinc-300">Alphabetical (A-Z List)</strong>: A simple flat list of all items from A to Z, regardless of brand.</li>
                        <li><strong className="text-zinc-300">Low Threshold</strong>: Prioritizes items that are running low and need restocking.</li>
                      </ul>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">{productGroups.length} items</span>
              <div className="sm:hidden">
                {renderHeaderStats('chemical', true)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-zinc-400 ml-auto sm:ml-0">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={chemicalSort}
                  onChange={(e) => setChemicalSort(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-yellow-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="brand">By Brand (All)</option>
                  <option value="alphabetical">A-Z List</option>
                  <option value="low_stock">Low Threshold</option>
                  <option value="no_cost">⚠ Missing Cost</option>
                  <option value="updated_at">Last Updated</option>
                  {allAvailableBrands.length > 0 && (
                    <optgroup label="Jump to Brand">
                      {allAvailableBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="hidden sm:inline">
                {renderHeaderStats('chemical', false)}
              </div>
              {chemicals.some(c => c.currentStock < c.threshold) && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Low Stock</span>
                </div>
              )}
              {expandedSections.chemicals ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.chemicals && (
            <div className="p-4 border-t border-yellow-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full text-[10px] font-bold">
                  {isAdmin && (
                    <>
                      <Button size="sm" onClick={openAddChemical} className="bg-yellow-600 hover:bg-yellow-500 text-white border-0 w-full sm:w-auto"><Plus className="h-3 w-3 mr-1" /> Add Chemical</Button>
                      <Button size="sm" variant="outline" onClick={() => { setLabelMakerChemical(null); setLabelMakerOpen(true); }} className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 w-full sm:w-auto"><Tag className="h-3 w-3 mr-1" /> Create Label</Button>
                      <Button size="sm" variant="outline" onClick={() => { setActiveImportTab("chemicals"); setInventoryImportOpen(true); }} className="w-full sm:w-auto"><FileText className="h-3 w-3 mr-1" /> Import</Button>
                      <Button size="sm" variant="outline" onClick={() => setBulkCleanupWarningOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20 w-full sm:w-auto"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="text-yellow-400 hover:text-yellow-300 w-full sm:w-auto" onClick={() => { try { downloadInventoryPDF('chemicals'); } catch(e) { toast({ title: "PDF Error", description: "Failed to generate inventory PDF.", variant: "destructive"}); } }}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-yellow-400 hover:text-yellow-300 w-full sm:w-auto" onClick={() => printInventory('chemicals')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                  <Button size="sm" variant="outline" className="text-emerald-400 hover:text-emerald-300 w-full sm:w-auto" onClick={() => { try { downloadDilutionPDF(); } catch(e) { toast({ title: "PDF Error", description: "Failed to generate reference chart PDF.", variant: "destructive"}); } }}><Download className="h-3 w-3 mr-1" /> PDF Ref Chart</Button>
                  <Button size="sm" variant="outline" className="text-emerald-400 hover:text-emerald-300 w-full sm:w-auto" onClick={printDilutionChart}><Printer className="h-3 w-3 mr-1" /> Print Ref Chart</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search chemicals..."
                    className="pl-8 pr-10 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={chemicalSearch}
                    onChange={(e) => setChemicalSearch(e.target.value)}
                  />
                  {chemicalSearch && (
                    <button 
                      onClick={() => setChemicalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-8">
                {chemicalSort === "brand" ? (
                  sortedBrands.map(brand => (
                    <div key={brand} className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 rounded-md border-l-4 border-yellow-500">
                        <span className="text-xs font-black uppercase tracking-widest text-yellow-500">{brand}</span>
                        <span className="text-[10px] text-zinc-500">({groupedChemicals[brand].length} items)</span>
                      </div>
                      <div className="overflow-x-auto hidden md:block">
                        <Table>
                          <TableBody>
                            {groupedChemicals[brand].map(group => renderChemicalRow(group))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-3">
                        {groupedChemicals[brand].map(group => renderChemicalCard(group))}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="overflow-x-auto hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-yellow-500/20">
                            <TableHead>Name</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Cost/Unit</TableHead>
                            <TableHead>{chemicalSort === 'updated_at' ? 'Last Updated' : 'Stock Level'}</TableHead>
                            <TableHead>Purchased From</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productGroups.map(group => renderChemicalRow(group))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {productGroups.map(group => renderChemicalCard(group))}
                    </div>
                  </>
                )}
                {chemicals.length === 0 && <div className="text-center py-6 text-muted-foreground">No chemicals tracked.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Supplies Section (Blue) - Renamed from Materials */}
        <div id="container-materials" className="border border-blue-500/30 rounded-xl bg-zinc-900/50">
          <div
            id="section-materials"
            className="p-4 bg-zinc-950 sticky z-50 border-b border-blue-500/20 flex flex-wrap items-center justify-between cursor-pointer hover:bg-zinc-950 transition-colors shadow-lg rounded-t-xl gap-3"
            style={{ top: isDemoMode ? '112px' : '72px' }}
            onClick={() => toggleSection('materials')}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`h-2 w-2 rounded-full ${materials.some(m => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold) ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
              <h3 className="text-lg font-semibold text-blue-100">Supplies</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-4 w-4 text-zinc-400 hover:text-blue-300 cursor-pointer transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 bg-zinc-900 border-blue-500/30" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Supplies Inventory (Consumables)
                    </h4>
                    <p className="text-sm text-zinc-300">
                      Track consumable, disposable, or frequently replaced items used in daily operations.
                    </p>
                    <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-700">
                      <p><strong className="text-blue-300">Examples:</strong> Microfiber towels, wash mitts, brushes, pads, applicators, rags, sponges, gloves, tape</p>
                      <p className="pt-2"><strong className="text-zinc-300">Key Difference:</strong></p>
                      <p className="text-zinc-300">• <strong className="text-blue-300">Supplies</strong> = Consumable items that wear out or are disposed of regularly</p>
                      <p className="text-zinc-300">• <strong className="text-purple-300">Equipment</strong> = Durable assets that last for years (see Equipment section)</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">{materials.length} items</span>
              <div className="sm:hidden">
                {renderHeaderStats('material', true)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-zinc-400 ml-auto sm:ml-0">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={supplySort}
                  onChange={(e) => setSupplySort(e.target.value as any)}
                  className="bg-zinc-800 border-zinc-700 text-blue-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="name">A-Z Name</option>
                  <option value="category">Category</option>
                  <option value="low_stock">Low Threshold</option>
                  <option value="no_cost">⚠ Missing Cost</option>
                  <option value="updated_at">Last Updated</option>
                  <option value="where_purchased">Where Purchased</option>
                  {allSupplyVendors.length > 0 && (
                    <optgroup label="Jump to Vendor">
                      {allSupplyVendors.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="hidden sm:inline">
                {renderHeaderStats('material', false)}
              </div>
              {materials.some(m => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold) && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Low Stock</span>
                </div>
              )}
              {expandedSections.materials ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.materials && (
            <div className="p-4 border-t border-blue-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={openAddMaterial} className="bg-blue-600 hover:bg-blue-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Supply</Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveImportTab("supplies"); setInventoryImportOpen(true); }}><FileText className="h-3 w-3 mr-1" /> Import</Button>
                  <Button size="sm" variant="outline" onClick={() => setBulkCleanupWarningOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                  <Button size="sm" variant="outline" className="text-blue-400 hover:text-blue-300" onClick={() => downloadInventoryPDF('supplies')}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-blue-400 hover:text-blue-300" onClick={() => printInventory('supplies')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search supplies..."
                    className="pl-8 pr-10 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                  />
                  {supplySearch && (
                    <button 
                      onClick={() => setSupplySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-blue-500/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost/Item</TableHead>
                      <TableHead>{supplySort === 'updated_at' ? 'Last Updated' : 'Quantity'}</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplyGroups.map(group => {
                      const m = group[0];
                      const totalGroupValue = group.reduce((sum: number, x: any) => sum + ((x.costPerItem || 0) * (x.quantity || 1)), 0);
                      const totalQty = group.reduce((sum: number, x: any) => sum + (x.quantity || 1), 0);
                      return (
                      <TableRow
                        key={m.id}
                        ref={registerRow(m.id)}
                        className="border-blue-500/10 hover:bg-blue-500/5 cursor-pointer group transition-colors"
                        onClick={() => openEdit(group, 'material')}
                      >
                        <TableCell className="font-medium flex items-center gap-2 text-white">
                          {m.imageUrl && (
                            <InventoryThumbnail 
                              id={m.id}
                              src={m.imageUrl} 
                              alt={m.name} 
                              activeBorderClass="border-blue-500/50"
                              className="h-8 w-8 rounded object-cover border border-zinc-700 relative" 
                            />
                          )}
                          {m.name}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {m.category}
                          {group.some((x: any) => x.wherePurchased) && <div className="text-[10px] text-zinc-500 italic mt-0.5">At: {group.map((x: any) => x.wherePurchased).filter(Boolean).join(', ')}</div>}
                        </TableCell>
                        <TableCell className={`font-medium ${group.every((x: any) => !x.costPerItem || x.costPerItem === 0) ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                          <div className="flex flex-col gap-1">
                            {(expandedRows.has(m.id) ? group : group.slice(0, 1)).map((x: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-0.5 border-b border-zinc-800/50 pb-1 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                  <span>{!x.costPerItem || x.costPerItem === 0 ? '⚠ $0.00' : `$${(x.costPerItem).toFixed(2)}`}</span>
                                  {x.actualPrice && x.actualPrice > x.costPerItem && (
                                    <span className="text-[10px] text-zinc-500 line-through mr-1">${(x.actualPrice).toFixed(2)}</span>
                                  )}
                                </div>
                                {x.actualPrice && x.actualPrice > x.costPerItem && (
                                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1 py-0.5 rounded w-fit border border-green-500/20">
                                    Save ${(x.actualPrice - x.costPerItem).toFixed(2)}
                                  </span>
                                )}
                                {x.costPerItem > 0 && x.quantity > 0 && (
                                  <span className="text-[10px] text-zinc-500 font-bold italic">Total: ${(x.costPerItem * x.quantity).toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                            {group.length > 1 && totalGroupValue > 0 && (
                              <div className="text-[10px] text-zinc-500 font-bold italic mt-1 pt-1 border-t border-zinc-800">Combined Value: ${totalGroupValue.toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplySort === 'updated_at' ? (
                            <span className="text-xs text-zinc-400 font-mono">
                              {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : 'Never'}
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${group.some((x: any) => typeof x.lowThreshold === 'number' && x.quantity < x.lowThreshold) ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400'}`}>
                              {group.some((x: any) => typeof x.lowThreshold === 'number' && x.quantity < x.lowThreshold) && <AlertTriangle className="h-3 w-3 mr-1 fill-red-500/20" />}
                              {totalQty} units
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 align-top">
                          <div className="flex flex-col gap-1">
                            {(expandedRows.has(m.id) ? group : group.slice(0, 1)).map((x: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-0.5 border-b border-zinc-800/50 pb-1 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-zinc-400 font-bold italic">{x.wherePurchased || '-'}</span>
                                </div>
                                {x.actualPrice && x.actualPrice > x.costPerItem && (
                                  <span className="text-[10px] invisible px-1 py-0.5">Spacer</span>
                                )}
                                {x.costPerItem > 0 && x.quantity > 0 && (
                                  <span className="text-[10px] invisible">Spacer</span>
                                )}
                              </div>
                            ))}
                            {group.length > 1 && totalGroupValue > 0 && (
                              <div className="text-[10px] invisible mt-1 pt-1 border-t border-transparent">Spacer</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top pt-3">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(group, 'material'); }} className="h-8 w-8 p-0" title="Edit Item"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(m, 'material'); }} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300" title="Duplicate"><Copy className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id, 'material', m.name); }} className="h-8 w-8 p-0 text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {group.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => toggleRowExpanded(m.id, e)} 
                                className="h-6 px-2 text-zinc-400 hover:text-white border border-zinc-700/50 bg-zinc-800/30"
                              >
                                {expandedRows.has(m.id) ? (
                                  <><ChevronUp className="h-3 w-3 mr-1" /> Hide {group.length - 1}</>
                                ) : (
                                  <><ChevronDown className="h-3 w-3 mr-1" /> Show {group.length - 1}</>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );})}
                    {filteredSupplies.length === 0 && materials.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-zinc-500 bg-zinc-950/20">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 opacity-20" />
                            <p>No matches for "{supplySearch}" in supplies.</p>
                            <Button variant="link" onClick={() => setSupplySearch("")} className="text-blue-400 p-0 h-auto">Clear search</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {materials.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No materials tracked.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Supplies) */}
              <div className="md:hidden space-y-3 mt-4">
                {supplyGroups.map(group => {
                  const m = group[0];
                  const totalGroupValue = group.reduce((sum: number, x: any) => sum + ((x.costPerItem || 0) * (x.quantity || 1)), 0);
                  const totalQty = group.reduce((sum: number, x: any) => sum + (x.quantity || 1), 0);
                  return (
                  <div
                    key={m.id}
                    ref={registerRow(m.id)}
                    className="bg-zinc-900 border border-blue-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-blue-500/5 transition-colors group"
                    onClick={() => openEdit(group, 'material')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {m.imageUrl && (
                            <InventoryThumbnail 
                              id={m.id}
                              src={m.imageUrl} 
                              alt={m.name} 
                              activeBorderClass="border-blue-500/50"
                              className="h-8 w-8 rounded object-cover border border-zinc-700 relative" 
                            />
                          )}
                          {m.name}
                        </div>
                        <div className={`text-sm font-medium ${group.every((x: any) => !x.costPerItem || x.costPerItem === 0) ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                          {supplySort === 'updated_at' ? (
                            <span className="text-xs text-blue-400 font-bold italic">
                              Last Updated: {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : 'Never'}
                            </span>
                          ) : (
                            <>
                              <div className="text-zinc-400 mb-1">{m.category}</div>
                              {group.map((x: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-0.5 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{!x.costPerItem ? '⚠ $0.00' : `$${(x.costPerItem * (x.quantity || 1)).toFixed(2)}`}</span>
                                    {x.actualPrice && x.actualPrice > x.costPerItem && (
                                      <span className="text-[10px] text-zinc-500 line-through mr-1">${(x.actualPrice * (x.quantity || 1)).toFixed(2)}</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 italic">(${(x.costPerItem || 0).toFixed(2)}/ea · qty {x.quantity || 1})</div>
                                </div>
                              ))}
                              {group.length > 1 && totalGroupValue > 0 && <div className="text-[10px] text-zinc-500 font-bold italic mt-2 pt-1 border-t border-zinc-800">Total Value: ${totalGroupValue.toFixed(2)}</div>}
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 italic mt-1">Purchased at: {group.map((x: any) => x.wherePurchased).filter(Boolean).join(', ') || '-'}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit h-fit ${group.some((x: any) => typeof x.lowThreshold === 'number' && x.quantity < x.lowThreshold) ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400'}`}>
                        {group.some((x: any) => typeof x.lowThreshold === 'number' && x.quantity < x.lowThreshold) && <AlertTriangle className="h-3 w-3 mr-1 fill-red-500/20" />}
                        {totalQty} units
                      </span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-blue-500/10">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(group, 'material'); }} className="h-8" title="Edit Item">
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(m, 'material'); }} className="h-8 text-blue-400 hover:text-blue-300" title="Duplicate">
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id, 'material', m.name); }} className="h-8 text-red-500" title="Delete">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </div>
                );})}
                {filteredSupplies.length === 0 && materials.length > 0 && (
                  <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                    <p>No matches for "{supplySearch}"</p>
                    <Button variant="link" onClick={() => setSupplySearch("")} className="text-blue-400">Clear</Button>
                  </div>
                )}
                {materials.length === 0 && <div className="text-center py-6 text-muted-foreground">No materials tracked.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Equipment Section (Purple) - Renamed from Tools */}
        <div id="container-equipment" className="border border-purple-500/30 rounded-xl bg-zinc-900/50">
          <div
            id="section-equipment"
            className="p-4 bg-zinc-950 sticky z-50 border-b border-purple-500/20 flex flex-wrap items-center justify-between cursor-pointer hover:bg-zinc-950 transition-colors shadow-lg rounded-t-xl gap-3"
            style={{ top: isDemoMode ? '112px' : '72px' }}
            onClick={() => toggleSection('tools')}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <h3 className="text-lg font-semibold text-purple-100">Equipment</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-4 w-4 text-zinc-400 hover:text-purple-300 cursor-pointer transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 bg-zinc-900 border-purple-500/30" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Equipment Inventory (Durable Assets)
                    </h4>
                    <p className="text-sm text-zinc-300">
                      Track high-value, durable machinery and tools that are long-term investments for your business.
                    </p>
                    <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-700">
                      <p><strong className="text-purple-300">Examples:</strong> Pressure washers, generators, power inverters, vacuums, extractors, polishers, buffers, compressors</p>
                      <p className="pt-2"><strong className="text-zinc-300">Key Difference:</strong></p>
                      <p className="text-zinc-300">• <strong className="text-purple-300">Equipment</strong> = Durable, powered machinery with multi-year lifespan</p>
                      <p className="text-zinc-300">• <strong className="text-blue-300">Supplies</strong> = Consumable items that need frequent replacement (see Supplies section)</p>
                      <p className="pt-2 text-amber-400"><strong>💡 Tip:</strong> All powered/electric items should be Equipment</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">{tools.length} items</span>
              <div className="sm:hidden">
                {renderHeaderStats('tool', true)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-zinc-400 ml-auto sm:ml-0">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={equipmentSort}
                  onChange={(e) => setEquipmentSort(e.target.value as any)}
                  className="bg-zinc-800 border-zinc-700 text-purple-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="name">A-Z Name</option>
                  <option value="purchaseDate">Purchase Date</option>
                  <option value="low_stock">Low Threshold</option>
                  <option value="no_cost">⚠ Missing Cost</option>
                  <option value="updated_at">Last Updated</option>
                  <option value="where_purchased">Where Purchased</option>
                  {allEquipmentVendors.length > 0 && (
                    <optgroup label="Jump to Vendor">
                      {allEquipmentVendors.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="hidden sm:inline">
                {renderHeaderStats('tool', false)}
              </div>
              {expandedSections.tools ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.tools && (
            <div className="p-4 border-t border-purple-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={openAddTool} className="bg-purple-600 hover:bg-purple-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Equipment</Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveImportTab("equipment"); setInventoryImportOpen(true); }}><FileText className="h-3 w-3 mr-1" /> Import</Button>
                  <Button size="sm" variant="outline" onClick={() => setBulkCleanupWarningOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                  <Button size="sm" variant="outline" className="text-purple-400 hover:text-purple-300" onClick={() => downloadInventoryPDF('equipment')}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-purple-400 hover:text-purple-300" onClick={() => printInventory('equipment')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search equipment..."
                    className="pl-8 pr-10 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                  />
                  {equipmentSearch && (
                    <button 
                      onClick={() => setEquipmentSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-purple-500/20">
                      <TableHead>Name</TableHead>
                      <TableHead>{equipmentSort === 'updated_at' ? 'Last Updated' : 'Purchase Date'}</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Source / Vendor</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map(t => (
                      <TableRow
                        key={t.id}
                        ref={registerRow(t.id)}
                        className="border-purple-500/10 hover:bg-purple-500/5 cursor-pointer group transition-colors"
                        onClick={() => openEdit(t, 'tool')}
                      >
                        <TableCell className="font-medium flex items-center gap-2 !text-white">
                          {t.imageUrl && (
                            <InventoryThumbnail 
                              id={t.id}
                              src={t.imageUrl} 
                              alt={t.name} 
                              activeBorderClass="border-purple-500/50"
                              className="h-8 w-8 rounded object-cover border border-zinc-700 relative" 
                            />
                          )}
                          {t.name}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {equipmentSort === 'updated_at' ? (
                            <div className="font-mono text-xs text-purple-400">
                              {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'Never'}
                            </div>
                          ) : (
                            <div>{t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString() : '-'}</div>
                          )}
                          {t.wherePurchased && <div className="text-[10px] text-zinc-500 italic">At: {t.wherePurchased}</div>}
                        </TableCell>
                        <TableCell className={`font-medium ${!t.price || t.price === 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span>{!t.price || t.price === 0 ? '⚠ $0.00' : `$${(t.price).toFixed(2)}`}</span>
                              {t.actualPrice && t.actualPrice > t.price && (
                                <span className="text-[10px] text-zinc-500 line-through mr-1">${(t.actualPrice).toFixed(2)}</span>
                              )}
                            </div>
                            {t.actualPrice && t.actualPrice > t.price && (
                              <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1 py-0.5 rounded w-fit border border-green-500/20">
                                Save ${(t.actualPrice - t.price).toFixed(2)}
                              </span>
                            )}
                            {t.price > 0 && t.quantity > 1 && (
                              <span className="text-[10px] text-zinc-500 font-bold italic">Total: ${(t.price * (t.quantity || 1)).toFixed(2)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <span className="text-[11px] text-zinc-400 font-bold italic">{t.wherePurchased || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(t, 'tool'); }} className="h-8 w-8 p-0" title="Edit Item"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(t, 'tool'); }} className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300" title="Duplicate"><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(t.id, 'tool', t.name); }} className="h-8 w-8 p-0 text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEquipment.length === 0 && tools.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-zinc-500">
                           No matches for "{equipmentSearch}"
                        </TableCell>
                      </TableRow>
                    )}
                    {tools.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No tools tracked.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Equipment) */}
              <div className="md:hidden space-y-3 mt-4">
                {filteredEquipment.map(t => (
                  <div
                    key={t.id}
                    ref={registerRow(t.id)}
                    className="bg-zinc-900 border border-purple-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-purple-500/5 transition-colors group"
                    onClick={() => openEdit(t, 'tool')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {t.imageUrl && (
                            <InventoryThumbnail 
                              id={t.id}
                              src={t.imageUrl} 
                              alt={t.name} 
                              activeBorderClass="border-purple-500/50"
                              className="h-8 w-8 rounded object-cover border border-zinc-700 relative" 
                            />
                          )}
                          {t.name}
                        </div>
                        <div className={`text-sm font-medium ${!t.price || t.price === 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                          {equipmentSort === 'updated_at' ? (
                            <span className="text-xs text-purple-400 font-bold italic">
                              Last Updated: {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'Never'}
                            </span>
                          ) : (
                            <>{!t.price || t.price === 0 ? '⚠ No cost entered' : `$${(t.price).toFixed(2)}${t.quantity > 1 ? ` (Total: $${(t.price * t.quantity).toFixed(2)})` : ''}`} • {t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString() : '-'}</>
                          )}
                        </div>
                        {t.wherePurchased && <div className="text-sm text-purple-400 font-bold italic">Purchased at: {t.wherePurchased}</div>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-purple-500/10">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(t, 'tool'); }} className="h-8" title="Edit Item">
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(t, 'tool'); }} className="h-8 text-purple-400 hover:text-purple-300" title="Duplicate">
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(t.id, 'tool', t.name); }} className="h-8 text-red-500" title="Delete">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {tools.length === 0 && <div className="text-center py-6 text-muted-foreground">No tools tracked.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Usage History Section (Updated) */}
        <Card className="p-6 bg-gradient-card border-border">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-foreground">Usage History</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Time</option>
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
              </select>
              <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="inventory-history-range" />
              <Button variant="outline" onClick={() => setUpdatesModalOpen(true)}>Material Updates</Button>
            </div>
          </div>
          <div className="rounded-md border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-900/50 hover:bg-zinc-900/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Item Used</TableHead>
                  <TableHead>Amount Used</TableHead>
                  <TableHead>Amount Left</TableHead>
                  <TableHead>Service / Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map(item => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-zinc-900/30 cursor-pointer transition-colors border-b border-zinc-800/50"
                    onClick={() => { setUsageEditItem(item); setUsageEditNotes(item.notes || ''); setUsageEditOpen(true); }}
                    title="Click to view/edit notes"
                  >
                    <TableCell className="text-zinc-400 font-mono text-xs">{new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.chemicalId ? 'text-yellow-400' : item.materialId ? 'text-blue-400' : 'text-purple-400'}`}>
                        {item.chemicalName || item.materialName || item.toolName || 'Unknown Item'}
                      </span>
                    </TableCell>
                    <TableCell>{getUsageAmount(item)}</TableCell>
                    <TableCell>
                      {item.remainingStock !== undefined
                        ? <span className="text-zinc-300 font-mono">{Number(item.remainingStock).toFixed(1).replace(/\.0$/, '')}</span>
                        : <span className="text-zinc-600 italic text-xs">n/a</span>}
                    </TableCell>
                    <TableCell className="text-zinc-300 max-w-[200px]">
                      <div>{item.serviceName}</div>
                      {item.notes && <div className="text-xs text-zinc-500 py-1" title={item.notes}>{item.notes}</div>}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500">
                      No usage history found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </main >

      {/* Usage Edit Modal */}
      < Dialog open={usageEditOpen} onOpenChange={setUsageEditOpen} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Usage Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Service / Reason</Label>
              <p className="font-medium text-white">{usageEditItem?.serviceName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Item</Label>
              <p className="font-medium text-white">{usageEditItem?.chemicalName || usageEditItem?.materialName || usageEditItem?.toolName || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="text-sm text-zinc-400">{usageEditItem ? new Date(usageEditItem.date).toLocaleString() : '-'}</p>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={usageEditNotes}
                onChange={(e) => setUsageEditNotes(e.target.value)}
                placeholder="Add details about this usage..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageEditOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (isDemoMode) {
                toast({ title: 'Demo Mode (Read-Only)', description: 'Data cannot be modified during training.' });
                setUsageEditOpen(false);
                return;
              }
              if (!usageEditItem) return;
              try {
                const updated = { ...usageEditItem, notes: usageEditNotes };
                await inventoryData.saveUsageHistory(updated);
                await loadData();
                setUsageEditOpen(false);
                toast({ title: 'Usage Updated', description: 'Notes saved.' });
              } catch (error) {
                console.error('Error updating usage:', error);
                toast({
                  title: 'Update Failed',
                  description: 'Failed to save notes.',
                  variant: 'destructive'
                });
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      <UnifiedInventoryModal
        mode={modalMode}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            // Clean up session draft when closed normally
            localStorage.removeItem('pending_inventory_form');
            localStorage.removeItem('pending_inventory_form_active');
            setEditing(null); // Clear editing state so next open is fresh
          }
        }}
        initial={editing || null}
        onSaved={async () => { 
          sessionStorage.removeItem('inventory-loaded');
          await loadData(); 
        }}
      />

      <ChemicalDetail
        chemical={viewChemical}
        open={!!viewCardId}
        onOpenChange={(open) => !open && setViewCardId(null)}
        onUpdate={async () => {
          if (viewCardId) {
            const updated = await getChemicalById(viewCardId);
            if (updated) setViewChemical(updated);
          }
        }}
      />

      {/* ... keeping other modals ... */}

      <LinkChemicalModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        inventoryItem={linkTargetItem}
        onLinked={(id) => {
          loadData(); // Refresh inventory list
          // Trigger view card
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: id })), 100);
        }}
      />

      {/* Material Updates modal (Usage History) */}
      <Dialog
        open={updatesModalOpen}
        onOpenChange={(open) => {
          setUpdatesModalOpen(open);
          if (!open) {
            const params = new URLSearchParams(location.search);
            if (params.has("updates")) {
              navigate(location.pathname, { replace: true });
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material Updates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Material</Label>
                <select value={updateMatId} onChange={(e) => setUpdateMatId(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select material...</option>
                  {materials.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
                <Input placeholder="Quantity / Note (e.g., 2 bottles or 3 units)" value={updateMatQtyNote} onChange={(e) => setUpdateMatQtyNote(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label>Chemical</Label>
                <select value={updateChemId} onChange={(e) => setUpdateChemId(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select chemical...</option>
                  {chemicals.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <select value={updateChemFraction} onChange={(e) => setUpdateChemFraction(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Fraction used</option>
                  {['1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1'].map(f => (<option key={f} value={f}>{f}</option>))}
                </select>
              </div>
            </div>
            <div>
              <Label>Checklist Items (text)</Label>
              <Input value={updateChecklistText} onChange={(e) => setUpdateChecklistText(e.target.value)} placeholder="e.g., Prep inspect, Tools gathered, Final pass" />
            </div>
            <div>
              <Label>Notes to Employee</Label>
              <Input value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Provide guidance or feedback" />
            </div>
            <div>
              <Label>Notify Employee</Label>
              <select value={updateEmployee} onChange={(e) => setUpdateEmployee(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select employee...</option>
                {employees.map((e: any) => (<option key={e.id || e.email || e.name} value={String(e.id || e.email || e.name)}>{e.name || e.email || e.id}</option>))}
              </select>
            </div>
          </div>
          <DialogFooter className="button-group-responsive">
            <Button
              variant="outline"
              onClick={() => {
                setUpdatesModalOpen(false);
                const params = new URLSearchParams(location.search);
                if (params.has("updates")) navigate(location.pathname, { replace: true });
              }}
            >
              Cancel
            </Button>
            <Button className="bg-gradient-hero" onClick={async () => {
              if (isDemoMode) {
                toast({ title: 'Demo Mode (Read-Only)', description: 'Data cannot be modified during training.' });
                setUpdatesModalOpen(false);
                return;
              }
              const now = new Date().toISOString();
              const matName = materials.find(m => m.id === updateMatId)?.name;
              const chemName = chemicals.find(c => c.id === updateChemId)?.name;
              const record: UsageHistory = {
                id: `u_${Date.now()}`,
                materialId: updateMatId || undefined,
                materialName: matName || undefined,
                chemicalId: updateChemId || undefined,
                chemicalName: chemName || undefined,
                serviceName: 'Material Update',
                date: now,
              };
              const list = (await localforage.getItem<UsageHistory[]>('chemical-usage')) || [];
              list.push(record);
              await localforage.setItem('chemical-usage', list);
              setUsageHistory(list);

              // Generate Admin Updates PDF for archive
              try {
                const doc = new jsPDF();
                doc.setFontSize(16); doc.text('Admin Updates', 20, 20);
                doc.setFontSize(12); doc.text('Material Updates — Usage History', 20, 30);
                let y = 42;
                if (matName) { doc.text(`Material: ${matName} — ${updateMatQtyNote || '-'}`, 20, y); y += 8; }
                if (chemName) { doc.text(`Chemical: ${chemName} — ${updateChemFraction || '-'}`, 20, y); y += 8; }
                if (updateChecklistText) { doc.text('Checklist Items:', 20, y); y += 6; const t = doc.splitTextToSize(updateChecklistText, 170); doc.text(t, 20, y); y += t.length * 6 + 6; }
                if (updateNotes) { doc.text('Notes to Employee:', 20, y); y += 6; const n = doc.splitTextToSize(updateNotes, 170); doc.text(n, 20, y); }
                const dataUrl = doc.output('dataurlstring');
                const fileName = `Admin_Update_Materials_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
                try { const { savePDFToArchive } = await import('@/lib/pdfArchive'); savePDFToArchive('Admin Updates', 'Admin', `materials-update-${Date.now()}`, dataUrl, { fileName, path: 'Admin Updates/' }); } catch { }
              } catch { }

              // Send employee notification
              if (updateEmployee) {
                pushEmployeeNotification(updateEmployee, `Material update: ${(matName || '')}${matName && chemName ? ' & ' : ''}${chemName || ''}. Note: ${updateNotes || '-'}`, { materialId: updateMatId, chemicalId: updateChemId });
              }

              setUpdatesModalOpen(false);
              const params = new URLSearchParams(location.search);
              if (params.has("updates")) navigate(location.pathname, { replace: true });
              setUpdateMatId(''); setUpdateMatQtyNote(''); setUpdateChemId(''); setUpdateChemFraction(''); setUpdateChecklistText(''); setUpdateNotes('');
              toast({ title: 'Update Saved', description: 'Usage history updated and employee notified.' });
            }}>Save Update</Button>
          </DialogFooter>
        </DialogContent>

        {/* Import Wizard Modal */}
        <ImportWizardModal
          open={importWizardOpen}
          onOpenChange={setImportWizardOpen}
          defaultTab={importWizardTab}
          onImportComplete={loadData}
        />

      </Dialog>

      <AlertDialog open={deleteState.open} onOpenChange={(open) => setDeleteState(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteState.type === 'delete' ? 'Delete Item?' : 'Unlink Card?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState.type === 'delete'
                ? `Are you sure you want to delete "${deleteState.name}"? This action cannot be undone.`
                : `Are you sure you want to unlink the card for "${deleteState.name}"? The inventory item will remain.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className={deleteState.type === 'delete' ? "bg-destructive hover:bg-destructive/90" : ""}>
              {deleteState.type === 'delete' ? 'Delete' : 'Unlink'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <InventoryImportModal
        open={inventoryImportOpen}
        onOpenChange={setInventoryImportOpen}
        defaultTab={activeImportTab}
        onSaved={async () => {
          sessionStorage.removeItem('inventory-loaded');
          await loadData();
        }}
      />
      <InventoryCleanupModal
        open={inventoryCleanupOpen}
        onOpenChange={(open) => {
          setInventoryCleanupOpen(open);
          if (!open) loadData();
        }}
      />
      <ChemicalDetail
        chemical={viewChemical}
        open={!!viewCardId}
        onOpenChange={(open) => !open && setViewCardId(null)}
        isAdmin={true}
        onUpdate={loadData}
        showReturnToInventory={true}
      />
      {labelMakerOpen && (
        <ChemicalLabelMaker 
             open={labelMakerOpen} 
             onOpenChange={setLabelMakerOpen}
             initialChemical={labelMakerChemical as any}
             onOpenRefChart={() => setIsDilutionModalOpen(true)}
           />
      )}

      {/* Bulk Cleanup Navigation Warning */}
      <AlertDialog open={bulkCleanupWarningOpen} onOpenChange={setBulkCleanupWarningOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500 text-xl font-bold">
              <ShieldAlert className="w-6 h-6" />
              Restricted Area Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 pt-2 text-base">
              You are about to leave the Inventory page. Bulk Cleanup is highly destructive and can wipe your entire inventory.
              <br/><br/>
              To proceed, you will be redirected to the <strong className="text-red-400">Settings Danger Zone</strong> and required to enter the security PIN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white mt-0 h-11 w-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                setBulkCleanupWarningOpen(false);
                navigate('/settings?action=danger-zone');
              }}
              className="bg-red-700 hover:bg-red-600 text-white font-bold h-11 w-full"
            >
              Proceed to Danger Zone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {renderInteractiveChart()}
      

      <RatiosOnlyChart 
        open={isRatiosOnlyModalOpen} 
        onOpenChange={setIsRatiosOnlyModalOpen} 
        chemicals={chemicals}
        onOpenCalculator={() => {
          setIsRatiosOnlyModalOpen(false);
          navigate('/dilution-calculator');
        }}
      />
      </div>
    </ThumbnailZoomContext.Provider>
  );
}

export default InventoryControl;
