import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, AlertTriangle, Printer, Save, Trash2, TrendingUp, Package, ChevronDown, ChevronUp, FileText, HelpCircle, RefreshCw, Unlink as UnlinkIcon, Pencil, Info, Search, Download, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { useAlertsStore } from "@/store/alerts";
import * as inventoryData from "@/lib/inventory-data";
import api from "@/lib/api";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import UnifiedInventoryModal from "@/components/inventory/UnifiedInventoryModal";
import ImportWizardModal from "@/components/inventory/ImportWizardModal";
import jsPDF from "jspdf";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { getSupabaseEmployees } from "@/lib/supa-data"; // NEW IMPORT
import localforage from "localforage";
import { ChemicalDetail } from "@/components/chemicals/ChemicalDetail";
import { LinkChemicalModal } from "@/components/inventory/LinkChemicalModal";
import { getChemicalById } from "@/lib/chemicals";
import { InventoryImportModal } from "@/components/inventory/InventoryImportModal";
import { InventoryCleanupModal } from "@/components/inventory/InventoryCleanupModal";

import { Chemical as LibraryChemical } from "@/types/chemicals";
import { ChemicalLabelMaker } from "@/components/chemicals/ChemicalLabelMaker";

// Import types from inventory-data
type Chemical = inventoryData.Chemical;
type UsageHistory = inventoryData.UsageHistory;
type Equipment = inventoryData.Tool; // Renamed: Tool → Equipment (DB table still 'tools')
type Supply = inventoryData.Material; // Renamed: Material → Supply (DB table still 'materials')
// Legacy aliases for backward compatibility
type Tool = Equipment;
type MaterialItem = Supply;


