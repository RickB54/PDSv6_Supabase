import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCouponsStore } from "@/store/coupons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, CheckCircle2, CheckCircle, ArrowRight, ChevronRight, Save, Receipt, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, ArrowUp, FileText, Check, AlertCircle, HelpCircle, Info, Clock, FlaskConical, Car, Calendar, Beaker, Scale, ClipboardList, Share2, MapPin, Printer, Download, X, Camera, Image as ImageIcon, Video, Gauge, Sparkles, ExternalLink, DollarSign, RotateCcw, Loader2, Settings2, Play, Pause, History as HistoryIcon, Package, User, Lightbulb, Wrench } from "lucide-react";
import { refineTextWithAI } from "@/lib/ai-refiner";
import { Badge } from "@/components/ui/badge";
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  supabase,
  Customer as CustomerType
} from "@/lib/supa-data";
import { generateInvoiceNumber } from "@/lib/utils";
import logo from "@/assets/pds-final-logo.png";
import { getUnifiedCustomers } from "@/lib/customers";
import { useToast } from "@/hooks/use-toast";
import { calculateDiscount as utilsCalculateDiscount } from "@/lib/discountUtils";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CustomerModal from "@/components/customers/CustomerModal";
import { servicePackages, addOns, getServicePrice, getAddOnPrice, VehicleType as VehKey, getServiceInstructions } from "@/lib/services";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import { getCustomPackages, getCustomAddOns, getPackageMeta, getAddOnMeta, buildFullSyncPayload } from "@/lib/servicesMeta";
import { Progress } from "@/components/ui/progress";
import MaterialsUsedModal from "@/components/checklist/MaterialsUsedModal";
import { ChemicalStepModal } from "@/components/checklist/ChemicalStepModal";
import { ChemicalDecisionModal } from "@/components/checklist/ChemicalDecisionModal";
import { DestinationFeeInline } from "@/components/distance/DestinationFeeInline";
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
import { sopService, MasterSOPItem } from "@/lib/sop-service";
import { SOPTooltip } from "@/components/SOPTooltip";

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
  
  const hiddenByDefault = [
    'paint-sealant', 'odor-eliminator', 'paint-touch-up', 'ceramic-coating', 
    'paint-correction', 'odor-treatment', 'ceramic-protection-1yr', 'ceramic-coating-2yr'
  ];

  return merged.filter(a => {
    const m = getAddOnMeta(a.id);
    if (m?.deleted) return false;
    if (m?.visible === true) return true;
    if (m?.visible === false) return false;
    return !hiddenByDefault.includes(a.id);
  });
}

const AVG_TIMES: Array<{ keywords: string[]; ms: number }> = [
  { keywords: ['inspect', 'walkaround', 'expectation'], ms: 120000 },
  { keywords: ['gather', 'prep', 'setup', 'tools', 'chemicals'], ms: 180000 },
  { keywords: ['pre-rinse', 'rinse', 'foam'], ms: 300000 },
  { keywords: ['wheels', 'tires', 'wheel'], ms: 600000 },
  { keywords: ['wash', 'soap', 'scrub', 'hand wash'], ms: 900000 },
  { keywords: ['dry', 'blow', 'towel'], ms: 480000 },
  { keywords: ['clay', 'decontaminate', 'iron'], ms: 900000 },
  { keywords: ['polish', 'compound', 'machine'], ms: 1800000 },
  { keywords: ['wax', 'sealant', 'coating', 'ceramic'], ms: 1200000 },
  { keywords: ['glass', 'window', 'windshield'], ms: 480000 },
  { keywords: ['vacuum', 'vacuuming'], ms: 900000 },
  { keywords: ['shampoo', 'steam', 'carpet', 'upholstery', 'fabric'], ms: 1200000 },
  { keywords: ['leather', 'condition'], ms: 600000 },
  { keywords: ['dashboard', 'console', 'interior', 'panel', 'steering'], ms: 600000 },
  { keywords: ['door', 'jamb', 'sill'], ms: 300000 },
  { keywords: ['engine', 'bay', 'hood'], ms: 900000 },
  { keywords: ['trim', 'plastic', 'dressing'], ms: 300000 },
  { keywords: ['final', 'inspect', 'quality', 'check'], ms: 180000 },
  { keywords: ['exhaust', 'chrome', 'metal'], ms: 300000 },
  { keywords: ['headlight', 'light', 'restore'], ms: 600000 },
];

const getAvgTime = (stepName: string): number => {
  const lower = stepName.toLowerCase();
  for (const entry of AVG_TIMES) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.ms;
  }
  return 300000;
};

const parseTimeToMinutes = (val: string): number => {
  const v = val.toLowerCase().trim();
  if (!v) return 0;
  if (v.includes('h') || v.includes('hour')) {
    const num = parseFloat(v.replace(/[^\d.]/g, '')) || 0;
    return Math.round(num * 60);
  }
  if (v.includes(':')) {
    const parts = v.split(':').map(n => parseInt(n) || 0);
    if (parts.length === 2) return parts[0] + Math.floor(parts[1] / 60);
    if (parts.length === 3) return (parts[0] * 60) + parts[1] + Math.floor(parts[2] / 3600);
  }
  const result = parseInt(v);
  return isNaN(result) ? 0 : result;
};

