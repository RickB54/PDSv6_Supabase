import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Save, Package, FlaskConical, Trash2, Plus, Info, Zap, Check, CheckSquare, List, MessageSquare, Droplets, BookOpen, Printer, FileText, RefreshCw, HelpCircle, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { servicePackages } from '@/lib/services';
import * as supaPkgs from '@/services/supabase/packages';
import { getCombinedSelectableProducts } from '@/lib/chemicals';
import { toast } from 'sonner';
import { contentService } from '@/lib/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/auth';
import { Lock } from 'lucide-react';

interface TipMapping {
  packageId: string;
  chemicalIds: string[];
  notes: string;
}

interface ChemicalDescription {
  id: string;
  purpose: string;
  instructions: string;
  dilutions: { scenario: string; ratio: string }[];
}

const RICK_TIPS_KEY = "ricks_chemical_tips_v3"; 

export default function RicksTipsModal({ open, onOpenChange, initialTab = 'package' }: { open: boolean, onOpenChange: (open: boolean) => void, initialTab?: 'package' | 'description' | 'prep' }) {
  const [activeTab, setActiveTab] = useState<'package' | 'description' | 'prep'>(initialTab);

  useEffect(() => {
    if (open && initialTab) {
        setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const [tips, setTips] = useState<TipMapping[]>([]);
  const [descriptions, setDescriptions] = useState<ChemicalDescription[]>([]);
  const [prepList, setPrepList] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedChemicalId, setSelectedChemicalId] = useState<string>('');
  const [chemicalSortBy, setChemicalSortBy] = useState<string>('brand');
  const [availableChemicals, setAvailableChemicals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chemicalSearchText, setChemicalSearchText] = useState('');
  const [activePackages, setActivePackages] = useState<any[]>(servicePackages);
  const [loading, setLoading] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchPrintIds, setBatchPrintIds] = useState<string[]>([]);
  const dataInitialized = useRef(false);
  
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const chemicalSortOptions = useMemo(() => {
    return Array.from(new Set(availableChemicals.map(c => c.brand || "Other / No Brand"))).sort((a, b) => {
      if (a === "Other / No Brand") return 1;
      if (b === "Other / No Brand") return -1;
      return a.localeCompare(b);
    });
  }, [availableChemicals]);

  const displayChemicals = useMemo(() => {
    let list = [...availableChemicals];
    if (chemicalSortBy === 'brand') {
       list.sort((a, b) => {
         const brandA = (a.brand || 'Other / No Brand').toLowerCase();
         const brandB = (b.brand || 'Other / No Brand').toLowerCase();
         if (brandA < brandB) return -1;
         if (brandA > brandB) return 1;
         return a.name.localeCompare(b.name);
       });
    } else if (chemicalSortBy === 'alphabetical') {
       list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
       list = list.filter(c => (c.brand || 'Other / No Brand') === chemicalSortBy).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    if (chemicalSearchText.trim()) {
      const query = chemicalSearchText.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(query) || (c.brand && c.brand.toLowerCase().includes(query)));
    }
    
    return list;
  }, [availableChemicals, chemicalSortBy, chemicalSearchText]);

  
  const getChemDesc = (chemId: string) => {
    const chem = availableChemicals.find(c => String(c.id) === String(chemId));
    if (!chem) return undefined;
    const searchId = chem.chemical_library_id || chem.id || chemId;
    let found = descriptions.find(d => String(d.id) === String(searchId) || String(d.id) === String(chemId));
    
    if (!found) {
      const cleanName = (chem.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const FALLBACK: Record<string, string> = {
        'apc': 'a1000002-0000-0000-0000-000000000002',
        'armorallwheel': 'a1000005-0000-0000-0000-000000000005',
        'platinumrapid': 'a1000007-0000-0000-0000-000000000007',
        'ceramiccoatingcerakote': 'a1000007-0000-0000-0000-000000000007',
        'blackwax': 'a1000008-0000-0000-0000-000000000008',
        'darkfury': 'a1000012-0000-0000-0000-000000000012',
        'ezshine': 'a1000015-0000-0000-0000-000000000015',
        'musclemagic': 'a1000023-0000-0000-0000-000000000023',
        'totalinterior': 'a1000034-0000-0000-0000-000000000034',
        'zapit': 'a1000037-0000-0000-0000-000000000037'
      };
      for (const [key, uuid] of Object.entries(FALLBACK)) {
        if (cleanName.includes(key)) {
          found = descriptions.find(d => String(d.id) === uuid);
          if (found) break;
        }
      }
    }
    return found;
  };

  const DEFAULT_SCENARIOS = useMemo(() => [
    { scenario: "Maintenance / Light", ratio: "" },
    { scenario: "Standard", ratio: "" },
    { scenario: "Heavy Dirt / Degreasing", ratio: "" }
  ], []);


  useEffect(() => {
    if (!open) return;

    const loadAll = async () => {
      setLoading(true);
      try {
        const meta = await contentService.getServiceMeta(RICK_TIPS_KEY);
        let loadedTips = [];
        let loadedDescs = [];
        let loadedPrepItems = [];

        if (meta && meta.meta) {
          if (Array.isArray(meta.meta.tips)) loadedTips = meta.meta.tips;
          if (Array.isArray(meta.meta.descriptions)) loadedDescs = meta.meta.descriptions;
          if (Array.isArray(meta.meta.prepList)) loadedPrepItems = meta.meta.prepList;
        }

        const chems = await getCombinedSelectableProducts();
        setAvailableChemicals(chems);

        // Fetch active packages from Supabase
        try {
          const allPkgs = await supaPkgs.getAll();
          const filtered = (allPkgs || []).filter(p => p.is_active !== false);
          
          const finalPkgs = filtered.length > 0 ? filtered : servicePackages;
          setActivePackages(finalPkgs);
          
          if (finalPkgs.length > 0 && !selectedPackageId) {
            setSelectedPackageId(finalPkgs[0].id);
          }
        } catch (pkgError) {
          console.error("Failed to fetch packages from Supabase", pkgError);
          setActivePackages(servicePackages);
          if (servicePackages.length > 0 && !selectedPackageId) {
             setSelectedPackageId(servicePackages[0].id);
          }
        }
        
        // Auto-seed descriptions, prep list & package tips strictly from chart if new
        const { seededDescs, seededPrep, seededTips, changed } = seedChemicalData(chems, loadedDescs, loadedPrepItems, loadedTips);
        
        if (changed) {
           loadedDescs = seededDescs;
           loadedPrepItems = seededPrep;
           loadedTips = seededTips;
           await saveToSupabase(seededTips, seededDescs, seededPrep);
        }

        setTips(loadedTips);
        setDescriptions(loadedDescs);
        setPrepList(loadedPrepItems);
        dataInitialized.current = true;

        if (chems.length > 0 && !selectedChemicalId) {
          setSelectedChemicalId(String(chems[0].id));
        }
      } catch (e) {
        console.error("Failed to load Rick's tips", e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [open]);

  // Auto-select first package/chemical when they load if none selected
  useEffect(() => {
    if (activePackages.length > 0 && !selectedPackageId) {
      setSelectedPackageId(String(activePackages[0].id));
    }
  }, [activePackages, selectedPackageId]);

  useEffect(() => {
    if (availableChemicals.length > 0 && !selectedChemicalId) {
      setSelectedChemicalId(String(availableChemicals[0].id));
    }
  }, [availableChemicals, selectedChemicalId]);

  const seedChemicalData = (chems: any[], currentDescs: ChemicalDescription[], currentPrep: string[], currentTips: TipMapping[]): { seededDescs: ChemicalDescription[], seededPrep: string[], seededTips: TipMapping[], changed: boolean } => {
    // Helper to find chemical ID by name
    const findChemId = (name: string) => {
      const match = chems.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
      return match ? String(match.id) : null;
    };

    const interiorChemNames = ["Pink Perfection", "Carpet Bomber", "Xpress", "Terminator", "Dirt Buster"];
    const exteriorChemNames = ["Dark Fury", "Road Warrior", "Formula 4", "Spray Wax", "Aqua Gloss", "Dirt Buster", "Meguiar's APC"];

    const interiorIds = interiorChemNames.map(n => findChemId(n)).filter(Boolean) as string[];
    const exteriorIds = exteriorChemNames.map(n => findChemId(n)).filter(Boolean) as string[];

    const packageAdvice = [
      { 
        id: 'prime-essential-exterior', 
        chemIds: exteriorIds,
        notes: "Essential Exterior Guide:\n- Inspect for heavy mud/bugs; pre-treat these areas.\n- Foam dwell time 3-5 mins; do not let dry.\n- Top-down wash with grit guards.\n- Hand dry with plush microfiber.\n\nEXTERIOR CADDY SETUP:\n1. Dark Fury (7:1) - Standard Wheels\n2. Dark Fury (4:1) - Heavy Wheels\n3. Road Warrior (4:1) - Heavy Bug Pre-Treat\n4. Formula 4 (20:1) - Drying Aid\n5. Spray Wax (RTU) - Shine & Protection\n6. Aqua Gloss (4:1) - Tire Dressing\n7. Dirt Buster (7:1) - Gen. Exterior Cleaner\n8. Meguiar's APC (4:1) - Heavy Degreaser" 
      },
      { 
        id: 'prime-essential-interior', 
        chemIds: interiorIds,
        notes: "Essential Interior Guide:\n- Remove all trash and loose items first.\n- Vacuum in sections (driver -> passenger -> rear).\n- Wipe dash/console with safe APC.\n- Glass cleaning is the final touch for clarity.\n\nINTERIOR CADDY SETUP:\n1. Pink Perfection (10:1) - Std. Plastics/Vinyl\n2. Pink Perfection (4:1) - Heavy Cleaner/Degreaser\n3. Carpet Bomber (7:1) - Std. Fabric/Seats\n4. Carpet Bomber (5:1) - Heavy Fabric\n5. P&S Xpress (3:1) - Light Satin Finish\n6. P&S Xpress (1:1) - Strong Satin Finish\n7. Terminator (RTU) - Odors & Stains\n8. Dirt Buster (10:1) - General Interior Backup" 
      },
      { 
        id: 'prime-essential-full', 
        chemIds: Array.from(new Set([...interiorIds, ...exteriorIds])),
        notes: "Essential Full Detail Guide:\n- Balance time between inside and out.\n- Wash exterior first to allow drying during interior work.\n- Wipe door jambs last to prevent drips.\n- Final walk-around with client for satisfaction.\n\nDUAL CADDY DEPLOYMENT:\nBring both Interior & Exterior caddies. Prioritize Pink Perfection (10:1) for dash and Dark Fury (7:1) for wheels." 
      },
      { 
        id: 'prime-elite-exterior', 
        chemIds: exteriorIds,
        notes: "Elite Exterior Guide:\n- Decon wash to strip old waxes.\n- Clay bar until surface feels glass-smooth.\n- Deep clean wheel wells and inner rim barrels.\n- Apply UV trim protectant; buff off excess.\n\nEXTERIOR CADDY SETUP:\n1. Dark Fury (7:1) - Standard Wheels\n2. Dark Fury (4:1) - Heavy Wheels\n3. Road Warrior (4:1) - Heavy Bug Pre-Treat\n4. Formula 4 (20:1) - Drying Aid\n5. Spray Wax (RTU) - Shine & Protection\n6. Aqua Gloss (4:1) - Tire Dressing\n7. Dirt Buster (7:1) - Gen. Exterior Cleaner\n8. Meguiar's APC (4:1) - Heavy Degreaser" 
      },
      { 
        id: 'prime-elite-interior', 
        chemIds: interiorIds,
        notes: "Elite Interior Guide:\n- Steam clean vents to kill bacteria/odors.\n- Hot water extraction for deep stain removal.\n- PH-balanced leather conditioning (matte finish).\n- Clean inside of trunk and storage cubbies.\n\nINTERIOR CADDY SETUP:\n1. Pink Perfection (10:1) - Std. Plastics/Vinyl\n2. Pink Perfection (4:1) - Heavy Cleaner/Degreaser\n3. Carpet Bomber (7:1) - Std. Fabric/Seats\n4. Carpet Bomber (5:1) - Heavy Fabric\n5. P&S Xpress (3:1) - Light Satin Finish\n6. P&S Xpress (1:1) - Strong Satin Finish\n7. Terminator (RTU) - Odors & Stains\n8. Dirt Buster (10:1) - General Interior Backup" 
      },
      { 
        id: 'prime-elite-full', 
        chemIds: Array.from(new Set([...interiorIds, ...exteriorIds])),
        notes: "Elite Full Detail Guide:\n- Master restoration: Decon + Clay + Protection.\n- Ceramic sealant requires clean, cool surface.\n- Full steam and extraction interior master class.\n- Double-check every button, crevice, and jamb.\n\nFULL MOBILE UNIT LOAD:\nDeploy all caddies. Ensure specific dilutions for heavy extraction (Carpet Bomber 5:1) and decontamination (Dark Fury 4:1) are ready." 
      }
    ];

    const chartData = [
      { name: "Pink Perfection", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["10:1", "10:1", "4:1"], purpose: "High-performance all-purpose cleaner and degreaser for interior and exterior pre-treat." },
      { name: "Dirt Buster", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["10:1", "10:1", "4:1"], purpose: "General purpose cleaning for interior plastics and vinyl." },
      { name: "Carpet Bomber", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["8:1", "7:1", "5:1"], purpose: "Premium carpet and upholstery cleaner. Deep cleans fibers without excessive foam." },
      { name: "Terminator", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["RTU", "RTU", "RTU"], purpose: "Enzyme-based odor and stain remover. Direct application." },
      { name: "Xpress", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["3:1", "1:1", "1:1"], purpose: "Quick interior cleaner that leaves a perfect factory finish. Safe for all surfaces." },
      { name: "Gold Class", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["5:1", "5:1", "5:1"], purpose: "Rich foam car wash. Gently lifts dirt while conditioning paint." },
      { name: "McGuire's Gold Class", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["5:1", "5:1", "5:1"], purpose: "Rich foam car wash. Gently lifts dirt while conditioning paint." },
      { name: "Road Warrior", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["10:1", "10:1", "4:1"], purpose: "Powerful exterior pre-treat for bugs and road grime." },
      { name: "Dark Fury", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["10:1", "7:1", "4:1"], purpose: "Wheel and tire cleaner. Dissolves brake dust and road tar instantly." },
      { name: "Formula 4", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["20:1", "20:1", "20:1"], purpose: "Rapid drying aid and polymer sealant. Fights hard water spots in direct sunlight." },
      { name: "Spray Wax", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["RTU", "RTU", "RTU"], purpose: "Professional high-gloss paint protection. Apply to wet or dry surfaces." },
      { name: "Aqua Gloss", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["4:1", "2:1", "1:1 (RTU)"], purpose: "Water-based tire and trim dressing. High shine without the sling." },
      { name: "Meguiar's APC", descs: ["Maintenance / Light", "Standard", "Heavy Dirt / Degreasing"], ratios: ["10:1", "4:1", "4:1"], purpose: "Heavy-duty all-purpose cleaner for engines, wheel wells, and stubborn grease." }
    ];

    const seededDescs = [...currentDescs];
    const seededPrep = [...currentPrep];
    const seededTips = [...currentTips];
    let changed = false;

    // Seed Package Advice (Tips)
    packageAdvice.forEach(advice => {
      const existingIdx = seededTips.findIndex(t => t.packageId === advice.id);
      if (existingIdx === -1) {
        seededTips.push({ packageId: advice.id, chemicalIds: advice.chemIds, notes: advice.notes });
        changed = true;
      } else {
        // If it's already there but empty or has old placeholder notes, update it
        if (seededTips[existingIdx].notes.includes("Rick's Pro Tip") || seededTips[existingIdx].notes === "" || seededTips[existingIdx].chemicalIds.length === 0) {
          seededTips[existingIdx] = { ...seededTips[existingIdx], notes: advice.notes, chemicalIds: advice.chemIds };
          changed = true;
        }
      }
    });

    chartData.forEach(item => {
      // Find all matches for this specific name (e.g. "Xpress" might match "P&S Xpress" and "Xpress Interior")
      const matches = chems.filter(c => c.name.toLowerCase().includes(item.name.toLowerCase()));
      
      matches.forEach(match => {
        // 1. Force add to Prep List (Job Setup)
        if (!seededPrep.includes(match.id)) {
           seededPrep.push(match.id);
           changed = true;
        }

        // 2. Ensure Professional Dilutions are set
        const descIdx = seededDescs.findIndex(d => d.id === match.id);
        if (descIdx === -1 || !seededDescs[descIdx].dilutions || seededDescs[descIdx].dilutions.length <= 1) {
          const newData = {
            id: match.id,
            purpose: item.purpose,
            instructions: "Apply to cool surface. Follow dilution ratios based on dirt level. Agitate if necessary and rinse or wipe clean.",
            dilutions: item.descs.map((d, i) => ({ scenario: d, ratio: item.ratios[i] }))
          };
          if (descIdx > -1) seededDescs[descIdx] = newData;
          else seededDescs.push(newData);
          changed = true;
        }
      });
    });

    return { seededDescs, seededPrep, seededTips, changed };
  };

  const saveToSupabase = async (newTips: TipMapping[], newDescs: ChemicalDescription[], newPrep: string[]) => {
    try {
      await contentService.upsertServiceMeta({
        key: RICK_TIPS_KEY,
        title: "Rick's Tips & Descriptions",
        meta: { tips: newTips, descriptions: newDescs, prepList: newPrep }
      });
    } catch (err) {
      console.error("Failed to save tips to Supabase", err);
    }
  };

  // Restored currentTip definition
  const currentTip = tips.find(t => t.packageId === selectedPackageId) || { packageId: selectedPackageId, chemicalIds: [], notes: '' };

  // Get current description with 3 default rows if empty
  const currentDesc = useMemo(() => {
    const found = getChemDesc(selectedChemicalId);
    if (found) {
        // If it has NO dilutions, give it the 3 defaults
        if (!found.dilutions || found.dilutions.length === 0) {
            return { ...found, dilutions: [...DEFAULT_SCENARIOS] };
        }
        return found;
    }
    return { 
        id: selectedChemicalId, 
        purpose: '', 
        instructions: '', 
        dilutions: [...DEFAULT_SCENARIOS] 
    };
  }, [descriptions, selectedChemicalId, DEFAULT_SCENARIOS]);

  const updateTips = (newTips: TipMapping[]) => {
    if (!isAdmin) {
      toast.error("Access Denied: Admins only");
      return;
    }
    setTips(newTips);
    saveToSupabase(newTips, descriptions, prepList);
  };

  const updateDescriptions = (newDescs: ChemicalDescription[]) => {
    if (!isAdmin) return;
    setDescriptions(newDescs);
    saveToSupabase(tips, newDescs, prepList);
  };

  const toggleChemical = (inputChemId: string | number) => {
    if (!isAdmin) {
       toast.error("Read Only: Contact admin to change mappings");
       return;
    }
    const chemId = String(inputChemId);
    const existingIndex = tips.findIndex(t => String(t.packageId) === String(selectedPackageId));
    let newTips = [...tips];

    if (existingIndex > -1) {
      const targetTip = newTips[existingIndex];
      // Create a shallow copy of the tip and its chemicalIds array for immutability
      const updatedTip = { 
        ...targetTip, 
        chemicalIds: [...targetTip.chemicalIds] 
      };
      
      const chemIds = updatedTip.chemicalIds.map(id => String(id));
      const chemIndex = chemIds.indexOf(chemId);
      
      if (chemIndex > -1) {
        updatedTip.chemicalIds.splice(chemIndex, 1);
      } else {
        updatedTip.chemicalIds.push(chemId);
      }
      newTips[existingIndex] = updatedTip;
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [chemId], notes: '' });
    }
    updateTips(newTips);
  };

  const resetToDefaults = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const chems = await getCombinedSelectableProducts();
      // Force seed by passing empty arrays
      const { seededDescs, seededPrep, seededTips } = seedChemicalData(chems, [], [], []);
      setTips(seededTips);
      setDescriptions(seededDescs);
      setPrepList(seededPrep);
      await saveToSupabase(seededTips, seededDescs, seededPrep);
      toast.success("Restored Rick's Professional Defaults!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reset defaults");
    } finally {
      setLoading(false);
    }
  };

  const refreshInventory = async () => {
    setLoading(true);
    try {
      const chems = await getCombinedSelectableProducts();
      setAvailableChemicals(chems);
      toast.success("Inventory Updated");
    } catch (e) {
      toast.error("Refresh Failed");
    } finally {
      setLoading(false);
    }
  };

  const updateNotes = (notes: string) => {
    if (!isAdmin) return;
    const existingIndex = tips.findIndex(t => String(t.packageId) === String(selectedPackageId));
    let newTips = [...tips];
    if (existingIndex > -1) {
      newTips[existingIndex].notes = notes;
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [], notes });
    }
    updateTips(newTips);
  };

  const updateDescField = (field: keyof ChemicalDescription, value: any) => {
    
    const chem = availableChemicals.find(c => String(c.id) === String(selectedChemicalId));
    const searchId = chem?.chemical_library_id || chem?.id || selectedChemicalId;
    const existingIndex = descriptions.findIndex(d => String(d.id) === String(searchId) || String(d.id) === String(selectedChemicalId));
  
    let newDescs = [...descriptions];
    if (existingIndex > -1) {
      newDescs[existingIndex] = { ...currentDesc, [field]: value };
    } else {
      newDescs.push({ ...currentDesc, id: searchId, [field]: value });
    }
    updateDescriptions(newDescs);
  };

  const addDilutionRow = () => {
    const nextDilutions = [...(currentDesc.dilutions || []), { scenario: '', ratio: '' }];
    updateDescField('dilutions', nextDilutions);
  };

  const updateDilutionRow = (idx: number, patch: { scenario?: string, ratio?: string }) => {
    const nextDilutions = [...(currentDesc.dilutions || [])];
    nextDilutions[idx] = { ...nextDilutions[idx], ...patch };
    updateDescField('dilutions', nextDilutions);
  };

  const removeDilutionRow = (idx: number) => {
    const nextDilutions = (currentDesc.dilutions || []).filter((_, i) => i !== idx);
    updateDescField('dilutions', nextDilutions);
  };

  const filteredChemicals = availableChemicals.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const latestChemicalDate = useMemo(() => {
    if (!availableChemicals.length) return null;
    let latest = 0;
    availableChemicals.forEach(c => {
      const ts = new Date((c as any).updated_at || (c as any).created_at || 0).getTime();
      if (ts > latest) latest = ts;
    });
    if (!latest) return null;
    return new Date(latest).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    });
  }, [availableChemicals]);

  const selectedChemicals = availableChemicals.filter(c => {
    const chemIds = currentTip.chemicalIds.map(id => String(id));
    return chemIds.includes(String(c.id)) || (c.chemical_library_id && chemIds.includes(String(c.chemical_library_id)));
  });

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];
    const filteredIds = filteredChemicals.map(c => c.id);

    if (existingIndex > -1) {
      if (isChecked) {
        const union = Array.from(new Set([...newTips[existingIndex].chemicalIds, ...filteredIds]));
        newTips[existingIndex].chemicalIds = union;
      } else {
        newTips[existingIndex].chemicalIds = newTips[existingIndex].chemicalIds.filter(id => !filteredIds.includes(id));
      }
    } else {
      if (isChecked) {
        newTips.push({ packageId: selectedPackageId, chemicalIds: filteredIds, notes: '' });
      }
    }
    updateTips(newTips);
  };

  const updatePrepList = (newList: string[]) => {
    setPrepList(newList);
    saveToSupabase(tips, descriptions, newList);
  };

  const addToPrepList = (id: string) => {
    if (!prepList.includes(id)) {
      updatePrepList([...prepList, id]);
      toast.success("Added to Prep List");
    }
  };

  const removeFromPrepList = (id: string) => {
    updatePrepList(prepList.filter(item => item !== id));
    toast.info("Removed from Prep List");
  };

  const printRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize professional advice textarea to fit content perfectly
  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [currentTip.notes, activeTab, selectedPackageId]);


  const handleSavePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 22, 41);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(192, 132, 252);
    doc.text("Rick's Command Center", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(`Professional Detailing Advice | Printed: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Content
    doc.setFontSize(14);
    doc.setTextColor(192, 132, 252);
    doc.setFont("helvetica", "bold");
    doc.text("Strategic Recommendations", 14, 50);
    doc.setDrawColor(192, 132, 252, 0.3);
    doc.line(14, 52, 196, 52);
    
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(currentTip.notes || "No custom advice set.", 182);
    doc.text(splitNotes, 14, 62);
    
    doc.save(`Ricks_Advice_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Advice Exported Successfully");
  };

  const generateCleanPrintHtml = (title: string, content: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @media print { @page { margin: 20mm; } }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; background: #fff; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #000; margin-bottom: 30px; padding-bottom: 10px; }
            h1 { font-size: 24pt; margin: 0; color: #000; }
            h2 { font-size: 18pt; margin: 20px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            h4 { font-size: 12pt; text-transform: uppercase; margin-bottom: 5px; color: #444; }
            p { margin: 0 0 10px 0; font-size: 11pt; }
            .item-container { margin-bottom: 40px; page-break-inside: avoid; }
            .data-row { border: 1px solid #eee; padding: 10px; margin-bottom: 5px; display: flex; justify-content: space-between; }
            .label { font-weight: bold; color: #555; }
            .value { font-weight: bold; }
            .meta { font-size: 9pt; color: #777; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <div class="meta">Rick's Tips • Professional Reference • Printed: ${new Date().toLocaleString()}</div>
          </div>
          ${content}
        </body>
      </html>
    `;
  };

  const handlePrint = (type: 'single-package' | 'single-chemical' | 'master-packages' | 'master-chemicals' | 'prep-interior' | 'prep-exterior' | 'batch-selected') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // --- Helper: Premium Header ---
    const drawHeader = (title: string, subtitle: string) => {
      // Background Accent
      doc.setFillColor(15, 22, 41); // Deep Navy
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(192, 132, 252); // Purple-400
      doc.text(title, 14, 20);
      
      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.setFont("helvetica", "normal");
      doc.text(`${subtitle} | Printed: ${new Date().toLocaleString()}`, 14, 28);
      
      // Logo Placeholder / Graphic element
      doc.setDrawColor(192, 132, 252);
      doc.setLineWidth(1);
      doc.line(14, 32, 60, 32);
      
      return 50; // New Y
    };

    // --- Helper: Section Title ---
    const drawSectionTitle = (text: string, y: number, color: [number, number, number] = [192, 132, 252]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text.toUpperCase(), 14, y);
      doc.setDrawColor(color[0], color[1], color[2], 0.2);
      doc.setLineWidth(0.5);
      doc.line(14, y + 2, 196, y + 2);
      return y + 10;
    };

    if (type === 'single-package') {
      const pkg = activePackages.find(p => p.id === selectedPackageId);
      const pkgChems = availableChemicals.filter(c => currentTip.chemicalIds.includes(c.id));
      
      currentY = drawHeader("Rick's Command Center", `Service Package Advice: ${pkg?.name || 'Service'}`);
      
      currentY = drawSectionTitle("Professional Recommendations", currentY);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(currentTip.notes || "No custom advice set for this package.", 182);
      doc.text(splitNotes, 14, currentY);
      currentY += (splitNotes.length * 6) + 10;

      currentY = drawSectionTitle("Designated Chemical Inventory", currentY, [56, 189, 248]); // Blue-400
      autoTable(doc, {
        startY: currentY,
        head: [['Chemical Name', 'Brand', 'Category', 'Purpose']],
        body: pkgChems.map(c => [
          c.name,
          c.brand || 'N/A',
          c.category || 'General',
          getChemDesc(c.id)?.purpose || '—'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [15, 22, 41], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });

    } else if (type === 'single-chemical') {
      const chem = availableChemicals.find(c => c.id === selectedChemicalId);
      currentY = drawHeader("Rick's Chemical Reference", `${chem?.name || 'Product'} Specification`);
      
      currentY = drawSectionTitle("Product Identity", currentY, [56, 189, 248]);
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`Brand: ${chem?.brand || 'N/A'}`, 14, currentY);
      currentY += 8;
      doc.text(`Purpose: ${currentDesc.purpose || "Professional properties."}`, 14, currentY);
      currentY += 12;

      currentY = drawSectionTitle("Usage Instructions", currentY, [16, 185, 129]); // Emerald-500
      const splitInst = doc.splitTextToSize(currentDesc.instructions || "Standard application procedures.", 182);
      doc.text(splitInst, 14, currentY);
      currentY += (splitInst.length * 6) + 10;

      currentY = drawSectionTitle("Professional Dilution Matrix", currentY);
      autoTable(doc, {
        startY: currentY,
        head: [['Cleaning Scenario / Intensity', 'Target Dilution Ratio']],
        body: (currentDesc.dilutions || DEFAULT_SCENARIOS).map(dil => [dil.scenario, dil.ratio || 'RTU']),
        theme: 'striped',
        headStyles: { fillColor: [192, 132, 252] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

    } else if (type === 'prep-interior' || type === 'prep-exterior' || (type as string) === 'full-prep') {
      const isFull = (type as string) === 'full-prep';
      const isInterior = type === 'prep-interior' || isFull;
      const isExterior = type === 'prep-exterior' || isFull;
      
      currentY = drawHeader("Rick's Setup Guide", isFull ? "Complete Mobile Unit Stage List" : `${isInterior ? 'Interior' : 'Exterior'} Preparation Checklist`);
      
      const filterChems = (zone: 'interior' | 'exterior') => {
        return availableChemicals
          .filter(c => prepList.includes(c.id))
          .filter(c => {
            const name = c.name.toLowerCase();
            if (zone === 'interior') {
              return (c.category?.toLowerCase() === 'interior') || 
                     ['perfection', 'buster', 'bomber', 'terminator', 'xpress'].some(n => name.includes(n));
            } else {
              if (['perfection', 'buster', 'bomber', 'terminator', 'xpress'].some(n => name.includes(n)) && !name.includes('pink perfection')) {
                 return false;
              }
              return (c.category?.toLowerCase() === 'exterior') || 
                     ['gold class', 'warrior', 'dark fury', 'formula 4', 'spray wax', 'aqua gloss', 'apc', 'pink perfection'].some(n => name.includes(n));
            }
          });
      };

      const zones: ('interior' | 'exterior')[] = isFull ? ['interior', 'exterior'] : [isInterior ? 'interior' : 'exterior'];

      zones.forEach(zone => {
        const zoneChems = filterChems(zone);
        if (zoneChems.length === 0) return;

        currentY = drawSectionTitle(`${zone} Setup`, currentY + 5, zone === 'interior' ? [56, 189, 248] : [245, 158, 11]);

        zoneChems.forEach((chem, idx) => {
          const desc = getChemDesc(chem.id);
          if (currentY > 240) { doc.addPage(); currentY = 20; }
          
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "bold");
          doc.text(`${idx + 1}. ${chem.name}`, 14, currentY);
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(` (${chem.brand || 'N/A'})`, 14 + doc.getTextWidth(`${idx + 1}. ${chem.name}`), currentY);
          currentY += 4;

          autoTable(doc, {
            startY: currentY,
            head: [['Scenario', 'Ratio', 'Ready']],
            body: (desc?.dilutions || DEFAULT_SCENARIOS).map(dil => [dil.scenario, dil.ratio || 'RTU', '[ ]']),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: zone === 'interior' ? [56, 189, 248] : [245, 158, 11] },
            margin: { left: 20, right: 20 }
          });
          currentY = (doc as any).lastAutoTable.finalY + 8;
        });
        currentY += 10;
      });

    } else if (type === 'master-packages') {
      currentY = drawHeader("Rick's Master Matrix", "Global Service Package Advice Catalog");
      
      activePackages.forEach(pkg => {
        const tip = tips.find(t => t.packageId === pkg.id);
        const pkgChems = availableChemicals.filter(c => tip?.chemicalIds.includes(c.id));
        
        currentY = drawSectionTitle(pkg.name, currentY);
        
        const splitNotes = doc.splitTextToSize(tip?.notes || "No advice set.", 182);
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(splitNotes, 14, currentY);
        currentY += (splitNotes.length * 5) + 5;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text(`Primary Chemicals: ${pkgChems.map(c => c.name).join(', ')}`, 14, currentY);
        currentY += 15;
      });

    } else if (type === 'master-chemicals' || type === 'batch-selected') {
      currentY = drawHeader(type === 'batch-selected' ? "Rick's Custom Selection" : "Rick's Strategic Catalog", type === 'batch-selected' ? "Custom Print" : "Full Chemical Asset Reference");
      
      const targetChems = type === 'batch-selected' ? availableChemicals.filter(c => batchPrintIds.includes(c.id)) : availableChemicals;

      targetChems.forEach(chem => {
        const desc = getChemDesc(chem.id);
        
        doc.setFont("helvetica", "normal");
        const splitPurpose = doc.splitTextToSize(desc?.purpose || "—", 156);
        const splitInst = doc.splitTextToSize(desc?.instructions || "Standard application procedures.", 156);
        
        if (currentY > 260) { doc.addPage(); currentY = 20; }
        
        currentY = drawSectionTitle(`${chem.name} (${chem.brand})`, currentY, [56, 189, 248]);
        
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("PURPOSE:", 14, currentY);
        doc.setFont("helvetica", "normal");
        
        splitPurpose.forEach((line: string, i: number) => {
          if (currentY > 280) { doc.addPage(); currentY = 20; }
          doc.text(line, 40, currentY);
          if (i < splitPurpose.length - 1) currentY += 5;
        });
        currentY += 8;

        if (currentY > 270) { doc.addPage(); currentY = 20; }

        doc.setFont("helvetica", "bold");
        doc.text("USAGE:", 14, currentY);
        doc.setFont("helvetica", "normal");
        
        splitInst.forEach((line: string, i: number) => {
          if (currentY > 280) { doc.addPage(); currentY = 20; }
          doc.text(line, 40, currentY);
          if (i < splitInst.length - 1) currentY += 5;
        });
        currentY += 8;

        autoTable(doc, {
          startY: currentY,
          head: [['Scenario', 'Professional Ratio']],
          body: (desc?.dilutions || DEFAULT_SCENARIOS).map(dil => [dil.scenario, dil.ratio]),
          theme: 'striped',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [15, 22, 41] },
          margin: { left: 30 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    window.open(doc.output('bloburl'), '_blank');
    toast.success("Professional Document Generated");
  };

  const saveMasterCatalog = (type: 'packages' | 'chemicals' | 'batch-selected') => {
    const toastId = toast.loading(`Generating Master ${type === 'packages' ? 'Package Matrix' : 'Chemical Catalog'}...`);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // --- Helper: Premium Header ---
    const drawHeader = (title: string, subtitle: string) => {
      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(192, 132, 252);
      doc.text(title, 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(`${subtitle} | Master Reference File`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
      return 55;
    };

    // --- Helper: Section Title ---
    const drawSectionTitle = (text: string, y: number, color: [number, number, number] = [192, 132, 252]) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text.toUpperCase(), 14, y);
      doc.setDrawColor(color[0], color[1], color[2], 0.3);
      doc.setLineWidth(0.8);
      doc.line(14, y + 2, 196, y + 2);
      return y + 12;
    };

    if (type === 'packages') {
      currentY = drawHeader("Rick's Master Matrix", "Global Service Package Advice Catalog");
      activePackages.forEach(pkg => {
        const tip = tips.find(t => t.packageId === pkg.id);
        const pkgChems = availableChemicals.filter(c => tip?.chemicalIds.includes(c.id));
        
        currentY = drawSectionTitle(pkg.name, currentY);
        
        // Advice Text
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(tip?.notes || "No custom advice set for this package.", 182);
        doc.text(splitNotes, 14, currentY);
        currentY += (splitNotes.length * 6) + 8;

        // Chemicals Table
        autoTable(doc, {
          startY: currentY,
          head: [['Chemical Product', 'Brand', 'Category']],
          body: pkgChems.map(c => [c.name, c.brand || 'N/A', c.category || 'General']),
          theme: 'striped',
          headStyles: { fillColor: [15, 22, 41] },
          styles: { fontSize: 9 },
          margin: { left: 20 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
      });
    } else {
      currentY = drawHeader(type === 'batch-selected' ? "Rick's Custom Selection" : "Rick's Strategic Catalog", type === 'batch-selected' ? "Custom PDF" : "Full Chemical Asset Reference");
      const targetChems = type === 'batch-selected' ? availableChemicals.filter(c => batchPrintIds.includes(c.id)) : availableChemicals;

      targetChems.forEach(chem => {
        const desc = getChemDesc(chem.id);
        
        doc.setFont("helvetica", "normal");
        const splitPurpose = doc.splitTextToSize(desc?.purpose || "—", 156);
        const splitInst = doc.splitTextToSize(desc?.instructions || "Standard application procedures.", 156);
        
        if (currentY > 260) { doc.addPage(); currentY = 20; }
        
        currentY = drawSectionTitle(`${chem.name} (${chem.brand})`, currentY, [56, 189, 248]);
        
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("PURPOSE:", 14, currentY);
        doc.setFont("helvetica", "normal");
        
        splitPurpose.forEach((line: string, i: number) => {
          if (currentY > 280) { doc.addPage(); currentY = 20; }
          doc.text(line, 40, currentY);
          if (i < splitPurpose.length - 1) currentY += 5;
        });
        currentY += 8;

        if (currentY > 270) { doc.addPage(); currentY = 20; }

        doc.setFont("helvetica", "bold");
        doc.text("USAGE:", 14, currentY);
        doc.setFont("helvetica", "normal");
        
        splitInst.forEach((line: string, i: number) => {
          if (currentY > 280) { doc.addPage(); currentY = 20; }
          doc.text(line, 40, currentY);
          if (i < splitInst.length - 1) currentY += 5;
        });
        currentY += 8;

        autoTable(doc, {
          startY: currentY,
          head: [['Scenario', 'Professional Ratio']],
          body: (desc?.dilutions || DEFAULT_SCENARIOS).map(dil => [dil.scenario, dil.ratio]),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [15, 22, 41] },
          margin: { left: 40 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    doc.save(`Ricks_${type === 'packages' ? 'Package_Matrix' : type === 'batch-selected' ? 'Custom_Selection' : 'Chemical_Catalog'}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Catalog Saved Successfully", { id: toastId });
  };

  const isAllSelected = filteredChemicals.length > 0 && filteredChemicals.every(c => currentTip.chemicalIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] md:h-[85vh] bg-[#0c1220] border-slate-800 text-white flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">

        <DialogHeader className="p-4 md:p-6 border-b border-slate-800/60 bg-[#0f1629] shrink-0 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 shrink-0">
                <FlaskConical className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-left flex items-center gap-2">
                  Rick's Tips
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'ricks-tips' } }));
                    }}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors inline-flex items-center justify-center no-print"
                    title="Open Help Guide"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-400/60 hover:text-purple-400" />
                  </button>
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-[10px] md:text-sm text-left">
                  {activeTab === 'package' 
                    ? "Map specific chemicals and professional advice to your live service packages."
                    : activeTab === 'description' 
                      ? "Standalone chemical reference for properties, usage, and dilutions."
                      : "Job Preparation Checklist: Controlled list of chemicals and ratios for today's jobs."
                  }
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-800 self-center md:self-auto shrink-0 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('package')}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'package' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Package Advice
              </button>
              <button 
                onClick={() => setActiveTab('description')}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'description' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Chemical Description
              </button>
              <button 
                onClick={() => setActiveTab('prep')}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'prep' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Job Setup
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden" ref={printRef}>
          {activeTab === 'package' ? (
            <>
              {/* Top Bar: Packages Dropdown */}
              <div className="p-4 border-b border-slate-800/60 bg-black/40 shrink-0 z-10 no-print">
                <div className="max-w-xl mx-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selected Service Package</label>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <button onClick={resetToDefaults} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 group" title="Reset to Rick's Defaults">
                             <span className="text-[9px] font-black uppercase text-red-400 hidden group-hover:inline">Reset Defaults</span>
                             <Zap className="w-4 h-4 text-red-400" />
                          </button>
                          <button onClick={refreshInventory} className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors flex items-center gap-1 group" title="Refresh & Sync Inventory">
                             <span className="text-[9px] font-black uppercase text-purple-400 hidden group-hover:inline">Refresh Inventory</span>
                             <RefreshCw className={`w-4 h-4 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      )}
                      {!isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700 mr-2">
                           <Lock className="w-3 h-3 text-amber-500" />
                           <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Read Only</span>
                        </div>
                      )}
                      <button onClick={() => handlePrint('master-packages')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Print Master Matrix">
                        <span className="text-[9px] font-black uppercase text-emerald-400 hidden group-hover:inline">Full Matrix</span>
                        <Printer className="w-4 h-4 text-emerald-400" />
                      </button>
                      <button onClick={() => saveMasterCatalog('packages')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Save Master PDF">
                        <FileText className="w-4 h-4 text-sky-400" />
                      </button>
                    </div>
                  </div>
                  <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 h-14 text-white focus:ring-purple-500/50">
                      <SelectValue placeholder="Select a Service Package" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[40vh]">
                      {activePackages.map(pkg => (
                        <SelectItem key={String(pkg.id)} value={String(pkg.id)} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-semibold">{pkg.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {tips.find(t => t.packageId === pkg.id)?.chemicalIds.length || 0} Chemicals assigned
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-[#0f1629]/30 custom-scrollbar">
                {/* Notes Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                      Professional Advice
                      <div className="flex items-center gap-1 ml-2 no-print">
                        <button onClick={() => handlePrint('single-package')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Print Selection">
                          <Printer className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button onClick={() => handleSavePDF()} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Save PDF File">
                          <FileText className="w-4 h-4 text-sky-400" />
                        </button>
                      </div>
                    </h4>
                    <Badge variant="outline" className="bg-blue-500/5 border-blue-500/20 text-blue-400 text-[9px] md:text-[10px] uppercase tracking-tighter">
                      Rick's Pro Tip
                    </Badge>
                  </div>
                  <textarea
                    ref={notesRef}
                    value={currentTip.notes}
                    onChange={(e) => updateNotes(e.target.value)}
                    readOnly={!isAdmin}
                    placeholder={isAdmin ? "Enter job-specific chemical advice here... (e.g., 'Use high alkaline soap if organic debris is heavy')" : "View only: Detailing advice is managed by administrators."}
                    className={`w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none text-base md:text-lg leading-relaxed shadow-inner overflow-hidden ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                  />
                </section>

                {/* Chemical Assignment */}
                <section className="space-y-4 md:space-y-6 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h4 className="text-base md:text-lg font-bold flex items-center gap-2 shrink-0">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Recommended Chemicals
                    </h4>
                    <div className="flex flex-col min-[450px]:flex-row items-stretch min-[450px]:items-center gap-3 w-full sm:w-auto">
                       <div className="flex items-center justify-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors">
                         <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
                         <label htmlFor="select-all" className="text-xs font-medium text-slate-300 cursor-pointer">Select All Shown</label>
                       </div>
                      <div className="relative flex-1 sm:w-56 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search inventory..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900/80 border border-slate-700/50 rounded-full pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selected Chemicals Area */}
                  {selectedChemicals.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 md:p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl min-h-[60px]">
                      {selectedChemicals.map(chem => (
                        <Badge key={chem.id} className="bg-purple-500/20 text-purple-200 border-purple-500/30 flex items-center gap-2 py-1.5 pl-3 pr-1 group shadow-sm transition-all hover:bg-purple-500/30">
                          <span className="font-semibold text-xs md:text-sm">{chem.name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleChemical(chem.id); }}
                            className="p-1 hover:bg-purple-500/40 rounded-full transition-colors focus:outline-none"
                          >
                            <Trash2 className="w-3 h-3 text-purple-300" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Chemical Picker Header with Count */}
                  <div className="flex items-center justify-between mb-4 mt-8">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                       Inventory Database
                       <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-2 py-0 h-5 text-[9px] font-black">
                         {availableChemicals.length} Products
                       </Badge>
                    </h4>
                    <div className="h-[1px] flex-1 bg-slate-800/50 mx-4" />
                  </div>

                  {/* Chemical Picker Grid - Compact Squares */}
                  <div className="grid grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                      {filteredChemicals.map(chem => {
                        const chemId = String(chem.id);
                        const libId = chem.chemical_library_id ? String(chem.chemical_library_id) : null;
                        const isSelected = currentTip.chemicalIds.some(id => {
                          const sId = String(id);
                          return sId === chemId || (libId && sId === libId);
                        });
                      return (
                        <Popover key={chem.id}>
                          <PopoverTrigger asChild>
                            <button className={`relative aspect-square rounded-xl md:rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-center bg-slate-900 focus:outline-none group ${
                              isSelected 
                                ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                                : 'border-slate-800 hover:border-slate-600'
                            }`}>
                              {chem.primary_image_url ? (
                                <img src={chem.primary_image_url} alt={chem.name} className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${!isSelected ? 'opacity-70 group-hover:opacity-100' : 'opacity-100'}`} />
                              ) : (
                                <FlaskConical className={`w-8 h-8 md:w-10 md:h-10 ${isSelected ? 'text-purple-400' : 'text-slate-600'}`} />
                              )}
                              
                              {/* Selection Indicator Overlay */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-purple-500/10 flex items-start justify-end p-1.5 md:p-2 pointer-events-none">
                                  <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </div>
                                </div>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent sideOffset={8} className="w-64 bg-slate-900 border-slate-700 outline-none shadow-2xl p-4 flex flex-col gap-4 rounded-xl z-[300]">
                             <div className="flex gap-3 items-start">
                                 <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center border border-slate-700">
                                    {chem.primary_image_url ? <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" /> : <FlaskConical className="w-6 h-6 text-slate-500" />}
                                 </div>
                                 <div className="min-w-0">
                                     <h4 className="text-sm font-bold text-white leading-tight mb-1">{chem.name}</h4>
                                     <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{chem.brand || 'No Brand'}</p>
                                 </div>
                             </div>
                             <button 
                               onClick={() => toggleChemical(chem.id)}
                               className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                                 isSelected 
                                   ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                                   : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/20'
                               }`}
                             >
                                {isSelected ? (
                                  <>
                                    <Trash2 className="w-4 h-4" />
                                    Remove from Package
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Add to Package
                                  </>
                                )}
                             </button>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          ) : activeTab === 'description' ? (
            <>
               {/* Chemical Selector Top Bar */}
               <div className="p-4 border-b border-slate-800/60 bg-black/40 shrink-0 z-10">
                <div className="max-w-xl mx-auto flex flex-col gap-2">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-3">
                        Describe Individual Chemical
                        <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] border border-purple-500/20 font-black">
                          Total Chemicals = {availableChemicals.length}
                        </span>
                        {latestChemicalDate && (
                          <span className="text-[10px] text-slate-500 font-medium lowercase">
                            (last updated: {latestChemicalDate})
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Print Options">
                              <Printer className="w-4 h-4 text-emerald-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent sideOffset={8} className="w-48 p-1 bg-slate-900 border-slate-700 rounded-xl shadow-xl z-[400]">
                            <button onClick={() => handlePrint('master-chemicals')} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors rounded-lg flex items-center gap-3">
                              <Printer className="w-4 h-4 text-emerald-400" /> 
                              All Chemicals
                            </button>
                            <button onClick={() => setIsBatchModalOpen(true)} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors rounded-lg flex items-center gap-3">
                              <CheckSquare className="w-4 h-4 text-sky-400" /> 
                              Select Chemicals...
                            </button>
                          </PopoverContent>
                        </Popover>

                        <div className="w-px h-4 bg-slate-800"></div>

                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Save PDF Options">
                              <FileText className="w-4 h-4 text-sky-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent sideOffset={8} className="w-48 p-1 bg-slate-900 border-slate-700 rounded-xl shadow-xl z-[400]">
                            <button onClick={() => saveMasterCatalog('chemicals')} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors rounded-lg flex items-center gap-3">
                              <FileText className="w-4 h-4 text-emerald-400" /> 
                              All Chemicals
                            </button>
                            <button onClick={() => setIsBatchModalOpen(true)} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors rounded-lg flex items-center gap-3">
                              <CheckSquare className="w-4 h-4 text-sky-400" /> 
                              Select Chemicals...
                            </button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={chemicalSortBy}
                      onChange={(e) => setChemicalSortBy(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-sm h-14 px-3 text-white rounded-md focus:ring-purple-500/50 sm:w-1/3"
                    >
                      <option value="brand">By Brand (All)</option>
                      <option value="alphabetical">A-Z List</option>
                      {chemicalSortOptions.length > 0 && (
                        <optgroup label="Jump to Brand">
                          {chemicalSortOptions.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <Select 
                      value={selectedChemicalId} 
                      onValueChange={(val) => { setSelectedChemicalId(val); setChemicalSearchText(''); }}
                      onOpenChange={(open) => { if (!open) setChemicalSearchText(''); }}
                    >
                      <SelectTrigger className="w-full sm:w-2/3 bg-slate-900 border-slate-700 h-14 text-white focus:ring-purple-500/50">
                        <SelectValue placeholder="Select a Chemical" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[40vh]">
                        <div className="p-2 sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                              type="text"
                              placeholder="Search chemical..."
                              value={chemicalSearchText}
                              onChange={(e) => setChemicalSearchText(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="w-full bg-slate-800 border-slate-700 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-white"
                            />
                          </div>
                        </div>
                        {displayChemicals.length === 0 ? (
                           <div className="p-4 text-center text-sm text-slate-500">No chemicals found.</div>
                        ) : (
                           displayChemicals.map(chem => (
                             <SelectItem key={String(chem.id)} value={String(chem.id)} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-slate-800 border border-slate-700">
                                     {chem.primary_image_url ? <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" /> : <FlaskConical className="w-4 h-4 m-2 text-slate-500" />}
                                  </div>
                                  <div className="flex flex-col gap-0.5 items-start">
                                     <span className="font-semibold text-sm">{chem.name}</span>
                                     <span className="text-[10px] text-slate-500 uppercase tracking-tight">{chem.brand}</span>
                                  </div>
                               </div>
                             </SelectItem>
                           ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#0f1629]/30 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="space-y-6 lg:col-span-3">
                    {/* What it does */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-sky-400" />
                        Chemical Properties & Purpose
                        <div className="flex items-center gap-1 ml-2 no-print">
                          <button onClick={() => handlePrint('single-chemical')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Print Selection">
                            <Printer className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button onClick={() => handleSavePDF()} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Save PDF File">
                            <FileText className="w-4 h-4 text-sky-400" />
                          </button>
                        </div>
                      </h4>
                      <Textarea 
                        value={currentDesc.purpose}
                        onChange={(e) => updateDescField('purpose', e.target.value)}
                        placeholder="What is this chemical designed for? (e.g., 'A high-foaming pH neutral soap for safely removing surface grit without stripping wax...')"
                        className="bg-slate-900/50 border-slate-800 min-h-[180px] focus:ring-purple-500/20 text-base text-white"
                      />
                    </div>

                    {/* How to use */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        Application Instructions
                      </h4>
                      <Textarea 
                        value={currentDesc.instructions}
                        onChange={(e) => updateDescField('instructions', e.target.value)}
                        placeholder="Step-by-step professional usage guide..."
                        className="bg-slate-900/50 border-slate-800 min-h-[240px] focus:ring-purple-500/20 text-base text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 lg:col-span-1">
                    {/* Dilution Scenarios */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <List className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="truncate">Dilution & Scenarios</span>
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={addDilutionRow}
                          className="h-7 px-2 text-[10px] uppercase font-black text-purple-400 hover:text-white hover:bg-purple-500/20"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Scenario
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {(currentDesc.dilutions || []).map((row, idx) => (
                          <Card key={idx} className="bg-slate-900/40 border-slate-800 p-3 relative group">
                            <div className="flex flex-col gap-3">
                               <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Job Scenario</label>
                                 <Input 
                                   value={row.scenario}
                                   onChange={(e) => updateDilutionRow(idx, { scenario: e.target.value })}
                                   placeholder="e.g. Foam Cannon"
                                   className="bg-black/60 border-slate-700 h-10 text-sm text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                                 />
                               </div>
                               <div className="flex gap-3 items-end">
                                 <div className="flex-1 space-y-1.5">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Ratio</label>
                                   <Input 
                                     value={row.ratio}
                                     onChange={(e) => updateDilutionRow(idx, { ratio: e.target.value })}
                                     placeholder="e.g. 10:1"
                                     className="bg-black/60 border-slate-700 h-10 text-sm text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                                   />
                                 </div>
                                 <div className="pb-1 shrink-0">
                                    <button 
                                      onClick={() => removeDilutionRow(idx)}
                                      className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                               </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Job Prep Mode */}
              <div className="p-4 border-b border-slate-800/60 bg-black/40 shrink-0 z-10 no-print">
                <div className="max-w-xl mx-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manage Job Setup Checklist</label>
                    <div className="flex items-center gap-1">
                       <button onClick={() => handlePrint('master-packages')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 group" title="Print FULL Setup Chart">
                          <Printer className="w-4 h-4 text-emerald-400" />
                       </button>
                       <button onClick={() => handlePrint('full-prep' as any)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 group" title="SAVE FULL PDF File">
                          <span className="text-[9px] font-black uppercase text-sky-400 hidden group-hover:inline">Save PDF</span>
                          <FileText className="w-4 h-4 text-sky-400" />
                       </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select onValueChange={addToPrepList}>
                      <SelectTrigger className="w-full bg-slate-900 border-slate-700 h-12 text-white focus:ring-purple-500/50">
                        <SelectValue placeholder="Add Chemical to Prep List..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[40vh]">
                        {availableChemicals.filter(c => !prepList.includes(c.id)).map(chem => (
                          <SelectItem key={chem.id} value={chem.id} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-slate-800 border border-slate-700">
                                  {chem.primary_image_url ? <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" /> : <FlaskConical className="w-4 h-4 m-2 text-slate-500" />}
                               </div>
                               <span className="font-semibold text-sm">{chem.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
 
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0f1629]/30 custom-scrollbar" id="full-job-prep">
                 <div className="max-w-5xl mx-auto space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                       {/* Interior Column */}
                       <div className="space-y-4" id="print-interior">
                          <div className="flex items-center gap-3 border-b border-sky-500/30 pb-3">
                             <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                                <Package className="w-5 h-5 text-sky-400" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tighter text-sky-400 italic flex-1">Interior Preparation</h3>
                             <div className="flex items-center gap-1 no-print ml-2">
                                <button onClick={() => handlePrint('prep-interior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Print Interior Only">
                                   <Printer className="w-4 h-4 text-emerald-400" />
                                </button>
                                <button onClick={() => handlePrint('prep-interior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Save Interior PDF">
                                   <FileText className="w-4 h-4 text-sky-400" />
                                </button>
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                             {availableChemicals
                               .filter(c => prepList.includes(c.id))
                               .filter(c => {
                                  const name = c.name.toLowerCase();
                                  return (c.category?.toLowerCase() === 'interior') || 
                                         ['perfection', 'buster', 'bomber', 'terminator', 'xpress'].some(n => name.includes(n));
                               })
                               .map(chem => {
                                  const desc = getChemDesc(chem.id);
                                  return (
                                    <Card key={chem.id} className="bg-slate-900/60 border-slate-800 p-4 hover:border-sky-500/30 transition-all group relative border-l-4 border-l-sky-500/50 shadow-lg">
                                       <button 
                                         onClick={() => removeFromPrepList(chem.id)}
                                         className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-500/70 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all no-print border border-red-500/10"
                                         title="Remove from Prep List"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                       <div className="flex justify-between items-start mb-3 pr-6">
                                          <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                                {chem.primary_image_url ? (
                                                  <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  <FlaskConical className="w-5 h-5 m-2.5 text-slate-600" />
                                                )}
                                             </div>
                                             <div>
                                                <h4 className="font-bold text-white leading-tight">{chem.name}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{chem.brand}</p>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="grid grid-cols-1 gap-2">
                                          {(desc?.dilutions || DEFAULT_SCENARIOS).map((dil, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-slate-800/50 group-hover:border-sky-500/20">
                                               <span className="text-[11px] font-medium text-slate-400">{dil.scenario}</span>
                                               <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/20 font-black text-xs">{dil.ratio || "N/A"}</Badge>
                                            </div>
                                          ))}
                                       </div>
                                    </Card>
                                  );
                               })}
                          </div>
                       </div>
 
                       {/* Exterior Column */}
                       <div className="space-y-4" id="print-exterior">
                          <div className="flex items-center gap-3 border-b border-amber-500/30 pb-3">
                             <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                <Zap className="w-5 h-5 text-amber-400" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tighter text-amber-400 italic flex-1">Exterior Preparation</h3>
                             <div className="flex items-center gap-1 no-print ml-2">
                                <button onClick={() => handlePrint('prep-exterior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Print Exterior Only">
                                   <Printer className="w-4 h-4 text-emerald-400" />
                                </button>
                                <button onClick={() => handlePrint('prep-exterior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Save Exterior PDF">
                                   <FileText className="w-4 h-4 text-sky-400" />
                                </button>
                             </div>
                          </div>

                          <div className="space-y-3">
                             {availableChemicals
                               .filter(c => prepList.includes(c.id))
                               .filter(c => {
                                  const name = c.name.toLowerCase();
                                  if (['perfection', 'buster', 'bomber', 'terminator', 'xpress'].some(n => name.includes(n)) && !name.includes('pink perfection')) {
                                     return false;
                                  }
                                  return (c.category?.toLowerCase() === 'exterior') || 
                                         ['gold class', 'warrior', 'dark fury', 'formula 4', 'spray wax', 'aqua gloss', 'apc', 'pink perfection'].some(n => name.includes(n));
                               })
                               .map(chem => {
                                  const desc = getChemDesc(chem.id);
                                  return (
                                    <Card key={chem.id} className="bg-slate-900/60 border-slate-800 p-4 hover:border-amber-500/30 transition-all group relative border-l-4 border-l-amber-500/50 shadow-lg">
                                       <button 
                                         onClick={() => removeFromPrepList(chem.id)}
                                         className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-500/70 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all no-print border border-red-500/10"
                                         title="Remove from Prep List"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                       <div className="flex justify-between items-start mb-3 pr-6">
                                          <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                                {chem.primary_image_url ? (
                                                  <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  <FlaskConical className="w-5 h-5 m-2.5 text-slate-600" />
                                                )}
                                             </div>
                                             <div>
                                                <h4 className="font-bold text-white leading-tight">{chem.name}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{chem.brand}</p>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="grid grid-cols-1 gap-2">
                                          {(desc?.dilutions || DEFAULT_SCENARIOS).map((dil, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-slate-800/50 group-hover:border-amber-500/20">
                                               <span className="text-[11px] font-medium text-slate-400">{dil.scenario}</span>
                                               <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/20 font-black text-xs">{dil.ratio || "N/A"}</Badge>
                                            </div>
                                          ))}
                                       </div>
                                    </Card>
                                  );
                               })}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>

        <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
          <DialogContent className="w-[90vw] max-w-2xl h-[80vh] bg-slate-900 border-slate-700 text-white flex flex-col p-0 overflow-hidden rounded-xl shadow-2xl z-[500]">
            <DialogHeader className="p-4 border-b border-slate-800 bg-[#0f1629] shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <FileText className="w-5 h-5 text-sky-400" />
                Batch Select for Print/PDF
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Select the specific chemicals you want to compile into a single document.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                 <button 
                   onClick={() => setBatchPrintIds(batchPrintIds.length === availableChemicals.length ? [] : availableChemicals.map(c => c.id))}
                   className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider"
                 >
                   {batchPrintIds.length === availableChemicals.length ? "Deselect All" : "Select All"}
                 </button>
                 <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20">
                   {batchPrintIds.length} Selected
                 </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableChemicals.map(chem => (
                  <label key={chem.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${batchPrintIds.includes(chem.id) ? 'bg-sky-500/10 border-sky-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
                    <Checkbox 
                      checked={batchPrintIds.includes(chem.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setBatchPrintIds([...batchPrintIds, chem.id]);
                        else setBatchPrintIds(batchPrintIds.filter(id => id !== chem.id));
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{chem.name}</p>
                      <p className="text-xs text-slate-400 truncate">{chem.brand || 'No Brand'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f1629] shrink-0 flex items-center justify-end gap-3">
              <button onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button 
                disabled={batchPrintIds.length === 0}
                onClick={() => { handlePrint('batch-selected'); setIsBatchModalOpen(false); }} 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print Selected
              </button>
              <button 
                disabled={batchPrintIds.length === 0}
                onClick={() => { saveMasterCatalog('batch-selected'); setIsBatchModalOpen(false); }} 
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                Save PDF
              </button>
            </div>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}