const InventoryControl = () => {
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

  const [modalOpen, setModalOpen] = useState(false);
  const [inventoryImportOpen, setInventoryImportOpen] = useState(false);
  const [inventoryCleanupOpen, setInventoryCleanupOpen] = useState(false);
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

  // Usage Edit State
  const [usageEditOpen, setUsageEditOpen] = useState(false);
  const [usageEditItem, setUsageEditItem] = useState<UsageHistory | null>(null);
  const [usageEditNotes, setUsageEditNotes] = useState("");
  // Sorting states
  const [chemicalSort, setChemicalSort] = useState<"brand" | "alphabetical" | "low_stock">("brand");
  const [supplySort, setSupplySort] = useState<"name" | "category" | "low_stock">("name");
  const [equipmentSort, setEquipmentSort] = useState<"name" | "purchaseDate" | "low_stock">("name");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Chemical Card View State
  const [viewCardId, setViewCardId] = useState<string | null>(null);
  const [viewChemical, setViewChemical] = useState<LibraryChemical | null>(null);

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
    // Always load from localforage first (fast, cached data)
    loadDataFromCache();

    // Check if we've already fetched fresh data in this session
    const hasLoaded = sessionStorage.getItem('inventory-loaded');

    // Only fetch from database if we haven't loaded it yet (first visit in this session)
    if (!hasLoaded) {
      loadData();
      sessionStorage.setItem('inventory-loaded', 'true');
    }

    // Persist date filter
    const saved = localStorage.getItem('inventory-date-filter');
    if (saved) setDateFilter(saved as any);
    (async () => {
      const emps = await getSupabaseEmployees();
      setEmployees(emps as any[]);
    })();
  }, []);

  // Auto-open Material Updates modal ONCE when `?updates=true` or `?updates` is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("updates");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("updates"));
    if (shouldOpen && !autoOpenedFromQuery) {
      setUpdatesModalOpen(true);
      setAutoOpenedFromQuery(true);
    }
  }, [location.search, autoOpenedFromQuery]);

  useEffect(() => {
    localStorage.setItem('inventory-date-filter', dateFilter);
  }, [dateFilter]);

  // Update menu badge count whenever low stock changes
  useEffect(() => {
    const lowStockCount = chemicals.filter(c => c.currentStock < c.threshold).length +
      materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity < (m.lowThreshold || 0)).length;
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
  const getSortedChemicals = () => {
    const filtered = chemicals.filter(c =>
      c.name.toLowerCase().includes(chemicalSearch.toLowerCase()) ||
      (c.brand && c.brand.toLowerCase().includes(chemicalSearch.toLowerCase()))
    );

    if (chemicalSort === "brand") {
      // Grouping logic handled in render, but primary sort here
      return [...filtered].sort((a, b) => {
        const brandA = (a.brand || "Z - No Brand").toLowerCase();
        const brandB = (b.brand || "Z - No Brand").toLowerCase();
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        return a.name.localeCompare(b.name);
      });
    }
    if (chemicalSort === "low_stock") {
      return [...filtered].sort((a, b) => {
        const aLow = a.currentStock < a.threshold;
        const bLow = b.currentStock < b.threshold;
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSortedSupplies = () => {
    const filtered = supplies.filter(s =>
      s.name.toLowerCase().includes(supplySearch.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(supplySearch.toLowerCase()))
    );
    
    return [...filtered].sort((a, b) => {
      if (supplySort === "low_stock") {
        const aLow = typeof a.lowThreshold === 'number' && a.quantity < (a.lowThreshold || 0);
        const bLow = typeof b.lowThreshold === 'number' && b.quantity < (b.lowThreshold || 0);
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
      }
      if (supplySort === "category") {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  };

  const getSortedEquipment = () => {
    const filtered = equipment.filter(e =>
      e.name.toLowerCase().includes(equipmentSearch.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (equipmentSort === "low_stock") {
        // Equipment doesn't typically have threshold in DB, but we'll sort by 'life expectancy' or just alphabet as fallback
        return a.name.localeCompare(b.name);
      }
      if (equipmentSort === "purchaseDate") {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return dateB - dateA;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const filteredChemicals = getSortedChemicals();
  const filteredSupplies = getSortedSupplies();
  const filteredEquipment = getSortedEquipment();

  // Helper for brand grouping
  const groupedChemicals = filteredChemicals.reduce((acc, chem) => {
    const brand = chem.brand || "Other / No Brand";
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(chem);
    return acc;
  }, {} as Record<string, Chemical[]>);

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
    let yPos = 20;

    // Header
    pdf.setFillColor(color[0], color[1], color[2], 0.1);
    pdf.rect(10, 10, pageWidth - 20, 30, 'F');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${categoryName} Inventory Report`, pageWidth / 2, 25, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 35, { align: 'center' });

    yPos = 50;

    // Summary
    pdf.setFillColor(color[0], color[1], color[2], 0.05);
    pdf.rect(10, yPos, pageWidth - 20, 20, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');

    const totalValue = category === 'chemicals' ?
      (items as any[]).reduce((a, c: any) => a + (c.costPerBottle * c.currentStock), 0) :
      category === 'supplies' ?
        (items as any[]).reduce((a, m: any) => a + ((m.costPerItem || 0) * (m.quantity || 0)), 0) :
        (items as any[]).reduce((a, t: any) => a + (t.price || 0), 0);

    pdf.text(`Total Items: ${items.length}`, 15, yPos + 10);
    pdf.text(`Total Value: $${totalValue.toFixed(2)}`, pageWidth / 2, yPos + 10);

    if (category !== 'equipment') {
      const lowStock = category === 'chemicals' ?
        (items as any[]).filter((c: any) => c.currentStock < c.threshold).length :
        (items as any[]).filter((m: any) => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold).length;
      pdf.setTextColor(239, 68, 68);
      pdf.text(`Low Stock: ${lowStock}`, pageWidth - 60, yPos + 10);
    }

    yPos += 30;

    // Items
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    items.forEach((item: any, idx) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 20;
      }

      // Item header
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(10, yPos, pageWidth - 20, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');

      const itemName = category === 'chemicals' && item.brand ?
        `${item.brand} / ${item.name}` : item.name;
      pdf.text(itemName, 15, yPos + 7);

      yPos += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Item fields
      if (category === 'chemicals') {
        if (item.brand) {
          pdf.text(`Brand: ${item.brand}`, 15, yPos);
          yPos += 5;
        }
        pdf.text(`Product: ${item.name}`, 15, yPos);
        yPos += 5;
        pdf.text(`Size: ${item.bottleSize}`, 15, yPos);
        pdf.text(`Cost/Bottle: $${item.costPerBottle.toFixed(2)}`, pageWidth / 2, yPos);
        yPos += 5;

        const stockColor = item.currentStock < item.threshold ? [239, 68, 68] : [0, 0, 0];
        pdf.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
        pdf.text(`Stock: ${item.currentStock} bottles`, 15, yPos);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Threshold: ${item.threshold}`, pageWidth / 2, yPos);
        yPos += 5;
        pdf.text(`Total Value: $${(item.costPerBottle * item.currentStock).toFixed(2)}`, 15, yPos);
        yPos += 5;
        if (item.notes) {
          pdf.text(`Notes: ${item.notes.substring(0, 80)}`, 15, yPos);
          yPos += 5;
        }
      } else if (category === 'supplies') {
        pdf.text(`Name: ${item.name}`, 15, yPos);
        yPos += 5;
        pdf.text(`Category: ${item.category}`, 15, yPos);
        if (item.subtype) pdf.text(`Subtype: ${item.subtype}`, pageWidth / 2, yPos);
        yPos += 5;
        pdf.text(`Cost/Item: $${(item.costPerItem || 0).toFixed(2)}`, 15, yPos);

        const stockColor = typeof item.lowThreshold === 'number' && item.quantity < item.lowThreshold ? [239, 68, 68] : [0, 0, 0];
        pdf.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
        pdf.text(`Quantity: ${item.quantity}`, pageWidth / 2, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;
        if (typeof item.lowThreshold === 'number') {
          pdf.text(`Threshold: ${item.lowThreshold}`, 15, yPos);
          yPos += 5;
        }
        pdf.text(`Total Value: $${((item.costPerItem || 0) * (item.quantity || 0)).toFixed(2)}`, 15, yPos);
        yPos += 5;
        if (item.notes) {
          pdf.text(`Notes: ${item.notes.substring(0, 80)}`, 15, yPos);
          yPos += 5;
        }
      } else {
        pdf.text(`Name: ${item.name}`, 15, yPos);
        yPos += 5;
        pdf.text(`Price: $${(item.price || 0).toFixed(2)}`, 15, yPos);
        if (item.purchaseDate) pdf.text(`Purchased: ${new Date(item.purchaseDate).toLocaleDateString()}`, pageWidth / 2, yPos);
        yPos += 5;
        if (item.warranty) {
          pdf.text(`Warranty: ${item.warranty}`, 15, yPos);
          yPos += 5;
        }
        if (item.lifeExpectancy) {
          pdf.text(`Life Expectancy: ${item.lifeExpectancy}`, 15, yPos);
          yPos += 5;
        }
        if (item.notes) {
          pdf.text(`Notes: ${item.notes.substring(0, 80)}`, 15, yPos);
          yPos += 5;
        }
      }

      yPos += 5;
      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(10, yPos, pageWidth - 10, yPos);
      yPos += 10;
    });

    // Save PDF
    pdf.save(`${categoryName}_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
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
            background: linear-gradient(135deg, ${color}22, ${color}44);
            border-left: 4px solid ${color};
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
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
            background: ${color};
            color: white;
            padding: 12px 16px;
            margin: -20px -20px 16px -20px;
            border-radius: 6px 6px 0 0;
            font-size: 18px;
            font-weight: bold;
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
              <div class="summary-value">$${(items as any[]).reduce((a, c) => a + (c.costPerBottle * c.currentStock), 0).toFixed(2)}</div>
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
              <div class="field"><div class="field-label">Cost Per Bottle</div><div class="field-value">$${c.costPerBottle.toFixed(2)}</div></div>
              <div class="field"><div class="field-label">Current Stock</div><div class="field-value" style="${c.currentStock < c.threshold ? 'color: #ef4444; font-weight: bold;' : ''}">${c.currentStock} bottles</div></div>
              <div class="field"><div class="field-label">Low Threshold</div><div class="field-value">${c.threshold} bottles</div></div>
              <div class="field"><div class="field-label">Total Value</div><div class="field-value">$${(c.costPerBottle * c.currentStock).toFixed(2)}</div></div>
              ${c.chemicalLibraryId ? `<div class="field"><div class="field-label">Linked to Library</div><div class="field-value">Yes</div></div>` : ''}
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

  // Save handled inside UnifiedInventoryModal; refresh list on onSaved

  const handleDelete = (id: string, mode: 'chemical' | 'material' | 'tool', itemName: string) => {
    setDeleteState({ open: true, type: 'delete', mode, id, name: itemName });
  };

  const handleUnlinkRequest = (item: Chemical) => {
    setDeleteState({ open: true, type: 'unlink', mode: 'chemical', id: item.id, name: item.name, item });
  };

  const handleConfirmAction = async () => {
    const { id, mode, type, name, item } = deleteState;
    if (!id || !type) return;

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
  const [expandedSections, setExpandedSections] = useState({
    chemicals: false,
    materials: false,
    tools: false,
  });

  const toggleSection = (sec: 'chemicals' | 'materials' | 'tools') => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandAll = () => setExpandedSections({ chemicals: true, materials: true, tools: true });
  const collapseAll = () => setExpandedSections({ chemicals: false, materials: false, tools: false });

  // Metrics
  const totalItems = chemicals.length + materials.length + tools.length;
  const lowStockCount = chemicals.filter(c => c.currentStock < c.threshold).length +
    materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity < (m.lowThreshold || 0)).length;
  // Approximating value if cost exists
  const totalValue =
    chemicals.reduce((acc, c) => acc + (c.costPerBottle || 0) * (c.currentStock || 0), 0) +
    materials.reduce((acc, m) => acc + (m.costPerItem || 0) * (m.quantity || 0), 0) +
    tools.reduce((acc, t) => acc + (t.price || 0), 0);

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

  const renderChemicalRow = (c: Chemical) => (
    <TableRow
      key={c.id}
      className="border-yellow-500/10 hover:bg-yellow-500/5 cursor-pointer"
      onClick={() => openEdit(c, 'chemical')}
    >
      <TableCell className="font-medium flex items-center gap-2 text-white">
        {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="h-8 w-8 rounded object-cover border border-zinc-700" />}
        {c.brand ? `${c.brand} / ${c.name}` : c.name}
      </TableCell>
      <TableCell className="text-zinc-300">{c.bottleSize}</TableCell>
      <TableCell className="text-zinc-300">${c.costPerBottle.toFixed(2)}</TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${c.currentStock < c.threshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {c.currentStock < c.threshold && <AlertTriangle className="h-3 w-3 mr-1 fill-red-500/20" />}
          {c.currentStock} remaining
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {c.chemicalLibraryId ? (
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="h-8 text-blue-400 hover:text-blue-300" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: c.chemicalLibraryId })); }}>
                <FileText className="h-4 w-4 mr-1" /> Card
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-purple-400 hover:text-purple-300" onClick={(e) => { e.stopPropagation(); openLabelMaker(c); }}>
                <Tag className="h-4 w-4 mr-1" /> Label
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c, 'chemical'); }} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id, 'chemical', c.name); }} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderChemicalCard = (c: Chemical) => (
    <div
      key={c.id}
      className="bg-zinc-900 border border-yellow-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-yellow-500/5 transition-colors"
      onClick={() => openEdit(c, 'chemical')}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-white flex items-center gap-2">
            {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="h-8 w-8 rounded object-cover" />}
            {c.brand ? `${c.brand} / ${c.name}` : c.name}
          </div>
          <div className="text-sm text-zinc-300">{c.bottleSize} • ${c.costPerBottle.toFixed(2)}</div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${c.currentStock < c.threshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {c.currentStock} left
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
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c, 'chemical'); }} className="h-8 px-2">
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id, 'chemical', c.name); }} className="h-8 text-red-500 px-2">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
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

        {/* Data Management Actions */}
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
            onClick={() => setInventoryCleanupOpen(true)}
            variant="outline"
            className="h-12 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-red-500/50 group"
          >
            <Trash2 className="h-5 w-5 mr-2 text-red-500 group-hover:text-red-400" />
            <div className="text-left">
              <div className="font-semibold text-sm">Bulk Cleanup</div>
            </div>
          </Button>
        </div>

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
        <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-yellow-500/10 flex items-center justify-between cursor-pointer hover:bg-yellow-500/15 transition-colors"
            onClick={() => toggleSection('chemicals')}
          >
            <div className="flex items-center gap-3">
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
                      <p><strong className="text-zinc-300">Features:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Track bottle sizes and costs</li>
                        <li>Monitor current stock levels</li>
                        <li>Set low stock thresholds for alerts</li>
                        <li>Link to Chemical Library for SDS info</li>
                      </ul>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{chemicals.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={chemicalSort}
                  onChange={(e) => setChemicalSort(e.target.value as any)}
                  className="bg-zinc-800 border-zinc-700 text-yellow-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="brand">By Brand</option>
                  <option value="alphabetical">A-Z List</option>
                  <option value="low_stock">Low Threshold</option>
                </select>
              </div>
              <span className="mr-4 hidden sm:inline">Value: <span className="text-zinc-200">${chemicals.reduce((a, c) => a + (c.costPerBottle * c.currentStock), 0).toFixed(0)}</span></span>
              {chemicals.some(c => c.currentStock < c.threshold) && (
                <span className="text-red-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {chemicals.filter(c => c.currentStock < c.threshold).length} Low
                </span>
              )}
              {expandedSections.chemicals ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.chemicals && (
            <div className="p-4 border-t border-yellow-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap text-[10px] font-bold">
                  <Button size="sm" onClick={openAddChemical} className="bg-yellow-600 hover:bg-yellow-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Chemical</Button>
                  <Button size="sm" variant="outline" onClick={() => { setLabelMakerChemical(null); setLabelMakerOpen(true); }} className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400"><Tag className="h-3 w-3 mr-1" /> Create Label</Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveImportTab("chemicals"); setInventoryImportOpen(true); }}><FileText className="h-3 w-3 mr-1" /> Import</Button>
                  <Button size="sm" variant="outline" onClick={() => setInventoryCleanupOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                  <Button size="sm" variant="outline" className="text-yellow-400 hover:text-yellow-300" onClick={() => downloadInventoryPDF('chemicals')}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-yellow-400 hover:text-yellow-300" onClick={() => printInventory('chemicals')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search chemicals..."
                    className="pl-8 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={chemicalSearch}
                    onChange={(e) => setChemicalSearch(e.target.value)}
                  />
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
                            {groupedChemicals[brand].map(c => renderChemicalRow(c))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-3">
                        {groupedChemicals[brand].map(c => renderChemicalCard(c))}
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
                            <TableHead>Stock Level</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredChemicals.map(c => renderChemicalRow(c))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {filteredChemicals.map(c => renderChemicalCard(c))}
                    </div>
                  </>
                )}
                {chemicals.length === 0 && <div className="text-center py-6 text-muted-foreground">No chemicals tracked.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Supplies Section (Blue) - Renamed from Materials */}
        <div className="border border-blue-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-blue-500/10 flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-colors"
            onClick={() => toggleSection('materials')}
          >
            <div className="flex items-center gap-3">
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
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{materials.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={supplySort}
                  onChange={(e) => setSupplySort(e.target.value as any)}
                  className="bg-zinc-800 border-zinc-700 text-blue-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="name">A-Z Name</option>
                  <option value="category">Category</option>
                  <option value="low_stock">Low Threshold</option>
                </select>
              </div>
              <span className="mr-4 hidden sm:inline">Value: <span className="text-zinc-200">${materials.reduce((a, m) => a + ((m.costPerItem || 0) * (m.quantity || 0)), 0).toFixed(0)}</span></span>
              {materials.some(m => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold) && (
                <span className="text-red-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold).length} Low
                </span>
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
                  <Button size="sm" variant="outline" onClick={() => setInventoryCleanupOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                  <Button size="sm" variant="outline" className="text-blue-400 hover:text-blue-300" onClick={() => downloadInventoryPDF('supplies')}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-blue-400 hover:text-blue-300" onClick={() => printInventory('supplies')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search supplies..."
                    className="pl-8 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-blue-500/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost/Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupplies.map(m => (
                      <TableRow
                        key={m.id}
                        className="border-blue-500/10 hover:bg-blue-500/5 cursor-pointer"
                        onClick={() => openEdit(m, 'material')}
                      >
                        <TableCell className="font-medium flex items-center gap-2 text-white">
                          {m.imageUrl && <img src={m.imageUrl} alt={m.name} className="h-8 w-8 rounded object-cover border border-zinc-700" />}
                          {m.name}
                        </TableCell>
                        <TableCell className="text-zinc-300">{m.category}</TableCell>
                        <TableCell className="text-zinc-300">${(m.costPerItem || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400'}`}>
                            {typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold && <AlertTriangle className="h-3 w-3 mr-1 fill-red-500/20" />}
                            {m.quantity} units
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(m, 'material'); }} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id, 'material', m.name); }} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {materials.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No materials tracked.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Supplies) */}
              <div className="md:hidden space-y-3 mt-4">
                {materials.map(m => (
                  <div
                    key={m.id}
                    className="bg-zinc-900 border border-blue-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-blue-500/5 transition-colors"
                    onClick={() => openEdit(m, 'material')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {m.imageUrl && <img src={m.imageUrl} alt={m.name} className="h-8 w-8 rounded object-cover" />}
                          {m.name}
                        </div>
                        <div className="text-sm text-zinc-300">{m.category} • ${(m.costPerItem || 0).toFixed(2)}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${typeof m.lowThreshold === 'number' && m.quantity < m.lowThreshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400'}`}>
                        {m.quantity} units
                      </span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-blue-500/10">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(m, 'material'); }} className="h-8">
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id, 'material', m.name); }} className="h-8 text-red-500">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {materials.length === 0 && <div className="text-center py-6 text-muted-foreground">No materials tracked.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Equipment Section (Purple) - Renamed from Tools */}
        <div className="border border-purple-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-purple-500/10 flex items-center justify-between cursor-pointer hover:bg-purple-500/15 transition-colors"
            onClick={() => toggleSection('tools')}
          >
            <div className="flex items-center gap-3">
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
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{tools.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Sort:</span>
                <select
                  value={equipmentSort}
                  onChange={(e) => setEquipmentSort(e.target.value as any)}
                  className="bg-zinc-800 border-zinc-700 text-purple-500 text-[10px] font-bold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="name">A-Z Name</option>
                  <option value="purchaseDate">Purchase Date</option>
                  <option value="low_stock">Low Threshold</option>
                </select>
              </div>
              <div className="hidden sm:block">
                <span className="mr-4">Value: <span className="text-zinc-200">${tools.reduce((a, t) => a + (t.price || 0), 0).toFixed(0)}</span></span>
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
                  <Button size="sm" variant="outline" onClick={() => setInventoryCleanupOpen(true)} className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20"><Trash2 className="h-3 w-3 mr-1" /> Cleanup</Button>
                  <Button size="sm" variant="outline" className="text-purple-400 hover:text-purple-300" onClick={() => downloadInventoryPDF('equipment')}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" className="text-purple-400 hover:text-purple-300" onClick={() => printInventory('equipment')}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="search"
                    placeholder="Search equipment..."
                    className="pl-8 h-9 bg-zinc-900 border-zinc-700 text-white"
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-purple-500/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map(t => (
                      <TableRow
                        key={t.id}
                        className="border-purple-500/10 hover:bg-purple-500/5 cursor-pointer"
                        onClick={() => openEdit(t, 'tool')}
                      >
                        <TableCell className="font-medium flex items-center gap-2 !text-white">
                          {t.imageUrl && <img src={t.imageUrl} alt={t.name} className="h-8 w-8 rounded object-cover border border-zinc-700" />}
                          {t.name}
                        </TableCell>
                        <TableCell className="text-zinc-300">{t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-zinc-300">${(t.price || 0).toFixed(2)}</TableCell>
                        <TableCell><span className="text-xs text-zinc-300 truncate max-w-[200px] inline-block">{t.notes}</span></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(t, 'tool'); }} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(t.id, 'tool', t.name); }} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tools.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No tools tracked.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Equipment) */}
              <div className="md:hidden space-y-3 mt-4">
                {tools.map(t => (
                  <div
                    key={t.id}
                    className="bg-zinc-900 border border-purple-500/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-purple-500/5 transition-colors"
                    onClick={() => openEdit(t, 'tool')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {t.imageUrl && <img src={t.imageUrl} alt={t.name} className="h-8 w-8 rounded object-cover" />}
                          {t.name}
                        </div>
                        <div className="text-sm text-zinc-300">${(t.price || 0).toFixed(2)} • {t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>
                    {t.notes && <div className="text-xs text-zinc-300">{t.notes}</div>}
                    <div className="flex justify-end gap-2 pt-2 border-t border-purple-500/10">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(t, 'tool'); }} className="h-8">
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(t.id, 'tool', t.name); }} className="h-8 text-red-500">
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
                      {item.notes && <div className="text-xs text-zinc-500 truncate" title={item.notes}>{item.notes}</div>}
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
        onOpenChange={setModalOpen}
        initial={editing || null}
        onSaved={async () => { await loadData(); }}
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
        onOpenChange={(open) => {
          setInventoryImportOpen(open);
          if (!open) loadData(); // Refresh data after close
        }}
        defaultTab={activeImportTab}
      />
      <InventoryCleanupModal
        open={inventoryCleanupOpen}
        onOpenChange={(open) => {
          setInventoryCleanupOpen(open);
          if (!open) loadData(); // Refresh data after close
        }}
      />
      <ChemicalDetail
        chemical={viewChemical}
        open={!!viewCardId}
        onOpenChange={(open) => !open && setViewCardId(null)}
        isAdmin={true}
        onUpdate={loadData}
      />
      {labelMakerOpen && (
        <ChemicalLabelMaker
          open={labelMakerOpen}
          onOpenChange={setLabelMakerOpen}
          initialChemical={labelMakerChemical}
        />
      )}
    </div >
  );
}

export default InventoryControl;
