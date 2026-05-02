import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, CheckCircle2, ChevronRight, Save, Receipt, ChevronDown, ChevronUp, FileText, Check, AlertCircle, HelpCircle, Info, Clock, FlaskConical, Car, Calendar, Beaker, Scale, ClipboardList, Share2, MapPin, Printer, Download, X, Camera, Image as ImageIcon, Video, Gauge, Sparkles, ExternalLink, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import localforage from "localforage";
import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { purgeTestCustomers } from "@/lib/db";
import { 
  getSupabaseEmployees, 
  getSupabaseInvoices, 
  upsertSupabaseInvoice,
  getSupabaseCustomers, 
  upsertSupabaseCustomer, 
  upsertSupabaseBooking,
  upsertSupabaseEstimate,
  deleteSupabaseBooking,
  Customer as CustomerType
} from "@/lib/supa-data";
import { generateInvoiceNumber } from "@/lib/utils";
import logo from "@/assets/pds-final-logo.png";
import { getUnifiedCustomers } from "@/lib/customers";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CustomerModal from "@/components/customers/CustomerModal";
import { servicePackages, addOns, getServicePrice, getAddOnPrice, VehicleType as VehKey, getServiceInstructions } from "@/lib/services";
import { getCustomPackages, getCustomAddOns, getPackageMeta, getAddOnMeta, buildFullSyncPayload } from "@/lib/servicesMeta";
import { Progress } from "@/components/ui/progress";
import MaterialsUsedModal from "@/components/checklist/MaterialsUsedModal";
import { ChemicalStepModal } from "@/components/checklist/ChemicalStepModal";
import { ChemicalDecisionModal } from "@/components/checklist/ChemicalDecisionModal";
import { PrepChemicalsSummary } from "@/components/checklist/PrepChemicalsSummary";
import HelpModal from "@/components/help/HelpModal";
import TipSelectionScreen from "@/components/TipSelectionScreen";
import RicksTipsModal from "@/components/chemicals/RicksTipsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DisplayService = {
  id: string;
  name: string;
  description?: string;
  chemicals?: string[];
  kind: 'package' | 'addon' | 'special';
};

interface Customer {
  id?: string;
  name: string;
  vehicleType: string;
}

// Vehicle UI labels to dynamic keys
// Helper to ensure we pass a valid built-in key to legacy getters when needed
function toBuiltInVehKey(key: string): VehKey {
  return (key === 'compact' || key === 'midsize' || key === 'truck' || key === 'luxury') ? (key as VehKey) : 'midsize';
}

// Build display lists from dynamic sources + admin customizations
// Build display lists from dynamic sources + admin customizations
function buildCoreServices(): DisplayService[] {
  const customs = getCustomPackages();
  const pkgs = [...servicePackages, ...customs];
  return pkgs
    .filter(p => (getPackageMeta(p.id)?.deleted !== true) && (getPackageMeta(p.id)?.visible !== false))
    .map(p => ({ id: p.id, name: p.name, description: (p as any).description || "", kind: 'package' }));
}

function buildAddOnServices(): DisplayService[] {
  const customs = getCustomAddOns();
  const base = addOns;
  const merged = [
    ...base.map(a => ({ id: a.id, name: a.name, kind: 'addon' as const })),
    ...customs.map(a => ({ id: a.id, name: a.name, kind: 'addon' as const })),
  ];
  return merged.filter(a => (getAddOnMeta(a.id)?.deleted !== true) && (getAddOnMeta(a.id)?.visible !== false));
}