const ServiceChecklist = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  // Dynamic vehicle types (store slug key directly)
  const [vehicleType, setVehicleType] = useState<string>("choose");
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    choose: "Choose Type",
    compact: "Compact/Sedan",
    midsize: "Mid-Size/SUV",
    truck: "Truck/Van/Large SUV",
    luxury: "Luxury/High-End",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['choose', 'compact', 'midsize', 'truck', 'luxury']);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<"percent" | "dollar">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountMethod, setDiscountMethod] = useState<'coupon' | 'custom'>('custom');
  const [discountCode, setDiscountCode] = useState("");
  const { items: coupons, refresh: refreshCoupons } = useCouponsStore();
  
  useEffect(() => {
    refreshCoupons();
  }, [refreshCoupons]);
  
  const [masterSOPs, setMasterSOPs] = useState<MasterSOPItem[]>([]);

  useEffect(() => {
    sopService.getMasterSOPs().then(setMasterSOPs);
    const handleSOPUpdate = (e: any) => {
      if (e.detail?.sops) {
        setMasterSOPs(e.detail.sops);
      } else {
        sopService.getMasterSOPs().then(setMasterSOPs);
      }
    };
    window.addEventListener('master-sops-updated', handleSOPUpdate);
    return () => window.removeEventListener('master-sops-updated', handleSOPUpdate);
  }, []);

  const getSOPItemForStep = useCallback((stepId: string, stepName: string): MasterSOPItem | undefined => {
    if (!masterSOPs || masterSOPs.length === 0) return undefined;
    let found = masterSOPs.find(s => s.id.toLowerCase() === stepId.toLowerCase() || s.code.toLowerCase() === stepId.toLowerCase());
    if (found) return found;

    const nameLower = stepName.toLowerCase();
    if (nameLower.includes('wheel') || nameLower.includes('rim')) return masterSOPs.find(s => s.id === 'ext-1');
    if (nameLower.includes('bug') || (nameLower.includes('rinse') && !nameLower.includes('final'))) return masterSOPs.find(s => s.id === 'ext-2');
    if (nameLower.includes('foam')) return masterSOPs.find(s => s.id === 'ext-3');
    if (nameLower.includes('hand wash') || nameLower.includes('contact wash') || (nameLower.includes('wash') && !nameLower.includes('pressure'))) return masterSOPs.find(s => s.id === 'ext-4');
    if (nameLower.includes('iron') || nameLower.includes('tar') || nameLower.includes('decon')) return masterSOPs.find(s => s.id === 'ext-5');
    if (nameLower.includes('clay')) return masterSOPs.find(s => s.id === 'ext-6');
    if (nameLower.includes('dry') || nameLower.includes('blow')) return masterSOPs.find(s => s.id === 'ext-7');
    if (nameLower.includes('protect') || nameLower.includes('sealant') || nameLower.includes('wax') || nameLower.includes('trim')) return masterSOPs.find(s => s.id === 'ext-8');

    if (nameLower.includes('personal') || nameLower.includes('trash')) return masterSOPs.find(s => s.id === 'int-1');
    if (nameLower.includes('air') || nameLower.includes('blow-out') || nameLower.includes('vent')) return masterSOPs.find(s => s.id === 'int-2');
    if (nameLower.includes('vac') || nameLower.includes('vacuum')) return masterSOPs.find(s => s.id === 'int-3');
    if (nameLower.includes('mat') || nameLower.includes('rug')) return masterSOPs.find(s => s.id === 'int-4');
    if (nameLower.includes('dash') || nameLower.includes('console') || nameLower.includes('switch')) return masterSOPs.find(s => s.id === 'int-5');
    if (nameLower.includes('seat') || nameLower.includes('leather')) return masterSOPs.find(s => s.id === 'int-6');
    if (nameLower.includes('extract') || nameLower.includes('shampoo') || nameLower.includes('carpet')) return masterSOPs.find(s => s.id === 'int-7');
    if (nameLower.includes('glass') || nameLower.includes('window')) return masterSOPs.find(s => s.id === 'int-8');
    if (nameLower.includes('uv') || nameLower.includes('protectant')) return masterSOPs.find(s => s.id === 'int-9');
    if (nameLower.includes('final') || nameLower.includes('inspection')) return masterSOPs.find(s => s.id === 'int-10');

    return masterSOPs.find(s => s.title.toLowerCase().includes(nameLower) || nameLower.includes(s.title.toLowerCase()));
  }, [masterSOPs]);
  
  const [destinationFee, setDestinationFee] = useState(0);
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [prevNotes, setPrevNotes] = useState<string | null>(null);
  
  const handleModifyWithAI = async () => {
    if (!notes) return;
    setPrevNotes(notes);
    setAiProcessing(true);
    try {
      const refined = await refineTextWithAI(notes);
      setNotes(refined);
      toast({ title: "Note Professionalized", description: "AI has refined your notes for the customer record." });
    } catch (error) {
      toast({ title: "AI Refinement Failed", variant: "destructive" });
    } finally {
      setAiProcessing(false);
    }
  };

  const handleRevertNotes = () => {
    if (prevNotes !== null) {
      setNotes(prevNotes);
      setPrevNotes(null);
      toast({ title: "Notes Reverted", description: "Returned to original version." });
    }
  };
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Tip Checkout Flow
  const [showTipScreen, setShowTipScreen] = useState(false);
  const [finishedJobId, setFinishedJobId] = useState<string | null>(null);
  const [showPostPaymentPopup, setShowPostPaymentPopup] = useState(false);

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
  const [hasCreatedInvoice, setHasCreatedInvoice] = useState(false);

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
  const [isJobCompleted, setIsJobCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [sessionHistory, setSessionHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('checklist_sessions') || '[]'); } catch { return []; }
  });
  const [pendingNavDest, setPendingNavDest] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<any>(null);

  // Pre-Vehicle Inspection Checklist State
  const [preVehicleExpanded, setPreVehicleExpanded] = useState(true);
  const initialPreVehicleChecks = {
    // Exterior (11)
    paint: false, frontBumper: false, headlightsFoglights: false, windshield: false,
    doorPanelsMirrors: false, wheels: false, tires: false, wheelWells: false,
    rearBumper: false, taillights: false, trunkTailgate: false,
    // Interior (7)
    frontSeats: false, frontCarpetMats: false, dashboardConsole: false, odorCheck: false,
    rearSeats: false, rearCarpetFloor: false, trunkCargoArea: false,
    // Cost-Impact Flags (6)
    excessivePetHair: false, heavyMudDirt: false, smokeOdor: false,
    stainsExtraction: false, biohazard: false, excessiveTrash: false,
  };
  type PreVehicleChecks = typeof initialPreVehicleChecks;
  const [preVehicleChecks, setPreVehicleChecks] = useState<PreVehicleChecks>(initialPreVehicleChecks);
  const [preVehicleNotes, setPreVehicleNotes] = useState('');
  const [preVehicleCustomerSig, setPreVehicleCustomerSig] = useState('');
  const [preVehicleDetailerSig, setPreVehicleDetailerSig] = useState('');
  const [preVehicleSigDate, setPreVehicleSigDate] = useState('');

  const togglePreVehicleCheck = (key: keyof PreVehicleChecks) =>
    setPreVehicleChecks(prev => ({ ...prev, [key]: !prev[key] }));


  const resetForm = () => {
    try { localStorage.removeItem('checklist_current_state'); } catch {}
    setInitialSnapshot("");
    setChecklistId("");
    setSelectedCustomer("");
    setVehicleType("choose");
    setSelectedServices([]);
    setDiscountValue("");
    setDestinationFee(0);
    setNotes("");
    setSelectedPackage("");
    setSelectedAddOns([]);
    setEstimatedTime("");
    setPreVehicleChecks(initialPreVehicleChecks);
    setPreVehicleNotes('');
    setPreVehicleCustomerSig('');
    setPreVehicleDetailerSig('');
    setPreVehicleSigDate('');
    setVYear("");
    setVMake("");
    setVModel("");
    
    // Do not default to admin; let it be empty or overridden by URL/Booking data
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
    setJobStartTime(null);
    setItemDurations({});
    setFinishedJobId(null);
    setShowTipScreen(false);
    setIsJobCompleted(false);
    setCompletedAt(null);

    // Reset Master Timer
    setMasterStartTime(null);
    setMasterIsRunning(false);
    setMasterElapsedTimeMs(0);

    // Clear Drafts from LocalStorage
    localStorage.removeItem('service_checklist_draft');
    if (checklistId) {
      localStorage.removeItem(`service_checklist_draft_${checklistId}`);
      localStorage.removeItem(`master_timer_${checklistId}`);
    }
    sessionStorage.removeItem('pending_draft_steps');

    setMaxVisitedStageIndex(0);
    setJobSetupExpanded(true);
    setPreVehicleExpanded(false);
    setMaterialsSectionExpanded(false);
    setMileageExpanded(false);
    setDiscountExpanded(false);
    setDestinationExpanded(false);
    setCollapsedSections({
      preparation: true,
      exterior: true,
      interior: true,
      addons: true,
      final: true,
    });

    // Clear URL parameters to prevent re-hydration on refresh
    setSearchParams({}, { replace: true });
  };

  // Read employee from URL params (from Staff Schedule "Start Job")
  useEffect(() => {
    const employeeParam = searchParams.get('employee');
    const employeeIdParam = searchParams.get('employeeId');
    if (employeeParam && employeeIdParam) {
      const user = getCurrentUser();
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';
      
      if (!isAdmin && user?.id !== employeeIdParam && user?.email !== employeeIdParam) {
        toast({
          title: "Access Denied",
          description: "This job is not assigned to you.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Auto-select the employee
      setEmployeeAssigned(employeeIdParam);
      toast({
        title: "Employee Auto-Selected",
        description: `Job assigned to ${employeeParam}`,
      });
    }
  }, [searchParams, navigate]);

  /* Accordion states for Materials Used & Discount */
  const [materialsAccordion, setMaterialsAccordion] = useState({ chemicals: false, materials: false, tools: false });
  const [materialsSectionExpanded, setMaterialsSectionExpanded] = useState(false);
  const [mileageExpanded, setMileageExpanded] = useState(false);
  const [addOnsExpanded, setAddOnsExpanded] = useState(false);
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const [destinationExpanded, setDestinationExpanded] = useState(false);
  const [jobSetupExpanded, setJobSetupExpanded] = useState(true);
  const [checklistExpanded, setChecklistExpanded] = useState(true);


  const toggleMatAccordion = (sec: 'chemicals' | 'materials' | 'tools') => setMaterialsAccordion(prev => ({ ...prev, [sec]: !prev[sec] }));
  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({}); // Track expanded help items
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<string>("");

  // Rick's Tips State
  const [tipsOpen, setTipsOpen] = useState(false);

  // Admin Instruction Editing State
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editInstructionText, setEditInstructionText] = useState("");
  const [isAdminEditMode, setIsAdminEditMode] = useState(false);
  const [editingStepNameId, setEditingStepNameId] = useState<string | null>(null);
  const [editStepNameText, setEditStepNameText] = useState("");

  const handleSaveStepName = (stepId: string) => {
    setChecklistSteps(prev => prev.map(s => s.id === stepId ? { ...s, name: editStepNameText } : s));
    setEditingStepNameId(null);
  };

  const handleDeleteStep = (stepId: string) => {
    if (window.confirm("Are you sure you want to remove this step from the current job?")) {
      setChecklistSteps(prev => prev.filter(s => s.id !== stepId));
    }
  };

  const handleAddStep = (category: ChecklistStep['category']) => {
    const name = window.prompt(`Enter new ${category} step name:`);
    if (name) {
      const newStep: ChecklistStep = {
        id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        category,
        checked: false
      };
      setChecklistSteps(prev => {
        // Insert after the last item of the same category
        const lastIdx = [...prev].reverse().findIndex(s => s.category === category);
        if (lastIdx === -1) return [...prev, newStep];
        const idx = prev.length - 1 - lastIdx;
        const next = [...prev];
        next.splice(idx + 1, 0, newStep);
        return next;
      });
    }
  };

  const saveAsStandardProcess = () => {
    if (!selectedPackage) return;
    if (!window.confirm(`Save this current checklist layout as the PERMANENT standard for "${selectedPackage}"? This will affect all future jobs using this package.`)) return;

    try {
      const overrides = JSON.parse(localStorage.getItem('packageStepOverrides') || '{}');
      // We only save the steps that belong to the package (not prep/addons/final unless we want to)
      // Actually, let's just save the whole thing but filter out addons which are dynamic?
      // Or save by category. 
      // The user probably wants the whole "Preparation", "Exterior", "Interior", "Final" sections to be customizable.
      
      const pkgSteps = checklistSteps.filter(s => !s.id.startsWith('addon-'));
      overrides[selectedPackage] = pkgSteps;
      localStorage.setItem('packageStepOverrides', JSON.stringify(overrides));
      
      toast({ title: "Standard Process Saved", description: `The process for "${selectedPackage}" has been updated globally.` });
    } catch (e) {
      toast({ title: "Failed to save standard", variant: "destructive" });
    }
  };

  const handleSaveInstruction = (stepId: string, stepName: string) => {
    try {
      const overrides = JSON.parse(localStorage.getItem('stepInstructionOverrides') || '{}');
      // Use ID as primary key, fallback to name
      const key = (stepId || stepName).toLowerCase();
      overrides[key] = editInstructionText;
      localStorage.setItem('stepInstructionOverrides', JSON.stringify(overrides));
      setEditingStepId(null);
      toast({ title: "Process Updated", description: `Standardized process for "${stepName}" has been saved.` });
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };




  const getKey = (type: 'package' | 'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const toVehKey = (value: string): VehKey => {
    const builtIns: VehKey[] = ['compact', 'midsize', 'truck', 'luxury'];
    let v = String(value || '').trim();
    // Normalize: remove descriptions in parentheses if present (e.g. "Compact/Sedan (Small...)") -> "Compact/Sedan"
    if (v.includes('(')) v = v.split('(')[0].trim();

    if ((builtIns as string[]).includes(v.toLowerCase())) return v.toLowerCase() as VehKey;
    const fromLabel = Object.keys(vehicleLabels).find(k => (vehicleLabels[k] || '').toLowerCase() === v.toLowerCase());
    const key = fromLabel || v;
    return toBuiltInVehKey(key);
  };

  // Standard vehicle types are now hardcoded (compact, midsize, truck, luxury) per user request.

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
  type ChecklistStep = { id: string; name: string; category: 'preparation' | 'exterior' | 'interior' | 'addons' | 'final'; checked: boolean; instructions?: string; stepChemicals?: string[] };
  const [checklistSteps, setChecklistSteps] = useState<ChecklistStep[]>([]);
  const isRestoringDraft = useRef(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    preparation: true,
    exterior: true,
    interior: true,
    addons: true,
    final: true,
  });
  const [maxVisitedStageIndex, setMaxVisitedStageIndex] = useState<number>(0);

  const FLOW_STAGES = [
    'vehicle-type',
    'service-package',
    'preparation',
    'exterior',
    'interior',
    'addons',
    'final',
    'materials',
    'totals-payment',
    'finish-job'
  ] as const;

  const advanceGuidedFlowToStage = useCallback((stageName: string) => {
    const idx = FLOW_STAGES.indexOf(stageName as any);
    if (idx !== -1) {
      setMaxVisitedStageIndex(prev => Math.max(prev, idx));
    }
  }, []);

  const isAllSectionsCollapsed = 
    Boolean(collapsedSections['preparation']) && 
    Boolean(collapsedSections['exterior']) && 
    Boolean(collapsedSections['interior']);

  const handleToggleAllSections = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAllSectionsCollapsed) {
      setCollapsedSections({});
      setJobSetupExpanded(true);
      setPreVehicleExpanded(true);
      setMaterialsSectionExpanded(true);
      setMileageExpanded(true);
      setDiscountExpanded(true);
      setDestinationExpanded(true);
      setChecklistExpanded(true);
    } else {
      setCollapsedSections({
        preparation: true,
        exterior: true,
        interior: true,
        addons: true,
        final: true,
      });
      setJobSetupExpanded(false);
      setPreVehicleExpanded(false);
      setMaterialsSectionExpanded(false);
      setMileageExpanded(false);
      setDiscountExpanded(false);
      setDestinationExpanded(false);
      setChecklistExpanded(true);
      setExpandedHelp({});
    }
  };

  // Timer State
  const [jobStartTime, setJobStartTime] = useState<number | null>(null);
  const [jobEndTime, setJobEndTime] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [lastActionTime, setLastActionTime] = useState<number>(Date.now());
  const [itemDurations, setItemDurations] = useState<Record<string, number>>({}); // stepId -> ms
  const [sectionDurations, setSectionDurations] = useState<Record<string, number>>({}); // category -> minutes
  const [liveNow, setLiveNow] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionValue, setEditSectionValue] = useState<string>("");

  // Master Timer (Job Duration) - Top Right
  const [masterStartTime, setMasterStartTime] = useState<number | null>(null);
  const [masterIsRunning, setMasterIsRunning] = useState(false);
  const [masterElapsedTimeMs, setMasterElapsedTimeMs] = useState(0);

  const updateElapsedTime = (now: number, startTime: number | null, accumulated: number) => {
    const diff = (now - (startTime || now)) + accumulated;
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setElapsedTime(
      `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    );
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        const now = Date.now();
        setLiveNow(now);
        updateElapsedTime(now, jobStartTime, totalElapsedMs);
        // Sync to localStorage for Quick Pay
        localStorage.setItem('recent_service_time', getAdjustedTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, jobStartTime, totalElapsedMs, elapsedTime]);

  // Master Timer Update Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (masterIsRunning) {
      interval = setInterval(() => {
        setLiveNow(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [masterIsRunning]);

  // Master Timer Persistence
  useEffect(() => {
    if (!checklistId) return;
    const key = `master_timer_${checklistId}`;
    if (masterIsRunning) {
      localStorage.setItem(key, JSON.stringify({ 
        startTime: masterStartTime, 
        isRunning: true, 
        elapsedBase: masterElapsedTimeMs 
      }));
    } else {
      localStorage.setItem(key, JSON.stringify({ 
        startTime: null, 
        isRunning: false, 
        elapsedBase: masterElapsedTimeMs 
      }));
    }
  }, [masterIsRunning, masterStartTime, masterElapsedTimeMs, checklistId]);

  // Initialize Master Timer from storage
  useEffect(() => {
    if (!checklistId) return;
    const saved = localStorage.getItem(`master_timer_${checklistId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.isRunning && data.startTime) {
          setMasterStartTime(data.startTime);
          setMasterIsRunning(true);
          setMasterElapsedTimeMs(data.elapsedBase || 0);
        } else if (data.elapsedBase) {
          setMasterElapsedTimeMs(data.elapsedBase);
        }
      } catch (e) { console.error("Master timer restore failed", e); }
    }
  }, [checklistId]);

  const handleStartTimer = () => {
    if (!isTimerRunning) {
      const now = Date.now();
      setJobStartTime(now);
      setIsTimerRunning(true);
      setLastActionTime(now);
      updateElapsedTime(now, now, totalElapsedMs); // Immediate UI update

      // Sync Master Timer (Start it if not already running)
      if (!masterIsRunning) {
        setMasterStartTime(now);
        setMasterIsRunning(true);
      }

      // Find first unchecked to scroll to
      setTimeout(() => {
        const firstUnchecked = checklistSteps.find(s => !s.checked);
        if (firstUnchecked) {
          // Expand the section if it's collapsed
          setCollapsedSections(prev => ({ ...prev, [firstUnchecked.category]: false }));
          
          // Small delay to allow expansion before scrolling
          setTimeout(() => {
            const el = document.getElementById(`step-${firstUnchecked.id}`);
            if (el) {
              const headerOffset = 150; // Account for sticky headers
              const elementPosition = el.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
              });
            }
          }, 300);
        }
      }, 100);
    }
  };

  const handleStopTimer = () => {
    if (isTimerRunning) {
      const now = Date.now();
      const sessionDiff = now - (jobStartTime || now);
      setTotalElapsedMs(prev => prev + sessionDiff);
      setIsTimerRunning(false);
      setJobStartTime(null);
      updateElapsedTime(now, null, totalElapsedMs + sessionDiff); // Immediate UI update
      // toast({ title: "Timer Paused", description: "Clock stopped." });
    }
  };

  const handleResetTimer = () => {
    if (confirm("Reset the job timer and all item durations to zero? This cannot be undone.")) {
      setJobStartTime(null);
      setIsTimerRunning(false);
      setTotalElapsedMs(0);
      setElapsedTime("00:00:00");
      setItemDurations({});
      
      // Reset Master Timer too
      setMasterStartTime(null);
      setMasterIsRunning(false);
      setMasterElapsedTimeMs(0);
      if (checklistId) {
        localStorage.removeItem(`master_timer_${checklistId}`);
      }
      // toast({ title: "Timer Reset", description: "Clock and task times have been cleared." });
    }
  };

  const formatDuration = (ms: any) => {
    if (typeof ms !== 'number' || isNaN(ms) || ms === 0) return "0s";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleToggleStep = (stepId: string, checked: boolean) => {
    const now = Date.now();
    
    // Update checklist status
    setChecklistSteps(prev => {
      const next = prev.map(ps => ps.id === stepId ? { ...ps, checked } : ps);
      
      // Auto-stop timer if everything is done
      const allDone = next.every(s => s.checked);
      if (allDone && isTimerRunning) {
        handleStopTimer();
      }
      return next;
    });

    // Auto-start timer on first check if not running
    if (checked && !isTimerRunning && !jobStartTime) {
      handleStartTimer();
      // StartTimer will set jobStartTime and lastActionTime
    } else if (checked && isTimerRunning) {
      // Update duration if checking ON while timer is active
      const diff = now - lastActionTime;
      setItemDurations(prev => ({
        ...prev,
        [stepId]: (prev[stepId] || 0) + diff
      }));
      setLastActionTime(now);
    }
    // Note: If unchecking, we keep the recorded duration so far (accumulated work)
  };

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  const handleSaveItemDuration = (stepId: string) => {
    let ms = 0;
    if (editDurationValue.includes(':')) {
      const [m, s] = editDurationValue.split(':').map(n => parseInt(n) || 0);
      ms = (m * 60 + s) * 1000;
    } else {
      // Treat as seconds if no colon
      ms = (parseInt(editDurationValue) || 0) * 1000;
    }
    setItemDurations(prev => ({ ...prev, [stepId]: ms }));
    setEditingDurationId(null);
  };

  const handleSaveSectionActualTime = (section: string, directValue?: string) => {
    const val = directValue !== undefined ? directValue : editSectionValue;
    const mins = parseTimeToMinutes(val);
    const ms = mins * 60 * 1000;

    if (ms >= 0) {
      // Distribute this time among checked items in this section
      const sectionSteps = checklistSteps.filter(s => s.category === section && s.checked);
      if (sectionSteps.length > 0) {
        const msPerStep = Math.floor(ms / sectionSteps.length);
        setItemDurations(prev => {
          const next = { ...prev };
          sectionSteps.forEach(s => {
            next[s.id] = msPerStep;
          });
          return next;
        });
      }
    }
    setEditingSectionId(null);
  };

  const handleCheckAllSection = (section: string) => {
    const sectionSteps = checklistSteps.filter(s => s.category === section);
    const allChecked = sectionSteps.every(s => s.checked);
    
    setChecklistSteps(prev => prev.map(step => 
      step.category === section ? { ...step, checked: !allChecked } : step
    ));
  };

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
      
      const destFee = params.get("destinationFee");
      if (destFee) setDestinationFee(Number(destFee) || 0);

      const addr = params.get("address");
      if (addr) setCustomerAddress(decodeURIComponent(addr));
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

      // Only set employee if explicitly passed via URL
      setEmployeeAssigned(prev => {
        if (prev) return prev;
        const urlEmpId = params.get('employeeId') || params.get('employee');
        if (urlEmpId) return urlEmpId;
        return "";
      });
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
        const firstVeh = customer.vehicles[0];
        setSelectedVehicleId(firstVeh.id || "");
        
        if (firstVeh.type) {
          const key = toVehKey(firstVeh.type);
          setVehicleType((vehicleOptions.includes(key) ? key : 'midsize'));
        } else {
          // Only fallback to smart guess if DB record is empty
          const fullName = `${firstVeh.year || ''} ${firstVeh.make || ''} ${firstVeh.model || ''}`.trim();
          const smartType = normalizeVehicleType(fullName);
          if (smartType) setVehicleType(smartType);
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


   const generateJobReport = (saveToArchive: boolean = false) => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // Primary red
    doc.text('JOB COMPLETION REPORT', 105, y, { align: 'center' });
    y += 15;

    // Job Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, y);
    doc.text(`Job ID: ${checklistId || 'DRAFT'}`, 190, y, { align: 'right' });
    y += 10;
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    // Customer & Vehicle Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Customer & Vehicle Information', 20, y);
    y += 8;
    doc.setFontSize(10);
    const customer = customers.find(c => c.id === selectedCustomer);
    doc.text(`Customer: ${customer?.name || genericCustomerName || 'N/A'}`, 25, y);
    y += 6;
    doc.text(`Vehicle: ${vYear} ${vMake} ${vModel}`, 25, y);
    y += 6;
    doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 25, y);
    y += 6;
    doc.text(`Assigned To: ${employees.find(e => String(e.id) === employeeAssigned)?.name || employeeAssigned || 'N/A'}`, 25, y);
    y += 12;

    // Service & Timing Summary
    doc.setFontSize(14);
    doc.text('Service Summary', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Main Package: ${selectedPackage}`, 25, y);
    y += 6;
    if (selectedAddOns.length > 0) {
      doc.text(`Add-ons: ${selectedAddOns.join(', ')}`, 25, y);
      y += 6;
    }
    const totalJobMs = (jobEndTime || liveNow) - (jobStartTime || Date.now());
    doc.text(`Total Job Time: ${formatDuration(totalJobMs)}`, 25, y);
    if (jobEndTime) {
      doc.setTextColor(22, 163, 74); // Green
      doc.text('Status: COMPLETED', 190, y, { align: 'right' });
      doc.setTextColor(0);
    }
    y += 12;

    // Checklist Detail Section
    doc.setFontSize(14);
    doc.text('Work Process & Timing', 20, y);
    y += 8;
    
    checklistSteps.forEach((step) => {
      // Page break check
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const isCategoryStart = y === 20 || checklistSteps[checklistSteps.indexOf(step) - 1]?.category !== step.category;
      if (isCategoryStart) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const sectionTitle = step.category === 'final' ? 'FINAL INSPECTION' : step.category === 'addons' ? 'ADD-ON SERVICES' : step.category.toUpperCase();
        const sectionSteps = checklistSteps.filter(s => s.category === step.category);
        const budgetTime = sectionDurations[step.category] !== undefined 
          ? parseTimeToMinutes(String(sectionDurations[step.category])) 
          : Math.floor(sectionSteps.reduce((acc, s) => acc + getAvgTime(s.name), 0) / 60000);
        
        doc.text(`${sectionTitle} (Budget: ${budgetTime}m)`, 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }

      // Step row
      doc.text(step.checked ? '[X]' : '[ ]', 25, y);
      doc.text(step.name, 35, y);
      
      if (itemDurations[step.id]) {
        doc.setTextColor(100);
        doc.text(`(${formatDuration(itemDurations[step.id])})`, 190, y, { align: 'right' });
        doc.setTextColor(0);
      }
      y += 6;
    });

    // Financials
    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, y);
    y += 8;
    doc.setFontSize(10);
    const subtotal = calculateSubtotal();
    doc.text('Subtotal:', 25, y);
    doc.text(`$${subtotal.toFixed(2)}`, 190, y, { align: 'right' });
    y += 6;
    
    if (discountValue) {
      doc.text(`Discount (${discountType === 'percent' ? discountValue + '%' : '$' + discountValue}):`, 25, y);
      const discAmt = discountType === 'percent' ? (subtotal * (parseFloat(discountValue) / 100)) : parseFloat(discountValue);
      doc.text(`-$${discAmt.toFixed(2)}`, 190, y, { align: 'right' });
      y += 6;
    }
    
    const finalTotal = Math.round(Math.max(0, subtotal - utilsCalculateDiscount(subtotal, parseFloat(discountValue) || 0, discountType)));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL AMOUNT:', 25, y);
    doc.text(`$${finalTotal.toFixed(2)}`, 190, y, { align: 'right' });

    // Save/Archive logic
    const pdfDataUrl = doc.output('dataurlstring');
    const fileName = `Job_Report_${selectedCustomer || 'Guest'}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (saveToArchive) {
      savePDFToArchive(
        'Job', 
        customer?.name || genericCustomerName || 'Guest', 
        checklistId || String(generateInvoiceNumber()), 
        pdfDataUrl, 
        { fileName, path: 'Reports/' }
      );
      toast({ title: "Report Archived", description: "The job completion report has been saved to your file manager." });
    } else {
      doc.save(fileName);
      toast({ title: "Report Generated", description: "Your PDF report has been downloaded." });
    }
  };

  const postChecklistMaterials = async (jobId: string, finalize = false) => {
    // Map fractional selections to numeric quantities for inventory decrement
    const FRACTION_TO_NUM: Record<string, number> = {
      '1/8': 0.125, '1/4': 0.25, '3/8': 0.375, '1/2': 0.5, '5/8': 0.625, '3/4': 0.75, '7/8': 0.875, '1': 1, '': 0
    };
    const serviceName = (servicePackages.find(p => p.id === selectedPackage)?.name
      || getCustomPackages().find((p: any) => p.id === selectedPackage)?.name
      || 'Service');
    const nowIso = new Date().toISOString();
    const chemItems = chemRows.filter(r => r.chemicalId).map(r => ({
      chemicalId: r.chemicalId,
      quantity: FRACTION_TO_NUM[r.fraction || ''] || 0,
      notes: r.notes || '',
      serviceName,
      date: nowIso,
      employee: employeeAssigned || '',
    })).filter(i => i.quantity > 0);
    const matItems = matRows.filter(r => r.materialId).map(r => {
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
    }).filter(i => i.quantity > 0);
    const toolItems = toolRows.filter(r => r.toolId).map(r => ({
      toolId: r.toolId,
      toolName: toolsList.find(t => t.id === r.toolId)?.name,
      notes: r.notes || '',
      serviceName,
      date: nowIso,
      employee: employeeAssigned || '',
    }));
    const items = [...chemItems, ...matItems];

    if (toolItems.length > 0) {
      const currentUsage = await localforage.getItem<any[]>('tool-usage') || [];
      await localforage.setItem('tool-usage', [...currentUsage, ...toolItems]);
    }

    try {
      const res = await api('/api/checklist/materials', { method: 'POST', body: JSON.stringify({ jobId, rows: items }) });
      if ((res as any)?.ok || res === null) {
        toast({ title: finalize ? 'Materials finalized' : 'Materials saved', description: finalize ? 'Inventory updated and usage history logged.' : 'Materials usage recorded for this job.' });
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
        return sum + getServicePrice(svc.id, builtInKey);
      }
      if (svc.kind === 'addon') {
        return sum + getAddOnPrice(svc.id, builtInKey);
      }
      return sum; // special handled separately
    }, 0);
    return total + destinationFee;
  };

  // When package, add-ons, or destination fee change, re-sync selectedServices and build checklist
  useEffect(() => {
    const vkey = toBuiltInVehKey(vehicleType);
    const selected = [
      selectedPackage, 
      ...selectedAddOns,
      destinationFee > 0 ? 'destination-fee' : null
    ].filter(Boolean) as string[];
    setSelectedServices(selected);

    // Auto-reset timer if everything is unchecked and we're switching
    if (checklistSteps.length > 0 && checklistSteps.every(s => !s.checked) && jobStartTime) {
      setJobStartTime(null);
      setItemDurations({});
    }

    // Capture previous state to preserve it
    const prevChecked = new Map(checklistSteps.map(s => [s.id, s.checked]));
    const prevNamesChecked = new Map(checklistSteps.map(s => [s.name, s.checked]));

    // Build new steps
    const pkg = servicePackages.find(p => p.id === selectedPackage) || 
                (getCustomPackages().find((p: any) => p.id === selectedPackage) as any) ||
                servicePackages.find(p => p.name === selectedPackage); // fallback to name for old drafts
    const globalOverrides = JSON.parse(localStorage.getItem('packageStepOverrides') || '{}');
    
    // Build core preparation and final steps that always exist
    const prep: ChecklistStep[] = [
      { id: 'prep-inspect', name: 'Inspect vehicle (exterior & interior)', category: 'preparation', checked: false },
      { id: 'prep-tools', name: 'Gather tools & chemicals', category: 'preparation', checked: false },
      { id: 'prep-walkaround', name: 'Customer walkaround & expectations', category: 'preparation', checked: false },
    ];
    const final: ChecklistStep[] = [
      { id: 'final-personal', name: 'Remove personal items & trash', category: 'final', checked: false },
      { id: 'final-inspect', name: 'Final inspection & touch-ups', category: 'final', checked: false },
      { id: 'final-walkaround', name: 'Final customer walkaround', category: 'final', checked: false },
    ];

    let nextSteps: ChecklistStep[] = [];
    if (selectedPackage && globalOverrides[selectedPackage]) {
      // Overrides for this package
      const addonSteps = selectedAddOns.map(aid => {
        const found = (liveAddOns || []).find((a: any) => a.id === aid) || addOns.find(a => a.id === aid);
        return { id: `addon-${aid}`, name: found?.name || aid, category: 'addons', checked: false } as ChecklistStep;
      });
      nextSteps = [...prep, ...globalOverrides[selectedPackage], ...addonSteps, ...final];
    } else {
      let baseSteps: ChecklistStep[] = [];
      if (pkg && (pkg as any).steps) {
        baseSteps = (pkg as any).steps.map((s: any) => ({ id: s.id || s, name: s.name || s, category: (s.category || 'exterior'), checked: false }));
      }
      const addonSteps = selectedAddOns.map(aid => {
        const found = (liveAddOns || []).find((a: any) => a.id === aid) || addOns.find(a => a.id === aid);
        return { id: `addon-${aid}`, name: found?.name || aid, category: 'addons', checked: false } as ChecklistStep;
      });
      nextSteps = [...prep, ...baseSteps, ...addonSteps, ...final];
    }

    // Merge previous progress back in
    const merged = nextSteps.map(step => {
      // Priority 1: Match by ID
      if (prevChecked.has(step.id)) return { ...step, checked: prevChecked.get(step.id) };
      // Priority 2: Match by Name (for stability when IDs are generated from names)
      if (prevNamesChecked.has(step.name)) return { ...step, checked: prevNamesChecked.get(step.name) };
      return step;
    });

    setChecklistSteps(merged);
  }, [selectedPackage, selectedAddOns, vehicleType, destinationFee]);

  // --- PERSISTENCE LOGIC START ---
  const CHECKLIST_DRAFT_KEY = 'service_checklist_draft';
  const DRAFTS_INDEX_KEY = 'service_checklist_drafts_v1';

  const [customerHistory, setCustomerHistory] = useState<any[]>([]);

  // Fetch true database history for the selected customer
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerHistory([]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', selectedCustomer)
          .order('date', { ascending: false });
        if (data) setCustomerHistory(data);
      } catch (e) {
        console.error("Failed to fetch customer history:", e);
      }
    };
    fetchHistory();
  }, [selectedCustomer]);

  // 1. Restore State on Mount (if no URL params)
  useEffect(() => {
    const hasUrlParams = searchParams.get("package") || searchParams.get("vehicleType") || searchParams.get("addons");
    const urlId = searchParams.get("id");
    
    // Priority: If we have a URL ID, try to restore THAT specific draft
    const targetKey = urlId ? `${CHECKLIST_DRAFT_KEY}_${urlId}` : CHECKLIST_DRAFT_KEY;
    const saved = localStorage.getItem(targetKey);

    if (saved) {
      try {
        const state = JSON.parse(saved);
        console.log("Restoring checklist draft:", state);

        // URL Parameters take precedence over draft saved values!
        const urlPkg = searchParams.get("package");
        const urlVType = searchParams.get("vehicleType");
        const urlAddons = searchParams.get("addons");
        const urlEmp = searchParams.get("employeeId");
        
        const urlDiscountValue = searchParams.get("discountValue");
        const urlDiscountType = searchParams.get("discountType");
        const urlDiscountCode = searchParams.get("discountCode");

        if (state.selectedCustomer) setSelectedCustomer(state.selectedCustomer);
        if (state.selectedPackage && !urlPkg) setSelectedPackage(state.selectedPackage);
        if (state.vehicleType && !urlVType) setVehicleType(state.vehicleType);
        if (state.selectedAddOns && !urlAddons) setSelectedAddOns(state.selectedAddOns);
        if (state.destinationFee) setDestinationFee(state.destinationFee);
        if (state.notes) setNotes(state.notes);
        if (state.employeeAssigned && !urlEmp) setEmployeeAssigned(state.employeeAssigned);
        
        if (urlDiscountValue) setDiscountValue(urlDiscountValue);
        else if (state.discountValue) setDiscountValue(state.discountValue);
        
        if (urlDiscountType) setDiscountType(urlDiscountType as "percent" | "dollar");
        else if (state.discountType) setDiscountType(state.discountType);
        
        if (urlDiscountCode) {
           setDiscountCode(urlDiscountCode);
           setDiscountMethod('coupon');
           setDiscountExpanded(true);
        } else if (state.discountValue || urlDiscountValue) {
           setDiscountMethod('custom');
           setDiscountExpanded(true);
        }

        if (urlId) {
          setChecklistId(urlId);
          // DYNAMIC LOOKUP FIX: Fetch booking to ensure employee is set correctly
          if (localStorage.getItem("demo_mode_active") !== "true") {
            supabase.from('bookings').select('assigned_employee_id').eq('id', urlId).single().then(({ data, error }) => {
              if (data?.assigned_employee_id && !searchParams.get("employeeId")) {
              setEmployeeAssigned(data.assigned_employee_id);
            }
          });
          }
        }
        else if (state.checklistId) setChecklistId(state.checklistId);

        if (state.jobStartTime) setJobStartTime(state.jobStartTime);
        if (state.isTimerRunning) setIsTimerRunning(state.isTimerRunning);
        if (state.totalElapsedMs) setTotalElapsedMs(state.totalElapsedMs);
        if (state.elapsedTime) setElapsedTime(state.elapsedTime);
        if (state.itemDurations) setItemDurations(state.itemDurations);
        if (state.sectionDurations) setSectionDurations(state.sectionDurations);
        if (state.chemRows) setChemRows(state.chemRows);
        if (state.matRows) setMatRows(state.matRows);
        if (state.toolRows) setToolRows(state.toolRows);
        if (state.odometerStart) setOdometerStart(state.odometerStart);
        if (state.odometerEnd) setOdometerEnd(state.odometerEnd);

        // Store saved steps so the merge effect can apply checked states
        // after the regeneration effect builds the full step list (with exterior/interior)
        if (state.checklistSteps) {
          window.sessionStorage.setItem('pending_draft_steps', JSON.stringify(state.checklistSteps));
        }

        toast({ title: "Draft Restored", description: `Resumed job for ${state.customerName || 'Generic Customer'}.` });
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
    
    // Allow state to settle before tracking unsaved changes
    setTimeout(() => {
      setInitialLoaded(true);
      setHasUnsavedChanges(false);
    }, 1000);
  }, []); // Run once on mount

  const progressPercent = useMemo(() => {
    const total = checklistSteps.length || 0;
    const done = checklistSteps.filter(s => s.checked).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [checklistSteps]);

  // 2. Re-apply steps checked status after regeneration
  // Matches by ID first, then falls back to step name - handles old drafts
  // that may not have exterior/interior steps (they're regenerated fresh each time)
  useEffect(() => {
    const pending = window.sessionStorage.getItem('pending_draft_steps');
    if (pending && checklistSteps.length > 0) {
      try {
        const savedSteps = JSON.parse(pending) as ChecklistStep[];
        if (!savedSteps || savedSteps.length === 0) return;

        const merged = checklistSteps.map(current => {
          // Priority 1: match by ID
          const byId = savedSteps.find(s => s.id === current.id);
          if (byId) return { ...current, checked: byId.checked, stepChemicals: byId.stepChemicals || current.stepChemicals };
          // Priority 2: match by name (catches exterior/interior steps from package)
          const byName = savedSteps.find(s => s.name.trim().toLowerCase() === current.name.trim().toLowerCase());
          if (byName) return { ...current, checked: byName.checked, stepChemicals: byName.stepChemicals || current.stepChemicals };
          return current;
        });

        const isDifferent = JSON.stringify(merged) !== JSON.stringify(checklistSteps);
        if (isDifferent) {
          setChecklistSteps(merged);
          window.sessionStorage.removeItem('pending_draft_steps');
        }
      } catch { }
    }
  }, [checklistSteps]);



  // 3. Save State on Change
  const saveCurrentSession = () => {
    const sState = {
      checklistId, customerName: customers.find(c => c.id === selectedCustomer)?.name || genericCustomerName || 'Generic Customer',
      packageName: servicePackages.find(p => p.id === selectedPackage)?.name || getCustomPackages().find((p: any) => p.id === selectedPackage)?.name || 'Custom Package',
      selectedCustomer, selectedPackage, vehicleType, selectedAddOns, 
      checklistSteps, notes, destinationFee, employeeAssigned, discountValue, discountType, jobStartTime,
      isTimerRunning, totalElapsedMs, elapsedTime, itemDurations, sectionDurations,
      chemRows, matRows, toolRows, milesTraveled, odometerStart, odometerEnd, timestamp: Date.now()
    };
    
    setSessionHistory(prev => {
      // @ts-ignore
      const id = window.currentChecklistSessionId || Date.now().toString();
      // @ts-ignore
      window.currentChecklistSessionId = id;
      
      const existingIdx = prev.findIndex(s => s.sessionId === id);
      const newEntry = {
         sessionId: id,
         date: new Date().toISOString(),
         jobId: checklistId,
         customerName: sState.customerName,
         employeeAssigned,
         packageName: sState.packageName,
         state: sState
      };
      const newList = [...prev];
      if (existingIdx >= 0) newList[existingIdx] = newEntry;
      else newList.unshift(newEntry);
      
      if (newList.length > 50) newList.pop(); // Keep only last 50
      
      localStorage.setItem('checklist_sessions', JSON.stringify(newList));
      return newList;
    });
    setHasUnsavedChanges(false);
    toast({ title: "Progress Saved", description: "Your checklist progress has been saved to history." });
  };

  // Capture the starting state once data finishes loading (from draft or URL)
  useEffect(() => {
    if (initialLoaded && !initialSnapshot) {
      const currentStateObj = {
        selectedCustomer, selectedPackage, selectedAddOns, 
        checklistSteps: checklistSteps.map(s => s.checked), notes, destinationFee, discountValue, 
        jobStartTime, masterStartTime, chemRows, matRows, toolRows, 
        milesTraveled
      };
      setInitialSnapshot(JSON.stringify(currentStateObj));
    }
  }, [initialLoaded]);

  useEffect(() => {
    if (initialLoaded) {
      // If the job is marked as completed, it's definitely not "unsaved"
      if (completedAt || isJobCompleted) {
        setHasUnsavedChanges(false);
        // @ts-ignore
        window.hasUnsavedChecklistChanges = false;
        return;
      }

      // Check if current state differs from the initial snapshot
      const currentStateObj = {
        selectedCustomer, selectedPackage, selectedAddOns, 
        checklistSteps: checklistSteps.map(s => s.checked), notes, destinationFee, discountValue, 
        jobStartTime, masterStartTime, chemRows, matRows, toolRows, 
        milesTraveled
      };
      const currentStateStr = JSON.stringify(currentStateObj);
      
      const isUntouched = initialSnapshot ? (currentStateStr === initialSnapshot) : true;

      if (isUntouched) {
        setHasUnsavedChanges(false);
        // @ts-ignore
        window.hasUnsavedChecklistChanges = false;
      } else {
        setHasUnsavedChanges(true);
        // @ts-ignore
        window.hasUnsavedChecklistChanges = true;
      }
    }
  }, [
    initialLoaded, initialSnapshot,
    selectedCustomer, selectedPackage, selectedAddOns, 
    checklistSteps, notes, destinationFee, discountValue, 
    jobStartTime, masterStartTime, chemRows, matRows, toolRows, 
    milesTraveled, completedAt, isJobCompleted
  ]);

  useEffect(() => {
    const handleSaveRequest = (e: any) => {
       const dest = e.detail;
       setPendingNavDest(dest);
    };
    window.addEventListener('request-checklist-save', handleSaveRequest);
    
    // Clean up flag on unmount
    return () => {
       window.removeEventListener('request-checklist-save', handleSaveRequest);
       // @ts-ignore
       window.hasUnsavedChecklistChanges = false;
    };
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        if (!anchor.href.startsWith('http')) return;
        
        try {
          const targetUrl = new URL(anchor.href);
          if (targetUrl.origin === window.location.origin && targetUrl.pathname !== window.location.pathname) {
            e.preventDefault();
            e.stopPropagation();
            setPendingNavDest(targetUrl.pathname + targetUrl.search + targetUrl.hash);
          }
        } catch {}
      }
    };
    
    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // @ts-ignore
      window.hasUnsavedChecklistChanges = false;
    };
  }, [hasUnsavedChanges]);

  // Listen for Quick Pay completion to open Post-Payment Popup after Finish Job
  useEffect(() => {
    // Check if returning from Stripe or external checkout with pending popup flag
    try {
      if (sessionStorage.getItem('post_payment_popup_pending') === 'true') {
        sessionStorage.removeItem('post_payment_popup_pending');
        setShowTipScreen(false);
        setShowPostPaymentPopup(true);
      }
    } catch {}

    const handleQuickPayCompleted = () => {
      setShowTipScreen(false);
      setShowPostPaymentPopup(true);
    };
    window.addEventListener('quick-pay-completed', handleQuickPayCompleted);
    return () => window.removeEventListener('quick-pay-completed', handleQuickPayCompleted);
  }, []);

  // --- PERSISTENCE LOGIC END ---


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

    // Customer sync is now handled solely by the CRM/Modal to avoid duplicate ghost vehicles.

    // 0.5 Ensure we have a customer ID if history requires it
    let targetCustomerId = selectedCustomer;
    const isGenericTest = !targetCustomerId;

    if (isGenericTest) {
      // If no customer is selected, treat as a local test/generic job.
      // We do NOT record these in the booking calendar to avoid clutter.
      console.log("Generic/Test Customer detected. Skipping database booking.");
      
      // We still update the draft and allow PDF generation
      const mockId = checklistId || `test-${Date.now()}`;
      setChecklistId(mockId);
      
      // DISPATCH LOCAL EVENT SO UI UPDATES WITHOUT REQUIRING DB SYNC
      window.dispatchEvent(new Event('bookings-updated'));
      
      toast({ 
        title: 'Test/Generic Mode', 
        description: 'Progress is local-only. No record will be added to the booking calendar.',
        className: 'bg-zinc-800 text-zinc-300 border-zinc-700'
      });
      
      return mockId;
    }

    // --- FROM HERE DOWN: LOCAL CHECKLIST TRACKING ONLY ---
    // Note: The Service Checklist does NOT create booking records.
    // Bookings are managed exclusively via the Bookings page or the public BookNow page.
    
    const localId = checklistId || `checklist-${Date.now()}`;
    setChecklistId(localId);

    const stateToSave = {
      checklistId: localId,
      customerName: customers.find(c => c.id === selectedCustomer)?.name || genericCustomerName || 'Generic Customer',
      packageName: servicePackages.find(p => p.id === selectedPackage)?.name || getCustomPackages().find((p: any) => p.id === selectedPackage)?.name || 'Custom Package',
      selectedCustomer,
      selectedPackage,
      vehicleType,
      selectedAddOns,
      checklistSteps, 
      notes,
      destinationFee,
      employeeAssigned,
      discountValue,
      discountType,
      jobStartTime,
      isTimerRunning,
      totalElapsedMs,
      elapsedTime,
      itemDurations,
      sectionDurations,
      chemRows,
      matRows,
      toolRows,
      milesTraveled,
      odometerStart,
      odometerEnd,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CHECKLIST_DRAFT_KEY, JSON.stringify(stateToSave));
    localStorage.setItem(`${CHECKLIST_DRAFT_KEY}_${localId}`, JSON.stringify(stateToSave));
    
    setHasUnsavedChanges(false);
    // toast({ title: 'Progress Saved', description: 'Checklist progress saved.' });

    try {
      await postChecklistMaterials(localId, false);
    } catch (err) {
      console.warn("Materials Sync Delayed:", err);
    }

    return localId;
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
    return utilsCalculateDiscount(calculateSubtotal(), parseFloat(discountValue) || 0, discountType);
  };

  const getAdjustedTime = () => {
    // If the timer has bare minimum progress, substitute it with fixed times
    if (totalElapsedMs < 60000 || elapsedTime === '00:00:00' || elapsedTime.startsWith('00:00:')) {
      const pkgName = servicePackages.find(p => p.id === selectedPackage)?.name || 
                     getCustomPackages().find((p: any) => p.id === selectedPackage)?.name || '';
      const lower = pkgName.toLowerCase();
      if (lower.includes('full')) return '2 hr 30 min';
      if (lower.includes('interior')) return '1 hr 30 min';
      if (lower.includes('exterior')) return '1 hr';
      return '1 hr'; // fallback
    }
    return elapsedTime;
  };
  const calculateTotal = () => {
    return Math.max(0, Math.ceil(calculateSubtotal()) - calculateDiscount());
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
      const title = finalize ? 'Service Checklist - Job Completed' : 'Service Checklist - Progress Saved';
      doc.setFontSize(18);
      doc.text('Prime Auto Detail', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text(title, 105, 26, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 38);
      doc.text(`Customer: ${customerName}`, 20, 46);
      doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 20, 54);
      doc.text(`Total Time: ${elapsedTime}`, 20, 62);
      let y = 70;
      if (employeeAssigned) { doc.text(`Employee: ${employeeAssigned}`, 20, y); y += 8; }

      // Timer Info
      const masterDuration = (masterIsRunning ? (Date.now() - (masterStartTime || Date.now())) : 0) + masterElapsedTimeMs;
      if (finalize && (masterDuration > 0)) {
        if (masterStartTime) doc.text(`Started: ${new Date(masterStartTime).toLocaleTimeString()}`, 120, 46);
        doc.text(`Finished: ${new Date().toLocaleTimeString()}`, 120, 54);
        doc.setFont(undefined, 'bold');
        doc.text(`Master Job Time: ${formatDuration(masterDuration)}`, 120, 62);
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

      // Checklist Details - tasks, progress, and notes
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
          
          const durationStr = itemDurations[t.id] ? ` [${formatDuration(itemDurations[t.id])}]` : '';
          const wrapped = doc.splitTextToSize(String((t.name || '') + durationStr), 170);
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

      // Materials Used - chemicals and materials rows
      doc.setFontSize(13);
      doc.text('Materials Used', 20, y); y += 7;
      doc.setFontSize(11);
      // Chemicals
      doc.text('Chemicals:', 20, y); y += 6;
      const chemLines = (chemRows || []).map(row => {
        const name = String(chemicalsList.find(c => String(c.id) === String(row.chemicalId))?.name || row.chemicalId || '');
        const frac = row.fraction ? String(row.fraction) : '';
        const note = row.notes ? ` - ${row.notes}` : '';
        return name ? `• ${name}${frac ? ` (${frac})` : ''}${note}` : '';
      }).filter(Boolean);
      const chemText = doc.splitTextToSize(chemLines.length ? chemLines.join('\n') : '(none)', 170);
      doc.text(chemText, 28, y); y += chemText.length * 5 + 4;
      // Materials
      doc.text('Materials:', 20, y); y += 6;
      const matLines = (matRows || []).map(row => {
        const name = String(materialsList.find(m => String(m.id) === String(row.materialId))?.name || row.materialId || '');
        const qty = row.quantityNote ? row.quantityNote : '';
        return name ? `• ${name}${qty ? ` - ${qty}` : ''}` : '';
      }).filter(Boolean);
      const matText = doc.splitTextToSize(matLines.length ? matLines.join('\n') : '(none)', 170);
      doc.text(matText, 28, y); y += matText.length * 5 + 4;
      // Tools
      doc.text('Tools:', 20, y); y += 6;
      const toolLines = (toolRows || []).map(row => {
        const name = String(toolsList.find(t => String(t.id) === String(row.toolId))?.name || row.toolId || '');
        const note = row.notes ? ` - ${row.notes}` : '';
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

    // toast({ title: "Estimate Saved", description: "Service checklist saved to local storage." });
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
          return getServicePrice(svc.id, vkeyBuiltIn);
        }
        if (svc.kind === 'addon') {
          return getAddOnPrice(svc.id, vkeyBuiltIn);
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
    const hoursWorked = masterElapsedTimeMs > 0 ? Number((masterElapsedTimeMs / (1000 * 60 * 60)).toFixed(2)) : 0;
    
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
      hoursWorked: hoursWorked > 0 ? hoursWorked : undefined,
      hoursMethod: hoursWorked > 0 ? 'timer' : undefined,
      employeeId: employeeAssigned || undefined
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
      const customerName = customer?.name || genericCustomerName;
      
      if (!customerName || customerName.trim().toLowerCase() === 'generic customer') {
        toast({ 
          title: "Customer Name Required", 
          description: "Please provide a customer name or select one from the CRM to create an invoice. Test/Generic jobs without names are not sent to accounting.",
          variant: "destructive"
        });
        return;
      }
      
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
            return getServicePrice(svc.id, vkeyBuiltIn);
          }
          if (svc.kind === 'addon') {
            return getAddOnPrice(svc.id, vkeyBuiltIn);
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

      // DO NOT clear draft here - let the final "Complete" or "Close" button decide when to clear.

      setHasCreatedInvoice(true);
      toast({ title: "Invoice Created", description: "Invoice saved to Supabase and PDF downloaded." });

    } catch (e: any) {
      console.error("Create Invoice Failed:", e);
      toast({ title: "Failed to Create Invoice", description: e.message || "Unknown error", variant: "destructive" });
    }
  };
  const finishJob = async () => {
    // Stop the timers
    const end = Date.now();
    setJobEndTime(end);
    setIsTimerRunning(false);
    setJobStartTime(null);
    
    // Stop Master Timer
    setMasterIsRunning(false);
    if (masterStartTime) {
      setMasterElapsedTimeMs(prev => prev + (end - masterStartTime));
      setMasterStartTime(null);
    }

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

      // Update Booking Status to 'done' if the id is a valid UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idToUse)) {
        try {
          step = 'update_booking_status';
          if (localStorage.getItem("demo_mode_active") !== "true") {
            await supabase.from('bookings').update({ status: 'done' }).eq('id', idToUse);
          }
          window.dispatchEvent(new Event('bookings-updated'));
        } catch (e) {
          console.warn("Failed to update booking status to done:", e);
        }
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
      
      // AUTO-CREATE INVOICE (ONLY IF NOT ALREADY CREATED)
      if (!hasCreatedInvoice) {
        try {
          step = 'create_invoice';
          
          const hoursWorked = masterElapsedTimeMs > 0 ? Number((masterElapsedTimeMs / (1000 * 60 * 60)).toFixed(2)) : 0;
          
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
            paidAmount: 0,
            hoursWorked: hoursWorked > 0 ? hoursWorked : undefined,
            hoursMethod: hoursWorked > 0 ? 'timer' : undefined,
            employeeId: employeeAssigned || undefined
          };
          await upsertSupabaseInvoice(invoiceData);
          setHasCreatedInvoice(true);
          console.log("✅ Auto-invoice created for job:", idToUse);
        } catch (invErr) {
          console.error("Auto-invoice creation failed:", invErr);
          // Don't fail the whole job finish if just invoice creation fails, 
          // but alert the user if possible.
        }
      } else {
        console.log("â„¹ï¸ Invoice already created manually, skipping auto-invoice.");
      }

      pushAdminAlert('job_completed', `Job completed for ${customerName}`, 'system', { checklistId: idToUse, customerId: selectedCustomer });
      toast({ title: 'Job Finished', description: 'Materials posted, completion archived, and invoice generated.' });
      
      if (selectedCustomer) {
        try {
          await import('@/lib/supa-data').then(m => m.upsertSupabaseCustomer({
            id: selectedCustomer,
            updated_at: new Date().toISOString()
          }));
        } catch (e) {
          console.error("Failed to update customer timestamp", e);
        }
      }

      // Trigger tip and payment
      setFinishedJobId(idToUse);
      setShowTipScreen(true);
      // Lock the checklist
      setIsJobCompleted(true);
      setCompletedAt(new Date().toISOString());
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
    doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 20, 42);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);
    doc.text(`Customer: ${customer?.name || "N/A"}`, 20, 56);

    let y = 68;
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
        const serviceText = `${service.name}: $${price}`;
        const lines = doc.splitTextToSize(serviceText, 170);
        doc.text(lines, 25, y);
        y += (lines.length * 6);
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

  const generateColorfulChecklistPDF = () => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === selectedCustomer);
    const customerName = customer?.name || genericCustomerName || 'Guest';

    // Header Branding
    doc.setFillColor(31, 31, 31); // Dark background
    doc.rect(0, 0, 210, 45, 'F');
    
    try {
      doc.addImage(logo, 'PNG', 15, 5, 30, 30);
    } catch(e) {}

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("SERVICE CHECKLIST", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${customerName} | ${selectedPackage || 'Custom Package'} | ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

    let y = 55;
    const categories = ['preparation', 'exterior', 'interior', 'addons', 'final'];
    const categoryLabels: any = { preparation: 'PREPARATION', exterior: 'EXTERIOR', interior: 'INTERIOR', addons: 'ADD-ON SERVICES', final: 'FINAL INSPECTION' };
    const categoryColors: any = { preparation: [59, 130, 246], exterior: [16, 185, 129], interior: [249, 115, 22], addons: [139, 92, 246], final: [239, 68, 68] };

    categories.forEach(cat => {
      const steps = checklistSteps.filter(s => s.category === cat);
      if (steps.length === 0) return;

      // Section Header
      const color = categoryColors[cat];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(15, y - 5, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(categoryLabels[cat], 20, y);
      y += 10;

      // Items
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      steps.forEach(step => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        // Checkbox
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, y - 4, 5, 5);
        if (step.checked) {
          doc.setDrawColor(color[0], color[1], color[2]);
          doc.line(20, y - 4, 25, y + 1);
          doc.line(25, y - 4, 20, y + 1);
        }

        // Text
        doc.text(step.name, 30, y);
        y += 8;
      });
      y += 5;
    });

    // Open in new window
    window.open(doc.output('bloburl'), '_blank');

    doc.save(`Checklist_${customerName.replace(/\s+/g, '_')}.pdf`);
    toast({ title: "Checklist Generated", description: "Clean colorful PDF is ready." });
  };

  // Guided-Flow Stage Calculation
  const isCustomerValid = Boolean(selectedCustomer) || (Boolean(genericCustomerName) && genericCustomerName.trim().length > 0);
  const isVehicleValid = Boolean(vehicleType) && vehicleType !== 'choose' && vehicleType !== 'Choose Type';
  const isPackageValid = Boolean(selectedPackage) && selectedPackage.trim().length > 0;
  const isEmployeeValid = Boolean(employeeAssigned) && employeeAssigned !== '' && employeeAssigned !== 'unassigned';

  const isVehicleSelected = isVehicleValid;
  const isPackageSelected = isPackageValid;

  // Job setup is complete as soon as both Vehicle Type and Service Package are selected (Customer & Employee have defaults)
  const isJobSetupComplete = isVehicleSelected && isPackageSelected;

  const determineActiveFlowStage = (): string | null => {
    if (isJobCompleted) return null;
    if (!isVehicleSelected) return 'vehicle-type';
    if (!isPackageSelected) return 'service-package';

    // Job Setup is complete! Look through remaining flow stages starting from maxVisitedStageIndex (min 2)
    const minIndex = Math.max(2, maxVisitedStageIndex);
    const categoriesList: string[] = ['preparation', 'exterior', 'interior', 'addons', 'final'];

    for (let i = minIndex; i < FLOW_STAGES.length; i++) {
      const stage = FLOW_STAGES[i];
      if (categoriesList.includes(stage)) {
        const catSteps = checklistSteps.filter(s => s.category === stage);
        if (catSteps.length > 0 && catSteps.some(s => !s.checked)) {
          return stage;
        }
      } else {
        return stage;
      }
    }
    return 'finish-job';
  };

  const activeFlowStage = determineActiveFlowStage();

  // Auto-expand whatever section is currently required by guided flow
  useEffect(() => {
    if (!activeFlowStage) return;

    if (activeFlowStage === 'vehicle-type' || activeFlowStage === 'service-package') {
      setJobSetupExpanded(true);
    } else if (['preparation', 'exterior', 'interior', 'addons', 'final'].includes(activeFlowStage)) {
      setCollapsedSections(prev => {
        if (prev[activeFlowStage]) {
          const next = { ...prev };
          delete next[activeFlowStage];
          return next;
        }
        return prev;
      });
      setChecklistExpanded(true);
    } else if (activeFlowStage === 'materials') {
      setMaterialsSectionExpanded(true);
    }
  }, [activeFlowStage]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title={`Service Checklist ${selectedCustomer ? '(Linked)' : '(Generic)'}`} 
        subtitle="Execute the Prime Standard for every vehicle."
      >
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={saveCurrentSession}
            disabled={!hasUnsavedChanges}
            className={cn("border-purple-500/30 bg-purple-500/10 hover:bg-purple-500 hover:text-white font-bold h-9 px-3", hasUnsavedChanges ? "text-purple-400 animate-pulse" : "text-zinc-500")}
          >
            <Save className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Save Progress</span>
          </Button>
        </div>
      </PageHeader>

      <main className="container mx-auto px-2 sm:px-4 py-4 md:py-8 max-w-7xl animate-fade-in space-y-4 md:space-y-8">
        {/* Premium Header Block */}
        <div className="bg-gradient-to-r from-purple-900/20 via-black to-zinc-950 p-4 md:p-6 rounded-2xl border border-purple-900/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight truncate flex items-center gap-2">
                  Service Checklist
                  <PaymentWorkflowHelp variant="service-checklist" />
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shrink-0"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-help', { 
                      detail: { topicId: 'service-checklist', role: getCurrentUser()?.role } 
                    }));
                  }}
                  title="SOP & Procedure Guide"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                
                {/* Moved Buttons */}
                <div className="flex gap-2 ml-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/chemical-training')} 
                    className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 font-bold h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs"
                  >
                    <Beaker className="w-3 h-3 md:w-4 md:h-4 md:mr-2" /> 
                    <span className="hidden md:inline">Chemical Decision</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dilution-calculator')} 
                    className="border-green-500/30 bg-green-500/10 hover:bg-green-500 hover:text-white text-green-400 font-bold h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs"
                  >
                    <Scale className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">Dilution Calc</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={(e) => handleToggleAllSections(e)} 
                    className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-zinc-300 font-bold h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs"
                    title={isAllSectionsCollapsed ? "Expand All Sections" : "Collapse All Sections"}
                  >
                    {isAllSectionsCollapsed ? (
                      <ChevronsDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-300 md:mr-1.5" />
                    ) : (
                      <ChevronsUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-300 md:mr-1.5" />
                    )}
                    <span className="hidden md:inline">{isAllSectionsCollapsed ? 'Expand All' : 'Collapse All'}</span>
                  </Button>
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] md:text-xs max-w-xl hidden sm:block">Quality control & estimation workflow</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Progress Indicator moved to far right top row */}
              <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                <div className="text-right flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-tighter font-black">Progress</span>
                  <span className="text-lg font-bold text-white leading-none">{progressPercent}%</span>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setTipsOpen(true)} className="bg-purple-700 text-white hover:bg-purple-800 h-7 text-[10px] px-2 font-bold">
                  Tips
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPrepSummaryOpen(true)} className="bg-blue-700 text-white hover:bg-blue-800 h-7 text-[10px] px-2">
                  Prep
                </Button>
              </div>
            </div>
          </div>
          {/* Mobile Buttons Row - hidden to save space if needed, or keep minimal */}
          <div className="flex md:hidden items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
            <Button variant="secondary" size="sm" onClick={() => setTipsOpen(true)} className="bg-purple-700 text-white hover:bg-purple-800 h-6 text-[9px] px-2 font-bold flex-1">
              Tips
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPrepSummaryOpen(true)} className="bg-blue-700 text-white hover:bg-blue-800 h-6 text-[9px] px-2 flex-1">
              Prep
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDecisionModalOpen(true)} className="bg-teal-700 text-white hover:bg-teal-800 h-6 text-[9px] px-2 flex-1">
              Decision
            </Button>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>
        
        <div className="space-y-6">
          {/* Always Visible Sticky Service Summary */}
          {selectedPackage && (
            <div 
              style={{ top: 'var(--header-total-height, 64px)' }}
              className="sticky z-50 mb-4 bg-zinc-950/95 backdrop-blur-md rounded-xl border border-purple-500/30 shadow-2xl p-3 md:p-4 transition-all"
            >
               <div className="flex justify-between items-center w-full">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="text-zinc-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                      Service Summary
                      {isJobCompleted && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase py-0 h-4 border-zinc-700">
                          FINISHED
                        </Badge>
                      )}
                    </div>
                    <div className="text-blue-400 font-bold text-xs md:text-sm mb-1 truncate flex items-center gap-2">
                      {(() => {
                         const cName = customers.find(c => c.id === selectedCustomer)?.name || genericCustomerName;
                         const vString = [vYear, vMake, vModel].filter(Boolean).join(" ");
                         const vClass = vehicleLabels[vehicleType] || vehicleType;
                         const fullVehicle = vString ? `${vString} (${vClass})` : (vClass !== 'choose' && vClass !== 'Choose Type') ? `(${vClass})` : '';
                         return [cName, fullVehicle].filter(Boolean).join(" • ");
                      })()}
                    </div>
                    <div className="text-white font-black text-sm md:text-lg tracking-tight leading-tight uppercase truncate">
                       {servicePackages.find(p => p.id === selectedPackage)?.name || 
                        getCustomPackages().find((p: any) => p.id === selectedPackage)?.name || 
                        "No Service Selected"}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-300 text-[9px] md:text-[10px] font-black uppercase py-0 px-2 h-5 border-zinc-700 flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        {employees.find(e => e.id === employeeAssigned)?.name || 'Unassigned'}
                      </Badge>
                      {selectedAddOns.map((a, i) => {
                         const name = addOns.find(x => x.id === a)?.name || getCustomAddOns().find((x: any) => x.id === a)?.name || a;
                         return (
                          <Badge key={i} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black uppercase py-0 px-2 h-5">
                            {name}
                          </Badge>
                         );
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div className="text-emerald-400 font-bold text-lg md:text-2xl drop-shadow-md tracking-tight">
                      ${calculateTotal().toFixed(2)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Button 
                        size="sm" 
                        onClick={async () => { 
                          const savedId = await saveGenericChecklist(); 
                          archiveChecklistPDF(false, savedId || checklistId || undefined); 
                        }} 
                        className="bg-black/50 hover:bg-zinc-800 text-white border border-white/10 h-8 text-[10px] md:text-xs px-3"
                      >
                        <Save className="h-3 w-3 mr-1.5" /> Save Progress
                      </Button>
                      {hasUnsavedChanges && (
                        <div className="text-[9px] md:text-[10px] text-yellow-500 flex items-center font-bold animate-pulse mt-0.5">
                          <AlertCircle className="w-3 h-3 mr-1" /> Unsaved changes
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          )}

          {/* Timer Reminder Notification */}
          {(selectedPackage && (selectedCustomer || genericCustomerName)) && !isTimerRunning && totalElapsedMs === 0 && (
            <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600/30 flex items-center justify-center animate-pulse">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm md:text-base">Ready to start detailing?</h3>
                  <p className="text-blue-300/80 text-xs md:text-sm">Don't forget to start your timer to track job performance!</p>
                </div>
              </div>
              <Button onClick={handleStartTimer} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 shadow-lg shadow-blue-900/40">
                <Play className="h-4 w-4 mr-2" /> Start Clock
              </Button>
            </div>
          )}

          {/* ============================================================ */}
          {/* PRE-VEHICLE INSPECTION CHECKLIST */}
          {/* ============================================================ */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl border-t-4 border-t-amber-500/60 mb-4">
            <div
              className="px-4 md:px-6 py-4 flex items-center justify-between gap-4 cursor-pointer group bg-black/60 transition-all rounded-t-xl"
              onClick={() => setPreVehicleExpanded(!preVehicleExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full h-9 w-9 bg-amber-500/20 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Pre-Vehicle Inspection Checklist
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Prime Standard</span>
                  </h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Complete BEFORE starting any service</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/Pre-Vehicle-Inspection-Checklist.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all text-[10px] font-black uppercase tracking-widest shrink-0" title="Open original PDF form for printing" onClick={(e) => e.stopPropagation()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print PDF Form</span>
                </a>
                <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
                  {preVehicleExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                </div>
              </div>
            </div>

            {preVehicleExpanded && (
              <div className="p-4 md:p-6 space-y-5 animate-in slide-in-from-top-2 duration-300">

                {/* Business Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-4">
                    <img src={logo} alt="Prime Auto Detail" className="h-12 w-12 object-contain" />
                    <div>
                      <div className="text-white font-black text-base tracking-tight uppercase">PRIME AUTO DETAIL</div>
                      <div className="text-zinc-400 text-[10px]">Methuen, MA • primeautodetail.net • (978) 555-0100</div>
                    </div>
                  </div>
                  <div className="border-2 border-zinc-600 rounded-lg px-4 py-2 text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">PRE-VEHICLE</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">CHECKLIST</div>
                  </div>
                </div>

                {/* Info Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Customer', value: customers.find(c => c.id === selectedCustomer)?.name || genericCustomerName || '' },
                    { label: 'Date', value: format(new Date(), 'MMM d, yyyy') },
                    { label: 'Service', value: servicePackages.find(p => p.id === selectedPackage)?.name || getCustomPackages().find((p: any) => p.id === selectedPackage)?.name || '' },
                    { label: 'Year', value: vYear || '' },
                    { label: 'Make', value: vMake || '' },
                    { label: 'Model', value: vModel || '' },
                  ].map(f => (
                    <div key={f.label} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{f.label}</div>
                      <div className="text-zinc-200 text-xs font-semibold truncate">{f.value}</div>
                    </div>
                  ))}
                </div>

                {/* Exterior + Interior side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EXTERIOR */}
                  <div className="border-2 border-zinc-700 rounded-xl overflow-hidden">
                    <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-white">Exterior</span>
                      <span className="ml-auto text-[10px] text-zinc-400">11 Points</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {([
                        ['paint', 'Paint / Clear Coat'],
                        ['frontBumper', 'Front Bumper'],
                        ['headlightsFoglights', 'Headlights / Foglights'],
                        ['windshield', 'Windshield'],
                        ['doorPanelsMirrors', 'Door Panels / Mirrors'],
                        ['wheels', 'Wheels'],
                        ['tires', 'Tires'],
                        ['wheelWells', 'Wheel Wells'],
                        ['rearBumper', 'Rear Bumper'],
                        ['taillights', 'Taillights'],
                        ['trunkTailgate', 'Trunk / Tailgate'],
                      ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => togglePreVehicleCheck(key)}>
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                            preVehicleChecks[key]
                              ? 'bg-emerald-500/20 border-emerald-500'
                              : 'border-zinc-600 group-hover:border-emerald-500/50'
                          )}>
                            {preVehicleChecks[key] && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <span className={cn(
                            "text-xs transition-colors",
                            preVehicleChecks[key] ? 'text-emerald-300 line-through' : 'text-zinc-300 group-hover:text-white'
                          )}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* INTERIOR */}
                  <div className="border-2 border-zinc-700 rounded-xl overflow-hidden">
                    <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-white">Interior</span>
                      <span className="ml-auto text-[10px] text-zinc-400">7 Points</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {([
                        ['frontSeats', 'Front Seats'],
                        ['frontCarpetMats', 'Front Carpet / Floor Mats'],
                        ['dashboardConsole', 'Dashboard / Center Console'],
                        ['odorCheck', 'Odor Check'],
                        ['rearSeats', 'Rear Seats'],
                        ['rearCarpetFloor', 'Rear Carpet / Floor'],
                        ['trunkCargoArea', 'Trunk / Cargo Area'],
                      ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => togglePreVehicleCheck(key)}>
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                            preVehicleChecks[key]
                              ? 'bg-blue-500/20 border-blue-500'
                              : 'border-zinc-600 group-hover:border-blue-500/50'
                          )}>
                            {preVehicleChecks[key] && <Check className="w-3 h-3 text-blue-400" />}
                          </div>
                          <span className={cn(
                            "text-xs transition-colors",
                            preVehicleChecks[key] ? 'text-blue-300 line-through' : 'text-zinc-300 group-hover:text-white'
                          )}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cost-Impact Flags + Ask The Customer side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* COST-IMPACT FLAGS */}
                  <div className="border-2 border-red-900/50 rounded-xl overflow-hidden">
                    <div className="bg-red-950/60 px-4 py-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-red-300">Cost-Impact Flags</span>
                    </div>
                    <div className="p-3 space-y-2 bg-red-950/10">
                      {([
                        ['excessivePetHair', 'Excessive Pet Hair'],
                        ['heavyMudDirt', 'Heavy Mud / Dirt Buildup'],
                        ['smokeOdor', 'Smoke Odor'],
                        ['stainsExtraction', 'Stains Requiring Extraction'],
                        ['biohazard', 'Biohazard / Bodily Fluid'],
                        ['excessiveTrash', 'Excessive Trash / Clutter'],
                      ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => togglePreVehicleCheck(key)}>
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                            preVehicleChecks[key]
                              ? 'bg-red-500/30 border-red-500'
                              : 'border-red-900/60 group-hover:border-red-500/60'
                          )}>
                            {preVehicleChecks[key] && <Check className="w-3 h-3 text-red-400" />}
                          </div>
                          <span className={cn(
                            "text-xs transition-colors",
                            preVehicleChecks[key] ? 'text-red-300 font-semibold' : 'text-zinc-400 group-hover:text-red-300'
                          )}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ASK THE CUSTOMER */}
                  <div className="border-2 border-zinc-700 rounded-xl overflow-hidden">
                    <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-white">Ask The Customer</span>
                      <span className="ml-auto text-[9px] text-zinc-500 italic">Reference - not checkable</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {[
                        'When was the last time the vehicle was professionally detailed?',
                        'Are there any specific problem areas you\u2019d like us to focus on?',
                        'Are there pets or smokers that regularly use this vehicle?',
                        'Are there any fragile or valuable items in the vehicle we should know about?',
                      ].map((q, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-black text-amber-400">{i + 1}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="border-2 border-zinc-700 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Inspection Notes</span>
                  </div>
                  <div className="p-3">
                    <Textarea
                      value={preVehicleNotes}
                      onChange={e => setPreVehicleNotes(e.target.value)}
                      placeholder="Document pre-existing damage, special conditions, or customer requests..."
                      className="min-h-[100px] bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs resize-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Sign-off */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Customer Signature</label>
                    <Input
                      value={preVehicleCustomerSig}
                      onChange={e => setPreVehicleCustomerSig(e.target.value)}
                      placeholder="Type name as signature..."
                      className="h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs italic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Detailer Signature</label>
                    <Input
                      value={preVehicleDetailerSig}
                      onChange={e => setPreVehicleDetailerSig(e.target.value)}
                      placeholder="Type name as signature..."
                      className="h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs italic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sign-off Date</label>
                    <Input
                      value={preVehicleSigDate}
                      onChange={e => setPreVehicleSigDate(e.target.value)}
                      placeholder={format(new Date(), 'MM/dd/yyyy')}
                      className="h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs"
                    />
                  </div>
                </div>

                {/* Summary badge row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.values(preVehicleChecks).filter(Boolean).length > 0 && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                      ✓ {Object.values(preVehicleChecks).filter(Boolean).length} items flagged / confirmed
                    </span>
                  )}
                  {(preVehicleChecks.excessivePetHair || preVehicleChecks.heavyMudDirt || preVehicleChecks.smokeOdor || preVehicleChecks.stainsExtraction || preVehicleChecks.biohazard || preVehicleChecks.excessiveTrash) && (
                    <span className="text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full font-bold animate-pulse">
                      âš  Cost-impact flags active - discuss surcharge
                    </span>
                  )}
                </div>

              </div>
            )}
          </Card>
          {/* ============================================================ */}

          {/* Job Setup */}
          <Card className={cn(
            "bg-gradient-card overflow-visible mb-4 transition-all duration-300",
            !isJobSetupComplete
              ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              : "border-border"
          )}>
            <div 
              className="px-4 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-2 md:gap-4 cursor-pointer group bg-black/50 transition-all rounded-t-xl"
              onClick={() => setJobSetupExpanded(!jobSetupExpanded)}
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="rounded-full h-8 w-8 md:h-10 md:w-10 bg-blue-600/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-all">
                  <Settings2 className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-2xl font-bold text-white truncate transition-all">
                      Job Setup
                    </h2>
                    {isJobSetupComplete ? (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" /> Complete
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" /> Required Step
                      </span>
                    )}
                    {jobSetupExpanded ? <ChevronUp className="h-5 w-5 text-zinc-600" /> : <ChevronDown className="h-5 w-5 text-zinc-600" />}
                  </div>
                  {jobSetupExpanded && <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest animate-in fade-in truncate">Customer, Vehicle & Services</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {jobSetupExpanded && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to RESET the entire form? This will wipe all customer, vehicle, and service data from the screen for a new entry.")) {
                        resetForm();
                        toast({ title: 'Form Reset', description: 'The screen has been cleared for a new entry.' });
                      }
                    }}
                    className="flex border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 gap-2 px-2 md:px-3 animate-in fade-in"
                    title="Reset Job Setup"
                  >
                    <RotateCcw className="h-4 w-4" /> 
                    <span className="hidden md:inline">Reset</span>
                  </Button>
                )}
                <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
                  {jobSetupExpanded ? <ChevronUp className="h-6 w-6 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                </div>
              </div>
            </div>

            {jobSetupExpanded && (
              <>
                <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
            {/* Customer selection restored - includes Generic option */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Customer Link</Label>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'prospect-vs-customer' } }))}
                    className="text-zinc-600 hover:text-blue-400"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className={cn(
                    "flex h-10 w-full rounded-md border bg-black text-white px-3 py-2 text-sm transition-all",
                    !isCustomerValid ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-white/20"
                  )}
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
                    className={cn(
                      "h-10 text-white transition-all",
                      !isCustomerValid ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30" : "border-blue-500/20 bg-black focus:border-blue-500/50"
                    )}
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
                      if (veh) {
                        if (veh.type) {
                          const key = toVehKey(veh.type);
                          setVehicleType(vehicleOptions.includes(key) ? key : 'midsize');
                        } else {
                          // Only fallback to smart guess if DB record is empty
                          const fullName = `${veh.year || ''} ${veh.make || ''} ${veh.model || ''}`.trim();
                          const smartType = normalizeVehicleType(fullName);
                          if (smartType) setVehicleType(smartType);
                        }
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-purple-900/30 bg-black text-white px-3 py-2 text-sm focus:ring-purple-500/20"
                  >
                    <option value="">-- Choose a Vehicle --</option>
                    {(customers.find(c => c.id === selectedCustomer)?.vehicles || []).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} {v.color ? `[Color: ${v.color}]` : ""} ({v.type || 'No Type'})
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
            <div className="grid grid-cols-3 gap-3 mb-4 border-t border-white/5 pt-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500">Year</Label>
                <Input placeholder="" value={vYear} onChange={(e) => setVYear(e.target.value)} className="h-10 bg-black text-sm border-zinc-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500">Make</Label>
                <Input placeholder="" value={vMake} onChange={(e) => setVMake(e.target.value)} className="h-10 bg-black text-sm border-zinc-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500">Model</Label>
                <Input placeholder="" value={vModel} onChange={(e) => setVModel(e.target.value)} className="h-10 bg-black text-sm border-zinc-800" />
              </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-300">Vehicle Type</Label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className={cn(
                    "flex h-11 w-full rounded-md border bg-black text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all",
                    activeFlowStage === 'vehicle-type' ? "border-amber-500/60 ring-1 ring-amber-500/30 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "border-white/20"
                  )}
                >
                  {vehicleOptions.map((opt) => (
                    <option key={opt} value={opt}>{vehicleLabels[opt] || opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-300">Service Package</Label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className={cn(
                      "flex h-11 w-full rounded-md border bg-black text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all",
                      activeFlowStage === 'service-package' ? "border-amber-500/60 ring-1 ring-amber-500/30 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "border-white/20"
                    )}
                  >
                    <option value="">Select a package...</option>
                    {coreServicesDisplay.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {liveAddOns.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div 
                      className="flex items-center justify-between cursor-pointer group mb-2"
                      onClick={() => setAddOnsExpanded(!addOnsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Label className="cursor-pointer font-bold text-zinc-200">Optional Add-Ons</Label>
                        {selectedAddOns.length > 0 && (
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] h-4">
                            {selectedAddOns.length} selected
                          </Badge>
                        )}
                      </div>
                      <div className="p-1 rounded-full group-hover:bg-white/10 transition-colors">
                        {addOnsExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                      </div>
                    </div>
                    
                    {addOnsExpanded && (
                      <div className="grid grid-cols-1 gap-1.5 animate-in slide-in-from-top-1 duration-200">
                        {liveAddOns
                          .filter((a: any) => !a.applicableVehicleTypes || a.applicableVehicleTypes.includes(vehicleType))
                          .map((a: any) => (
                          <label key={a.id} className="flex items-center gap-2 text-xs p-2 rounded hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5">
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 border-t border-white/5 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-300">Estimated Time</Label>
                <Input 
                  placeholder="e.g., 4 hours" 
                  value={estimatedTime} 
                  onChange={(e) => setEstimatedTime(e.target.value)} 
                  className="h-11 bg-black border-white/20 focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-300">Employee Assigned</Label>
                <select
                  value={employeeAssigned}
                  onChange={(e) => setEmployeeAssigned(e.target.value)}
                  disabled={!isAdminUser}
                  className={cn(
                    "flex h-11 w-full rounded-md border bg-black text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    isCustomerValid && isVehicleValid && isPackageValid && !isEmployeeValid ? "border-amber-500/60 ring-1 ring-amber-500/30 animate-pulse" : "border-white/20"
                  )}
                >
                  <option value="">Select employee...</option>
                  {employees.map((e: any) => (
                    <option key={e.id || e.name} value={String(e.id || e.name)}>{e.name || e.id}</option>
                  ))}
                </select>
              </div>
              </div>

              {/* Job Notes & Professional AI Assistant - MOVED INSIDE JOB SETUP */}
              <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Job Notes & Communication</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {prevNotes && (
                      <Button variant="ghost" size="sm" onClick={handleRevertNotes} className="h-8 text-[10px] text-zinc-500 hover:text-white gap-1 uppercase font-black">
                        <RotateCcw className="h-3 w-3" /> Revert
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleModifyWithAI} 
                      disabled={aiProcessing || !notes}
                      className="h-8 text-xs bg-indigo-600/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all rounded-lg"
                    >
                      {aiProcessing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Modify Using AI
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">These notes will appear on the customer's PDF estimate and invoice.</p>
                <Textarea
                  placeholder="e.g. Surface scratches on hood were deeper than expected. Recommended a 2-step correction for best results."
                  className="bg-zinc-950 border-zinc-800 min-h-[120px] text-zinc-200 focus:border-indigo-500/50"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </Card>


        {/* ===== JOB COMPLETION LOCK BANNER ===== */}
        {isJobCompleted && (
          <div className="mx-0 mb-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-emerald-400 text-base uppercase tracking-wider">✓ Job Completed</p>
                <p className="text-zinc-400 text-sm mt-0.5">
                  This checklist was completed on {completedAt ? new Date(completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'just now'}.
                </p>
                <p className="text-zinc-500 text-xs mt-1">Invoice and payment records are unaffected. Totals &amp; Payment remain editable below.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 font-bold"
              onClick={() => {
                setIsJobCompleted(false);
                setCompletedAt(null);
                toast({ title: 'Checklist Reopened', description: 'You can now edit this checklist. No financial records were changed.' });
              }}
            >
              <HistoryIcon className="h-4 w-4 mr-2" /> Reopen &amp; Edit
            </Button>
          </div>
        )}

      <Card className="bg-gradient-card border-border overflow-visible relative mb-4"
            style={{ opacity: isJobCompleted ? 0.65 : 1, pointerEvents: isJobCompleted ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
        <div 
          style={{ top: 'var(--header-total-height, 64px)' }}
          className="sticky z-40 px-4 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-2 md:gap-4 cursor-pointer group bg-black/95 backdrop-blur-md transition-all rounded-t-xl"
          onClick={() => setChecklistExpanded(!checklistExpanded)}
        >
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-red-600/20 flex items-center justify-center shrink-0 group-hover:bg-red-600/30 transition-colors">
              <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-2xl font-bold text-white truncate">Service Checklist</h2>
                {checklistExpanded ? <ChevronUp className="h-5 w-5 text-zinc-600" /> : <ChevronDown className="h-5 w-5 text-zinc-600" />}
              </div>
              <p className="text-[10px] md:text-sm text-zinc-400">Step-by-step quality control</p>
            </div>
          </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 md:h-7 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-white/30 gap-1.5 px-2 md:px-3 shrink-0 font-bold"
                onClick={(e) => handleToggleAllSections(e)}
                title={isAllSectionsCollapsed ? "Expand All Sections" : "Collapse All Sections"}
              >
                {isAllSectionsCollapsed ? (
                  <ChevronsDown className="h-3.5 w-3.5 md:h-3 md:w-3 text-zinc-300" />
                ) : (
                  <ChevronsUp className="h-3.5 w-3.5 md:h-3 md:w-3 text-zinc-300" />
                )}
                <span className="hidden md:inline text-[10px]">{isAllSectionsCollapsed ? "Expand All" : "Collapse All"}</span>
              </Button>
              {getCurrentUser()?.role === 'admin' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-8 md:h-7 gap-1.5 px-2 md:px-3 ${isAdminEditMode ? 'bg-orange-500 text-white border-orange-600' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`}
                  onClick={() => setIsAdminEditMode(!isAdminEditMode)}
                >
                  <Settings2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  <span className="hidden md:inline text-[10px]">{isAdminEditMode ? 'Exit Edit' : 'Edit Checklist'}</span>
                </Button>
              )}
              {isAdminEditMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 md:h-7 bg-green-900/20 border-green-700/30 text-green-400 hover:bg-green-900/30 gap-1.5 px-2 md:px-3"
                  onClick={saveAsStandardProcess}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  <span className="hidden md:inline text-[10px]">Save Standard</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 md:h-7 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-white/30 gap-1.5 px-2 md:px-3"
                onClick={() => generateJobReport(false)}
                title="Generate Report"
              >
                <Download className="h-3.5 w-3.5 md:h-3 md:w-3" />
                <span className="hidden md:inline text-[10px]">Report</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 md:h-7 bg-red-900/10 border-red-900/30 text-red-400 hover:bg-red-900/20 gap-1.5 px-2 md:px-3"
                onClick={() => generateJobReport(true)}
                title="Archive Job"
              >
                <Save className="h-3.5 w-3.5 md:h-3 md:w-3" />
                <span className="hidden md:inline text-[10px]">Archive</span>
              </Button>
            </div>
          </div>

        {checklistExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5 px-6 pb-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="text-[11px] h-8 flex-1 sm:flex-none border border-white/5 hover:bg-white/5" onClick={() => {
                  const allExpanded = checklistSteps.length > 0 && checklistSteps.every(s => expandedHelp[s.id]);
                  const next = allExpanded ? {} : checklistSteps.reduce((acc, s) => ({ ...acc, [s.id]: true }), {} as Record<string, boolean>);
                  setExpandedHelp(next);
                }}>
                  {checklistSteps.length > 0 && checklistSteps.every(s => expandedHelp[s.id]) ? <span className="flex items-center gap-1"><ChevronUp className="h-4 w-4" /> Collapse</span> : <span className="flex items-center gap-1"><ChevronDown className="h-4 w-4" /> Expand</span>}
                </Button>
                <Button variant="outline" size="sm" className="text-[11px] h-8 flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-lg" onClick={generateColorfulChecklistPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Checklist PDF
                </Button>
                <Button variant="outline" size="sm" className="text-[11px] h-8 flex-1 sm:flex-none bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" onClick={() => {
                  const now = Date.now();
                  const anyUnchecked = checklistSteps.some(s => !s.checked);
                  const targetState = anyUnchecked;

                  setChecklistSteps(prev => prev.map(s => ({ ...s, checked: targetState })));

                  if (targetState) {
                    const unchecked = checklistSteps.filter(s => !s.checked);
                    if (unchecked.length > 0) {
                      setItemDurations(prev => {
                        const next = { ...prev };
                        unchecked.forEach(s => {
                          if (!next[s.id] || next[s.id] === 0) {
                            next[s.id] = getAvgTime(s.name);
                          }
                        });
                        return next;
                      });
                    }
                    if (jobStartTime) setLastActionTime(now);
                  }
                }}>
                  {checklistSteps.length > 0 && checklistSteps.every(s => s.checked) ? 'Uncheck All' : 'Check All'}
                </Button>
                <Button variant="outline" size="sm" className="text-[11px] h-8 flex-1 sm:flex-none bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" onClick={() => {
                  setItemDurations(prev => {
                    const next = { ...prev };
                    checklistSteps.forEach(s => {
                      if (!next[s.id] || next[s.id] === 0) {
                        next[s.id] = getAvgTime(s.name);
                      }
                    });
                    return next;
                  });
                  toast({ title: 'Times Prefilled', description: 'Average durations applied to empty steps.' });
                }}>
                  <Clock className="h-4 w-4 mr-2" />
                  Prefill Avg Times
                </Button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-zinc-500 uppercase font-black">Progress</span>
                  <span className="text-sm font-black text-white">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2 w-20 md:w-32 bg-zinc-800" />
              </div>
            </div>

            <div className="p-3 md:p-6">
              {selectedPackage && (
                <div className="space-y-6 pr-2">
                  {['preparation', 'exterior', 'interior', 'addons', 'final'].map((section, idx) => {
                    const steps = checklistSteps.filter(s => s.category === section);
                    if (steps.length === 0) return null;

                    const isCompleted = steps.every(s => s.checked);
                    const isExpanded = !collapsedSections[section];
                    const isActiveSection = (activeFlowStage === section);

                    return (
                      <div 
                        key={section} 
                        className={cn(
                          "space-y-3 transition-all duration-300 rounded-xl p-3 md:p-4",
                          isActiveSection 
                            ? "border border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                            : isCompleted 
                              ? "border border-emerald-500/20 bg-emerald-500/5" 
                              : "border border-transparent"
                        )}
                      >
                        <button
                          type="button"
                          className="w-full text-left text-xl font-semibold mb-2 flex items-center justify-between group"
                          onClick={() => {
                            setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
                            advanceGuidedFlowToStage(section);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-wrap">
                            <span className={`transition-colors truncate ${isCompleted ? 'text-green-500' : isActiveSection ? 'text-amber-400 font-bold' : 'group-hover:text-primary'}`}>
                              {section === 'final' ? 'Final Inspection' : section === 'addons' ? 'Add-On Services' : section.charAt(0).toUpperCase() + section.slice(1)}
                            </span>
                            {isCompleted ? (
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                <Check className="w-3 h-3 text-emerald-400" /> Complete
                              </span>
                            ) : isActiveSection ? (
                              <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" /> Current Section
                              </span>
                            ) : null}
                            {section !== 'preparation' && jobStartTime && (
                              <div className="flex items-center gap-2">
                                {editingSectionId === section ? (
                                  <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                          <Clock className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300 w-48">
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "2:00")}>2 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "10:00")}>10 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "15:00")}>15 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "20:00")}>20 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "30:00")}>30 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "45:00")}>45 min</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "1:00:00")}>1 hour</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "1:30:00")}>1.5 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "2:00:00")}>2 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "2:30:00")}>2.5 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "3:00:00")}>3 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "3:30:00")}>3.5 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "4:00:00")}>4 hours</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white" onClick={() => handleSaveSectionActualTime(section, "4:30:00")}>4.5 hours</DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-zinc-800" />
                                        <DropdownMenuItem className="text-xs font-bold text-blue-400">Custom (Use Input)</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Input 
                                      value={editSectionValue}
                                      onChange={(e) => setEditSectionValue(e.target.value)}
                                      className="h-7 w-20 bg-white text-black text-[10px] font-bold text-center border-2 border-zinc-300"
                                      placeholder="mm:ss"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSectionActualTime(section);
                                        if (e.key === 'Escape') setEditingSectionId(null);
                                      }}
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                                      onClick={() => handleSaveSectionActualTime(section)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className="text-xs md:text-sm font-bold font-mono bg-white text-black px-2 py-0.5 rounded border-2 border-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.3)] cursor-pointer hover:scale-105 transition-transform"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(section);
                                      const totalSecs = Math.floor(steps.filter(s => s.checked).reduce((acc, s) => acc + (itemDurations[s.id] || 0), 0) / 1000);
                                      const m = Math.floor(totalSecs / 60);
                                      const s = totalSecs % 60;
                                      setEditSectionValue(`${m}:${s.toString().padStart(2, '0')}`);
                                    }}
                                    title="Click to edit actual elapsed time for this section"
                                  >
                                    {formatDuration(
                                      steps
                                        .filter(s => s.checked)
                                        .reduce((acc, s) => acc + (itemDurations[s.id] || 0), 0)
                                    )}
                                  </span>
                                )}
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] uppercase font-black text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckAllSection(section);
                              }}
                            >
                              {checklistSteps.filter(s => s.category === section).every(s => s.checked) ? 'Uncheck All' : 'Check All'}
                            </Button>
                            <div className="flex items-center gap-2 ml-auto mr-4" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <Input 
                                  type="text"
                                  value={sectionDurations[section] !== undefined ? sectionDurations[section] : Math.floor(steps.reduce((acc, s) => acc + getAvgTime(s.name), 0) / 60000)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow typing numbers/colons/h without immediate parsing which breaks flow
                                    setSectionDurations(prev => ({ ...prev, [section]: val as any }));
                                  }}
                                  onBlur={(e) => {
                                    const mins = parseTimeToMinutes(e.target.value);
                                    setSectionDurations(prev => ({ ...prev, [section]: mins }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const mins = parseTimeToMinutes((e.target as HTMLInputElement).value);
                                      setSectionDurations(prev => ({ ...prev, [section]: mins }));
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="h-7 w-14 bg-zinc-900 border-zinc-700 text-[10px] text-center font-bold text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 pr-1 pl-1"
                                />
                                <div className="absolute -top-3 left-0 right-0 text-center">
                                  <span className="text-[7px] text-zinc-500 uppercase font-black tracking-tighter">Time</span>
                                </div>
                              </div>
                              <span className="text-[8px] text-zinc-500 uppercase font-black">mins</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                        </button>

                        {isExpanded && (
                          <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
                            {steps.map((step) => {
                              const sopItem = getSOPItemForStep(step.id, step.name);
                              const instructionText = sopItem ? sopItem.detailedInstructions : (step.instructions || getServiceInstructions(step.name, step.id));
                              return (
                                <div key={step.id} id={`step-${step.id}`} className="border-b border-border/40 last:border-0 hover:bg-zinc-900/50 rounded-lg transition-colors">
                                  <div className="flex items-center justify-between py-2 gap-2">
                                    <label className="flex items-center gap-3 text-sm flex-1 py-1 group/item cursor-pointer min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={step.checked}
                                        onChange={(e) => {
                                          handleToggleStep(step.id, e.target.checked);
                                          advanceGuidedFlowToStage(step.category);
                                        }}
                                        className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-red-600 focus:ring-offset-0 cursor-pointer"
                                      />
                                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        {editingStepNameId === step.id ? (
                                          <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-1">
                                            <Input 
                                              value={editStepNameText}
                                              onChange={(e) => setEditStepNameText(e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="h-8 bg-black text-white border-blue-500/50 flex-1 text-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveStepName(step.id);
                                                if (e.key === 'Escape') setEditingStepNameId(null);
                                              }}
                                            />
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); handleSaveStepName(step.id); }}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setEditingStepNameId(null); }}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <span 
                                            className={`whitespace-normal break-words flex-1 py-1 ${step.checked ? "text-muted-foreground line-through decoration-red-500/50" : "text-foreground font-medium"}`}
                                            onClick={(e) => {
                                              if (isAdminEditMode) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditingStepNameId(step.id);
                                                setEditStepNameText(step.name);
                                              }
                                            }}
                                          >
                                            {step.name}
                                            {isAdminEditMode && <FileText className="inline h-3 w-3 ml-2 text-blue-500 opacity-50 group-hover/item:opacity-100 transition-opacity" />}
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                    
                                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                      {/* Integrated Master SOP Tooltip */}
                                      <SOPTooltip sopIdOrCode={sopItem?.id || step.id} title={step.name} variant="icon" />
                                      {(itemDurations[step.id] !== undefined || step.checked || editingDurationId === step.id) ? (
                                        editingDurationId === step.id ? (
                                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] bg-black border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                                                  Presets
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 30000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>30 sec</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 60000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>1 min</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 300000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>5 min</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 600000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>10 min</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 900000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>15 min</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 1200000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>20 mins</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white" onClick={() => {
                                                  const ms = 1800000;
                                                  setItemDurations(prev => ({ ...prev, [step.id]: ms }));
                                                  setEditingDurationId(null);
                                                }}>30 mins</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuItem className="text-xs font-bold text-blue-400 focus:text-blue-300">Custom (Below)</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Input
                                              value={editDurationValue}
                                              onChange={(e) => setEditDurationValue(e.target.value)}
                                              className="h-6 w-16 bg-black text-[10px] px-1 border-yellow-500/50 text-white font-mono"
                                              placeholder="mm:ss"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveItemDuration(step.id);
                                                if (e.key === 'Escape') setEditingDurationId(null);
                                              }}
                                            />
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-6 w-6 p-0 text-green-500 hover:bg-green-500/10"
                                              onClick={() => handleSaveItemDuration(step.id)}
                                            >
                                              <Check className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <span 
                                            className={`text-[10px] md:text-[11px] text-black font-black font-mono shrink-0 whitespace-nowrap bg-yellow-400 px-2 py-0.5 rounded shadow-sm border border-yellow-600 animate-in fade-in zoom-in-95 duration-300 ${getCurrentUser()?.role === 'admin' ? 'cursor-pointer hover:bg-yellow-300 hover:scale-105 transition-all' : ''}`}
                                            onClick={() => {
                                              if (getCurrentUser()?.role === 'admin') {
                                                setEditingDurationId(step.id);
                                                const totalSecs = Math.floor((itemDurations[step.id] || 0) / 1000);
                                                const m = Math.floor(totalSecs / 60);
                                                const s = totalSecs % 60;
                                                setEditDurationValue(`${m}:${s.toString().padStart(2, '0')}`);
                                              }
                                            }}
                                            title={getCurrentUser()?.role === 'admin' ? "Click to edit duration" : ""}
                                          >
                                            {formatDuration(itemDurations[step.id])}
                                          </span>
                                        )
                                      ) : null}

                                      {isAdminEditMode && !step.id.startsWith('addon-') && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full shrink-0"
                                          onClick={() => handleDeleteStep(step.id)}
                                          title="Remove Step"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                      
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
                                        size="icon"
                                        className="h-8 w-8 text-zinc-400 active:text-purple-400 active:bg-purple-900/20 rounded-md shrink-0 border border-transparent border-zinc-800/30"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleOpenChemicals(step.id, step.name);
                                        }}
                                        title="Chemical Reference"
                                      >
                                        <FlaskConical className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {expandedHelp[step.id] && (
                                    <div className="pb-3 pl-8 sm:pl-10 text-sm text-zinc-300 animate-in slide-in-from-top-2 fade-in duration-200">
                                      <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
                                        <div className="flex items-start gap-2">
                                          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                          <div className="flex flex-col gap-2 flex-1">
                                            {editingStepId === step.id ? (
                                              <div className="space-y-2 animate-in fade-in">
                                                <Textarea 
                                                  value={editInstructionText}
                                                  onChange={(e) => setEditInstructionText(e.target.value)}
                                                  className="min-h-[150px] bg-black text-white border-primary/50 text-sm leading-relaxed"
                                                  placeholder="Enter custom process details..."
                                                />
                                                <div className="flex gap-2">
                                                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => handleSaveInstruction(step.id, step.name)}>
                                                    <Save className="h-3 w-3 mr-1" /> Save Process
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => setEditingStepId(null)}>
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="leading-relaxed space-y-1">
                                                {sopItem?.shortSummary && (
                                                  <p className="text-xs text-zinc-400 italic mb-2">"{sopItem.shortSummary}"</p>
                                                )}
                                                {instructionText.split('. ').map((sentence, idx) => {
                                                  const parts = sentence.split(': ');
                                                  if (parts.length > 1 && ['Chemical', 'Alternative', 'Dwell Time', 'Application', 'Application Tip', 'Precautions'].some(k => parts[0].includes(k))) {
                                                    return (
                                                      <div key={idx} className="flex flex-col sm:flex-row sm:gap-2">
                                                        <span className="font-bold text-primary shrink-0">{parts[0]}:</span>
                                                        <span>{parts[1]}</span>
                                                      </div>
                                                    );
                                                  }
                                                  return <p key={idx}>{sentence}{idx < instructionText.split('. ').length - 1 ? '.' : ''}</p>;
                                                })}
                                                {sopItem?.ricksTips && (
                                                  <div className="mt-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                                                    <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                      <span className="font-extrabold uppercase text-amber-400 text-[10px] block mb-0.5">Rick's Pro Tip:</span>
                                                      {sopItem.ricksTips}
                                                    </div>
                                                  </div>
                                                )}
                                                {sopItem?.dilutionRatio && sopItem.dilutionRatio !== 'N/A' && (
                                                  <div className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                                                    <Beaker className="h-3.5 w-3.5" />
                                                    <span>Ratio: {sopItem.dilutionRatio}</span>
                                                  </div>
                                                )}
                                                {sopItem?.tools && sopItem.tools.length > 0 && (
                                                  <div className="text-xs text-blue-400 font-semibold mt-1 flex items-center gap-1">
                                                    <Wrench className="h-3.5 w-3.5" />
                                                    <span>Tools: {sopItem.tools.join(', ')}</span>
                                                  </div>
                                                )}
                                                {getCurrentUser()?.role === 'admin' && (
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="mt-2 text-[10px] text-zinc-500 hover:text-primary h-6 px-2 gap-1.5 border border-zinc-800/50 shrink-0"
                                                    onClick={() => {
                                                      setEditingStepId(step.id);
                                                      setEditInstructionText(instructionText);
                                                    }}
                                                  >
                                                    <FileText className="h-3 w-3" /> Edit Process
                                                  </Button>
                                                )}
                                              </div>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-zinc-800/60">
                                              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                <span>🧪</span> Chemicals for this step
                                              </p>
                                              {chemicalsList.length === 0 ? (
                                                <p className="text-[11px] text-zinc-600 italic">No chemicals in inventory yet.</p>
                                              ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                  {chemicalsList.map((chem: any) => {
                                                    const isSelected = (step.stepChemicals || []).includes(chem.id);
                                                    return (
                                                      <button
                                                        key={chem.id}
                                                        type="button"
                                                        onClick={() => {
                                                          setChecklistSteps(prev => prev.map(s => {
                                                            if (s.id !== step.id) return s;
                                                            const current = s.stepChemicals || [];
                                                            const next = isSelected
                                                              ? current.filter(id => id !== chem.id)
                                                              : [...current, chem.id];
                                                            return { ...s, stepChemicals: next };
                                                          }));
                                                        }}
                                                        title={chem.dilution ? `Dilution: ${chem.dilution}` : chem.name}
                                                        className={`inline-flex flex-col items-start px-2 py-1 rounded text-[10px] border transition-all cursor-pointer ${
                                                          isSelected
                                                            ? 'bg-primary/20 border-primary text-primary'
                                                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                                                        }`}
                                                      >
                                                        <span className="font-semibold leading-tight">{chem.name}</span>
                                                        {chem.dilution && (
                                                          <span className="text-[9px] opacity-70 leading-tight">Dilution: {chem.dilution}</span>
                                                        )}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {(() => {
                                                const addKey = `adding_chem_${step.id}`;
                                                const isAdding = !!(window as any)[addKey];
                                                return isAdding ? (
                                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                                    <Input
                                                      id={`new-chem-name-${step.id}`}
                                                      placeholder="Chemical name"
                                                      className="h-6 text-[10px] bg-zinc-900 border-zinc-700 text-white w-32 px-2"
                                                      autoFocus
                                                    />
                                                    <Input
                                                      id={`new-chem-dilution-${step.id}`}
                                                      placeholder="Dilution (e.g. 4:1)"
                                                      className="h-6 text-[10px] bg-zinc-900 border-zinc-700 text-white w-28 px-2"
                                                    />
                                                    <button
                                                      type="button"
                                                      className="h-6 px-2 text-[10px] bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors"
                                                      onClick={async () => {
                                                        const nameEl = document.getElementById(`new-chem-name-${step.id}`) as HTMLInputElement;
                                                        const dilEl = document.getElementById(`new-chem-dilution-${step.id}`) as HTMLInputElement;
                                                        const name = nameEl?.value?.trim();
                                                        if (!name) return;
                                                        const newChem = { id: `chem-${Date.now()}`, name, dilution: dilEl?.value?.trim() || '' };
                                                        try {
                                                          await api('/api/inventory/chemicals', { method: 'POST', body: JSON.stringify(newChem) });
                                                        } catch { /* save best-effort */ }
                                                        setChemicalsList((prev: any[]) => [...prev, newChem]);
                                                        setChecklistSteps(prev => prev.map(s => {
                                                          if (s.id !== step.id) return s;
                                                          return { ...s, stepChemicals: [...(s.stepChemicals || []), newChem.id] };
                                                        }));
                                                        (window as any)[addKey] = false;
                                                        setExpandedHelp(prev => ({ ...prev }));
                                                      }}
                                                    >Save</button>
                                                    <button
                                                      type="button"
                                                      className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white rounded border border-zinc-700 transition-colors"
                                                      onClick={() => { (window as any)[addKey] = false; setExpandedHelp(prev => ({ ...prev })); }}
                                                    >Cancel</button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-primary transition-colors cursor-pointer"
                                                    onClick={() => { (window as any)[addKey] = true; setExpandedHelp(prev => ({ ...prev })); }}
                                                  >
                                                    <Plus className="h-3 w-3" /> Add new chemical
                                                  </button>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {isAdminEditMode && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleAddStep(section as ChecklistStep['category'])}
                                className="w-full justify-start text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 border border-dashed border-zinc-800 mt-2 h-9 group"
                              >
                                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                                Add {section === 'final' ? 'Inspection' : section} Step
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(!selectedPackage || !vehicleType || vehicleType === 'choose') && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 animate-in fade-in duration-500">
                  <ClipboardList className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a package and vehicle type above</p>
                  <p className="text-sm">to load the Prime Standard checklist for this job.</p>
                </div>
              )}
            </div>

            {/* Toast Position Override for Checklist Page */}
            <style dangerouslySetInnerHTML={{ __html: `
              [data-radix-toast-viewport] {
                top: 0 !important;
                bottom: auto !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                flex-direction: column-reverse !important;
                padding: 1rem !important;
                width: 100% !important;
                max-width: 420px !important;
              }
              .fixed.top-0.z-\\[100\\] {
                top: 0 !important;
              }
            `}} />
          </div>
        )}
      </Card>

      {/* Materials Used */}
      <Card className={cn(
        "p-3 md:p-6 bg-gradient-card space-y-6 transition-all duration-300 rounded-xl",
        activeFlowStage === 'materials' 
          ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
          : "border-border"
      )}>
        <div 
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => {
            setMaterialsSectionExpanded(!materialsSectionExpanded);
            advanceGuidedFlowToStage('materials');
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white pb-1 border-b-2 border-red-600">Materials Used</h2>
            {activeFlowStage === 'materials' && (
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" /> Current Section
              </span>
            )}
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
          <Card 
            className={cn(
              "p-6 bg-gradient-card transition-all duration-300 rounded-xl",
              activeFlowStage === 'totals-payment' 
                ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                : "border-border"
            )}
            onClick={() => advanceGuidedFlowToStage('totals-payment')}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">Totals & Payment</h2>
                {activeFlowStage === 'totals-payment' && (
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" /> Current Section
                  </span>
                )}
              </div>
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
                <div className="space-y-4">
                  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Apply Discount</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Select value={discountMethod} onValueChange={(val: 'coupon' | 'custom') => {
                      setDiscountMethod(val);
                      if (val === 'coupon') {
                        const first = coupons.find(c => c.active)?.code || '';
                        setDiscountCode(first);
                        const matched = coupons.find(c => c.code === first);
                        if (matched) {
                          setDiscountType(matched.percent ? 'percent' : 'dollar');
                          setDiscountValue(String(matched.percent || matched.amount || 0));
                        }
                      } else {
                        setDiscountCode('');
                        setDiscountType('dollar');
                        setDiscountValue('');
                      }
                    }}>
                      <SelectTrigger className="col-span-2 sm:col-span-1 bg-zinc-900 border-zinc-800 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coupon">Coupon Code</SelectItem>
                        <SelectItem value="custom">Manual Amount</SelectItem>
                      </SelectContent>
                    </Select>

                    {discountMethod === 'coupon' ? (
                      <div className="col-span-2 sm:col-span-4 flex flex-col gap-2">
                        <Select
                          value={(discountCode && coupons.some(c => c.code === discountCode)) ? discountCode : (discountCode ? 'CUSTOM_CODE' : '')}
                          onValueChange={(val) => {
                            if (val === 'CUSTOM_CODE') {
                              setDiscountCode('CUSTOM');
                              setDiscountType('dollar');
                              setDiscountValue('');
                            } else {
                              setDiscountCode(val);
                              const matched = coupons.find(c => c.code === val);
                              if (matched) {
                                setDiscountType(matched.percent ? 'percent' : 'dollar');
                                setDiscountValue(String(matched.percent || matched.amount || 0));
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-xs">
                            <SelectValue placeholder="Select Coupon..." />
                          </SelectTrigger>
                          <SelectContent>
                            {coupons.filter(c => c.active).map(c => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} ({c.percent ? `${c.percent}% Off` : `$${c.amount} Off`})
                              </SelectItem>
                            ))}
                            <SelectItem value="CUSTOM_CODE" className="text-zinc-500 italic">Enter Custom Code...</SelectItem>
                          </SelectContent>
                        </Select>
                        {((discountCode && !coupons.some(c => c.code === discountCode)) || discountCode === 'CUSTOM') && (
                          <Input
                            type="text"
                            placeholder="Enter Custom Code..."
                            value={discountCode === 'CUSTOM' ? '' : discountCode}
                            onChange={(e) => {
                              const codeVal = e.target.value.toUpperCase();
                              setDiscountCode(codeVal);
                              const matched = coupons.find(c => c.code === codeVal);
                              if (matched) {
                                setDiscountType(matched.percent ? 'percent' : 'dollar');
                                setDiscountValue(String(matched.percent || matched.amount || 0));
                              } else {
                                setDiscountType('dollar');
                                setDiscountValue('');
                              }
                            }}
                            className="h-9 bg-zinc-900 border-zinc-800 text-zinc-200 uppercase text-xs"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="col-span-2 sm:col-span-4 flex gap-2">
                        <Select value={discountType} onValueChange={(val: 'percent' | 'dollar') => setDiscountType(val)}>
                          <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-800 h-9 text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent (%)</SelectItem>
                            <SelectItem value="dollar">Dollar ($)</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="relative flex-1">
                          {discountType === 'dollar' && <span className="absolute left-3 top-2 text-zinc-500 text-xs">$</span>}
                          <Input
                            type="number"
                            placeholder={discountType === 'percent' ? "e.g. 10" : "e.g. 25"}
                            className={`h-9 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs ${discountType === 'dollar' ? 'pl-7' : ''}`}
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                          />
                          {discountType === 'percent' && <span className="absolute right-3 top-2 text-zinc-500 text-xs">%</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {customerAddress && !params.get('destinationFee') && (
              <div className="mb-4">
                <DestinationFeeInline 
                  address={customerAddress} 
                  mode="booking" 
                  theme="dark"
                  onFeeCalculated={(m, fee) => {
                    // Only auto-apply if it hasn't been set manually yet
                    if (destinationFee === 0 && fee > 0) {
                      setDestinationFee(fee);
                      toast({ title: "Destination Fee Added", description: `Automatically added $${fee} based on customer address.` });
                    }
                  }} 
                />
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
                <span className="font-mono text-zinc-200">${Math.round(calculateSubtotal())}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-${Math.round(calculateDiscount())}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl border-t border-zinc-800 pt-4 mt-2">
                <span className="font-bold text-white">Total Due:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ${(() => {
                     const t = calculateTotal();
                     try { 
                       localStorage.setItem('recent_service_amount', Math.round(t).toString()); 
                       localStorage.setItem('recent_service_job_id', checklistId || '');
                       localStorage.setItem('recent_service_time', getAdjustedTime());
                       localStorage.setItem('recent_service_timestamp', Date.now().toString());
                     } catch(e) {}
                     return Math.round(t);
                  })()}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions & Completion */}
          <div className="flex flex-col gap-6" onClick={() => advanceGuidedFlowToStage('finish-job')}>
            <Card className={cn(
              "p-4 md:p-6 bg-gradient-card space-y-6 transition-all duration-300 rounded-xl",
              activeFlowStage === 'finish-job' 
                ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                : "border-border"
            )}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Final Steps</h2>
                  {activeFlowStage === 'finish-job' && (
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" /> Ready To Complete
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-help', { 
                        detail: { topicId: 'checklist-final-steps', role: getCurrentUser()?.role } 
                      }));
                    }}
                    title="How Finishing Works"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {/* Save button relocated to sticky header */}
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
                  disabled={isJobCompleted}
                  className={cn(
                    "md:col-span-2 text-white font-black italic h-12 text-lg transition-all",
                    isJobCompleted 
                      ? "bg-emerald-600/50 cursor-not-allowed opacity-50" 
                      : activeFlowStage === 'finish-job'
                        ? "bg-purple-600 hover:bg-purple-700 border-2 border-amber-400 animate-pulse ring-4 ring-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                        : "bg-purple-600 hover:bg-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                  )}
                >
                  <CheckCircle2 className="h-5 w-5 mr-3" />
                  {isJobCompleted ? 'JOB FINISHED & LOCKED' : 'FINISH & COMPLETE JOB'}
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
              <h2 className="text-2xl font-bold text-foreground mb-4">Link to Customer</h2>
              {selectedCustomer ? (
                <div className="flex items-center gap-4 bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <div>
                    <p className="font-bold text-emerald-400">Job is actively linked to:</p>
                    <p className="text-white text-lg">{customers.find(c => c.id === selectedCustomer)?.name || "Selected Customer"}</p>
                  </div>
                </div>
              ) : (
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
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => linkJobToCustomer(String(c.id))}>Link Job</Button>
                          <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400 p-2" onClick={async () => {
                            if (confirm(`Are you sure you want to delete ${c.name}? This will remove them from your CRM permanently.`)) {
                              await api(`/api/customers/${c.id}`, { method: 'DELETE' });
                              setCustomers(prev => prev.filter(cust => cust.id !== c.id));
                              setCustomerSearchResults(prev => prev.filter(cust => cust.id !== c.id));
                              toast({ title: "Customer Deleted", description: "Record removed from CRM." });
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            )}
          </Card>
        )}

        {/* Service Checklist History - RELOCATED & IMPROVED */}
        {(customerHistory.length > 0 || sessionHistory.length > 0) && (
          <Card className="bg-gradient-card border-border overflow-visible relative mb-4 mt-8">
            <div 
              className="px-4 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-2 md:gap-4 cursor-pointer group bg-black/95 backdrop-blur-md transition-all rounded-t-xl"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-colors">
                  <HistoryIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-2xl font-bold text-white truncate">Service Checklist History</h2>
                    {historyOpen ? <ChevronUp className="h-5 w-5 text-zinc-600" /> : <ChevronDown className="h-5 w-5 text-zinc-600" />}
                  </div>
                  <p className="text-[10px] md:text-sm text-zinc-400">View past or active jobs for this customer</p>
                </div>
              </div>
            </div>
            
            {historyOpen && (
              <div className="p-4 bg-zinc-950/80 backdrop-blur-sm rounded-b-xl border-t border-white/5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {customerHistory.map((booking) => {
                  const bVehicle = typeof booking.vehicle_info === 'string' ? booking.vehicle_info : (booking.vehicle_info?.type || 'Unknown');
                  const bPackage = booking.service_package || booking.title || 'Custom Service';
                  const isDone = booking.status === 'done' || booking.status === 'completed';
                  return (
                  <div 
                    key={booking.id} 
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      checklistId === booking.id 
                        ? 'bg-blue-900/20 border-blue-500/50 shadow-md shadow-blue-900/20' 
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-800'
                    }`}
                    onClick={() => {
                      if (checklistId && checklistId !== booking.id) {
                        if (!confirm(`Switching will save your current progress but change your active checklist. Continue?`)) {
                          return;
                        }
                      }
                      const saved = localStorage.getItem(`${CHECKLIST_DRAFT_KEY}_${booking.id}`);
                      if (saved) {
                        const state = JSON.parse(saved);
                        setChecklistId(state.checklistId || booking.id);
                        setSelectedCustomer(state.selectedCustomer || booking.customer_id);
                        setSelectedPackage(state.selectedPackage || bPackage);
                        setVehicleType(state.vehicleType || (vehicleOptions.includes(bVehicle) ? bVehicle : 'choose'));
                        setSelectedAddOns(state.selectedAddOns || []);
                        setNotes(state.notes || "");
                        setJobStartTime(state.jobStartTime || null);
                        setIsTimerRunning(!!state.isTimerRunning);
                        setTotalElapsedMs(state.totalElapsedMs || 0);
                        setElapsedTime(state.elapsedTime || "00:00:00");
                        setItemDurations(state.itemDurations || {});
                        setSectionDurations(state.sectionDurations || {});
                        setChemRows(state.chemRows || []);
                        setMatRows(state.matRows || []);
                        setToolRows(state.toolRows || []);
                        if (state.checklistSteps) {
                          window.sessionStorage.setItem('pending_draft_steps', JSON.stringify(state.checklistSteps));
                        }
                        const services = [state.selectedPackage || bPackage, ...(state.selectedAddOns || [])].filter(Boolean);
                        setSelectedServices(services);
                      } else {
                        setChecklistId(booking.id);
                        setSelectedCustomer(booking.customer_id);
                        setSelectedPackage(bPackage);
                        setVehicleType(vehicleOptions.includes(bVehicle) ? bVehicle : 'choose');
                        setSelectedAddOns([]);
                        setNotes("");
                        setJobStartTime(null);
                        setIsTimerRunning(false);
                        setTotalElapsedMs(0);
                        setElapsedTime("00:00:00");
                        setItemDurations({});
                        setSectionDurations({});
                        setChemRows([]);
                        setMatRows([]);
                        setToolRows([]);
                        window.sessionStorage.removeItem('pending_draft_steps');
                        setSelectedServices([bPackage].filter(Boolean));
                      }
                      toast({ title: "Switched Job", description: `Opened record for ${booking.customer_name}.` });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base truncate text-white">{booking.customer_name || 'Unknown Customer'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tighter ${isDone ? 'bg-zinc-800 text-zinc-300' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                          {isDone ? '100% Complete' : 'Active'}
                        </span>
                        {checklistId === booking.id && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase font-black">
                            Currently Viewing
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                        <span className="text-white/90 font-medium flex items-center gap-1">
                          <Package className="h-3 w-3" /> {bPackage}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" /> {vehicleLabels[bVehicle] || bVehicle}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="h-3 w-3" /> {new Date(booking.date || booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 h-10 w-10 rounded-full hover:bg-blue-500/20 hover:text-blue-400 transition-all ml-2"
                        title="Load Job"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 h-10 w-10 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all ml-1"
                        title="Delete Job"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Delete this history item permanently? This cannot be undone.')) {
                            try {
                              await deleteSupabaseBooking(booking.id);
                              setCustomerHistory(prev => prev.filter(b => b.id !== booking.id));
                              toast({ title: "Deleted", description: "History item deleted." });
                            } catch(err) {
                              toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )})}
                
                {sessionHistory.length > 0 && (
                  <div className="mt-6">
                    {customerHistory.length > 0 && <div className="h-px bg-white/10 my-4" />}
                    <h3 className="text-zinc-400 font-bold px-2 text-xs uppercase tracking-wider mb-3">Session Recovery History</h3>
                    <div className="space-y-2">
                      {sessionHistory.map((session) => (
                        <div key={session.sessionId} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-800 transition-all gap-4">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-base truncate text-white">{session.customerName || 'Generic Customer'}</span>
                              <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">
                                {new Date(session.date).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                              <span className="text-white/90 font-medium flex items-center gap-1">
                                <Package className="h-3 w-3" /> {session.packageName || 'Service'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <User className="h-3 w-3" /> {employees.find(e => e.id === session.employeeAssigned)?.name || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                             <Button
                               size="sm"
                               variant="outline"
                               className="text-xs h-8 bg-black hover:bg-zinc-800 border-white/10"
                               onClick={() => setExpandedSession(session)}
                             >
                               <Info className="h-3 w-3 mr-1 text-blue-400" /> Details
                             </Button>
                             <Button 
                               size="sm" 
                               variant="outline"
                               className="text-xs h-8 bg-black hover:bg-zinc-800 border-white/10"
                               onClick={() => {
                                 if (checklistId && checklistId !== session.jobId) {
                                   if (!confirm('Switching will replace your current unsaved progress. Continue?')) return;
                                 }
                                 const state = session.state;
                                 setChecklistId(state.checklistId);
                                 setSelectedCustomer(state.selectedCustomer);
                                 setSelectedPackage(state.selectedPackage);
                                 setVehicleType(state.vehicleType || 'choose');
                                 setSelectedAddOns(state.selectedAddOns || []);
                                 setNotes(state.notes || "");
                                 setJobStartTime(state.jobStartTime || null);
                                 setIsTimerRunning(!!state.isTimerRunning);
                                 setTotalElapsedMs(state.totalElapsedMs || 0);
                                 setElapsedTime(state.elapsedTime || "00:00:00");
                                 setItemDurations(state.itemDurations || {});
                                 setSectionDurations(state.sectionDurations || {});
                                 setChemRows(state.chemRows || []);
                                 setMatRows(state.matRows || []);
                                 setToolRows(state.toolRows || []);
                                 if (state.checklistSteps) {
                                   window.sessionStorage.setItem('pending_draft_steps', JSON.stringify(state.checklistSteps));
                                 }
                                 const services = [state.selectedPackage, ...(state.selectedAddOns || [])].filter(Boolean);
                                 setSelectedServices(services);
                                 toast({ title: "Session Restored", description: `Restored progress for ${session.customerName}.` });
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }}
                             >
                               <RotateCcw className="h-3 w-3 mr-1" /> Restore
                             </Button>
                             <Button 
                               size="sm" 
                               variant="ghost" 
                               className="h-8 w-8 p-0 rounded-full hover:bg-orange-500/20 hover:text-orange-400"
                               title="Reset form - clears checklist for fresh start, keeps this history entry"
                               onClick={() => {
                                 if (confirm("Reset this session? This clears the checklist form for a fresh start. The history entry will remain.")) {
                                   resetForm();
                                   // @ts-ignore
                                   window.currentChecklistSessionId = null;
                                   toast({ title: "Form Reset", description: "Checklist cleared. History record kept." });
                                   window.scrollTo({ top: 0, behavior: "smooth" });
                                 }
                               }}
                             >
                               <RotateCcw className="h-4 w-4" />
                             </Button>
                             <Button 
                               size="sm" 
                               variant="ghost" 
                               className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 hover:text-red-400"
                               onClick={() => {
                                 if (!isAdminUser) {
                                   toast({ title: "Access Denied", description: "Only administrators can delete session history logs.", variant: "destructive" });
                                   return;
                                 }
                                 if (confirm("Are you sure you want to permanently delete this session log? This cannot be undone.")) {
                                   setSessionHistory(prev => {
                                     const newList = prev.filter(s => s.sessionId !== session.sessionId);
                                     localStorage.setItem('checklist_sessions', JSON.stringify(newList));
                                     return newList;
                                   });
                                   toast({ title: "Session Deleted", description: "The session log has been removed." });
                                 }
                               }}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}


          <CustomerModal
            open={customerModalOpen}
            onOpenChange={setCustomerModalOpen}
            onSave={async (saved) => {
              const list = await getUnifiedCustomers();
              setCustomers(list as CustomerType[]);
              setSelectedCustomer((saved as any).id);
            }}
          />

          <RicksTipsModal open={tipsOpen} onOpenChange={setTipsOpen} />
          
          {/* Bottom Spacer to prevent floating bar overlap */}
          <div className="h-32 md:h-24" aria-hidden="true" />
        </div>
      </main>
      <AlertDialog open={!!pendingNavDest} onOpenChange={(open) => { if (!open) setPendingNavDest(null); }}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Unsaved Checklist Progress</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You are about to leave the checklist with unsaved progress. Would you like to save it to your history before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavDest(null)} className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { 
               // Fully clear the form so the user doesn't see stale data on return
               resetForm();
               setHasUnsavedChanges(false);
               setPendingNavDest(null);
               // @ts-ignore
               window.hasUnsavedChecklistChanges = false;
               // @ts-ignore
               window.currentChecklistSessionId = null;
               if (pendingNavDest) navigate(pendingNavDest);
            }}>Discard & Leave</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={() => {
               saveCurrentSession();
               setHasUnsavedChanges(false);
               // @ts-ignore
               window.hasUnsavedChecklistChanges = false;
               if (pendingNavDest) navigate(pendingNavDest);
            }}>Save & Leave</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ChemicalStepModal
        open={chemModalOpen}
        onOpenChange={setChemModalOpen}
        stepId={currentStepId}
        stepName={currentStepName}
        isAdmin={getCurrentUser()?.role === 'admin' || getCurrentUser()?.role === 'owner'}
      />
      <Dialog open={!!expandedSession} onOpenChange={(o) => { if (!o) setExpandedSession(null); }}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 shadow-2xl max-w-md">
          {expandedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                  <HistoryIcon className="text-purple-500 w-5 h-5" />
                  Session Details
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Saved on {new Date(expandedSession.date).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 my-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Customer</span>
                     <span className="font-bold text-white text-sm">{expandedSession.customerName || 'Generic'}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Package</span>
                     <span className="font-bold text-emerald-400 text-sm line-clamp-2 leading-tight">{expandedSession.packageName || 'Service'}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Vehicle</span>
                     <span className="font-bold text-white text-sm capitalize">{expandedSession.state?.vehicleType || 'Not specified'}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Service Type</span>
                     <span className={cn("font-black text-sm", (expandedSession.state?.destinationFee > 0) ? "text-amber-400" : "text-blue-400")}>
                       {expandedSession.state?.destinationFee > 0 ? "Mobile Detailing" : "Shop Location"}
                     </span>
                  </div>
                </div>

                {(expandedSession.state?.selectedAddOns?.length > 0) && (
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Add-Ons Included</span>
                    <div className="flex flex-wrap gap-2">
                      {expandedSession.state.selectedAddOns.map((id: string) => {
                         const all = [...addOns, ...getCustomAddOns()];
                         const name = all.find(a => a.id === id)?.name || id;
                         return <Badge key={id} className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold">{name}</Badge>;
                      })}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block">Time Elapsed</span>
                     <span className="font-mono font-bold text-white text-sm">{expandedSession.state?.elapsedTime || "00:00:00"}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                     <span className="text-[10px] uppercase font-bold text-zinc-500 block">Notes Included</span>
                     <span className="font-bold text-zinc-300 text-sm">{(expandedSession.state?.notes?.length > 0) ? "Yes" : "None"}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                 <Button variant="outline" onClick={() => setExpandedSession(null)} className="border-zinc-700 text-zinc-300 hover:text-white">Close</Button>
                 <Button className="bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-900/40" onClick={() => {
                    const state = expandedSession.state;
                    setChecklistId(state.checklistId);
                    setSelectedCustomer(state.selectedCustomer);
                    setSelectedPackage(state.selectedPackage);
                    setVehicleType(state.vehicleType || 'choose');
                    setSelectedAddOns(state.selectedAddOns || []);
                    setNotes(state.notes || "");
                    setJobStartTime(state.jobStartTime || null);
                    setIsTimerRunning(!!state.isTimerRunning);
                    setTotalElapsedMs(state.totalElapsedMs || 0);
                    setElapsedTime(state.elapsedTime || "00:00:00");
                    setItemDurations(state.itemDurations || {});
                    setSectionDurations(state.sectionDurations || {});
                    setChemRows(state.chemRows || []);
                    setMatRows(state.matRows || []);
                    setToolRows(state.toolRows || []);
                    if (state.checklistSteps) {
                      window.sessionStorage.setItem('pending_draft_steps', JSON.stringify(state.checklistSteps));
                    }
                    const services = [state.selectedPackage, ...(state.selectedAddOns || [])].filter(Boolean);
                    setSelectedServices(services);
                    toast({ title: "Session Restored", description: `Restored progress for ${expandedSession.customerName}.` });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setExpandedSession(null);
                    setHistoryOpen(false);
                 }}>
                   <RotateCcw className="w-4 h-4 mr-2" /> Restore Session
                 </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
          finalTime={getAdjustedTime()}
          onCashPayment={async (tip) => {
            try {
              toast({ title: 'Cash Payment Recorded', description: `Recorded cash payment including $${tip.toFixed(2)} tip. Job Complete!` });
              if (selectedCustomer) {
                const cust = customers.find(c => c.id === selectedCustomer);
                if (cust) {
                  import('@/lib/supa-data').then(m => m.upsertSupabaseCustomer({
                    id: cust.id,
                    name: cust.name,
                    email: cust.email,
                    phone: cust.phone,
                    address: cust.address,
                    updated_at: new Date().toISOString()
                  })).catch(e => console.warn("Customer timestamp update failed:", e));
                }
              }
              window.dispatchEvent(new Event('bookings-updated'));
              window.dispatchEvent(new CustomEvent('quick-pay-completed', {
                detail: { totalPaid: calculateTotal() + tip, paymentMethod: 'Cash' }
              }));
            } catch (err) {
              console.error("Error processing cash payment:", err);
            } finally {
              setShowTipScreen(false);
              setShowPostPaymentPopup(true);
            }
          }}
        />
      )}

      {/* Post-Payment Next Steps Reminder Modal */}
      <Dialog open={showPostPaymentPopup} onOpenChange={setShowPostPaymentPopup}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 shadow-2xl max-w-lg p-6 sm:p-8 rounded-3xl">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Job & Payment Complete!
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                  Payment recorded via Quick Pay. Follow these next steps on the Invoices page to finalize customer records:
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 my-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="h-7 w-7 rounded-xl bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                1
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Review & Verify Invoice Details</h4>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Open the auto-generated invoice on the <b>Invoices</b> page to double-check vehicle info, line items, labor timer hours, and discounts.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                2
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Confirm Paid Status & Receipt</h4>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Verify the invoice payment status is marked as <b>Paid</b> and download or print the official PDF receipt.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30">
                3
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Send Invoice to Customer</h4>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Send the finalized PDF invoice to the customer via Email or shareable link to complete job documentation.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowPostPaymentPopup(false)}
              className="w-full sm:w-auto border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl h-11 text-xs font-bold"
            >
              Stay on Checklist
            </Button>
            <Button
              onClick={() => {
                setHasUnsavedChanges(false);
                // @ts-ignore
                window.hasUnsavedChecklistChanges = false;
                // @ts-ignore
                window.currentChecklistSessionId = null;
                setPendingNavDest(null);
                setShowPostPaymentPopup(false);
                navigate('/invoicing');
              }}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Go to Invoices Page
              <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Floating Timer Bar - Always Onscreen (Relocated and refactored for perfect centering on mobile) */}
      {selectedPackage && (
        <div className="fixed bottom-4 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-full px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-1.5 sm:gap-3 border-r border-white/10 pr-3 sm:pr-6">
                <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${isTimerRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                <div className="flex flex-col">
                  <span className="text-[7px] sm:text-[10px] text-zinc-500 uppercase tracking-tight sm:tracking-widest font-bold">Time</span>
                  <span className="text-base sm:text-2xl font-mono font-bold text-white tracking-tighter leading-none">{elapsedTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {!isTimerRunning ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button 
                      onClick={handleStartTimer} 
                      className="bg-green-600 hover:bg-green-500 text-white rounded-full h-9 px-4 sm:px-6 font-bold shadow-lg shadow-green-900/20 text-xs sm:text-base"
                    >
                      <Play className="h-3.5 w-3.5 mr-1 sm:mr-2" /> 
                      {totalElapsedMs > 0 ? "Resume" : "Start"}
                    </Button>
                    
                    {totalElapsedMs > 0 && (
                      <Button 
                        onClick={handleResetTimer}
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full h-9 w-9 p-0"
                        title="Reset Timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={handleStopTimer} 
                    className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-full h-8 px-3 font-bold text-xs"
                  >
                    <Pause className="h-3 w-3 mr-1" /> Pause
                  </Button>
                )}
              </div>

              <div className="flex flex-col border-l border-white/10 pl-2">
                <span className="text-[7px] text-zinc-500 uppercase font-bold">Progress</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-lg font-bold text-white">{progressPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Floating Global Job Timer - Master Timer (Job Duration) */}
      {(masterIsRunning || masterElapsedTimeMs > 0) && !showTipScreen && (
        <div className="fixed top-[74px] right-2 md:right-4 z-[200] animate-in slide-in-from-right duration-500">
          <div className={`flex flex-col items-end gap-1 px-3 md:px-4 py-1.5 md:py-2 bg-zinc-950/90 border-2 shadow-xl rounded-2xl backdrop-blur-md ${jobEndTime ? 'border-green-500' : 'border-blue-600'}`}>
            <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest">Job Duration</span>
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 md:h-5 md:w-5 ${jobEndTime ? 'text-green-500' : 'text-blue-500'}`} />
              <span className={`text-sm md:text-2xl font-mono font-black ${jobEndTime ? 'text-green-500' : 'text-blue-400'}`}>
                {formatDuration((masterIsRunning ? (Date.now() - (masterStartTime || Date.now())) : 0) + masterElapsedTimeMs)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceChecklist;

