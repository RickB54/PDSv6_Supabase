import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Save, Package, FlaskConical, Trash2, Plus, Info, Zap, Check, CheckSquare, List, MessageSquare, Droplets, BookOpen, Printer, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { servicePackages } from '@/lib/services';
import { getCombinedSelectableProducts } from '@/lib/chemicals';
import { toast } from 'sonner';
import { contentService } from '@/lib/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

export default function RicksTipsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'package' | 'description' | 'prep'>('package');
  const [tips, setTips] = useState<TipMapping[]>([]);
  const [descriptions, setDescriptions] = useState<ChemicalDescription[]>([]);
  const [prepList, setPrepList] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(servicePackages[0]?.id || '');
  const [selectedChemicalId, setSelectedChemicalId] = useState<string>('');
  const [availableChemicals, setAvailableChemicals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const dataInitialized = useRef(false);

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
        
        // Auto-seed descriptions & prep list strictly from chart if new
        const { seededDescs, seededPrep, changed } = seedChemicalData(chems, loadedDescs, loadedPrepItems);
        
        if (changed) {
           loadedDescs = seededDescs;
           loadedPrepItems = seededPrep;
           await saveToSupabase(loadedTips, seededDescs, seededPrep);
        }

        setTips(loadedTips);
        setDescriptions(loadedDescs);
        setPrepList(loadedPrepItems);
        dataInitialized.current = true;

        if (chems.length > 0 && !selectedChemicalId) {
          setSelectedChemicalId(chems[0].id);
        }
      } catch (e) {
        console.error("Failed to load Rick's tips", e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [open]);

  const seedChemicalData = (chems: any[], currentDescs: ChemicalDescription[], currentPrep: string[]): { seededDescs: ChemicalDescription[], seededPrep: string[], changed: boolean } => {
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
    let changed = false;

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

    return { seededDescs, seededPrep, changed };
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
    const found = descriptions.find(d => d.id === selectedChemicalId);
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
    setTips(newTips);
    saveToSupabase(newTips, descriptions, prepList);
  };

  const updateDescriptions = (newDescs: ChemicalDescription[]) => {
    setDescriptions(newDescs);
    saveToSupabase(tips, newDescs, prepList);
  };

  const toggleChemical = (chemId: string) => {
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];

    if (existingIndex > -1) {
      const chemIndex = newTips[existingIndex].chemicalIds.indexOf(chemId);
      if (chemIndex > -1) {
        newTips[existingIndex].chemicalIds.splice(chemIndex, 1);
      } else {
        newTips[existingIndex].chemicalIds.push(chemId);
      }
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [chemId], notes: '' });
    }
    updateTips(newTips);
  };

  const updateNotes = (notes: string) => {
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];
    if (existingIndex > -1) {
      newTips[existingIndex].notes = notes;
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [], notes });
    }
    updateTips(newTips);
  };

  const updateDescField = (field: keyof ChemicalDescription, value: any) => {
    const existingIndex = descriptions.findIndex(d => d.id === selectedChemicalId);
    let newDescs = [...descriptions];
    if (existingIndex > -1) {
      newDescs[existingIndex] = { ...currentDesc, [field]: value };
    } else {
      newDescs.push({ ...currentDesc, [field]: value });
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

  const selectedChemicals = availableChemicals.filter(c => currentTip.chemicalIds.includes(c.id));

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


  const handleSavePDF = (targetId?: string) => {
    const element = targetId ? document.getElementById(targetId) : printRef.current;
    if (!element) return;

    const opt = {
      margin: 10 as number | [number, number],
      filename: `RicksChemicalTips_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#0c1220'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Create a temporary clone for colorful styling
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.background = '#0c1220';
    clone.style.color = 'white';
    clone.style.padding = '20px';
    
    // Add the header to the clone
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="border-bottom: 2px solid #2d3748; margin-bottom: 30px; padding-bottom: 20px;">
        <h1 style="color: #c084fc; font-size: 28px; font-family: sans-serif; font-style: italic; font-weight: 900; margin: 0;">Rick's Command Center</h1>
        <p style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Professional Auto Detailing - Generated ${new Date().toLocaleDateString()}</p>
      </div>
    `;
    clone.prepend(header);

    html2pdf().set(opt).from(clone).save()
      .then(() => {
        toast.success("PDF Downloaded Successfully");
      })
      .catch((err) => {
        console.error("PDF Error:", err);
        toast.error("PDF Generation Failed");
      });
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

  const handlePrint = (type: 'single-package' | 'single-chemical' | 'master-packages' | 'master-chemicals' | 'prep-interior' | 'prep-exterior') => {
    let title = "Rick's Chemical Report";
    let contentHtml = '';

    if (type === 'single-package') {
      const pkg = servicePackages.find(p => p.id === selectedPackageId);
      const pkgChems = availableChemicals.filter(c => currentTip.chemicalIds.includes(c.id));
      title = `${pkg?.name || 'Service'} Advice`;
      contentHtml = `
        <div class="item-container">
          <h2>Recommendations</h2>
          <p>${currentTip.notes || "No custom advice set."}</p>
          <h2>Chemical Listing</h2>
          ${pkgChems.map(c => `
            <div class="data-row">
              <span><span class="label">Product:</span> ${c.name}</span>
              <span class="value">${c.brand}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (type === 'single-chemical') {
      const chem = availableChemicals.find(c => c.id === selectedChemicalId);
      title = `Chemical Reference: ${chem?.name || 'Product'}`;
      contentHtml = `
        <div class="item-container">
          <p><span class="label">Brand:</span> ${chem?.brand}</p>
          <h2>Purpose</h2>
          <p>${currentDesc.purpose || "Professional properties."}</p>
          <h2>Usage Instructions</h2>
          <p>${currentDesc.instructions || "Standard application."}</p>
          <h2>Dilution Scenarios</h2>
          ${(currentDesc.dilutions || DEFAULT_SCENARIOS).map(dil => `
            <div class="data-row">
              <span>${dil.scenario}</span>
              <span class="value">${dil.ratio}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (type === 'master-packages') {
      title = "Master Package Advice Matrix";
      contentHtml = servicePackages.map(pkg => {
        const tip = tips.find(t => t.packageId === pkg.id);
        const pkgChems = availableChemicals.filter(c => tip?.chemicalIds.includes(c.id));
        return `
          <div class="item-container">
            <h2>${pkg.name} Advice</h2>
            <p>${tip?.notes || "No custom advice set."}</p>
            <div style="margin-left: 20px;">
              ${pkgChems.map(c => `<p>• <strong>${c.name}</strong> (${c.brand})</p>`).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else if (type === 'prep-interior' || type === 'prep-exterior') {
      const isInterior = type === 'prep-interior';
      title = `${isInterior ? 'Interior' : 'Exterior'} Preparation Guide`;
      const filtered = availableChemicals
        .filter(c => prepList.includes(c.id))
        .filter(c => {
          const name = c.name.toLowerCase();
          if (isInterior) {
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

      contentHtml = filtered.map(chem => {
        const desc = descriptions.find(d => d.id === chem.id);
        return `
          <div class="item-container">
            <h2>${chem.name}</h2>
            <div style="margin-bottom: 5px;"><span class="label">Brand:</span> ${chem.brand}</div>
            ${(desc?.dilutions || DEFAULT_SCENARIOS).map(dil => `
              <div class="data-row" style="padding: 5px;">
                <span>${dil.scenario}</span>
                <span class="value">${dil.ratio || 'N/A'}</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('');
    } else if (type === 'master-chemicals') {
      title = "Master Chemical Reference Catalog";
      contentHtml = availableChemicals.map(chem => {
        const desc = descriptions.find(d => d.id === chem.id);
        if (!desc) return '';
        return `
          <div class="item-container">
            <h2>${chem.name} (${chem.brand})</h2>
            <p><strong>Purpose:</strong> ${desc.purpose || "Generic properties."}</p>
            <p><strong>Usage:</strong> ${desc.instructions || "Standard application."}</p>
            <h4>Dilution Matrix</h4>
            ${(desc.dilutions || DEFAULT_SCENARIOS).map(dil => `
              <div class="data-row">
                <span>${dil.scenario}</span>
                <span class="value">${dil.ratio}</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('');
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateCleanPrintHtml(title, contentHtml));
      printWindow.document.close();
      printWindow.focus();
      // Small timeout to allow images/styles to load if any added later
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const saveMasterCatalog = (type: 'packages' | 'chemicals') => {
    toast.loading(`Generating Master ${type === 'packages' ? 'Package Matrix' : 'Chemical Catalog'}...`);
    
    let contentHtml = '';
    
    if (type === 'packages') {
      contentHtml = servicePackages.map(pkg => {
        const tip = tips.find(t => t.packageId === pkg.id);
        const pkgChems = availableChemicals.filter(c => tip?.chemicalIds.includes(c.id));
        return `
          <div style="margin-bottom: 50px; break-inside: avoid; border: 1px solid #2d3748; background: #1a2235; padding: 25px; border-radius: 12px;">
            <h2 style="color: #c084fc; font-style: italic; margin-bottom: 15px; font-size: 24px; text-transform: uppercase;">${pkg.name} Advice</h2>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
              <p style="color: white; font-size: 14px; white-space: pre-wrap;">${tip?.notes || "No custom advice set for this package."}</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
              ${pkgChems.map(c => `
                <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.05);">
                  <div style="font-weight: bold; color: white; font-size: 13px;">${c.name}</div>
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${c.brand}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      contentHtml = availableChemicals.map(chem => {
        const desc = descriptions.find(d => d.id === chem.id);
        if (!desc) return '';
        return `
          <div style="margin-bottom: 60px; break-inside: avoid; border: 1px solid #2d3748; background: #1a2235; padding: 30px; border-radius: 16px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px;">
              ${chem.primary_image_url ? `<img src="${chem.primary_image_url}" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover; border: 2px solid #2d3748;" />` : ''}
              <div>
                <h2 style="color: #38bdf8; font-style: italic; font-weight: 900; margin: 0; font-size: 28px; text-transform: uppercase;">${chem.name}</h2>
                <div style="color: #94a3b8; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; font-size: 11px;">${chem.brand} Master Reference</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 25px;">
              <div>
                <h4 style="color: #34d399; text-transform: uppercase; font-size: 13px; border-bottom: 1px solid rgba(52,211,153,0.2); padding-bottom: 6px; margin-bottom: 10px;">Purpose & Instructions</h4>
                <p style="color: white; font-size: 14px; margin-bottom: 15px; opacity: 0.9;"><strong>Purpose:</strong> ${desc.purpose || "Generic properties."}</p>
                <p style="color: white; font-size: 14px; opacity: 0.9;"><strong>Usage:</strong> ${desc.instructions || "Standard application."}</p>
              </div>
              <div>
                <h4 style="color: #c084fc; text-transform: uppercase; font-size: 13px; border-bottom: 1px solid rgba(192,132,252,0.2); padding-bottom: 6px; margin-bottom: 12px;">Dilution Scenarios</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  ${(desc.dilutions || DEFAULT_SCENARIOS).map(dil => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                      <span style="font-size: 11px; color: #94a3b8;">${dil.scenario}</span>
                      <span style="background: rgba(192,132,252,0.2); color: #c084fc; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 11px;">${dil.ratio}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const wrapper = document.createElement('div');
    wrapper.style.background = '#0c1220';
    wrapper.style.color = 'white';
    wrapper.style.padding = '40px';
    wrapper.style.fontFamily = 'sans-serif';
    
    wrapper.innerHTML = `
      <div style="border-bottom: 3px solid #2d3748; margin-bottom: 40px; padding-bottom: 25px;">
        <h1 style="color: #c084fc; font-size: 32px; font-style: italic; font-weight: 900; margin: 0; text-transform: uppercase;">Rick's Master ${type === 'packages' ? 'Matrix' : 'Catalog'}</h1>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <p style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Professional Auto Detailing Reference</p>
          <p style="color: #94a3b8; font-size: 10px;">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>
      <div>${contentHtml}</div>
    `;

    const opt = {
      margin: 15,
      filename: `Ricks_${type === 'packages' ? 'Package_Matrix' : 'Chemical_Catalog'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0c1220' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(wrapper).save()
      .then(() => {
        toast.dismiss();
        toast.success("Master Catalog Downloaded Successfully");
      })
      .catch((err) => {
        console.error("PDF Error:", err);
        toast.dismiss();
        toast.error("Generation Failed");
      });
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
                <DialogTitle className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-left">
                  Rick's Tips
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
                      <button onClick={() => handlePrint('master-packages')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Print Master Matrix">
                        <span className="text-[9px] font-black uppercase text-emerald-400 hidden group-hover:inline">All Packages</span>
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
                      {servicePackages.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
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
                        <button onClick={() => handlePrint()} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Print Selection">
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
                    value={currentTip.notes}
                    onChange={(e) => updateNotes(e.target.value)}
                    placeholder="Enter job-specific chemical advice here... (e.g., 'Use high alkaline soap if organic debris is heavy')"
                    className="w-full h-28 md:h-32 bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none text-base md:text-lg leading-relaxed shadow-inner"
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
                          className="w-full bg-slate-900/80 border border-slate-700/50 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
                        />
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

                  {/* Chemical Picker Grid - Compact Squares */}
                  <div className="grid grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                    {filteredChemicals.map(chem => {
                      const isSelected = currentTip.chemicalIds.includes(chem.id);
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
                          <PopoverContent sideOffset={8} className="w-64 bg-slate-900 border-slate-700 outline-none shadow-2xl p-4 flex flex-col gap-4 rounded-xl z-[100]">
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
                                    <CheckSquare className="w-4 h-4" />
                                    Select Component
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
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Describe Individual Chemical</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handlePrint('full-chemical-catalog')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Print Master Chemical Catalog">
                          <span className="text-[9px] font-black uppercase text-emerald-400 hidden group-hover:inline">All Chemicals</span>
                          <Printer className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button onClick={() => saveMasterCatalog('chemicals')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 group" title="Save Master PDF">
                          <FileText className="w-4 h-4 text-sky-400" />
                        </button>
                      </div>
                    </div>
                  <Select value={selectedChemicalId} onValueChange={setSelectedChemicalId}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 h-14 text-white focus:ring-purple-500/50">
                      <SelectValue placeholder="Select a Chemical" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[40vh]">
                      {availableChemicals.map(chem => (
                        <SelectItem key={chem.id} value={chem.id} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
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
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#0f1629]/30 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* What it does */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-sky-400" />
                        Chemical Properties & Purpose
                        <div className="flex items-center gap-1 ml-2 no-print">
                          <button onClick={() => handlePrint()} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Print Selection">
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
                        className="bg-slate-900/50 border-slate-800 min-h-[120px] focus:ring-purple-500/20 text-base text-white"
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
                        className="bg-slate-900/50 border-slate-800 min-h-[160px] focus:ring-purple-500/20 text-base text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Dilution Scenarios */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <List className="w-4 h-4 text-purple-400" />
                          Dilution & Job Scenarios
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
                            <div className="grid grid-cols-12 gap-3 items-end">
                               <div className="col-span-7 space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Job Scenario</label>
                                 <Input 
                                   value={row.scenario}
                                   onChange={(e) => updateDilutionRow(idx, { scenario: e.target.value })}
                                   placeholder="e.g. Foam Cannon"
                                   className="bg-black/60 border-slate-700 h-10 text-sm text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                                 />
                               </div>
                               <div className="col-span-4 space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Ratio</label>
                                 <Input 
                                   value={row.ratio}
                                   onChange={(e) => updateDilutionRow(idx, { ratio: e.target.value })}
                                   placeholder="e.g. 10:1"
                                   className="bg-black/60 border-slate-700 h-10 text-sm text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                                 />
                               </div>
                               <div className="col-span-1 flex justify-end pb-1">
                                  <button 
                                    onClick={() => removeDilutionRow(idx)}
                                    className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
                       <button onClick={() => handlePrint('full-job-prep')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 group" title="Print FULL Setup Chart">
                          <Printer className="w-4 h-4 text-emerald-400" />
                       </button>
                       <button onClick={() => handleSavePDF('full-job-prep')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 group" title="SAVE FULL PDF File">
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
                                <button onClick={() => handleSavePDF('print-interior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Save Interior PDF">
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
                                  const desc = descriptions.find(d => d.id === chem.id);
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
                                <button onClick={() => handleSavePDF('print-exterior')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shadow-inner border border-white/5" title="Save Exterior PDF">
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
                                  const desc = descriptions.find(d => d.id === chem.id);
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

      </DialogContent>
    </Dialog>
  );
}