const ServiceChecklist = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  // Dynamic vehicle types (store slug key directly)
  const [vehicleType, setVehicleType] = useState<string>('midsize');
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan",
    midsize: "Mid-Size/SUV",
    truck: "Truck/Van/Large SUV",
    luxury: "Luxury/High-End",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact', 'midsize', 'truck', 'luxury']);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<"percent" | "dollar">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [destinationFee, setDestinationFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Tip Checkout Flow
  const [showTipScreen, setShowTipScreen] = useState(false);
  const [finishedJobId, setFinishedJobId] = useState<string | null>(null);

  // New generic job flow state
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [liveAddOns, setLiveAddOns] = useState<any[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [vYear, setVYear] = useState<string>("");
  const [vMake, setVMake] = useState<string>("");
  const [vModel, setVModel] = useState<string>("");
  const [employeeAssigned, setEmployeeAssigned] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [checklistId, setChecklistId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [genericCustomerName, setGenericCustomerName] = useState<string>("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerType[]>([]);
  const [vehicleTypeOther, setVehicleTypeOther] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Mileage State
  const [odometerStart, setOdometerStart] = useState<string>("");
  const [odometerEnd, setOdometerEnd] = useState<string>("");
  const milesTraveled = useMemo(() => {
    const start = parseFloat(odometerStart);
    const end = parseFloat(odometerEnd);
    if (!isNaN(start) && !isNaN(end) && end >= start) return end - start;
    return 0;
  }, [odometerStart, odometerEnd]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const resetForm = () => {
    setChecklistId("");
    setSelectedCustomer("");
    setVehicleType("midsize");
    setSelectedServices([]);
    setDiscountValue("");
    setDestinationFee(0);
    setNotes("");
    setSelectedPackage("");
    setSelectedAddOns([]);
    setEstimatedTime("");
    setVYear("");
    setVMake("");
    setVModel("");
    setEmployeeAssigned("");
    setCustomerSearch("");
    setGenericCustomerName("");
    setVehicleTypeOther("");
    setSelectedVehicleId("");
    setOdometerStart("");
    setOdometerEnd("");
    setChecklistSteps([]);
    setChemRows([]);
    setMatRows([]);
    setToolRows([]);
    setFinishedJobId(null);
    setShowTipScreen(false);
  };

  // Read employee from URL params (from Staff Schedule "Start Job")
  useEffect(() => {
    const employeeParam = searchParams.get('employee');
    const employeeIdParam = searchParams.get('employeeId');
    if (employeeParam && employeeIdParam) {
      // Auto-select the employee
      setEmployeeAssigned(employeeIdParam);
      toast({
        title: "Employee Auto-Selected",
        description: `Job assigned to ${employeeParam}`,
      });
    }
  }, [searchParams]);

  /* Accordion states for Materials Used & Discount */
  const [materialsAccordion, setMaterialsAccordion] = useState({ chemicals: false, materials: false, tools: false });
  const [materialsSectionExpanded, setMaterialsSectionExpanded] = useState(false);
  const [mileageExpanded, setMileageExpanded] = useState(false);
  const [addOnsExpanded, setAddOnsExpanded] = useState(false);
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const [destinationExpanded, setDestinationExpanded] = useState(false);
  const toggleMatAccordion = (sec: 'chemicals' | 'materials' | 'tools') => setMaterialsAccordion(prev => ({ ...prev, [sec]: !prev[sec] }));
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string, string>>({});
  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({}); // Track expanded help items

  // Rick's Tips State
  const [tipsOpen, setTipsOpen] = useState(false);




  const getKey = (type: 'package' | 'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const toVehKey = (value: string): VehKey => {
    const builtIns: VehKey[] = ['compact', 'midsize', 'truck', 'luxury'];
    const v = String(value || '').trim();
    if ((builtIns as string[]).includes(v)) return v as VehKey;
    const fromLabel = Object.keys(vehicleLabels).find(k => (vehicleLabels[k] || '').toLowerCase() === v.toLowerCase());
    const key = fromLabel || v;
    return toBuiltInVehKey(key);
  };

  // Load live vehicle types
  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        const res = await fetch(`/api/vehicle-types/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, string> = { ...vehicleLabels };
            const opts: string[] = [];
            data.forEach((vt: any) => {
              const id = String(vt.id || vt.key || '').trim();
              const name = String(vt.name || '').trim();
              if (id && name) { map[id] = name; opts.push(id); }
            });
            setVehicleLabels(map);
            setVehicleOptions(opts.length ? opts : ['compact', 'midsize', 'truck', 'luxury']);
            if (!opts.includes(vehicleType)) setVehicleType(opts[0] || 'midsize');
          }
        }
      } catch { }
    };
    loadVehicleTypes();
    const onChanged = (e: any) => {
      if (e && e.detail && (e.detail.kind === 'vehicle-types' || e.detail.type === 'vehicle-types')) loadVehicleTypes();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  // Load savedPrices for dynamic pricing
  useEffect(() => {
    const loadSavedPrices = async () => {
      try {
        const snapshot = await buildFullSyncPayload();
        setSavedPricesLive(snapshot.savedPrices || {});
      } catch { }
    };
    loadSavedPrices();
    const onChanged = (e: any) => {
      if (e && e.detail && (e.detail.kind === 'savedPrices' || e.detail.type === 'savedPrices')) loadSavedPrices();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  // Hard reload page when admin triggers force refresh (vehicle types changed)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'force-refresh') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  type ChecklistStep = { id: string; name: string; category: 'preparation' | 'exterior' | 'interior' | 'final'; checked: boolean; instructions?: string };
  const [checklistSteps, setChecklistSteps] = useState<ChecklistStep[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Timer State
  const [jobStartTime, setJobStartTime] = useState<number | null>(null);
  const [jobEndTime, setJobEndTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  useEffect(() => {
    // Auto-start timer on first check if not already started
    if (!jobStartTime && checklistSteps.some(s => s.checked)) {
      setJobStartTime(Date.now());
    }
  }, [checklistSteps, jobStartTime]);

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobStartTime && !jobEndTime) {
      interval = setInterval(() => {
        const diff = Date.now() - jobStartTime;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobStartTime, jobEndTime]);

  // Materials Used state
  type ChemItem = { id: string; name: string; threshold?: number; currentStock?: number };
  type MatItem = { id: string; name: string; lowThreshold?: number; quantity?: number };
  type ToolItem = { id: string; name: string; };
  const [chemicalsList, setChemicalsList] = useState<ChemItem[]>([]);
  const [materialsList, setMaterialsList] = useState<MatItem[]>([]);
  const [toolsList, setToolsList] = useState<ToolItem[]>([]);
  type ChemRow = { chemicalId: string; fraction: '1/8' | '1/4' | '3/8' | '1/2' | '5/8' | '3/4' | '7/8' | '1' | ''; notes?: string };
  type MatRow = { materialId: string; quantityNote: string };
  type ToolRow = { toolId: string; notes: string };
  const [chemRows, setChemRows] = useState<ChemRow[]>([]);
  const [matRows, setMatRows] = useState<MatRow[]>([]);
  const [toolRows, setToolRows] = useState<ToolRow[]>([]);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);

  // Chemical Modal State
  const [chemModalOpen, setChemModalOpen] = useState(false);
  const [currentStepId, setCurrentStepId] = useState("");
  const [currentStepName, setCurrentStepName] = useState("");

  const handleOpenChemicals = (stepId: string, stepName: string) => {
    setCurrentStepId(stepId);
    setCurrentStepName(stepName);
    setChemModalOpen(true);
  };

  const [prepSummaryOpen, setPrepSummaryOpen] = useState(false);

  const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      await purgeTestCustomers();
      const list = await getUnifiedCustomers();
      setCustomers(list as CustomerType[]);
      const prefill = params.get("customerId");
      if (prefill && list.find((c: any) => c.id === prefill)) {
        setSelectedCustomer(prefill);
      } else {
        // Fallback: name match
        const cName = params.get("customerName");
        if (cName) {
          const match = list.find((c: any) => c.name === cName);
          if (match) setSelectedCustomer(match.id);
        }
      }

      const cNameRaw = params.get("customerName");
      if (cNameRaw) setGenericCustomerName(decodeURIComponent(cNameRaw));

      const pkgId = params.get("package");
      if (pkgId) setSelectedPackage(pkgId);

      const vType = params.get("vehicleType");
      if (vType) {
        // Map to built-in key logic
        const key = toVehKey(vType);
        setVehicleType(key);
      }

      const addonsParam = params.get("addons");
      if (addonsParam) {
        setSelectedAddOns(addonsParam.split(','));
      }

      const year = params.get("vehicleYear");
      if (year) setVYear(decodeURIComponent(year));
      const make = params.get("vehicleMake");
      if (make) setVMake(decodeURIComponent(make));
      const model = params.get("vehicleModel");
      if (model) setVModel(decodeURIComponent(model));
    })();
  }, [params]);

  // Auto-fill estimated time when package changes
  useEffect(() => {
    if (selectedPackage) {
      const nid = selectedPackage.toLowerCase();
      let duration = "2 hours";
      if (nid.includes('full')) duration = "2.5 hours";
      else if (nid.includes('interior')) duration = "1.5 hours";
      else if (nid.includes('exterior')) duration = "1 hour";
      
      setEstimatedTime(duration);
    }
  }, [selectedPackage]);

  useEffect(() => {
    (async () => {
      let currentEmps: any[] = [];
      try {
        setEmployeesLoading(true);
        // Cache check
        const cached = sessionStorage.getItem('cached_employees');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 60000) {
              currentEmps = parsed.data || [];
              setEmployees(currentEmps);
              setEmployeesLoading(false);
            }
          } catch { }
        }

        // Load fresh data
        const fresh = await getSupabaseEmployees();
        if (fresh) {
          currentEmps = fresh;
          setEmployees(fresh);
          sessionStorage.setItem('cached_employees', JSON.stringify({
            data: fresh,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
        if (currentEmps.length === 0) setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }

      // Load live add-ons via API
      try {
        const live = await api('/api/addons/live', { method: 'GET' });
        setLiveAddOns(Array.isArray(live) ? live : []);
      } catch (e) { console.error(e); }

      // Preselect default employee if present and not already set
      // We use currentEmps which holds either cached or fresh data
      const defaultEmp = currentEmps.find(e => 
        e.name.toLowerCase().includes('rick') || 
        e.email?.toLowerCase().includes('rberube') ||
        e.name.toLowerCase().includes('rberube54')
      ) || currentEmps[0];

      if (defaultEmp && !employeeAssigned) {
        setEmployeeAssigned(String(defaultEmp.id || defaultEmp.name || ''));
      }
    })();
  }, [params]);

  useEffect(() => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer?.vehicleType) {
        // Attempt to map stored value to UI label
        const key = toVehKey(customer.vehicleType);
        setVehicleType((vehicleOptions.includes(key) ? key : 'midsize'));
      }

      // Auto-select first vehicle if available
      if (customer?.vehicles && customer.vehicles.length > 0) {
        setSelectedVehicleId(customer.vehicles[0].id || "");
        if (customer.vehicles[0].type) {
          const key = toVehKey(customer.vehicles[0].type);
          setVehicleType((vehicleOptions.includes(key) ? key : 'midsize'));
        }
      } else {
        setSelectedVehicleId("");
      }

      // Pre-check previous services from the latest invoice
      (async () => {
        const invs = await getSupabaseInvoices();
        const custInvs = (invs as any[]).filter(inv => inv.customerId === selectedCustomer);
        custInvs.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        const last = custInvs[0];
        if (last?.services?.length) {
          const all = [...buildCoreServices(), ...buildAddOnServices(), { id: 'destination-fee', name: 'Destination Fee', kind: 'special' as const }];
          const ids = last.services
            .map((s: any) => {
              const matched = all.find(x => x.name === s.name);
              // Only auto-preselect packages, NOT add-ons (per user request)
              if (matched && matched.kind === 'package') return matched.id;
              return null;
            })
            .filter(Boolean) as string[];
          
          if (ids.length) {
            // Only set if we don't already have a selection (e.g. from URL)
            setSelectedPackage(prev => prev || ids[0]);
          }
        }
      })();
    }
  }, [selectedCustomer, customers]);

  // Load inventory lists for Materials Used selector (preferred split endpoints, fallback to /all)
  useEffect(() => {
    (async () => {
      // Helper to normalize IDs to string and handle _id/key variants
      const normalize = (list: any[]) => {
        if (!Array.isArray(list)) return [];
        return list
          .map(i => ({ ...i, id: String(i.id || i._id || i.key || '') }))
          .filter(i => i.id && i.name);
      };

      try {
        const chems = await api('/api/inventory/chemicals', { method: 'GET' });
        const mats = await api('/api/inventory/materials', { method: 'GET' });

        let validChems = normalize(chems as any[]);
        let validMats = normalize(mats as any[]);

        // Fallback if either is empty
        if (validChems.length === 0 || validMats.length === 0) {
          const res = await api('/api/inventory/all', { method: 'GET' });
          const { chemicals = [], materials = [] } = (res as any) || {};
          if (validChems.length === 0) validChems = normalize(chemicals);
          if (validMats.length === 0) validMats = normalize(materials);
        }
        setChemicalsList(validChems);
        setMaterialsList(validMats);
      } catch {
        try {
          const res = await api('/api/inventory/all', { method: 'GET' });
          const { chemicals = [], materials = [] } = (res as any) || {};
          setChemicalsList(normalize(chemicals));
          setMaterialsList(normalize(materials));
        } catch {
          setChemicalsList([]);
          setMaterialsList([]);
        }
      }
      const tls = await localforage.getItem<ToolItem[]>('tools') || [];
      // Normalize tools as well just in case
      setToolsList(normalize(tls));
    })();
  }, []);

  // Materials helpers
  const FRACTIONS: ChemRow['fraction'][] = ['1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1'];
  const [chemSearch, setChemSearch] = useState<string>('');
  const [matSearch, setMatSearch] = useState<string>('');
  const addChemicalRow = () => setChemRows(prev => ([...prev, { chemicalId: '', fraction: '', notes: '' }]));
  const updateChemicalRow = (idx: number, patch: Partial<ChemRow>) => setChemRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const removeChemicalRow = (idx: number) => setChemRows(prev => prev.filter((_, i) => i !== idx));
  const addMaterialRow = () => setMatRows(prev => ([...prev, { materialId: '', quantityNote: '' }]));
  const updateMaterialRow = (idx: number, patch: Partial<MatRow>) => setMatRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const removeMaterialRow = (idx: number) => setMatRows(prev => prev.filter((_, i) => i !== idx));
  const addToolRow = () => setToolRows(prev => ([...prev, { toolId: '', notes: '' }]));
  const updateToolRow = (idx: number, patch: Partial<ToolRow>) => setToolRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const removeToolRow = (idx: number) => setToolRows(prev => prev.filter((_, i) => i !== idx));

  const postChecklistMaterials = async (jobId: string, finalize = false) => {
    // Map fractional selections to numeric quantities for inventory decrement
    const FRACTION_TO_NUM: Record<string, number> = {
      '1/8': 0.125,
      '1/4': 0.25,
      '3/8': 0.375,
      '1/2': 0.5,
      '5/8': 0.625,
      '3/4': 0.75,
      '7/8': 0.875,
      '1': 1,
      '': 0,
    };
    const serviceName = (servicePackages.find(p => p.id === selectedPackage)?.name
      || getCustomPackages().find((p: any) => p.id === selectedPackage)?.name
      || 'Service');
    const nowIso = new Date().toISOString();
    const chemItems = chemRows
      .filter(r => r.chemicalId)
      .map(r => ({
        chemicalId: r.chemicalId,
        quantity: FRACTION_TO_NUM[r.fraction || ''] || 0,
        notes: r.notes || '',
        serviceName,
        date: nowIso,
        employee: employeeAssigned || '',
      }))
      .filter(i => i.quantity > 0);
    const matItems = matRows
      .filter(r => r.materialId)
      .map(r => {
        const match = String(r.quantityNote || '').match(/\d+(\.\d+)?/);
        const quantity = match ? Number(match[0]) : 0;
        return {
          materialId: r.materialId,
          quantity,
          notes: r.quantityNote || '',
          serviceName,
          date: nowIso,
          employee: employeeAssigned || '',
        };
      })
      .filter(i => i.quantity > 0);
    const toolItems = toolRows
      .filter(r => r.toolId)
      .map(r => ({
        toolId: r.toolId,
        toolName: toolsList.find(t => t.id === r.toolId)?.name,
        notes: r.notes || '',
        serviceName,
        date: nowIso,
        employee: employeeAssigned || '',
      }));
    const items = [...chemItems, ...matItems];

    // Save tool usage to localforage
    if (toolItems.length > 0) {
      const currentUsage = await localforage.getItem<any[]>('tool-usage') || [];
      await localforage.setItem('tool-usage', [...currentUsage, ...toolItems]);
    }
    try {
      const res = await api('/api/checklist/materials', { method: 'POST', body: JSON.stringify({ jobId, rows: items }) });
      if ((res as any)?.ok || res === null) {
        toast({ title: finalize ? 'Materials finalized' : 'Materials saved', description: finalize ? 'Inventory updated and usage history logged.' : 'Materials usage recorded for this job.' });

        // On finalize, generate an Admin Updates PDF summarizing materials/chemicals used
        if (finalize && items.length > 0) {
          const doc = new jsPDF();
          let y = 20;
          doc.setFontSize(16);
          doc.text('Admin Updates', 20, y);
          y += 10;
          doc.setFontSize(12);
          doc.text(`Materials Update — Job ${jobId}`, 20, y);
          y += 8;
          doc.text(`Service: ${serviceName}`, 20, y);
          y += 8;
          if (employeeAssigned) { doc.text(`Employee: ${employeeAssigned}`, 20, y); y += 8; }
          doc.text(`Date: ${new Date().toLocaleString()}`, 20, y);
          y += 12;

          doc.setFontSize(12);
          doc.text('Chemicals Used:', 20, y);
          y += 8;
          const chemLines = chemItems.map(ci => `• ${String(chemicalsList.find(c => String(c.id) === String(ci.chemicalId))?.name || ci.chemicalId)} — ${ci.quantity} unit(s)`);
          const chemText = doc.splitTextToSize(chemLines.length ? chemLines.join('\n') : '(none)', 170);
          doc.text(chemText, 20, y);
          y += chemText.length * 6 + 8;

          doc.text('Materials Used:', 20, y);
          y += 8;
          const matLines = matItems.map(mi => `• ${String(materialsList.find(m => String(m.id) === String(mi.materialId))?.name || mi.materialId)} — ${mi.quantity} unit(s)`);
          const matText = doc.splitTextToSize(matLines.length ? matLines.join('\n') : '(none)', 170);
          doc.text(matText, 20, y);
          y += matText.length * 6 + 8;

          doc.text('Tools Used:', 20, y);
          y += 8;
          const toolLines = toolItems.map(ti => `• ${String(ti.toolName || ti.toolId)}`);
          const toolText = doc.splitTextToSize(toolLines.length ? toolLines.join('\n') : '(none)', 170);
          doc.text(toolText, 20, y);
          y += toolText.length * 6 + 8;

          const pdfDataUrl = doc.output('dataurlstring');
          const fileName = `Admin_Update_Materials_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
          savePDFToArchive('Admin Updates', 'Admin', `materials-${jobId}`, pdfDataUrl, { fileName, path: 'Admin Updates/' });
        }
      } else {
        const serverErr = (res as any)?.error;
        throw new Error(String(serverErr || 'Failed to sync materials'));
      }
      return res;
    } catch (e: any) {
      const msg = e?.message || 'Could not sync materials to inventory.';
      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
      console.error('postChecklistMaterials error:', e);
      throw e;
    }
  };

  // Build dynamic display lists
  // Build dynamic display lists
  const coreServicesDisplay = useMemo(() => buildCoreServices(), []);
  const addOnServicesDisplay = useMemo(() => buildAddOnServices(), []);
  const destinationFeeDisplay: DisplayService = useMemo(() => ({ id: 'destination-fee', name: 'Destination Fee', description: 'Transportation fee based on miles', kind: 'special' }), []);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const calculateSubtotal = () => {
    const selectedKey = vehicleType;
    const builtInKey = toBuiltInVehKey(selectedKey);
    const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];
    const total = selectedServices.reduce((sum, id) => {
      const svc = allServices.find(s => s.id === id);
      if (!svc) return sum;
      if (svc.kind === 'package') {
        const sp = parseFloat(savedPricesLive[getKey('package', id, selectedKey)]) || NaN;
        const fallback = getServicePrice(svc.id, builtInKey);
        return sum + (isNaN(sp) ? fallback : sp);
      }
      if (svc.kind === 'addon') {
        const ap = parseFloat(savedPricesLive[getKey('addon', id, selectedKey)]) || NaN;
        const fallback = getAddOnPrice(svc.id, builtInKey);
        return sum + (isNaN(ap) ? fallback : ap);
      }
      return sum; // special handled separately
    }, 0);
    return total + destinationFee;
  };

  // When package or add-ons change, re-sync selectedServices and build checklist
  useEffect(() => {
    const vkey = toBuiltInVehKey(vehicleType);
    const selected = [selectedPackage, ...selectedAddOns].filter(Boolean);
    setSelectedServices(selected);
    // Build steps from selected package
    const pkg = servicePackages.find(p => p.id === selectedPackage) || (getCustomPackages().find((p: any) => p.id === selectedPackage) as any);
    let baseSteps: ChecklistStep[] = [];
    if (pkg && (pkg as any).steps) {
      baseSteps = (pkg as any).steps.map((s: any) => ({ id: s.id || s, name: s.name || s, category: (s.category || 'exterior'), checked: false }));
    }
    // Preparation static steps
    const prep: ChecklistStep[] = [
      { id: 'prep-inspect', name: 'Inspect vehicle', category: 'preparation', checked: false },
      { id: 'prep-tools', name: 'Gather tools', category: 'preparation', checked: false },
      { id: 'prep-walkaround', name: 'Customer walkaround', category: 'preparation', checked: false },
    ];
    // Add-on steps: treat each add-on as a single step under exterior
    const addonSteps: ChecklistStep[] = selectedAddOns.map((aid) => {
      const found = (liveAddOns || []).find((a: any) => a.id === aid) || addOns.find(a => a.id === aid);
      return { id: `addon-${aid}`, name: found?.name || aid, category: (found as any)?.category || 'exterior', checked: false };
    });
    setChecklistSteps([...prep, ...baseSteps, ...addonSteps]);
  }, [selectedPackage, selectedAddOns, vehicleType]);

  // --- PERSISTENCE LOGIC START ---
  const CHECKLIST_DRAFT_KEY = 'service_checklist_draft';

  // 1. Restore State on Mount (if no URL params)
  useEffect(() => {
    const hasUrlParams = params.get("package") || params.get("vehicleType") || params.get("addons");
    if (!hasUrlParams) {
      const saved = localStorage.getItem(CHECKLIST_DRAFT_KEY);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          console.log("Restoring checklist draft:", state);

          if (state.selectedCustomer) setSelectedCustomer(state.selectedCustomer);
          if (state.selectedPackage) {
            setSelectedPackage(state.selectedPackage);
            // We need to wait for step regeneration before restoring checked status?
            // Actually, checklistSteps regeneration depends on selectedPackage.
            // We can restore checking status in a separate effect or forcing it here after a tick?
            // Better: Set the inputs, and let the regeneration effect run. 
            // BUT, the regeneration effect resets 'checked' to false!
            // We need a way to re-apply 'checked' status *after* steps are regenerated.
            // We will save 'checklistSteps' to a temp ref or state and apply it after regeneration.
          }
          if (state.vehicleType) setVehicleType(state.vehicleType);
          if (state.selectedAddOns) setSelectedAddOns(state.selectedAddOns);
          if (state.destinationFee) setDestinationFee(state.destinationFee);
          if (state.notes) setNotes(state.notes);
          if (state.employeeAssigned) setEmployeeAssigned(state.employeeAssigned);
          if (state.discountValue) setDiscountValue(state.discountValue);
          if (state.discountType) setDiscountType(state.discountType);

          // Save dirty steps to be reapplied after regeneration
          if (state.checklistSteps) {
            window.sessionStorage.setItem('pending_draft_steps', JSON.stringify(state.checklistSteps));
          }

          toast({ title: "Draft Restored", description: "Resumed your checklist from where you left off." });
        } catch (e) {
          console.error("Failed to restore draft", e);
        }
      }
    }
  }, []); // Run once on mount

  // 2. Re-apply steps checked status after regeneration (No replacement, just view)stored a draft)
  useEffect(() => {
    const pending = window.sessionStorage.getItem('pending_draft_steps');
    if (pending && checklistSteps.length > 0) {
      try {
        const savedSteps = JSON.parse(pending) as ChecklistStep[];
        // Only apply if they look compatible (e.g. at least one matching ID)
        const hasMatch = savedSteps.some(s => checklistSteps.some(curr => curr.id === s.id));

        if (hasMatch) {
          const merged = checklistSteps.map(current => {
            const saved = savedSteps.find(s => s.id === current.id);
            return saved ? { ...current, checked: saved.checked } : current;
          });
          // Check if actually different to avoid loop
          const isDifferent = JSON.stringify(merged) !== JSON.stringify(checklistSteps);
          if (isDifferent) {
            setChecklistSteps(merged);
            window.sessionStorage.removeItem('pending_draft_steps'); // Clear trigger
          }
        }
      } catch { }
    }
  }, [checklistSteps]);

  // 3. Save State on Change
  useEffect(() => {
    // Don't save if empty/initial
    if (!selectedPackage && !selectedCustomer) return;

    const state = {
      selectedCustomer,
      selectedPackage,
      vehicleType,
      selectedAddOns,
      checklistSteps, // Saves checked status
      notes,
      destinationFee,
      employeeAssigned,
      discountValue,
      discountType,
      timestamp: Date.now()
    };

    localStorage.setItem(CHECKLIST_DRAFT_KEY, JSON.stringify(state));
  }, [selectedCustomer, selectedPackage, vehicleType, selectedAddOns, checklistSteps, notes, destinationFee, employeeAssigned, discountValue, discountType]);

  // --- PERSISTENCE LOGIC END ---

  const progressPercent = useMemo(() => {
    const total = checklistSteps.length || 0;
    const done = checklistSteps.filter(s => s.checked).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [checklistSteps]);

  // Save generic checklist progress
  // Save generic checklist progress
  const saveGenericChecklist = async (status: 'in-progress' | 'completed' = 'in-progress'): Promise<string | undefined> => {
    if (!selectedPackage) {
      toast({ title: 'Package Required', description: 'Please select a service package first.', variant: 'destructive' });
      return undefined;
    }
    if (!vehicleType) {
      toast({ title: 'Vehicle Required', description: 'Please select a vehicle type first.', variant: 'destructive' });
      return undefined;
    }

    // 0. Ensure Customer Exists in CRM (Sync Auth -> CRM)
    // This is critical to avoid Foreign Key violation in Bookings table
    if (selectedCustomer) {
      const c = customers.find(x => x.id === selectedCustomer);
      // Only try upsert if we actually found a customer object
      if (c) {
        try {
          await upsertSupabaseCustomer({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            vehicle_info: {
              make: c.vehicle?.split(' ')[1] || '',
              model: c.model,
              year: c.year
            }
          });
        } catch (err) {
          console.error("Failed to sync customer for booking:", err);
          // We don't abort, as maybe they already exist? 
          // But typically if this fails, booking insert will fail too if FK is strict.
        }
      }
    }

    // 0.5 Ensure we have a customer ID if history requires it
    let targetCustomerId = selectedCustomer;
    if (!targetCustomerId) {
        // Try to find a "Generic Customer" in existing list
        const generic = customers.find(c => c.name.toLowerCase().includes('generic'));
        if (generic) {
          targetCustomerId = generic.id!;
        } else {
          try {
            // Create a "Generic Customer" one-time record if it doesn't exist
            const newGeneric = await upsertSupabaseCustomer({ 
              name: genericCustomerName || 'Generic Customer',
              notes: 'System generated for non-linked jobs'
            });
            targetCustomerId = newGeneric.id!;
            // Reloading customers would be good here, but for now we just use the ID
          } catch (err) {
            console.error("Failed to create generic customer record", err);
          }
        }
    }

    // 1. Save to Supabase Bookings (Job History)
    const pkgName = servicePackages.find(p => p.id === selectedPackage)?.name || 'Custom Package';

    // Create detailed notes
    const jobDetails = {
      checklist: checklistSteps.map(s => ({ n: s.name, c: s.checked })),
      chemicals: chemRows,
      materials: matRows,
      stats: { progress: progressPercent, time: elapsedTime }
    };

    const bookingPayload = {
      id: checklistId || undefined, // Use existing ID if we have it
      title: pkgName,
      customerId: targetCustomerId || null,
      date: new Date().toISOString(),
      status: status,
      vehicle_info: { type: vehicleType, other: vehicleType === 'Other' ? vehicleTypeOther : undefined },
      notes: `Job Details: ${JSON.stringify(jobDetails)} \n\n User Notes: ${notes}`,
      price: calculateTotal(), // Estimated total
      addons: selectedAddOns
    };

    try {
      const savedBooking = await upsertSupabaseBooking(bookingPayload);
      if (!savedBooking || !savedBooking.id) {
        throw new Error("Database returned no record ID.");
      }
      
      const newId = savedBooking.id;
      setChecklistId(newId);
      
      toast({ title: 'Progress Saved', description: 'Checklist saved to Job History.' });
      
      try {
        // Post materials usage on save (no subtract)
        await postChecklistMaterials(newId, false);
      } catch (err) {
        console.warn("Materials Sync Delayed:", err);
      }
      
      return newId;
    } catch (err: any) {
      console.error("Failed to save Supabase Booking", err);
      const errorMsg = err.message || 'The checklist could not be saved to your job history.';
      toast({ 
        title: 'Database Save Failed', 
        description: errorMsg, 
        variant: 'destructive' 
      });
      // Rethrow if we are in 'completed' mode so finishJob knows it failed
      if (status === 'completed') throw err;
      return undefined;
    }
  };

  // Link job to customer
  const linkJobToCustomer = async (customerId: string, jobId?: string) => {
    if (!checklistId) return;
    const res = await api(`/api/checklist/${checklistId}/link-customer`, { method: 'PUT', body: JSON.stringify({ customerId, jobId }) });
    if ((res as any)?.ok || res === null) {
      toast({ title: 'Job Linked', description: 'Checklist attached to customer.' });
    } else {
      toast({ title: 'Link Failed', description: 'Could not link to customer.', variant: 'destructive' });
    }
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (!discountValue) return 0;
    const value = parseFloat(discountValue);
    if (discountType === "percent") {
      return (subtotal * value) / 100;
    }
    return value;
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  // Build a simple list of selected items for PDF summaries
  const buildSelectedItemsForSummary = () => {
    const vkey = toVehKey(vehicleType);
    const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];
    return selectedServices.map(id => {
      const svc = allServices.find(s => s.id === id);
      if (!svc) return { name: '', price: 0 };
      const price = svc.kind === 'package'
        ? getServicePrice(svc.id, vkey)
        : (svc.kind === 'addon' ? getAddOnPrice(svc.id, vkey) : destinationFee);
      return { name: svc.name || '', price };
    });
  };

  // Generate and archive a PDF for checklist progress/completion
  // Accept explicit recordId to avoid stale state causing broken linkage
  const archiveChecklistPDF = (finalize: boolean, recordId?: string) => {
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      const customerName = customer?.name || genericCustomerName || 'Generic Customer';
      const doc = new jsPDF();
      const title = finalize ? 'Service Checklist — Job Completed' : 'Service Checklist — Progress Saved';
      doc.setFontSize(18);
      doc.text('Prime Auto Detail', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text(title, 105, 26, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 38);
      doc.text(`Customer: ${customerName}`, 20, 46);
      doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 20, 54);
      let y = 62;
      if (employeeAssigned) { doc.text(`Employee: ${employeeAssigned}`, 20, y); y += 8; }

      // Timer Info
      if (finalize && jobStartTime) {
        doc.text(`Started: ${new Date(jobStartTime).toLocaleTimeString()}`, 120, 46);
        if (jobEndTime) doc.text(`Finished: ${new Date(jobEndTime).toLocaleTimeString()}`, 120, 54);
        doc.setFont(undefined, 'bold');
        doc.text(`Time Taken: ${elapsedTime}`, 120, 62);
        doc.setFont(undefined, 'normal');
      } else if (estimatedTime) {
        doc.text(`Est. Time: ${estimatedTime}`, 120, 38);
      }

      // Continue content
      if (y < 66) y = 66;
      doc.setFontSize(12);
      doc.text('Selected Services:', 20, y);
      y += 8;
      buildSelectedItemsForSummary().forEach(it => {
        doc.text(`${it.name}: $${(it.price || 0).toFixed(2)}`, 28, y);
        y += 6;
      });
      y += 4;
      doc.text(`Subtotal: $${calculateSubtotal().toFixed(2)}`, 20, y); y += 6;
      doc.text(`Discount: $${calculateDiscount().toFixed(2)}`, 20, y); y += 6;
      doc.text(`Total: $${calculateTotal().toFixed(2)}`, 20, y);

      // Checklist Details — tasks, progress, and notes
      y += 10;
      doc.setFontSize(13);
      doc.text('Checklist Details', 20, y); y += 7;
      doc.setFontSize(11);
      doc.text(`Progress: ${progressPercent}%`, 20, y); y += 7;
      // Group tasks by category and list all with checkmarks
      const categories = ['preparation', 'exterior', 'interior', 'final'] as const;
      categories.forEach(cat => {
        const tasks = checklistSteps.filter(t => t.category === cat);
        if (tasks.length === 0) return;
        doc.setFontSize(12);
        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        doc.text(`${label}:`, 20, y); y += 6;
        doc.setFontSize(10);
        tasks.forEach(t => {
          const mark = t.checked ? '✓' : '✗';
          // Draw colored mark, then item text in default color
          if (t.checked) doc.setTextColor(22, 163, 74); // green
          else doc.setTextColor(220, 38, 38); // red
          doc.text(mark, 28, y);
          doc.setTextColor(0, 0, 0);
          const wrapped = doc.splitTextToSize(String(t.name || ''), 170);
          // indent the text slightly after the mark
          doc.text(wrapped, 34, y);
          y += wrapped.length * 5 + 2;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 2;
      });

      if (notes && notes.trim()) {
        doc.setFontSize(12);
        doc.text('Notes:', 20, y); y += 6;
        doc.setFontSize(10);
        const split = doc.splitTextToSize(notes.trim(), 170);
        doc.text(split, 20, y);
        y += split.length * 5 + 4;
      }

      // Materials Used — chemicals and materials rows
      doc.setFontSize(13);
      doc.text('Materials Used', 20, y); y += 7;
      doc.setFontSize(11);
      // Chemicals
      doc.text('Chemicals:', 20, y); y += 6;
      const chemLines = (chemRows || []).map(row => {
        const name = String(chemicalsList.find(c => String(c.id) === String(row.chemicalId))?.name || row.chemicalId || '');
        const frac = row.fraction ? String(row.fraction) : '';
        const note = row.notes ? ` — ${row.notes}` : '';
        return name ? `• ${name}${frac ? ` (${frac})` : ''}${note}` : '';
      }).filter(Boolean);
      const chemText = doc.splitTextToSize(chemLines.length ? chemLines.join('\n') : '(none)', 170);
      doc.text(chemText, 28, y); y += chemText.length * 5 + 4;
      // Materials
      doc.text('Materials:', 20, y); y += 6;
      const matLines = (matRows || []).map(row => {
        const name = String(materialsList.find(m => String(m.id) === String(row.materialId))?.name || row.materialId || '');
        const qty = row.quantityNote ? row.quantityNote : '';
        return name ? `• ${name}${qty ? ` — ${qty}` : ''}` : '';
      }).filter(Boolean);
      const matText = doc.splitTextToSize(matLines.length ? matLines.join('\n') : '(none)', 170);
      doc.text(matText, 28, y); y += matText.length * 5 + 4;
      // Tools
      doc.text('Tools:', 20, y); y += 6;
      const toolLines = (toolRows || []).map(row => {
        const name = String(toolsList.find(t => String(t.id) === String(row.toolId))?.name || row.toolId || '');
        const note = row.notes ? ` — ${row.notes}` : '';
        return name ? `• ${name}${note}` : '';
      }).filter(Boolean);
      const toolText = doc.splitTextToSize(toolLines.length ? toolLines.join('\n') : '(none)', 170);
      doc.text(toolText, 28, y); y += toolText.length * 5 + 4;

      const dataUrl = doc.output('dataurlstring');
      const recordType = finalize ? 'Job' : 'Checklist';
      const fileName = finalize ? `Job_Completion_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Checklist_Progress_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const idToArchive = String(recordId || checklistId || 'pending');
      savePDFToArchive(recordType, customerName, idToArchive, dataUrl, { fileName });
    } catch { }
  };

  const handleSave = async () => {
    const customer = customers.find(c => c.id === selectedCustomer);
    const vkey = toVehKey(vehicleType);
    const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];
    const selectedItems = selectedServices.map(id => {
      const svc = allServices.find(s => s.id === id);
      if (!svc) return { name: '', price: 0, chemicals: [] as string[] };
      const price = svc.kind === 'package' ? getServicePrice(svc.id, vkey) : (svc.kind === 'addon' ? getAddOnPrice(svc.id, vkey) : destinationFee);
      return {
        name: svc.name || "",
        price,
        chemicals: svc.chemicals || []
      };
    });

    await upsertSupabaseEstimate({
      customerName: customer?.name || "Unknown",
      customerId: selectedCustomer,
      vehicle: vehicleType,
      services: selectedItems.map(i => ({ name: i.name, price: i.price || 0 })), // Map items to services
      total: calculateTotal(),
      notes,
      date: new Date().toISOString(),
      status: 'open'
    });

    toast({ title: "Estimate Saved", description: "Service checklist saved to local storage." });
  };

  const handleCreateInvoice = async () => {
    const customer = customers.find(c => c.id === selectedCustomer);
    const vkeyBuiltIn = toBuiltInVehKey(vehicleType);
    const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];
    const selectedItems = selectedServices.map(id => {
      const svc = allServices.find(s => s.id === id);
      const price = (() => {
        if (!svc) return 0;
        if (svc.kind === 'package') {
          const sp = parseFloat(savedPricesLive[getKey('package', svc.id, vehicleType)]) || NaN;
          return isNaN(sp) ? getServicePrice(svc.id, vkeyBuiltIn) : sp;
        }
        if (svc.kind === 'addon') {
          const ap = parseFloat(savedPricesLive[getKey('addon', svc.id, vehicleType)]) || NaN;
          return isNaN(ap) ? getAddOnPrice(svc.id, vkeyBuiltIn) : ap;
        }
        return destinationFee;
      })();
      return {
        id,
        name: svc?.name || "",
        price: price || 0,
        chemicals: svc?.chemicals || [],
      };
    });

    if (!customer) {
      toast({ title: "Select customer", description: "Please select or add a customer.", variant: "destructive" });
      return;
    }

    const now = new Date();
    const invoice: any = {
      customerId: customer.id!,
      customerName: customer.name,
      vehicle: `${customer.year || ""} ${customer.vehicle || ""} ${customer.model || ""}`.trim(),
      contact: { address: customer.address, phone: customer.phone, email: customer.email },
      vehicleInfo: { type: vehicleLabels[vehicleType] || vehicleType, mileage: customer.mileage, year: customer.year, color: customer.color, conditionInside: customer.conditionInside, conditionOutside: customer.conditionOutside },
      services: selectedItems,
      subtotal: calculateSubtotal(),
      discount: { type: discountType, value: discountValue ? parseFloat(discountValue) : 0, amount: calculateDiscount() },
      total: calculateTotal(),
      notes,
      date: now.toLocaleDateString(),
      createdAt: now.toISOString(),
    };

    await upsertSupabaseInvoice(invoice);

    // Generate PDF (download)
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Prime Auto Detail - Invoice", 20, 20);
      doc.setFontSize(12);
      doc.text(`Customer: ${invoice.customerName}`, 20, 35);
      doc.text(`Phone: ${invoice.contact.phone || "-"}`, 20, 42);
      doc.text(`Email: ${invoice.contact.email || "-"}`, 20, 49);
      doc.text(`Address: ${invoice.contact.address || "-"}`, 20, 56);
      doc.text(`Vehicle: ${invoice.vehicle}`, 20, 66);
      doc.text(`Vehicle Type: ${invoice.vehicleInfo.type}`, 20, 73);
      let y = 85;
      doc.setFontSize(14);
      doc.text("Services:", 20, y); y += 8;
      doc.setFontSize(11);
      invoice.services.forEach((s: any) => {
        doc.text(`${s.name}: $${s.price.toFixed(2)}`, 25, y); y += 6;
        if (s.chemicals?.length) { doc.setFontSize(9); doc.text(`Chemicals: ${s.chemicals.join(", ")}`, 28, y); y += 5; doc.setFontSize(11); }
      });
      if (invoice.discount.amount > 0) { y += 4; doc.text(`Discount: -$${invoice.discount.amount.toFixed(2)} (${invoice.discount.type === 'percent' ? invoice.discount.value + '%' : '$' + invoice.discount.value})`, 25, y); y += 6; }
      y += 4; doc.setFontSize(12); doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);
      if (notes) { y += 10; doc.setFontSize(12); doc.text("Notes:", 20, y); y += 6; doc.setFontSize(10); const split = doc.splitTextToSize(notes, 170); doc.text(split, 20, y); }
      doc.save(`invoice-${now.getTime()}.pdf`);
    } catch { }

    toast({ title: "Invoice Created", description: "Invoice saved and PDF downloaded." });
  };

  // Orchestrate finish job: ensure saved, post materials, alert and archive
  // Orchestrate finish job: ensure saved, post materials, alert and archive
  const handleCreateInvoiceGeneric = async () => {
    try {
      // 1. Sync Customer (Auth -> CRM)
      const customer = customers.find(c => c.id === selectedCustomer);
      const customerName = customer?.name || genericCustomerName || 'Generic Customer';
      
      let targetCustomerId = selectedCustomer;
      if (!targetCustomerId) {
          const generic = customers.find(c => c.name.toLowerCase().includes('generic'));
          if (generic) {
            targetCustomerId = generic.id!;
          } else {
            try {
              const newGeneric = await upsertSupabaseCustomer({ 
                name: genericCustomerName || 'Generic Customer',
                notes: 'System generated for invoice'
              });
              targetCustomerId = newGeneric.id!;
            } catch (err) {
              console.warn("Could not create/find generic customer for invoice", err);
            }
          }
      }

      const vkeyBuiltIn = toBuiltInVehKey(vehicleType);
      const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];

      const selectedVehicle = customer?.vehicles?.find((v: any) => v.id === selectedVehicleId) || customer?.vehicles?.[0];

      const selectedItems = selectedServices.map(id => {
        const svc = allServices.find(s => s.id === id);
        const price = (() => {
          if (!svc) return 0;
          if (svc.kind === 'package') {
            const sp = parseFloat(savedPricesLive[getKey('package', svc.id, vehicleType)]) || NaN;
            return isNaN(sp) ? getServicePrice(svc.id, vkeyBuiltIn) : sp;
          }
          if (svc.kind === 'addon') {
            const ap = parseFloat(savedPricesLive[getKey('addon', svc.id, vehicleType)]) || NaN;
            return isNaN(ap) ? getAddOnPrice(svc.id, vkeyBuiltIn) : ap;
          }
          return destinationFee;
        })();
        return {
          id,
          name: svc?.name || "",
          price: price || 0,
          chemicals: svc?.chemicals || [],
        };
      });

      const now = new Date();
      // Generate a numeric invoice number (integer) from timestamp if we don't have a better one
      const generatedInvoiceNum = Math.floor(now.getTime() / 1000) % 2147483647;

      const invoice: any = {
        invoiceNumber: generatedInvoiceNum,
        customerId: targetCustomerId || null, // Ensure ID is provided
        customerName: customerName,
        vehicle_id: selectedVehicleId || selectedVehicle?.id,
        vehicle: selectedVehicle ? `${selectedVehicle.year || ""} ${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`.trim() : (customer ? `${customer.year || ""} ${customer.vehicle || ""} ${customer.model || ""}`.trim() : ''),
        contact: { address: customer?.address || '', phone: customer?.phone || '', email: customer?.email || '' },
        vehicleInfo: {
          type: selectedVehicle?.type || vehicleLabels[vehicleType] || vehicleType,
          mileage: customer?.mileage,
          year: selectedVehicle?.year || customer?.year,
          color: selectedVehicle?.color || customer?.color,
          conditionInside: customer?.conditionInside,
          conditionOutside: customer?.conditionOutside
        },
        services: selectedItems,
        subtotal: calculateSubtotal(),
        discount: { type: discountType, value: discountValue ? parseFloat(discountValue) : 0, amount: calculateDiscount() },
        total: calculateTotal(),
        notes,
        date: now.toLocaleDateString(),
        createdAt: now.toISOString(),
      };

      // 2. Create Invoice
      await upsertSupabaseInvoice(invoice);

      // 3. Generate PDF
      try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Prime Auto Detail - Invoice", 20, 20);
        doc.setFontSize(12);
        doc.text(`Customer: ${invoice.customerName}`, 20, 35);
        doc.text(`Phone: ${invoice.contact.phone || "-"}`, 20, 42);
        doc.text(`Email: ${invoice.contact.email || "-"}`, 20, 49);
        doc.text(`Address: ${invoice.contact.address || "-"}`, 20, 56);
        doc.text(`Vehicle: ${invoice.vehicle}`, 20, 66);
        doc.text(`Vehicle Type: ${invoice.vehicleInfo.type}`, 20, 73);
        let y = 85;
        doc.setFontSize(14);
        doc.text("Services:", 20, y); y += 8;
        doc.setFontSize(11);
        invoice.services.forEach((s: any) => {
          doc.text(`${s.name}: $${s.price.toFixed(2)}`, 25, y); y += 6;
          if (s.chemicals?.length) { doc.setFontSize(9); doc.text(`Chemicals: ${s.chemicals.join(", ")}`, 28, y); y += 5; doc.setFontSize(11); }
        });
        if (invoice.discount.amount > 0) { y += 4; doc.text(`Discount: -$${invoice.discount.amount.toFixed(2)} (${invoice.discount.type === 'percent' ? invoice.discount.value + '%' : '$' + invoice.discount.value})`, 25, y); y += 6; }
        y += 4; doc.setFontSize(12); doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);
        if (notes) { y += 10; doc.setFontSize(12); doc.text("Notes:", 20, y); y += 6; doc.setFontSize(10); const split = doc.splitTextToSize(notes, 170); doc.text(split, 20, y); }
        doc.save(`invoice-${now.getTime()}.pdf`);
      } catch { }

      // Clear persistent draft on successful save
      localStorage.removeItem('service_checklist_draft');
      window.sessionStorage.removeItem('pending_draft_steps');

      toast({ title: "Invoice Created", description: "Invoice saved to Supabase and PDF downloaded." });

    } catch (e: any) {
      console.error("Create Invoice Failed:", e);
      toast({ title: "Failed to Create Invoice", description: e.message || "Unknown error", variant: "destructive" });
    }
  };
  const finishJob = async () => {
    // Stop the timer
    const end = Date.now();
    setJobEndTime(end);

    let step = 'start';
    try {
      // 1. Double check state before proceeding
      if (!selectedPackage) {
        throw new Error('Please select a service package first.');
      }
      if (!vehicleType) {
        throw new Error('Please select a vehicle type first.');
      }

      const idToUse = await saveGenericChecklist('completed');
      if (!idToUse) {
        throw new Error('Persistence Error: Checklist could not be saved to history. Check your connection.');
      }

      // Handle Mileage Logging
      if (milesTraveled > 0) {
        step = 'mileage_log';
        const customer = customers.find(c => c.id === selectedCustomer);
        const pkg = servicePackages.find(p => p.id === selectedPackage) || (getCustomPackages().find((p: any) => p.id === selectedPackage) as any);
        const pkgName = pkg?.name || "Service";

        await import('@/lib/supa-data').then(m => m.upsertSupabaseMileageLog({
          date: format(new Date(), "yyyy-MM-dd"),
          miles_driven: milesTraveled,
          purpose: "Customer job",
          odometer_start: parseFloat(odometerStart),
          odometer_end: parseFloat(odometerEnd),
          customer_id: selectedCustomer || undefined,
          job_id: idToUse,
          is_business: true,
          start_location: "Office/Hub", // Default or could be dynamic
          end_location: customer?.address || "Customer Location"
        }));
      }

      step = 'post_materials';
      await postChecklistMaterials(idToUse, true);
      step = 'archive_pdf';
      archiveChecklistPDF(true, idToUse);
      step = 'push_alert';
      const customer = customers.find(c => c.id === selectedCustomer);
      const customerName = customer?.name || genericCustomerName || 'Generic Customer';
      
      // AUTO-CREATE INVOICE
      try {
        step = 'create_invoice';
        const invoiceData = {
          invoiceNumber: generateInvoiceNumber(),
          customerId: selectedCustomer || idToUse, // Fallback to booking ID if no customer
          customerName: customerName,
          vehicle: `${vYear} ${vMake} ${vModel}`.trim() || "Unknown Vehicle",
          services: buildSelectedItemsForSummary(),
          total: calculateTotal(),
          date: new Date().toLocaleDateString(),
          createdAt: new Date().toISOString(),
          paymentStatus: 'unpaid',
          paidAmount: 0
        };
        await upsertSupabaseInvoice(invoiceData);
        console.log("✅ Auto-invoice created for job:", idToUse);
      } catch (invErr) {
        console.error("Auto-invoice creation failed:", invErr);
        // Don't fail the whole job finish if just invoice creation fails, 
        // but alert the user if possible.
      }

      pushAdminAlert('job_completed', `Job completed for ${customerName}`, 'system', { checklistId: idToUse, customerId: selectedCustomer });
      toast({ title: 'Job Finished', description: 'Materials posted, completion archived, and invoice generated.' });
      
      // Trigger tip and payment
      setFinishedJobId(idToUse);
      setShowTipScreen(true);
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      toast({ title: 'Finish Failed', description: `Step: ${step}. ${msg}`, variant: 'destructive' });
      console.error('Finish Job Error:', step, e);
    }
  };


  const generatePDF = () => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === selectedCustomer);

    // Add Logo
    try {
      doc.addImage(logo, 'PNG', 15, 10, 35, 35);
    } catch (e) {
      console.warn("Logo failed to load for PDF", e);
    }

    doc.setFontSize(18);
    doc.text("Prime Auto Detail - Service Estimate", 105, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Customer: ${customer?.name || "N/A"}`, 20, 50);
    doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 20, 42);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

    let y = 60;
    doc.setFontSize(14);
    doc.text("Selected Services:", 20, y);
    y += 8;

    const allServices = [...coreServicesDisplay, ...addOnServicesDisplay, destinationFeeDisplay];
    selectedServices.forEach(id => {
      const service = allServices.find(s => s.id === id);
      if (service) {
        doc.setFontSize(11);
        const vkey = toVehKey(vehicleType);
        const price = service.kind === 'package' ? getServicePrice(service.id, vkey) : (service.kind === 'addon' ? getAddOnPrice(service.id, vkey) : destinationFee);
        doc.text(`${service.name}: $${price}`, 25, y);
        y += 6;
      }
    });

    if (destinationFee > 0) {
      doc.text(`Destination Fee: $${destinationFee}`, 25, y);
      y += 6;
    }

    y += 5;
    doc.setFontSize(12);
    doc.text(`Subtotal: $${calculateSubtotal().toFixed(2)}`, 20, y);
    y += 7;
    if (calculateDiscount() > 0) {
      doc.text(`Discount: -$${calculateDiscount().toFixed(2)}`, 20, y);
      y += 7;
    }
    doc.setFontSize(14);
    doc.text(`Total: $${calculateTotal().toFixed(2)}`, 20, y);

    if (notes) {
      y += 12;
      doc.setFontSize(12);
      doc.text("Notes:", 20, y);
      y += 6;
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, y);
    }


    doc.save(`service-estimate-${new Date().getTime()}.pdf`);
    toast({ title: "PDF Generated", description: "Service estimate has been downloaded." });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title={`Service Checklist ${selectedCustomer ? '(Linked)' : '(Generic)'}`} 
        subtitle="Execute the Prime Standard for every vehicle."
      >
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/chemical-training')} 
            className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 font-bold h-9 px-3"
          >
            <Beaker className="w-4 h-4 md:mr-2" /> 
            <span className="hidden md:inline">Chemical Decision</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dilution-calculator')} 
            className="border-green-500/30 bg-green-500/10 hover:bg-green-500 hover:text-white text-green-400 font-bold h-9 px-3"
          >
            <Scale className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Dilution Calc</span>
          </Button>
        </div>
      </PageHeader>

      <main className="container mx-auto px-2 sm:px-4 py-4 md:py-8 max-w-7xl animate-fade-in space-y-6 md:space-y-8">
        {/* Premium Header Block */}
        <div className="bg-gradient-to-r from-purple-900/20 via-black to-zinc-950 p-4 md:p-8 rounded-2xl border border-purple-900/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">Service Checklist</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-help', { 
                      detail: { topicId: 'service-checklist', role: getCurrentUser()?.role } 
                    }));
                  }}
                  title="SOP & Procedure Guide"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-zinc-400 text-sm md:text-base max-w-xl">Track job progress, manage materials, and generate estimates.</p>
            </div>
            <div className="flex flex-row items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="text-right">
                <div className="text-xl md:text-2xl font-bold text-white mb-0.5">{progressPercent}%</div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Completion</div>
              </div>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black italic text-white tracking-tighter flex items-center gap-3">
                Job Setup
              </h1>
              <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">Configure vehicle and service details</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (window.confirm("Are you sure you want to RESET the entire form? This will wipe all customer, vehicle, and service data from the screen for a new entry.")) {
                  resetForm();
                  toast({ title: 'Form Reset', description: 'The screen has been cleared for a new entry.' });
                }
              }}
              className="border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Entire Form
            </Button>
          </div>

          {/* Job Setup - Generic, no forced customer link */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Job Setup</h2>
            {/* Customer selection restored — includes Generic option */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Customer Link</Label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-white/20 bg-black text-white px-3 py-2 text-sm"
                >
                  <option value="">-- Generic / New Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id!}>{c.name}</option>
                  ))}
                </select>
              </div>
              {!selectedCustomer && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                  <Label>Generic Customer Name</Label>
                  <Input 
                    placeholder="Enter customer name..." 
                    value={genericCustomerName} 
                    onChange={(e) => setGenericCustomerName(e.target.value)}
                    className="h-10 border-blue-500/20 bg-black text-white focus:border-blue-500/50"
                  />
                </div>
              )}
            </div>

            {selectedCustomer && (customers.find(c => c.id === selectedCustomer)?.vehicles?.length || 0) > 0 && (
              <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                <Label className="flex items-center gap-2 text-purple-400">
                  <Car className="h-4 w-4" />
                  Select Specific Vehicle
                </Label>
                <div className="flex gap-2">
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      const vehId = e.target.value;
                      setSelectedVehicleId(vehId);
                      const cust = customers.find(c => c.id === selectedCustomer);
                      const veh = cust?.vehicles?.find((v: any) => v.id === vehId);
                      if (veh && veh.type) {
                        const key = toVehKey(veh.type);
                        setVehicleType(vehicleOptions.includes(key) ? key : 'midsize');
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-purple-900/30 bg-black text-white px-3 py-2 text-sm focus:ring-purple-500/20"
                  >
                    <option value="">-- Choose a Vehicle --</option>
                    {(customers.find(c => c.id === selectedCustomer)?.vehicles || []).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} ({v.type || 'No Type'})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <Button
                      variant="outline"
                      className="h-10 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => window.open(`/vehicle-gallery?customerId=${selectedCustomer}&vehicleId=${selectedVehicleId}`, '_blank')}
                      title="View Vehicle Gallery"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 italic">
                  * Customer has multiple vehicles. Selecting one will auto-update the Vehicle Type.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 border-t border-white/5 pt-4">
              <div className="space-y-2">
                <Label>Vehicle Year</Label>
                <Input placeholder="e.g. 2024" value={vYear} onChange={(e) => setVYear(e.target.value)} className="bg-black" />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Make</Label>
                <Input placeholder="e.g. Ford" value={vMake} onChange={(e) => setVMake(e.target.value)} className="bg-black" />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Model</Label>
                <Input placeholder="e.g. F-150" value={vModel} onChange={(e) => setVModel(e.target.value)} className="bg-black" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Package</Label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-white/20 bg-black text-white px-3 py-2 text-sm"
                >
                  <option value="">Select a package...</option>
                  {coreServicesDisplay.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-white/20 bg-black text-white px-3 py-2 text-sm"
                >
                  {vehicleOptions.map((opt) => (
                    <option key={opt} value={opt}>{vehicleLabels[opt] || opt}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {vehicleType === 'Other' && (
                  <Input placeholder="Enter vehicle type" value={vehicleTypeOther} onChange={(e) => setVehicleTypeOther(e.target.value)} className="mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Estimated Time</Label>
                <Input placeholder="e.g., 4 hours" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employee Assigned</Label>
                <select
                  value={employeeAssigned}
                  onChange={(e) => setEmployeeAssigned(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-white/20 bg-black text-white px-3 py-2 text-sm"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e: any) => (
                    <option key={e.id || e.name} value={String(e.id || e.name)}>{e.name || e.id}</option>
                  ))}
                </select>
              </div>
            </div>
            {liveAddOns.length > 0 && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div 
                  className="flex items-center justify-between cursor-pointer group mb-2"
                  onClick={() => setAddOnsExpanded(!addOnsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <Label className="cursor-pointer">Optional Add-Ons</Label>
                    {selectedAddOns.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] h-4">
                        {selectedAddOns.length} selected
                      </Badge>
                    )}
                  </div>
                  <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
                    {addOnsExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                  </div>
                </div>
                
                {addOnsExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                    {liveAddOns.map((a: any) => (
                      <label key={a.id} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedAddOns.includes(a.id)} 
                          onChange={(e) => {
                            setSelectedAddOns(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id));
                          }} 
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-600 focus:ring-offset-0"
                        />
                        <span className={selectedAddOns.includes(a.id) ? "text-purple-300 font-medium" : "text-zinc-400"}>
                          {a.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Checklist - dynamic from package and add-ons */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-white">Checklist</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear this checklist? This will reset all Interior/Exterior progress steps, but will keep your Customer, Vehicle, and Job Setup info intact.")) {
                      setChecklistSteps(prev => prev.map(s => ({ ...s, checked: false })));
                      setChemRows([]);
                      setMatRows([]);
                      setToolRows([]);
                      localStorage.removeItem('service_checklist_draft');
                      toast({ title: 'Checklist Steps Cleared', description: 'Progress has been reset.' });
                    }
                  }}
                  className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  title="Clear Checklist"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5">
                {/* Section 1: Chemical & Decision Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setTipsOpen(true)} className="bg-purple-700 text-white hover:bg-purple-800 h-8 text-[10px] md:text-xs font-bold px-2 md:px-3">
                    Rick's Tips
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPrepSummaryOpen(true)} className="bg-blue-700 text-white hover:bg-blue-800 h-8 text-[10px] md:text-xs px-2 md:px-3">
                    <FlaskConical className="w-3 h-3 mr-1" /> Prep
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDecisionModalOpen(true)} className="bg-teal-700 text-white hover:bg-teal-800 h-8 text-[10px] md:text-xs px-2 md:px-3">
                    <Sparkles className="w-3 h-3 mr-1" /> Decision
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/chemical-training')} 
                    className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 h-8 text-[10px] md:text-xs px-2 md:px-3 font-bold"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Training
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-help', { 
                        detail: { topicId: 'checklist-tools-guide', role: getCurrentUser()?.role } 
                      }));
                    }} 
                    className="h-8 w-8 text-zinc-400 hover:text-white"
                    title="Tools Guide"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Section 2: View Controls (Expand/Check All) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => {
                    const allExpanded = checklistSteps.length > 0 && checklistSteps.every(s => expandedHelp[s.id]);
                    const next = allExpanded ? {} : checklistSteps.reduce((acc, s) => ({ ...acc, [s.id]: true }), {} as Record<string, boolean>);
                    setExpandedHelp(next);
                  }}>
                    {checklistSteps.length > 0 && checklistSteps.every(s => expandedHelp[s.id]) ? <span className="flex items-center gap-1"><ChevronUp className="h-4 w-4" /> Collapse</span> : <span className="flex items-center gap-1"><ChevronDown className="h-4 w-4" /> Expand</span>}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-8 flex-1 sm:flex-none" onClick={() => {
                    const all = checklistSteps.length > 0 && checklistSteps.every(s => s.checked);
                    setChecklistSteps(prev => prev.map(s => ({ ...s, checked: !all })));
                  }}>
                    {checklistSteps.length > 0 && checklistSteps.every(s => s.checked) ? 'Uncheck All' : 'Check All'}
                  </Button>
                </div>
                
                {/* Section 3: Static Progress Bar */}
                <div className="flex items-center justify-end gap-2 bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5 w-full sm:w-auto">
                  <Progress value={progressPercent} className="w-20 md:w-32 h-2" />
                  <span className="text-[10px] md:text-sm font-bold text-white">{progressPercent}%</span>
                </div>
              </div>
            </div>
            {(!selectedPackage || !vehicleType) && (
              <p className="text-sm text-muted-foreground">Select a package and vehicle type to load checklist.</p>
            )}
            {selectedPackage && (
              <div className="space-y-6 max-h-[50vh] overflow-auto pr-2">
                {(['preparation', 'exterior', 'interior', 'final'] as const).map(section => (
                  <div key={section}>
                    <button
                      className="w-full text-left text-xl font-semibold mb-2 flex items-center justify-between"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))}
                    >
                      <span>{section === 'final' ? 'Final Inspection' : section.charAt(0).toUpperCase() + section.slice(1)}</span>
                      {collapsedSections[section] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>
                    {!collapsedSections[section] && (
                      <div className="space-y-2">
                        {checklistSteps.filter(s => s.category === section).map((step) => {
                          const instructionText = step.instructions || getServiceInstructions(step.name, step.id);

                          return (
                            <div key={step.id} className="border-b border-border/40 last:border-0 hover:bg-zinc-900/50 rounded-lg -mx-2 px-2 transition-colors">
                              <div className="flex items-center justify-between py-2">
                                <label className="flex items-center gap-3 text-sm cursor-pointer flex-1 py-1">
                                  <input
                                    type="checkbox"
                                    checked={step.checked}
                                    onChange={(e) => setChecklistSteps(prev => prev.map(ps => ps.id === step.id ? { ...ps, checked: e.target.checked } : ps))}
                                    className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-red-600 focus:ring-offset-0"
                                  />
                                  <span className={step.checked ? "text-muted-foreground line-through decoration-red-500/50" : "text-foreground font-medium"}>
                                    {step.name}
                                  </span>
                                </label>
                                
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full shrink-0"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setExpandedHelp(prev => ({ ...prev, [step.id]: !prev[step.id] }));
                                    }}
                                  >
                                    {expandedHelp[step.id] ? <ChevronUp className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-zinc-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-md shrink-0 border border-transparent hover:border-purple-500/30"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleOpenChemicals(step.id, step.name);
                                    }}
                                    title="Chemical Reference"
                                  >
                                    <FlaskConical className="h-4 w-4 mr-1 sm:mr-1.5" />
                                    <span className="text-[10px] sm:text-xs font-bold">Chem</span>
                                  </Button>
                                </div>
                              </div>

                              {expandedHelp[step.id] && (
                                <div className="pb-3 pl-8 sm:pl-10 text-sm text-zinc-300 animate-in slide-in-from-top-2 fade-in duration-200">
                                  <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
                                    <div className="flex items-start gap-2">
                                      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                      <p className="leading-relaxed">{instructionText}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                    }
                  </div>
                ))}
              </div>
            )}
            {/* Notes and Destination Fee removed from here - moved to Totals section for cleaner flow */}
          </Card>

          {/* Materials Used */}
          <Card className="p-6 bg-gradient-card border-border space-y-6">
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setMaterialsSectionExpanded(!materialsSectionExpanded)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white pb-1 border-b-2 border-red-600">Materials Used</h2>
                <div className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-mono">
                  {chemRows.length + matRows.length + toolRows.length} items logged
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-zinc-800 text-zinc-400 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setMaterialsModalOpen(true); }}
                >
                  Quick Updates
                </Button>
                <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
                  {materialsSectionExpanded ? <ChevronUp className="h-6 w-6 text-zinc-500" /> : <ChevronDown className="h-6 w-6 text-zinc-500" />}
                </div>
              </div>
            </div>

            {materialsSectionExpanded && (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                {/* Quick add */}
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Label className="mb-2 block text-zinc-400">Quick Add from Inventory (Auto-expands section)</Label>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const chem = chemicalsList.find(c => String(c.id) === String(val));
                      const mat = materialsList.find(m => String(m.id) === String(val));
                      if (chem) {
                        setChemRows(prev => ([...prev, { chemicalId: String(chem.id), fraction: '', notes: '' }]));
                        setMaterialsAccordion(prev => ({ ...prev, chemicals: true }));
                      } else if (mat) {
                        setMatRows(prev => ([...prev, { materialId: String(mat.id), quantityNote: '' }]));
                        setMaterialsAccordion(prev => ({ ...prev, materials: true }));
                      } else {
                        const tool = toolsList.find(t => String(t.id) === String(val));
                        if (tool) setToolRows(prev => ([...prev, { toolId: String(tool.id), notes: '' }]));
                        setMaterialsAccordion(prev => ({ ...prev, tools: true }));
                      }
                      e.currentTarget.selectedIndex = 0;
                    }}
                    className="flex h-10 w-full rounded-md border border-red-600 bg-black text-white px-3 py-2 text-sm"
                  >
                    <option value="">Select item to add...</option>
                    <optgroup label="Chemicals">
                      {chemicalsList.map(it => (<option key={`chem-${it.id}`} value={it.id}>{it.name}</option>))}
                    </optgroup>
                    <optgroup label="Materials">
                      {materialsList.map(it => (<option key={`mat-${it.id}`} value={it.id}>{it.name}</option>))}
                    </optgroup>
                    <optgroup label="Tools">
                      {toolsList.map(it => (<option key={`tool-${it.id}`} value={it.id}>{it.name}</option>))}
                    </optgroup>
                  </select>
                </div>

            {/* Chemicals Accordion (Yellow) */}
            <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
              <div
                className="p-4 bg-yellow-500/10 flex items-center justify-between cursor-pointer hover:bg-yellow-500/15 transition-colors"
                onClick={() => toggleMatAccordion('chemicals')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <h3 className="text-lg font-semibold text-yellow-100">Chemicals (fractional)</h3>
                  <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-chemicals' })); }} />
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{chemRows.length} items</span>
                </div>
                {materialsAccordion.chemicals ? <ChevronUp className="h-5 w-5 text-yellow-500/50" /> : <ChevronDown className="h-5 w-5 text-yellow-500/50" />}
              </div>

              {materialsAccordion.chemicals && (
                <div className="p-4 border-t border-yellow-500/10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-yellow-500/70">Track precise chemical usage (e.g. 1/4 bottle)</p>
                    <Button onClick={addChemicalRow} size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-white h-8"><Plus className="h-4 w-4 mr-2" />Add Row</Button>
                  </div>
                  <div className="mb-3">
                    <Label>Search</Label>
                    <Input placeholder="Filter chemicals..." value={chemSearch} onChange={(e) => setChemSearch(e.target.value)} className="h-9 bg-zinc-950/50 border-yellow-500/20 focus-visible:ring-yellow-500/50" />
                  </div>
                  <div className="space-y-3">
                    {chemRows.map((row, idx) => (
                      <div key={`chem-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded bg-zinc-950/30 border border-zinc-800/50">
                        <div className="md:col-span-4">
                          <Label className="text-xs text-yellow-500/70">Chemical</Label>
                          <select
                            value={row.chemicalId}
                            onChange={(e) => updateChemicalRow(idx, { chemicalId: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-yellow-500/20 bg-zinc-900 text-white px-3 py-1 text-sm focus:border-yellow-500/50 outline-none"
                          >
                            <option value="">Select a chemical...</option>
                            {chemicalsList
                              .filter(it => (chemSearch ? String(it.name || '').toLowerCase().includes(chemSearch.toLowerCase()) : true))
                              .map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                          </select>
                        </div>
                        <div className="md:col-span-6">
                          <Label className="text-xs text-yellow-500/70">Quantity Used</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {FRACTIONS.map(f => (
                              <label key={f} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer transition-colors ${row.fraction === f ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200' : 'border-zinc-700 text-zinc-400 hover:border-yellow-500/30'}`}>
                                <input type="checkbox" className="hidden" checked={row.fraction === f} onChange={() => updateChemicalRow(idx, { fraction: row.fraction === f ? '' : f })} />
                                <span>{f}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-yellow-500/70">Notes</Label>
                          <Input className="h-9 border-yellow-500/20 bg-zinc-900" type="text" value={row.notes || ''} onChange={(e) => updateChemicalRow(idx, { notes: e.target.value })} placeholder="Note" />
                        </div>
                        <div className="md:col-span-12 flex justify-end mt-2 md:mt-0">
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8" onClick={() => removeChemicalRow(idx)}><Trash2 className="h-4 w-4 mr-2" /> Remove</Button>
                        </div>
                      </div>
                    ))}
                    {chemRows.length === 0 && <p className="text-center text-sm text-zinc-500 italic py-4">No chemicals added yet.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Materials Accordion (Blue) */}
            <div className="border border-blue-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
              <div
                className="p-4 bg-blue-500/10 flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-colors"
                onClick={() => toggleMatAccordion('materials')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h3 className="text-lg font-semibold text-blue-100">Materials (note-based)</h3>
                  <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-materials' })); }} />
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{matRows.length} items</span>
                </div>
                {materialsAccordion.materials ? <ChevronUp className="h-5 w-5 text-blue-500/50" /> : <ChevronDown className="h-5 w-5 text-blue-500/50" />}
              </div>

              {materialsAccordion.materials && (
                <div className="p-4 border-t border-blue-500/10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-blue-500/70">Track disposables and items (e.g. 5 rags)</p>
                    <Button onClick={addMaterialRow} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white h-8"><Plus className="h-4 w-4 mr-2" />Add Row</Button>
                  </div>
                  <div className="space-y-3">
                    {matRows.map((row, idx) => (
                      <div key={`mat-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded bg-zinc-950/30 border border-zinc-800/50">
                        <div className="md:col-span-5">
                          <Label className="text-xs text-blue-500/70">Material</Label>
                          <select
                            value={row.materialId}
                            onChange={(e) => updateMaterialRow(idx, { materialId: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-blue-500/20 bg-zinc-900 text-white px-3 py-1 text-sm focus:border-blue-500/50 outline-none"
                          >
                            <option value="">Select a material...</option>
                            {materialsList.map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                          </select>
                        </div>
                        <div className="md:col-span-6">
                          <Label className="text-xs text-blue-500/70">Quantity / Notes</Label>
                          <Input className="h-9 border-blue-500/20 bg-zinc-900" type="text" value={row.quantityNote} onChange={(e) => updateMaterialRow(idx, { quantityNote: e.target.value })} placeholder="e.g. 5 rags" />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 w-9" onClick={() => removeMaterialRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {matRows.length === 0 && <p className="text-center text-sm text-zinc-500 italic py-4">No materials added yet.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Tools Accordion (Purple) */}
            <div className="border border-purple-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
              <div
                className="p-4 bg-purple-500/10 flex items-center justify-between cursor-pointer hover:bg-purple-500/15 transition-colors"
                onClick={() => toggleMatAccordion('tools')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <h3 className="text-lg font-semibold text-purple-100">Tools (tracking)</h3>
                  <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-tools' })); }} />
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{toolRows.length} items</span>
                </div>
                {materialsAccordion.tools ? <ChevronUp className="h-5 w-5 text-purple-500/50" /> : <ChevronDown className="h-5 w-5 text-purple-500/50" />}
              </div>

              {materialsAccordion.tools && (
                <div className="p-4 border-t border-purple-500/10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-purple-500/70">Log usage of main tools</p>
                    <Button onClick={addToolRow} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white h-8"><Plus className="h-4 w-4 mr-2" />Add Row</Button>
                  </div>
                  <div className="space-y-3">
                    {toolRows.map((row, idx) => (
                      <div key={`tool-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded bg-zinc-950/30 border border-zinc-800/50">
                        <div className="md:col-span-5">
                          <Label className="text-xs text-purple-500/70">Tool</Label>
                          <select
                            value={row.toolId}
                            onChange={(e) => updateToolRow(idx, { toolId: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-purple-500/20 bg-zinc-900 text-white px-3 py-1 text-sm focus:border-purple-500/50 outline-none"
                          >
                            <option value="">Select a tool...</option>
                            {toolsList.map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                          </select>
                        </div>
                        <div className="md:col-span-6">
                          <Label className="text-xs text-purple-500/70">Activity Notes</Label>
                          <Input className="h-9 border-purple-500/20 bg-zinc-900" type="text" value={row.notes} onChange={(e) => updateToolRow(idx, { notes: e.target.value })} placeholder="Usage details" />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 w-9" onClick={() => removeToolRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {toolRows.length === 0 && <p className="text-center text-sm text-zinc-500 italic py-4">No tools added yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

          {/* Materials Used Modal */}
          <MaterialsUsedModal
            open={materialsModalOpen}
            onOpenChange={setMaterialsModalOpen}
            chemicalsList={chemicalsList}
            materialsList={materialsList}
            initialChemRows={chemRows}
            initialMatRows={matRows}
            onSave={(newChemRows, newMatRows) => { setChemRows(newChemRows); setMatRows(newMatRows); }}
          />

          {/* Mileage Section (New) */}
          <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20">
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setMileageExpanded(!mileageExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Gauge className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Job Mileage Tracking</h2>
                {milesTraveled > 0 && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 ml-2">
                    {milesTraveled.toFixed(1)} mi
                  </Badge>
                )}
              </div>
              <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
                {mileageExpanded ? <ChevronUp className="h-6 w-6 text-zinc-500" /> : <ChevronDown className="h-6 w-6 text-zinc-500" />}
              </div>
            </div>

            {mileageExpanded && (
              <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Odometer Start</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Enter start reading"
                        className="bg-black/40 border-zinc-800 font-mono text-zinc-200"
                        value={odometerStart}
                        onChange={(e) => setOdometerStart(e.target.value)}
                      />
                      <span className="absolute right-3 top-2.5 text-zinc-600 text-xs">mi</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Odometer End</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Enter end reading"
                        className="bg-black/40 border-zinc-800 font-mono text-zinc-200"
                        value={odometerEnd}
                        onChange={(e) => setOdometerEnd(e.target.value)}
                      />
                      <span className="absolute right-3 top-2.5 text-zinc-600 text-xs">mi</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50 flex justify-between items-center h-10 mb-0.5">
                    <span className="text-zinc-500 text-xs uppercase font-medium">Auto-Calculated</span>
                    <span className={`font-mono font-bold text-lg ${milesTraveled > 0 ? 'text-indigo-400' : 'text-zinc-600'}`}>
                      {milesTraveled.toFixed(1)} <span className="text-xs font-normal">mi</span>
                    </span>
                  </div>
                </div>
                {milesTraveled > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-2 italic animate-in fade-in">
                    * Mileage will be automatically logged to Finance upon finishing the job.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Complete & Save controls moved to bottom Actions */}

          {/* Discount & Total */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl font-bold text-foreground">Totals & Payment</h2>
              <div className="flex flex-wrap gap-2">
                <div
                  className={`flex items-center gap-2 cursor-pointer text-sm transition-colors px-3 py-1.5 rounded-full border ${discountExpanded ? 'bg-zinc-800 border-zinc-500 text-white' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
                  onClick={() => setDiscountExpanded(!discountExpanded)}
                >
                  {discountExpanded ? 'Hide Discount' : 'Add Discount'}
                  {discountExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                <div
                  className={`flex items-center gap-2 cursor-pointer text-sm transition-colors px-3 py-1.5 rounded-full border ${destinationExpanded ? 'bg-zinc-800 border-zinc-500 text-white' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
                  onClick={() => setDestinationExpanded(!destinationExpanded)}
                >
                  {destinationExpanded ? 'Hide Fee' : 'Add Destination Fee'}
                  {destinationExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </div>

            {/* Collapsible Discount Controls */}
            {discountExpanded && (
              <div className="mb-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label className="text-zinc-400 mb-1.5 block">Discount Type</Label>
                    <div className="relative">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as "percent" | "dollar")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="dollar">Dollar Amount ($)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-zinc-400 mb-1.5 block">Discount Value</Label>
                    <Input
                      type="number"
                      placeholder={discountType === "percent" ? "e.g., 10" : "e.g., 20"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Destination Fee Controls */}
            {destinationExpanded && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
                <Label className="text-zinc-400 mb-1.5 block">Destination Fee ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={destinationFee || ''}
                  onChange={(e) => setDestinationFee(Number(e.target.value))}
                />
                <p className="text-xs text-zinc-500 mt-1">Added to total as a service charge.</p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200">${calculateSubtotal().toFixed(2)}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-${calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl border-t border-zinc-800 pt-4 mt-2">
                <span className="font-bold text-white">Total Due:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ${(() => {
                     const t = calculateTotal();
                     try { 
                       localStorage.setItem('recent_service_amount', t.toString()); 
                       localStorage.setItem('recent_service_job_id', checklistId || '');
                     } catch(e) {}
                     return t.toFixed(2);
                  })()}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions & Completion */}
          <div className="flex flex-col gap-6">
            <Card className="p-4 md:p-6 bg-gradient-card border-border space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white">Final Steps</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={async () => { 
                      const savedId = await saveGenericChecklist(); 
                      archiveChecklistPDF(false, savedId || checklistId || undefined); 
                      const customer = customers.find(c => c.id === selectedCustomer); 
                      const customerName = customer?.name || 'Unknown'; 
                      // pushAdminAlert('job_progress', `Progress saved for ${customerName}`, 'system', { checklistId: savedId || checklistId, customerId: selectedCustomer }); 
                    }} 
                    className="bg-black border border-white/10 hover:bg-zinc-900 text-white px-6"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Progress
                  </Button>
                  {checklistId && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 px-3 py-1">Saved</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-500 hover:text-red-400 h-8 px-2"
                        onClick={() => setShowDeleteDialog(true)}
                        title="Delete this checklist record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={finishJob} 
                  className="bg-red-600 hover:bg-red-700 text-white font-black italic h-12 text-lg shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                >
                  <CheckCircle2 className="h-5 w-5 mr-3" />
                  FINISH & COMPLETE JOB
                </Button>
                <Button 
                  onClick={handleCreateInvoiceGeneric} 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black italic h-12 text-lg shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all active:scale-95"
                >
                  <Receipt className="h-5 w-5 mr-3" />
                  SAVE & CREATE INVOICE
                </Button>
                <Button 
                  onClick={async () => {
                    const idToUse = checklistId || await saveGenericChecklist();
                    if (!idToUse) {
                      toast({ title: 'Error', description: 'Could not link job. Cannot process payment.', variant: 'destructive' });
                      return;
                    }
                    setFinishedJobId(idToUse);
                    setShowTipScreen(true);
                  }} 
                  className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 border-2 border-emerald-400/50 mt-2 rounded-xl"
                >
                  <DollarSign className="h-7 w-7 mr-3" />
                  COLLECT IN-PERSON PAYMENT (W/ TIP)
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={generatePDF} variant="outline" className="flex-1 h-10 border-white/10 text-zinc-400 hover:text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Estimate PDF
                </Button>
                <Button onClick={() => window.print()} variant="outline" className="flex-1 h-10 border-white/10 text-zinc-400 hover:text-white">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Checklist
                </Button>
              </div>
            </Card>
          </div>

          {/* Link to Customer (Optional) */}
          {checklistId && (
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-2xl font-bold text-foreground mb-4">Link to Customer (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Search Customer</Label>
                  <div className="flex gap-2">
                    <Input value={customerSearch} onChange={async (e) => {
                      const q = e.target.value; setCustomerSearch(q);
                      const res = await api(`/api/customers/search?q=${encodeURIComponent(q)}`, { method: 'GET' });
                      setCustomerSearchResults(Array.isArray(res) ? res : []);
                    }} placeholder="Type name, phone, or email" />
                    <Button variant="outline" onClick={() => setCustomerModalOpen(true)}>Add New</Button>
                  </div>
                  <div className="mt-2 max-h-[200px] overflow-auto space-y-2">
                    {customerSearchResults.map((c) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone} {c.email}</p>
                        </div>
                        <Button size="sm" onClick={() => linkJobToCustomer(String(c.id))}>Link Job</Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Job ID (optional)</Label>
                  <Input placeholder="Auto or manual" onBlur={(e) => {
                    const jobId = (e.target as HTMLInputElement).value.trim();
                    if (jobId) linkJobToCustomer(String(selectedCustomer || customerSearchResults[0]?.id || ''), jobId);
                  }} />
                  <Button variant="outline" onClick={() => { /* skip */ toast({ title: 'Saved as generic', description: 'You can link later from history.' }); }}>Skip</Button>
                </div>
              </div>
            </Card>
          )}

          <CustomerModal
            open={customerModalOpen}
            onOpenChange={setCustomerModalOpen}
            initial={customers.find(c => c.id === selectedCustomer) as any}
            onSave={async (data) => {
              const saved = await upsertSupabaseCustomer(data as any);
              const list = await getUnifiedCustomers();
              setCustomers(list as CustomerType[]);
              setSelectedCustomer((saved as any).id);
            }}
          />

          <RicksTipsModal open={tipsOpen} onOpenChange={setTipsOpen} />
        </div>
      </main>
      <ChemicalStepModal
        open={chemModalOpen}
        onOpenChange={setChemModalOpen}
        stepId={currentStepId}
        stepName={currentStepName}
        isAdmin={getCurrentUser()?.role === 'admin' || getCurrentUser()?.role === 'owner'}
      />
      <ChemicalDecisionModal
        open={decisionModalOpen}
        onOpenChange={setDecisionModalOpen}
      />
      <PrepChemicalsSummary
        open={prepSummaryOpen}
        onOpenChange={setPrepSummaryOpen}
        steps={checklistSteps}
      />
      {showTipScreen && finishedJobId && (
        <TipSelectionScreen
          jobId={finishedJobId}
          remainingBalanceInCents={Math.round(calculateTotal() * 100)}
          clientUrl={window.location.origin}
          onCancel={() => setShowTipScreen(false)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Checklist Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently remove this service record from your job history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!checklistId) return;
                try {
                  await deleteSupabaseBooking(checklistId);
                  toast({ title: 'Job Deleted', description: 'This service record has been permanently removed.' });
                  resetForm();
                  navigate('/job-history');
                } catch (err) {
                  toast({ title: 'Delete Failed', description: 'Could not remove the record.', variant: 'destructive' });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceChecklist;
