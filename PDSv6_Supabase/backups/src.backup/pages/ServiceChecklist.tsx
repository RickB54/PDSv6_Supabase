import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save, FileText, Info, Plus, Trash2, CheckCircle2 } from "lucide-react";
import localforage from "localforage";
import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { addEstimate, upsertCustomer, upsertInvoice, purgeTestCustomers, getInvoices } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CustomerModal, { Customer as CustomerType } from "@/components/customers/CustomerModal";
import { servicePackages, addOns, getServicePrice, getAddOnPrice, VehicleType as VehKey } from "@/lib/services";
import { getCustomPackages, getCustomAddOns, getPackageMeta, getAddOnMeta, buildFullSyncPayload } from "@/lib/servicesMeta";
import { Progress } from "@/components/ui/progress";
import MaterialsUsedModal from "@/components/checklist/MaterialsUsedModal";

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
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact','midsize','truck','luxury']);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [addOnsExpanded, setAddOnsExpanded] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "dollar">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [destinationFee, setDestinationFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // New generic job flow state
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [liveAddOns, setLiveAddOns] = useState<any[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [employeeAssigned, setEmployeeAssigned] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [checklistId, setChecklistId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerType[]>([]);
  const [vehicleTypeOther, setVehicleTypeOther] = useState<string>("");
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string,string>>({});

  const getKey = (type: 'package'|'addon', id: string, size: string) => `${type}:${id}:${size}`;

  // Resolve a vehicle "key" from either an existing key slug or a human label.
  // Always return one of the built-in keys for legacy pricing helpers.
  const toVehKey = (value: string): VehKey => {
    const builtIns: VehKey[] = ['compact','midsize','truck','luxury'];
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
        const res = await fetch(`http://localhost:6061/api/vehicle-types/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
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
            setVehicleOptions(opts.length ? opts : ['compact','midsize','truck','luxury']);
            if (!opts.includes(vehicleType)) setVehicleType(opts[0] || 'midsize');
          }
        }
      } catch {}
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
      } catch {}
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
  type ChecklistStep = { id: string; name: string; category: 'preparation' | 'exterior' | 'interior' | 'final'; checked: boolean };
  const [checklistSteps, setChecklistSteps] = useState<ChecklistStep[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Materials Used state
  type ChemItem = { id: string; name: string; threshold?: number; currentStock?: number };
  type MatItem = { id: string; name: string; lowThreshold?: number; quantity?: number };
  const [chemicalsList, setChemicalsList] = useState<ChemItem[]>([]);
  const [materialsList, setMaterialsList] = useState<MatItem[]>([]);
  type ChemRow = { chemicalId: string; fraction: '1/8'|'1/4'|'3/8'|'1/2'|'5/8'|'3/4'|'7/8'|'1'|''; notes?: string };
  type MatRow = { materialId: string; quantityNote: string };
  const [chemRows, setChemRows] = useState<ChemRow[]>([]);
  const [matRows, setMatRows] = useState<MatRow[]>([]);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);

const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      await purgeTestCustomers();
      const list = await getUnifiedCustomers();
      setCustomers(list as CustomerType[]);
      const prefill = params.get("customerId");
      if (prefill && list.find((c: any) => c.id === prefill)) {
        setSelectedCustomer(prefill);
      }
      // Load employees for assignment
      const emps = (await localforage.getItem('company-employees')) || [];
      try {
        const cur = getCurrentUser();
        const listWithAdmin = Array.isArray(emps) ? [...(emps as any[])] : [];
        if (cur && cur.role === 'admin') {
          const hasAdmin = listWithAdmin.some((e: any) => String(e.name || e.id).toLowerCase() === 'admin');
          if (!hasAdmin) {
            listWithAdmin.unshift({ id: 'Admin', name: 'Admin', email: cur.email, role: 'admin' });
          }
        }
        setEmployees(listWithAdmin as any[]);
      } catch {
        setEmployees(emps as any[]);
      }
      // Load live add-ons via API
      const live = await api('/api/addons/live', { method: 'GET' });
      setLiveAddOns(Array.isArray(live) ? live : []);
      // Preselect default employee if present
      const defaultEmp = ((Array.isArray(emps) ? emps : []) as any[])[0];
      if (defaultEmp) setEmployeeAssigned(String(defaultEmp.id || defaultEmp.name || ''));
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
      // Pre-check previous services from the latest invoice
      (async () => {
        const invs = await getInvoices();
        const custInvs = (invs as any[]).filter(inv => inv.customerId === selectedCustomer);
        custInvs.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        const last = custInvs[0];
        if (last?.services?.length) {
          const all = [...buildCoreServices(), ...buildAddOnServices(), { id: 'destination-fee', name: 'Destination Fee', kind: 'special' as const }];
          const ids = last.services
            .map((s: any) => all.find(x => x.name === s.name)?.id)
            .filter(Boolean) as string[];
          if (ids.length) setSelectedServices(ids);
        }
      })();
    }
  }, [selectedCustomer, customers]);

  // Load inventory lists for Materials Used selector (preferred split endpoints, fallback to /all)
  useEffect(() => {
    (async () => {
      try {
        const chems = await api('/api/inventory/chemicals', { method: 'GET' });
        const mats = await api('/api/inventory/materials', { method: 'GET' });
        setChemicalsList(Array.isArray(chems) ? chems as ChemItem[] : []);
        setMaterialsList(Array.isArray(mats) ? mats as MatItem[] : []);
        // Fallback if either is empty
        if ((Array.isArray(chems) && chems.length === 0) || (Array.isArray(mats) && mats.length === 0)) {
          const res = await api('/api/inventory/all', { method: 'GET' });
          const { chemicals = [], materials = [] } = (res as any) || {};
          if ((Array.isArray(chems) && chems.length === 0)) setChemicalsList(chemicals as ChemItem[]);
          if ((Array.isArray(mats) && mats.length === 0)) setMaterialsList(materials as MatItem[]);
        }
      } catch {
        try {
          const res = await api('/api/inventory/all', { method: 'GET' });
          const { chemicals = [], materials = [] } = (res as any) || {};
          setChemicalsList(chemicals as ChemItem[]);
          setMaterialsList(materials as MatItem[]);
        } catch {
          setChemicalsList([]);
          setMaterialsList([]);
        }
      }
    })();
  }, []);

  // Materials helpers
  const FRACTIONS: ChemRow['fraction'][] = ['1/8','1/4','3/8','1/2','5/8','3/4','7/8','1'];
  const [chemSearch, setChemSearch] = useState<string>('');
  const [matSearch, setMatSearch] = useState<string>('');
  const addChemicalRow = () => setChemRows(prev => ([...prev, { chemicalId: '', fraction: '', notes: '' }]));
  const updateChemicalRow = (idx: number, patch: Partial<ChemRow>) => setChemRows(prev => prev.map((r,i) => i===idx ? { ...r, ...patch } : r));
  const removeChemicalRow = (idx: number) => setChemRows(prev => prev.filter((_,i) => i!==idx));
  const addMaterialRow = () => setMatRows(prev => ([...prev, { materialId: '', quantityNote: '' }]));
  const updateMaterialRow = (idx: number, patch: Partial<MatRow>) => setMatRows(prev => prev.map((r,i) => i===idx ? { ...r, ...patch } : r));
  const removeMaterialRow = (idx: number) => setMatRows(prev => prev.filter((_,i) => i!==idx));

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
    const items = [...chemItems, ...matItems];
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
          const matLines = matItems.map(mi => `• ${String(materialsList.find(m => String(m.id) === String(mi.materialId))?.name || mi.materialId)} — ${mi.quantity}`);
          const matText = doc.splitTextToSize(matLines.length ? matLines.join('\n') : '(none)', 170);
          doc.text(matText, 20, y);
          y += matText.length * 6 + 8;

          const pdfDataUrl = doc.output('datauristring');
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
      return { id: `addon-${aid}`, name: found?.name || aid, category: 'exterior', checked: false };
    });
    setChecklistSteps([...prep, ...baseSteps, ...addonSteps]);
  }, [selectedPackage, selectedAddOns, vehicleType]);

  const progressPercent = useMemo(() => {
    const total = checklistSteps.length || 0;
    const done = checklistSteps.filter(s => s.checked).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [checklistSteps]);

  // Save generic checklist progress
  const saveGenericChecklist = async (): Promise<string | undefined> => {
    if (!selectedPackage || !vehicleType) {
      toast({ title: 'Select package and vehicle', description: 'Choose a package and vehicle type first.', variant: 'destructive' });
      return undefined;
    }
    const payload = {
      packageId: selectedPackage,
      vehicleType: toVehKey(vehicleType),
      vehicleTypeNote: vehicleType === 'Other' ? vehicleTypeOther : '',
      addons: selectedAddOns,
      tasks: checklistSteps.map(s => ({ id: s.id, name: s.name, category: s.category, checked: s.checked })),
      progress: progressPercent,
      // materials saved through dedicated endpoint below
      employeeId: employeeAssigned || '',
      estimatedTime,
    };
    const res = await api('/api/checklist/generic', { method: 'POST', body: JSON.stringify(payload) });
    if ((res as any)?.id) {
      setChecklistId((res as any).id);
      toast({ title: 'Progress Saved', description: 'Generic checklist saved.' });
      // Post materials usage on save (no subtract)
      await postChecklistMaterials((res as any).id, false);
      const externalCustomerId = params.get('customerId') || selectedCustomer;
      if (externalCustomerId) {
        await linkJobToCustomer(String(externalCustomerId));
      }
      return (res as any).id as string;
    } else {
      toast({ title: 'Save Failed', description: 'Could not save checklist locally.', variant: 'destructive' });
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
      const customerName = customer?.name || 'Unknown';
      const doc = new jsPDF();
      const title = finalize ? 'Service Checklist — Job Completed' : 'Service Checklist — Progress Saved';
      doc.setFontSize(18);
      doc.text('Prime Detail Solutions', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text(title, 105, 26, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 38);
      doc.text(`Customer: ${customerName}`, 20, 46);
      doc.text(`Vehicle Type: ${vehicleLabels[vehicleType] || vehicleType}`, 20, 54);
      let y = 62;
      if (employeeAssigned) { doc.text(`Employee: ${employeeAssigned}`, 20, y); y += 8; }
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
      const categories = ['preparation','exterior','interior','final'] as const;
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

      const dataUrl = doc.output('dataurlstring');
      const recordType = finalize ? 'Job' : 'Checklist';
      const fileName = finalize ? `Job_Completion_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`
                                : `Checklist_Progress_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const idToArchive = String(recordId || checklistId || 'pending');
      savePDFToArchive(recordType, customerName, idToArchive, dataUrl, { fileName });
    } catch {}
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

    await addEstimate({
      customerName: customer?.name || "Unknown",
      customerId: selectedCustomer,
      vehicleType,
      items: selectedItems,
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      total: calculateTotal(),
      notes,
      date: new Date().toISOString(),
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

    await upsertInvoice(invoice);

    // Generate PDF (download)
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Prime Detail Solutions - Invoice", 20, 20);
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
        if (s.chemicals?.length) { doc.setFontSize(9); doc.text(`Chemicals: ${s.chemicals.join(", ")}`, 28, y); y += 5; doc.setFontSize(11);}  
      });
      if (invoice.discount.amount > 0) { y += 4; doc.text(`Discount: -$${invoice.discount.amount.toFixed(2)} (${invoice.discount.type === 'percent' ? invoice.discount.value + '%' : '$' + invoice.discount.value})`, 25, y); y += 6; }
      y += 4; doc.setFontSize(12); doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);
      if (notes) { y += 10; doc.setFontSize(12); doc.text("Notes:", 20, y); y += 6; doc.setFontSize(10); const split = doc.splitTextToSize(notes, 170); doc.text(split, 20, y); }
      doc.save(`invoice-${now.getTime()}.pdf`);
    } catch {}

  toast({ title: "Invoice Created", description: "Invoice saved and PDF downloaded." });
  };

  // Orchestrate finish job: ensure saved, post materials, alert and archive
  const handleCreateInvoiceGeneric = async () => {
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

    const now = new Date();
    const invoice: any = {
      customerId: customer?.id,
      customerName: customer?.name || 'Generic Job',
      vehicle: customer ? `${customer.year || ""} ${customer.vehicle || ""} ${customer.model || ""}`.trim() : '',
      contact: { address: customer?.address || '', phone: customer?.phone || '', email: customer?.email || '' },
      vehicleInfo: { type: vehicleLabels[vehicleType] || vehicleType, mileage: customer?.mileage, year: customer?.year, color: customer?.color, conditionInside: customer?.conditionInside, conditionOutside: customer?.conditionOutside },
      services: selectedItems,
      subtotal: calculateSubtotal(),
      discount: { type: discountType, value: discountValue ? parseFloat(discountValue) : 0, amount: calculateDiscount() },
      total: calculateTotal(),
      notes,
      date: now.toLocaleDateString(),
      createdAt: now.toISOString(),
    };

    await upsertInvoice(invoice);

    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Prime Detail Solutions - Invoice", 20, 20);
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
        if (s.chemicals?.length) { doc.setFontSize(9); doc.text(`Chemicals: ${s.chemicals.join(", ")}`, 28, y); y += 5; doc.setFontSize(11);}  
      });
      if (invoice.discount.amount > 0) { y += 4; doc.text(`Discount: -$${invoice.discount.amount.toFixed(2)} (${invoice.discount.type === 'percent' ? invoice.discount.value + '%' : '$' + invoice.discount.value})`, 25, y); y += 6; }
      y += 4; doc.setFontSize(12); doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);
      if (notes) { y += 10; doc.setFontSize(12); doc.text("Notes:", 20, y); y += 6; doc.setFontSize(10); const split = doc.splitTextToSize(notes, 170); doc.text(split, 20, y); }
      doc.save(`invoice-${now.getTime()}.pdf`);
    } catch {}

    toast({ title: "Invoice Created", description: "Invoice saved and PDF downloaded." });
  };
  const finishJob = async () => {
    let step = 'start';
    try {
      const idToUse = checklistId || await saveGenericChecklist();
      if (!idToUse) {
        throw new Error('Checklist not saved (select package and vehicle).');
      }
      step = 'post_materials';
      await postChecklistMaterials(idToUse, true);
      step = 'archive_pdf';
      archiveChecklistPDF(true, idToUse);
      step = 'push_alert';
      const customer = customers.find(c => c.id === selectedCustomer);
      const customerName = customer?.name || 'Unknown';
      pushAdminAlert('job_completed', `Job completed for ${customerName}`, 'system', { checklistId: idToUse, customerId: selectedCustomer });
      toast({ title: 'Job Finished', description: 'Materials posted and completion archived.' });
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      toast({ title: 'Finish Failed', description: `Step: ${step}. ${msg}`, variant: 'destructive' });
      console.error('Finish Job Error:', step, e);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === selectedCustomer);
    
    doc.setFontSize(18);
    doc.text("Prime Detail Solutions - Service Estimate", 20, 20);
    doc.setFontSize(12);
    doc.text(`Customer: ${customer?.name || "N/A"}`, 20, 35);
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
      <PageHeader title={`Service Checklist ${selectedCustomer ? '(Linked)' : '(Generic)'}`} />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          {/* Job Setup - Generic, no forced customer link */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Job Setup</h2>
            {/* Customer selection restored — includes Generic option */}
            <div className="mb-4">
              <Label>Customer</Label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="flex h-10 w-full rounded-md border border-white/20 bg-black text-white px-3 py-2 text-sm"
              >
                <option value="">Generic Customer (No Link)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id!}>{c.name}</option>
                ))}
              </select>
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
              <div className="space-y-2">
                <Label>Optional Add-Ons</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {liveAddOns.map((a: any) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedAddOns.includes(a.id)} onChange={(e) => {
                        setSelectedAddOns(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id));
                      }} />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Checklist - dynamic from package and add-ons */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Checklist</h2>
              <div className="flex items-center gap-3">
                <Progress value={progressPercent} className="w-40" />
                <span className="text-sm">{progressPercent}%</span>
              </div>
            </div>
            {(!selectedPackage || !vehicleType) && (
              <p className="text-sm text-muted-foreground">Select a package and vehicle type to load checklist.</p>
            )}
            {selectedPackage && (
              <div className="space-y-6 max-h-[50vh] overflow-auto pr-2">
                {(['preparation','exterior','interior','final'] as const).map(section => (
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
                        {checklistSteps.filter(s => s.category === section).map((step) => (
                          <label key={step.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={step.checked} onChange={(e) => setChecklistSteps(prev => prev.map(ps => ps.id === step.id ? { ...ps, checked: e.target.checked } : ps))} />
                            <span>{step.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="mt-2 min-h-[100px]" />
            </div>
            {/* Save moved below Materials Used section */}
          </Card>

          {/* Destination Fee (optional) */}
          <Card className="p-6 bg-gradient-card border-border">
            <Label>Destination Fee (optional)</Label>
            <Input
              type="number"
              placeholder="Enter fee amount"
              value={destinationFee || ''}
              onChange={(e) => {
                let num = parseFloat(e.target.value);
                if (isNaN(num)) num = 0;
                num = Math.max(0, Math.min(9999, num));
                setDestinationFee(Math.round(num));
              }}
              className="mt-2 max-w-xs"
            />
          </Card>

          {/* Materials Used */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white pb-2 border-b border-red-600">Materials Used</h2>
              <Button variant="outline" className="h-9" onClick={() => setMaterialsModalOpen(true)}>Material Updates</Button>
            </div>

            {/* Quick add from Inventory: unified dropdown for Chemicals + Materials */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Quick Add from Inventory</Label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const chem = chemicalsList.find(c => String(c.id) === String(val));
                    const mat = materialsList.find(m => String(m.id) === String(val));
                    if (chem) {
                      setChemRows(prev => ([...prev, { chemicalId: String(chem.id), fraction: '', notes: '' }]));
                    } else if (mat) {
                      setMatRows(prev => ([...prev, { materialId: String(mat.id), quantityNote: '' }]));
                    }
                    // reset select
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
                </select>
              </div>
            </div>

            {/* Chemicals subsection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Chemicals (fractional)</h3>
                <Button onClick={addChemicalRow} className="bg-red-600 text-white h-9"><Plus className="h-4 w-4 mr-2" />Add Chemical Row</Button>
              </div>
              {chemRows.length === 0 && (
                <p className="text-sm text-muted-foreground">Add chemicals used (e.g., Wax 1/2).</p>
              )}
              {/* Search filter for chemicals */}
              <div className="mb-3">
                <Label>Search Chemicals</Label>
                <Input placeholder="Type to filter…" value={chemSearch} onChange={(e) => setChemSearch(e.target.value)} />
              </div>
              <div className="space-y-3">
                {chemRows.map((row, idx) => (
                  <div key={`chem-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-4">
                      <Label>Chemical</Label>
                      <select
                        value={row.chemicalId}
                        onChange={(e) => updateChemicalRow(idx, { chemicalId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-red-600 bg-black text-white px-3 py-2 text-sm"
                      >
                        <option value="">Select a chemical...</option>
                        {chemicalsList
                          .filter(it => (chemSearch ? String(it.name || '').toLowerCase().includes(chemSearch.toLowerCase()) : true))
                          .map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                      </select>
                    </div>
                    <div className="md:col-span-6">
                      <Label>Quantity Used</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {FRACTIONS.map(f => (
                          <label key={f} className="flex items-center gap-1 text-sm px-2 py-1 rounded border border-red-600 text-white">
                            <input type="checkbox" checked={row.fraction === f} onChange={() => updateChemicalRow(idx, { fraction: row.fraction === f ? '' : f })} />
                            <span>{f}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Notes</Label>
                      <Input type="text" value={row.notes || ''} onChange={(e) => updateChemicalRow(idx, { notes: e.target.value })} placeholder="Optional note" />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button variant="destructive" className="h-10 w-full" onClick={() => removeChemicalRow(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials subsection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Materials (note-based)</h3>
                <Button onClick={addMaterialRow} className="bg-red-600 text-white h-9"><Plus className="h-4 w-4 mr-2" />Add Material Row</Button>
              </div>
              {matRows.length === 0 && (
                <p className="text-sm text-muted-foreground">Add materials used (e.g., 5 rags, 2 brushes).</p>
              )}
              {/* Removed search input; unified quick add dropdown above now lists all inventory */}
              <div className="space-y-3">
                {matRows.map((row, idx) => (
                  <div key={`mat-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-5">
                      <Label>Material</Label>
                      <select
                        value={row.materialId}
                        onChange={(e) => updateMaterialRow(idx, { materialId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-red-600 bg-black text-white px-3 py-2 text-sm"
                      >
                        <option value="">Select a material...</option>
                        {materialsList.map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                      </select>
                    </div>
                    <div className="md:col-span-6">
                      <Label>Quantity Used</Label>
                      <Input type="text" value={row.quantityNote} onChange={(e) => updateMaterialRow(idx, { quantityNote: e.target.value })} placeholder="e.g., 5 rags, 2 brushes" />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button variant="destructive" className="h-10 w-full" onClick={() => removeMaterialRow(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

          {/* Complete & Save controls */}
          <div className="flex items-center gap-3">
            <Button onClick={finishJob} className="bg-red-600 text-white">
              <Save className="h-4 w-4 mr-2" />Finish Job
            </Button>
            <Button onClick={async () => { const savedId = await saveGenericChecklist(); archiveChecklistPDF(false, savedId || checklistId || undefined); const customer = customers.find(c => c.id === selectedCustomer); const customerName = customer?.name || 'Unknown'; pushAdminAlert('job_progress', `Progress saved for ${customerName}`, 'system', { checklistId: savedId || checklistId, customerId: selectedCustomer }); }} className="bg-gradient-hero"><Save className="h-4 w-4 mr-2" />Save Progress</Button>
            {checklistId && <span className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Saved</span>}
          </div>

          {/* Discount & Total */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Discount & Total</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Discount Type</Label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percent" | "dollar")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="dollar">Dollar Amount ($)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    placeholder={discountType === "percent" ? "e.g., 10" : "e.g., 20"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-lg">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">${calculateSubtotal().toFixed(2)}</span>
                </div>
                {calculateDiscount() > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span className="font-bold">-${calculateDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl border-t pt-2">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-primary">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6 bg-gradient-card border-border">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes..."
              className="mt-2 min-h-[100px]"
            />
          </Card>

          {/* Actions */}
          <div className="flex gap-4 flex-wrap">
            <Button onClick={handleCreateInvoiceGeneric} className="bg-gradient-hero">
              <FileText className="h-4 w-4 mr-2" />
              Save & Create Invoice
            </Button>
            <Button onClick={generatePDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Estimate PDF
            </Button>
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
          const saved = await upsertCustomer(data as any);
          const list = await getUnifiedCustomers();
          setCustomers(list as CustomerType[]);
          setSelectedCustomer((saved as any).id);
        }}
      />
        </div>
      </main>
    </div>
  );
};

export default ServiceChecklist;
