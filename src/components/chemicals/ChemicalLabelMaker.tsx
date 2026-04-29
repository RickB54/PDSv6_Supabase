import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Tag, 
    Printer, 
    Download, 
    Sparkles, 
    Type, 
    Droplets, 
    AlertTriangle, 
    Settings2,
    Loader2,
    Sun,
    Moon,
    HelpCircle,
    Layout,
    Trash2,
    Wand2,
    Save,
    Plus,
    RotateCcw,
    Calculator,
    Check,
    Waves,
    Flame,
    Sparkle,
    FileText
} from 'lucide-react';
import { Chemical } from '@/types/chemicals';
import { getCombinedSelectableProducts, updateChemicalPartial } from '@/lib/chemicals';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import HelpModal from '@/components/help/HelpModal';
import { DilutionCalculator } from '@/pages/DilutionCalculator';

const mapScenarioLabel = (val: string) => {
    const s = (val || '').toLowerCase();
    if (s.match(/heavy|grime|deep|strong|worst|dirty|very dirty|degrease|tough/)) return "HEAVY DUTY";
    if (s.match(/light|standard|daily|maintenance|slightly dirty|fair|rinse|quick/)) {
        if (s.match(/maintenance|light|rinse/)) return "MAINTENANCE";
        return "STANDARD";
    }
    if (s.match(/interior|cabin|seats|carpet|dash|upholstery|leather|inside/)) return "INTERIOR";
    if (s.match(/exterior|outside|paint|body|wash|soap|foam/)) return "EXTERIOR";
    return (val || '').toUpperCase();
};

const findBestRatio = (type: string, chem: Chemical | null, fallbackRatio: string = '') => {
    const ratios = chem?.dilution_ratios || [];
    if (ratios.length === 0) return fallbackRatio;

    // 1. Keyword search (most accurate)
    const match = ratios.find(r => {
        const l = ((r.soil_level || '') + ' ' + (r.method || '')).toLowerCase();
        if (type === 'Interior') return l.match(/interior|cabin|inside|seats|carpet|dash|upholstery|leather|vinyl/);
        if (type === 'Exterior') return l.match(/exterior|outside|paint|body|wash|foam|soap/);
        if (type === 'Very Dirty') return l.match(/heavy|grime|deep|strong|worst|dirty|very dirty|degrease|engine/);
        if (type === 'Slightly Dirty') return l.match(/light|standard|daily|maintenance|slightly dirty|fair|quick|rinse/);
        return false;
    });

    if (match) return match.ratio;

    // 2. Logic-based hierarchy fallback: [0] is strongest, [last] is mildest
    if (ratios.length >= 2) {
        if (type === 'Very Dirty') return ratios[0].ratio;
        if (type === 'Slightly Dirty') return ratios[ratios.length - 1].ratio;
        if (type === 'Interior' && ratios.length >= 3) return ratios[1].ratio;
    }

    return ratios[0].ratio;
};

interface ChemicalLabelMakerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialChemical?: Chemical | null;
    onOpenRefChart?: () => void;
}

type LabelSize = 'Small (4oz)' | 'Mini (8oz)' | 'Medium (16oz)' | 'Large (24oz)' | 'X-Large (32oz)' | 'Sticker (4x3)';

interface SavedLabelTemplate {
    id: string;
    templateName: string;
    chemicalId: string;
    content: {
        name: string;
        brand: string;
        description: string;
        instructions: string;
        dilutionRatio: string;
        safetyWarning: string;
        imageUrl: string;
        freeformText: string;
        scenarioRatios: {
            standard: string;
            heavy: string;
            light: string;
            interior: string;
            exterior: string;
        };
    };
    style: {
        size: LabelSize;
        fontSize: 'Small' | 'Medium' | 'Large' | 'Extra Large' | 'XL';
        themeColor: string;
        showImage: boolean;
        showWarnings: boolean;
        showBrand: boolean;
        showDescription: boolean;
        showDilutionTable: boolean;
        boldMode: boolean;
        splitRatios: boolean;
        showFreeform: boolean;
        showBlankForm: boolean;
        showInstructions: boolean;
        showPrimaryRatio: boolean;
        showInterior: boolean;
        showExterior: boolean;
        showHeavy: boolean;
        showLight: boolean;
        printTheme: 'Dark' | 'Light';
    };
    createdAt: string;
}

export function ChemicalLabelMaker({ open, onOpenChange, initialChemical, onOpenRefChart }: ChemicalLabelMakerProps) {
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(initialChemical || null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('edit');
    const [showHelp, setShowHelp] = useState(false);
    const [helpTopicId, setHelpTopicId] = useState('chemical-label-maker');

    // Add print styles
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body * { visibility: hidden !important; }
                .freeform-print-page, .freeform-print-page * { visibility: visible !important; }
                .freeform-print-page { 
                    position: fixed !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 8.5in !important; 
                    height: 11in !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                    transform: scale(1) !important;
                    background: white !important;
                    box-shadow: none !important;
                    border: none !important;
                    display: block !important;
                }
                @page { size: letter portrait; margin: 0; }
                .no-print { display: none !important; }
            }
        `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    const [savedTemplates, setSavedTemplates] = useState<SavedLabelTemplate[]>([]);
    const [newTemplateName, setNewTemplateName] = useState('');

    // Label Content State
    const [labelContent, setLabelContent] = useState({
        name: '',
        brand: '',
        description: '',
        instructions: '',
        dilutionRatio: '',
        safetyWarning: '',
        imageUrl: '',
        freeformText: '',
        scenarioRatios: {
            standard: '',
            heavy: '',
            light: '',
            interior: '',
            exterior: ''
        }
    });

    // Label Style State
    const [labelStyle, setLabelStyle] = useState({
        size: 'Medium (16oz)' as LabelSize,
        fontSize: 'Medium' as 'Small' | 'Medium' | 'Large' | 'Extra Large' | 'XL',
        themeColor: '#8b5cf6',
        showImage: true,
        showWarnings: true,
        showBrand: true,
        showDescription: true,
        showDilutionTable: true,
        boldMode: true,
        splitRatios: false, 
        showFreeform: true,
        showBlankForm: true,
        showInstructions: true,
        showPrimaryRatio: true,
        showInterior: true,
        showExterior: true,
        showHeavy: true,
        showLight: true,
        printTheme: 'Light' as 'Dark' | 'Light',
    });

    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'editor' | 'calculator' | 'freeform'>('freeform');
    const [hasChanges, setHasChanges] = useState(false);
    const [selectedForBatch, setSelectedForBatch] = useState<string[]>([]);
    
    const [freeformConfig, setFreeformConfig] = useState({
        name: true,
        ratio: true,
        notes: true,
        customText: 'Write something here...',
        fontSize: 14,
        labelsPerPage: 10,
        pageZoom: 0.8, // Default zoom
    });

    const [sheetLabels, setSheetLabels] = useState<Array<any>>(Array(10).fill(null));

    // Auto-populate sheet if it's the default view and empty
    useEffect(() => {
        if (open && viewMode === 'freeform' && sheetLabels.every(s => s === null) && labelContent.name) {
            setSheetLabels(Array(10).fill({ ...labelContent }));
        }
    }, [open, viewMode, labelContent.name]);

    const saveRatiosToLibrary = async () => {
        if (!selectedChemical) return;
        try {
            const newRatios = [
                { method: 'Standard', ratio: labelContent.scenarioRatios.standard, soil_level: 'standard' },
                { method: 'Heavy Duty', ratio: labelContent.scenarioRatios.heavy, soil_level: 'heavy duty / concentrated' },
                { method: 'Maintenance', ratio: labelContent.scenarioRatios.light, soil_level: 'maintenance / light' }
            ];
            const { error } = await updateChemicalPartial(selectedChemical.id, { dilution_ratios: newRatios });
            if (error) throw error;
            toast({ title: "Reference Chart Updated", description: "Ratios have been synced to the main reference chart." });
        } catch (err) {
            console.error(err);
            toast({ title: "Sync Failed", description: "Could not update the reference chart.", variant: "destructive" });
        }
    };

    const skipDefaultApplicator = useRef(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);

    // Auto-fit scale effect
    useEffect(() => {
        if (viewMode === 'freeform' && pageContainerRef.current) {
            const container = pageContainerRef.current;
            const updateScale = () => {
                const containerWidth = container.clientWidth - 60;
                const containerHeight = container.clientHeight - 60;
                const pageWidth = 816; // 8.5in at 96dpi
                const pageHeight = 1056; // 11in at 96dpi
                
                const scaleW = containerWidth / pageWidth;
                const scaleH = containerHeight / pageHeight;
                const newScale = Math.min(scaleW, scaleH, 1);
                
                setFreeformConfig(prev => ({ ...prev, pageZoom: newScale }));
            };
            
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [viewMode]);


    // Track changes for the "Save Changes" button
    useEffect(() => {
        if (!activeTemplateId) {
            setHasChanges(false);
            return;
        }
        const active = savedTemplates.find(t => t.id === activeTemplateId);
        if (active) {
            const isDirty = JSON.stringify(active.content) !== JSON.stringify(labelContent) || 
                            JSON.stringify(active.style) !== JSON.stringify(labelStyle);
            setHasChanges(isDirty);
        }
    }, [labelContent, labelStyle, activeTemplateId, savedTemplates]);

    useEffect(() => {
        if (open) {
            loadChemicals();
            const saved = localStorage.getItem('chemical_label_templates');
            if (saved) setSavedTemplates(JSON.parse(saved));
            
            // Sync selected chemical if provided
            if (initialChemical) {
                setSelectedChemical(initialChemical);
            }
        }
    }, [open, initialChemical]);

    useEffect(() => {
        if (selectedChemical) {
            if (skipDefaultApplicator.current) {
                skipDefaultApplicator.current = false;
                return;
            }

            const ratios = selectedChemical.dilution_ratios || [];
            const sorted = [...ratios].sort((a,b) => {
               const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
               const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
               return pA - pB;
            });
            
            const standard = sorted.find(r => r.soil_level.toLowerCase().includes('standard')) || sorted[0];
            const heavy = sorted.find(r => r.soil_level.toLowerCase().includes('heavy')) || (sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0]);
            const maintenance = sorted.find(r => r.soil_level.toLowerCase().includes('maintenance') || r.soil_level.toLowerCase().includes('light')) || (sorted.length > 2 ? sorted[1] : sorted[0]);

            setLabelContent({
                name: selectedChemical.name,
                brand: selectedChemical.brand || '',
                description: selectedChemical.description || '',
                instructions: selectedChemical.application_guide?.notes || 'Apply following standard procedures.',
                dilutionRatio: standard?.ratio || '',
                safetyWarning: selectedChemical.warnings?.risks?.[0] || 'No specific hazard warnings.',
                imageUrl: selectedChemical.primary_image_url || '',
                freeformText: '',
                scenarioRatios: {
                    standard: standard?.ratio || "RTU",
                    heavy: heavy?.ratio || (standard?.ratio || "RTU"),
                    light: maintenance?.ratio || (standard?.ratio || "RTU"),
                    interior: ratios.find(r => r.soil_level.toLowerCase().includes('interior'))?.ratio || (standard?.ratio || "RTU"),
                    exterior: ratios.find(r => r.soil_level.toLowerCase().includes('exterior'))?.ratio || (standard?.ratio || "RTU")
                }
            });
            setLabelStyle(prev => ({
                ...prev,
                themeColor: selectedChemical.theme_color || '#8b5cf6',
            }));
        }
    }, [selectedChemical]);

    const loadChemicals = async () => {
        setLoading(true);
        try {
            const data = await getCombinedSelectableProducts();
            setChemicals(data);
        } finally {
            setLoading(false);
        }
    };

    const handleAiGenerate = () => {
        if (!selectedChemical) return;
        
        const condensedDesc = `${selectedChemical.name} is a professional ${selectedChemical.category.toLowerCase()} detailing solution. Optimized for ${(selectedChemical.used_for || []).slice(0, 3).join(', ')}.`;
        
        let condensedInst = selectedChemical.application_guide?.notes || 'Apply following standard procedures.';
        
        if (selectedChemical.dilution_ratios && selectedChemical.dilution_ratios.length > 0) {
            const ratios = selectedChemical.dilution_ratios;
            
            const taskRatios = {
                interior: ratios.filter(r => r.soil_level?.toLowerCase().includes('interior') || r.method?.toLowerCase().includes('interior')),
                wheels: ratios.filter(r => r.soil_level?.toLowerCase().includes('wheel') || r.soil_level?.toLowerCase().includes('tire')),
                bugs: ratios.filter(r => r.soil_level?.toLowerCase().includes('bug') || r.soil_level?.toLowerCase().includes('sap')),
                heavy: ratios.filter(r => r.soil_level?.toLowerCase().includes('heavy') || r.soil_level?.toLowerCase().includes('grime')),
                general: ratios.filter(r => !r.soil_level?.toLowerCase().match(/interior|wheel|tire|bug|sap|heavy/))
            };

            let ratioText = "\n\nREQUIRED MIXING RATIOS:";
            if (taskRatios.interior.length) ratioText += `\n🛋️ INTERIOR: ${taskRatios.interior[0].ratio}`;
            if (taskRatios.general.length) ratioText += `\n🚗 EXTERIOR: ${taskRatios.general[0].ratio}`;
            if (taskRatios.wheels.length) ratioText += `\n🛞 WHEELS/TIRES: ${taskRatios.wheels[0].ratio}`;
            if (taskRatios.bugs.length) ratioText += `\n🪲 BUG REMOVAL: ${taskRatios.bugs[0].ratio}`;
            if (taskRatios.heavy.length) ratioText += `\n💪 HEAVY GRIME: ${taskRatios.heavy[0].ratio}`;

            condensedInst = `${condensedInst}${ratioText}`;
        }
        
        setLabelContent(prev => ({
            ...prev,
            description: condensedDesc,
            instructions: condensedInst,
            scenarioRatios: {
                standard: findBestRatio('Standard', selectedChemical, ''),
                heavy: findBestRatio('Very Dirty', selectedChemical, ''),
                light: findBestRatio('Maintenance', selectedChemical, '') || findBestRatio('Slightly Dirty', selectedChemical, ''),
                interior: findBestRatio('Interior', selectedChemical, ''),
                exterior: findBestRatio('Exterior', selectedChemical, '')
            }
        }));

        toast({
            title: "AI Optimized",
            description: "Full dilution guide and instructions extracted.",
            className: "bg-purple-900 border-purple-800 text-white"
        });
    };
    const handleResetContent = () => {
        if (!selectedChemical) return;
        setLabelContent({
            name: selectedChemical.name,
            brand: selectedChemical.brand || '',
            description: selectedChemical.description || '',
            instructions: selectedChemical.application_guide?.notes || 'Apply following standard procedures.',
            dilutionRatio: selectedChemical.dilution_ratios?.[0]?.ratio || '',
            safetyWarning: selectedChemical.warnings?.risks?.[0] || 'No specific hazard warnings.',
            imageUrl: selectedChemical.primary_image_url || '',
            freeformText: '',
            scenarioRatios: {
                interior: findBestRatio('Interior', selectedChemical, ''),
                exterior: findBestRatio('Exterior', selectedChemical, ''),
                heavy: findBestRatio('Very Dirty', selectedChemical, ''),
                light: findBestRatio('Slightly Dirty', selectedChemical, ''),
                standard: (selectedChemical.dilution_ratios || []).find(r => r.soil_level.toLowerCase().includes('standard'))?.ratio || ''
            }
        });
        toast({ title: "Content Reset", description: "Labels restored to original chemical specs." });
    };

    const handleSaveTemplate = () => {
        if (!selectedChemical) {
            toast({ title: "Selection Required", description: "You must choose a chemical before you can save a design.", variant: "destructive" });
            return;
        }

        if (!labelContent.name.trim()) {
            toast({ title: "Product Name Missing", description: "Label must have a name to be saved.", variant: "destructive" });
            return;
        }

        if (!newTemplateName.trim()) {
            if (activeTemplateId) {
                const confirmed = window.confirm("Design name is empty. Would you like to UPDATE the current saved label with these changes instead?");
                if (confirmed) {
                    handleUpdateTemplate();
                    return;
                }
            }
            toast({ title: "Name Required", description: "Please enter a design name to save this as a new template.", variant: "destructive" });
            return;
        }

        const newTemplate: SavedLabelTemplate = {
            id: Date.now().toString(),
            templateName: newTemplateName,
            chemicalId: selectedChemical?.id || 'manual',
            content: { ...labelContent },
            style: { ...labelStyle },
            createdAt: new Date().toISOString()
        };

        const updated = [newTemplate, ...savedTemplates];
        setSavedTemplates(updated);
        localStorage.setItem('chemical_label_templates', JSON.stringify(updated));
        setNewTemplateName('');
        setActiveTemplateId(newTemplate.id);
        setHasChanges(false);
        
        toast({ title: "Design Saved", description: `"${newTemplateName}" is now in your collection.` });
    };

    const handleLoadTemplate = (template: SavedLabelTemplate) => {
        if (hasChanges) {
            const saveFirst = window.confirm("You have unsaved changes on your current label. Would you like to SAVE them before switching? (Select 'Cancel' to Discard and switch)");
            if (saveFirst) {
                handleUpdateTemplate();
            }
        }

        skipDefaultApplicator.current = true;
        setLabelContent({
            ...labelContent,
            ...template.content,
            scenarioRatios: {
                standard: template.content.scenarioRatios?.standard || '',
                heavy: template.content.scenarioRatios?.heavy || '',
                light: template.content.scenarioRatios?.light || '',
                interior: template.content.scenarioRatios?.interior || '',
                exterior: template.content.scenarioRatios?.exterior || ''
            }
        });
        setLabelStyle(template.style);
        setActiveTemplateId(template.id);
        if (template.chemicalId !== 'manual') {
            const chem = chemicals.find(c => c.id === template.chemicalId);
            if (chem) setSelectedChemical(chem);
        }
        setHasChanges(false);
        toast({ title: "Design Loaded", description: `Restored '${template.templateName}' settings.` });
    };

    const handleUpdateTemplate = () => {
        if (!activeTemplateId) return;
        
        if (!labelContent.name.trim()) {
            toast({ title: "Update Failed", description: "Cannot save a label with an empty name.", variant: "destructive" });
            return;
        }
        
        const updated = savedTemplates.map(t => {
            if (t.id === activeTemplateId) {
                return {
                    ...t,
                    content: { ...labelContent },
                    style: { ...labelStyle }
                };
            }
            return t;
        });
        
        setSavedTemplates(updated);
        localStorage.setItem('chemical_label_templates', JSON.stringify(updated));
        setHasChanges(false);
        toast({ title: "Template Updated", description: "Permanent changes saved to design." });
    };

    const handleDeleteTemplate = (id: string) => {
        const updated = savedTemplates.filter(t => t.id !== id);
        setSavedTemplates(updated);
        localStorage.setItem('chemical_label_templates', JSON.stringify(updated));
        toast({ title: "Design Removed" });
    };

    const convertImagesToBase64 = async (container: HTMLElement) => {
        const images = container.getElementsByTagName('img');
        const promises = Array.from(images).map(async (img) => {
            try {
                const response = await fetch(img.src, { mode: 'cors' });
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        img.src = reader.result as string;
                        resolve(true);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn("Failed to convert image to base64 for PDF", e);
                return Promise.resolve(false);
            }
        });
        await Promise.all(promises);
    };

    const processLabel = async (element: HTMLElement, pdf: jsPDF) => {
        if (labelStyle.printTheme === 'Light') {
            const allTexts = element.querySelectorAll('*');
            allTexts.forEach((el: any) => {
                el.style.color = '#000000';
                el.style.opacity = '1';
                // REmoved text-stroke as it ruins PDF quality - html2canvas prefers clean fonts
            });
            const ratioBox = element.querySelector('.ratio-box');
            if (ratioBox) (ratioBox as HTMLElement).style.backgroundColor = '#ffffff';
        }

        await convertImagesToBase64(element);

        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            backgroundColor: labelStyle.printTheme === 'Dark' ? '#18181b' : '#ffffff',
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const sizeMap: Record<string, [number, number]> = {
            '4oz': [2.5, 3.5],
            '8oz': [2.75, 4],
            '16oz': [3, 4.4],
            '24oz': [3.5, 5],
            '32oz': [4, 6],
            'Sticker': [4, 3]
        };
        
        const matchedSize = Object.keys(sizeMap).find(k => labelStyle.size.includes(k));
        const [labelWidth, labelHeight] = sizeMap[matchedSize || '16oz'];

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const x = (pageWidth - labelWidth) / 2;
        const y = (pageHeight - labelHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');
    };

    const handleDownloadPdf = async () => {
        if (!previewRef.current) return;
        
        try {
            setLoading(true);
            toast({ title: "Optimizing PDF...", description: "Converting assets for secure download." });
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: [8.5, 11]
            });

            const clone = previewRef.current.cloneNode(true) as HTMLElement;
            clone.style.position = 'fixed';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '800px'; // Force a stable width for generation
            clone.style.transform = 'none';
            clone.style.scale = '1';
            document.body.appendChild(clone);

            const labelBlocks = clone.querySelectorAll('.print-label-block');
            
            if (labelBlocks.length === 0) {
                await processLabel(clone, pdf);
            } else {
                for (let i = 0; i < labelBlocks.length; i++) {
                    const block = labelBlocks[i] as HTMLElement;
                    block.style.display = 'flex';
                    block.style.marginBottom = '0';
                    block.style.position = 'relative';
                    block.style.left = '0';
                    block.style.top = '0';
                    
                    if (i > 0) pdf.addPage();
                    await processLabel(block, pdf);
                }
            }

            pdf.save(`${labelContent.name.replace(/\s+/g, '_')}_Label.pdf`);
            document.body.removeChild(clone);
            toast({ title: "Success!", description: "PDF has been downloaded." });
        } catch (error: any) {
            console.error("PDF Export Error:", error);
            toast({ 
                title: "PDF Error", 
                description: "There was an issue creating the PDF.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBatchPrint = async () => {
        const templatesToPrint = savedTemplates.filter(t => selectedForBatch.includes(t.id));
        if (templatesToPrint.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const baseStyle = `
            body { margin: 0; padding: 5mm; background: white; font-family: sans-serif; }
            .batch-page { 
                width: 200mm; 
                height: 265mm; 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                grid-template-rows: 1fr 1fr; 
                gap: 4mm; 
                page-break-after: always;
                margin: 0 auto;
            }
            .label-item { 
                border: 2px solid #000; padding: 3mm; display: flex; flex-direction: column; overflow: hidden;
                background: white; color: black; box-sizing: border-box; height: 100%; position: relative;
            }
            .chem-img { max-height: 30mm; width: 100%; object-fit: contain; margin-bottom: 2mm; border: 1px solid #eee; padding: 1mm; border-radius: 4px; }
            .badge { display: inline-block; background: #eee; padding: 1mm 2mm; border-radius: 4px; font-size: 7pt; font-weight: 900; }
            @page { margin: 0; size: auto; }
        `;

        // Flatten templates into "slots" (Split = 2 slots, Single = 1 slot)
        const slots: any[] = [];
        templatesToPrint.forEach(t => {
            if (t.style.splitRatios) {
                slots.push({ mode: 'primary', t });
                slots.push({ mode: 'technical', t });
            } else {
                slots.push({ mode: 'all', t });
            }
        });

        let content = '';
        for (let i = 0; i < slots.length; i += 4) {
            content += '<div class="batch-page">';
            const pageSlots = slots.slice(i, i + 4);
            pageSlots.forEach(slot => {
                const { mode, t } = slot;
                content += `
                    <div class="label-item">
                        <div style="height: 2mm; background: ${t.style.themeColor || '#8b5cf6'}; margin-bottom: 2mm;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2mm;">
                            <div style="font-weight: 900; text-transform: uppercase; font-size: 13pt; line-height: 1; min-width: 0;">${t.content.name}</div>
                            ${mode !== 'technical' ? `<div style="border: 1px solid #000; padding: 1mm; font-size: 8pt; font-weight: 900;">${t.content.dilutionRatio}</div>` : ''}
                        </div>
                        
                        ${mode === 'primary' || mode === 'all' ? `
                            ${t.style.showImage ? `<img class="chem-img" src="${t.content.imageUrl}" />` : ''}
                            <div style="font-size: 8pt; font-style: italic; opacity: 0.7; overflow: hidden; max-height: 20mm;">${t.content.description}</div>
                        ` : ''}

                        ${mode === 'technical' || mode === 'all' ? `
                            <div style="margin-top: 3mm; border-top: 1px solid #000; pt: 2mm;">
                                <div style="font-size: 7pt; font-weight: 900; opacity: 0.5; margin-bottom: 1mm;">USAGE GUIDE</div>
                                <div style="font-size: 8pt; white-space: pre-wrap;">${t.content.instructions}</div>
                            </div>
                        ` : ''}

                        ${mode === 'primary' && t.style.showBlankForm ? `
                             <div style="margin-top: auto; border: 1px dashed #ccc; height: 15mm;"></div>
                        ` : ''}
                        
                        ${mode === 'technical' && t.style.showWarnings ? `
                            <div style="margin-top: auto; display: flex; align-items: center; gap: 4px; border-top: 1px solid #000; padding-top: 1mm;">
                                <span style="background: red; color: white; border-radius: 2px; px: 1mm; font-size: 6pt; font-weight: 900;">DANGER</span>
                                <span style="font-size: 7pt; font-weight: 900; color: red;">${t.content.safetyWarning}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            content += '</div>';
        }

        printWindow.document.write(`<html><head><script src="https://cdn.tailwindcss.com"></script><style>${baseStyle}</style></head><body>${content}</body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
    };

    const handleDirectPrint = async () => {
        if (!previewRef.current) return;

        try {
            toast({ title: "Opening Print Context...", description: "Optimizing for " + labelStyle.printTheme + " mode." });
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) throw new Error("Popup blocked");

            const labelWidth = labelStyle.size.includes('4oz') ? '2.5in' : labelStyle.size.includes('8oz') ? '2.75in' : labelStyle.size.includes('16oz') ? '3in' : labelStyle.size.includes('24oz') ? '3.5in' : labelStyle.size.includes('32oz') ? '4in' : '4in';
            const labelHeight = labelStyle.size.includes('4oz') ? '3.5in' : labelStyle.size.includes('8oz') ? '4in' : labelStyle.size.includes('16oz') ? '4.4in' : labelStyle.size.includes('24oz') ? '5in' : labelStyle.size.includes('32oz') ? '6in' : '3in';

            const baseStyle = `
                body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; background: white; font-family: -apple-system, sans-serif; }
                .label-wrapper { margin-bottom: 40px; page-break-after: always; display: flex; justify-content: center; width: 100%; }
                .label-container { 
                    width: ${labelWidth};
                    height: ${labelHeight};
                    border: 2px solid #000; 
                    background: ${labelStyle.printTheme === 'Dark' ? '#18181b' : '#ffffff'}; 
                    color: ${labelStyle.printTheme === 'Dark' ? '#ffffff' : '#000000'}; 
                    display: flex; flex-direction: column; 
                    overflow: hidden;
                    box-sizing: border-box;
                    print-color-adjust: exact;
                }
                @page { size: auto; margin: 0mm; }
                .label-container * { color: inherit !important; box-sizing: border-box; min-width: 0; min-height: 0; }
                .label-container b, .label-container strong { font-weight: 900 !important; }
                
                ${labelStyle.printTheme === 'Light' ? `
                    * { color: #000000 !important; opacity: 1 !important; print-color-adjust: exact !important; }
                    .label-container { color: #000000 !important; background: #ffffff !important; border: 3px solid #000 !important; }
                    .font-black, .font-bold { color: #000000 !important; }
                ` : ''}
            `;

            const generateLabelHtml = (elements: string, isSplitPage?: boolean) => `
                <div class="label-wrapper">
                    <div class="label-container" style="display: flex; flex-direction: column;">
                        <div class="h-2.5 shrink-0" style="background-color: ${labelStyle.themeColor}"></div>
                        <div class="flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
                            ${elements}
                        </div>
                    </div>
                </div>
            `;

            const headerPart = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%; flex-shrink: 0; gap: 12px;">
                    <div style="flex: 1; min-width: 0;">
                        ${labelStyle.showBrand && labelContent.brand ? `<div class="text-[9px] uppercase font-black mb-0.5 tracking-tighter" style="line-height: 1; opacity: 0.7;">${labelContent.brand}</div>` : ''}
                        <div class="font-black uppercase" style="font-size: ${labelStyle.fontSize === 'Small' ? '1.1rem' : labelStyle.fontSize === 'Medium' ? '1.5rem' : labelStyle.fontSize === 'Large' ? '2.1rem' : '2.6rem'}; line-height: 0.95; letter-spacing: -0.04em; white-space: normal; word-break: normal; overflow-wrap: normal;">${labelContent.name || 'Product'}</div>
                    </div>
                    ${labelStyle.showPrimaryRatio ? `
                    <div class="border-2 border-black p-1.5 rounded-lg flex flex-col items-center justify-center min-w-[80px] shrink-0 bg-white ml-3 shadow-sm">
                        <div class="text-[7px] uppercase font-black mb-0.5 opacity-60">Ratio</div>
                        <div class="text-[11px] font-black">${labelContent.dilutionRatio}</div>
                    </div>` : ''}
                </div>
            `;

            const imgPart = labelStyle.showImage && labelContent.imageUrl ? `
                <div class="w-full ${labelStyle.splitRatios ? 'flex-1' : 'h-[100px]'} min-h-0 rounded-md border flex items-center justify-center p-2 mb-3 overflow-hidden bg-white shrink-0">
                    <img src="${labelContent.imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                </div>
            ` : '';

            const descPart = labelStyle.showDescription ? `
                <div class="leading-tight italic mb-2 border-l-4 pl-3 shrink-0 font-bold" style="font-size: ${labelStyle.fontSize === 'Small' ? '9px' : labelStyle.fontSize === 'Medium' ? '10px' : labelStyle.fontSize === 'Large' ? '12px' : '15px'}; max-height: ${labelStyle.splitRatios ? 'none' : '50px'}; overflow: hidden;">
                    ${labelContent.description || 'Professional Formula.'}
                </div>
            ` : '';


            const activeFiltersCount = [labelStyle.showInterior, labelStyle.showExterior, labelStyle.showHeavy, labelStyle.showLight].filter(Boolean).length;
            let displayRatios: {label: string, ratio: string}[] = [];
            if (activeFiltersCount === 0) {
                displayRatios = (selectedChemical?.dilution_ratios || []).map(r => ({
                    label: mapScenarioLabel(r.soil_level || r.method || 'General'),
                    ratio: r.ratio
                }));
            } else {
                if (labelStyle.showInterior) displayRatios.push({ label: 'INTERIOR', ratio: labelContent.scenarioRatios.interior });
                if (labelStyle.showExterior) displayRatios.push({ label: 'EXTERIOR', ratio: labelContent.scenarioRatios.exterior });
                if (labelStyle.showHeavy) displayRatios.push({ label: 'VERY DIRTY', ratio: labelContent.scenarioRatios.heavy });
                if (labelStyle.showLight) displayRatios.push({ label: 'SLIGHTLY DIRTY', ratio: labelContent.scenarioRatios.light });
            }

            const mainRatiosPart = labelStyle.showDilutionTable && displayRatios.length > 0 ? `
                <div class="mb-2 border-2 border-black rounded-md overflow-hidden bg-gray-50 shrink-0">
                    <div class="bg-gray-200 border-b-2 border-black grid grid-cols-2 p-1.5 font-black uppercase text-[7px]">
                        <div>Scenario</div>
                        <div class="text-right">Mix Ratio</div>
                    </div>
                    ${displayRatios.slice(0, 4).map((r: any) => `
                        <div class="grid grid-cols-2 p-1.5 border-b border-black text-[9px] font-bold uppercase last:border-0">
                            <div class="truncate pr-1">${r.label}</div>
                            <div class="text-right font-black">${r.ratio}</div>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            const dangerPart = labelStyle.showWarnings ? `
                <div class="mt-auto pt-2 border-t-2 shrink-0 border-black">
                    <div class="flex items-center gap-2">
                        <span class="bg-red-600 text-white text-[7px] font-black px-1 rounded-sm">DANGER</span>
                        <span class="text-[8px] font-black text-red-500 uppercase truncate">
                            ${labelContent.safetyWarning}
                        </span>
                    </div>
                </div>
            ` : '';

            const instructionsPart = labelStyle.showInstructions ? `
                <div class="${labelStyle.splitRatios ? 'flex-1' : 'shrink'} overflow-hidden">
                    <div class="text-[7px] uppercase font-black mb-1 opacity-60">Usage Guide</div>
                    <div style="font-size: ${labelStyle.fontSize === 'Small' ? '9px' : labelStyle.fontSize === 'Medium' ? '11px' : labelStyle.fontSize === 'Large' ? '13px' : '16px'}; white-space: pre-wrap; line-height: 1.1;" class="font-bold">
                        ${labelContent.instructions}
                    </div>
                </div>
            ` : '';

            const freeformPart = labelStyle.showFreeform ? `
                <div class="mt-2 p-2 border-2 border-black border-dashed min-h-[40px] font-bold shrink-0" style="font-size: ${labelStyle.fontSize === 'Small' ? '9px' : '11px'};">
                    ${labelContent.freeformText || ''}
                </div>
            ` : '';

            const blankPart = labelStyle.showBlankForm ? `
                <div class="mt-2 p-2 border-2 border-black border-dotted min-h-[60px] flex flex-col justify-end shrink-0">
                    <div class="border-b-2 border-black w-full mb-3"></div>
                    <div class="border-b-2 border-black w-full mb-3"></div>
                </div>
            ` : '';

            let finalHtmlSteps = "";
            if (labelStyle.splitRatios) {
                finalHtmlSteps += generateLabelHtml(headerPart + imgPart + descPart + freeformPart + blankPart);
                finalHtmlSteps += generateLabelHtml(headerPart + mainRatiosPart + instructionsPart + dangerPart);
            } else {
                // SINGLE LABEL LAYOUT ORDER:
                // Header (fixed)
                // Content Scroll (img, desc, instruc - flex-1)
                // Footer (ratios, freeform, blank, danger - shrink-0)
                finalHtmlSteps += generateLabelHtml(
                    headerPart + 
                    `<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
                        ${imgPart}
                        ${descPart}
                        ${instructionsPart}
                    </div>` + 
                    `<div class="shrink-0 mt-3">
                        ${mainRatiosPart}
                        ${freeformPart}
                        ${blankPart}
                        ${dangerPart}
                    </div>`
                );
            }

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Labels</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>${baseStyle}</style>
                    </head>
                    <body>
                        ${finalHtmlSteps}
                        <script>
                            window.onload = () => {
                                setTimeout(() => { window.print(); window.close(); }, 800);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();

        } catch (error) {
            console.error("Print Error:", error);
            toast({ title: "Print Failed", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[100vw] w-full h-[100vh] sm:max-w-[95vw] sm:h-[95vh] xl:max-w-[1700px] bg-zinc-950 border-zinc-800 text-white p-0 flex flex-col overflow-hidden sm:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <DialogHeader className="px-8 py-5 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-purple-600/20 rounded-xl">
                            <Tag className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold">
                                    {viewMode === 'freeform' ? `10-Label Sheet — OL125 - 4" x 2"` : 'Chemical Label Maker'}
                                </DialogTitle>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-help', { 
                                            detail: { topicId: 'chemical-label-maker', role: 'admin' } 
                                        }));
                                    }}
                                    className="h-6 w-6 text-zinc-500 hover:text-purple-400"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </Button>
                            </div>
                            <DialogDescription className="text-zinc-500">
                                Design professional labels for your bottles and stickers.
                            </DialogDescription>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button 
                                variant={viewMode === 'freeform' ? "default" : "outline"}
                                onClick={() => {
                                    if (viewMode !== 'freeform') {
                                        // Entering freeform mode - check for selection
                                        const templates = savedTemplates.filter(t => selectedForBatch.includes(t.id));
                                        const newSheet = [...sheetLabels];
                                        
                                        if (templates.length > 0) {
                                            templates.forEach((t, i) => { if (i < 10) newSheet[i] = { ...t.content }; });
                                        } else {
                                            // Fill with current if nothing else assigned
                                            if (newSheet.every(s => s === null)) {
                                                for (let i = 0; i < 10; i++) newSheet[i] = { ...labelContent };
                                            }
                                        }
                                        setSheetLabels(newSheet);
                                    }
                                    setViewMode(viewMode === 'freeform' ? 'editor' : 'freeform');
                                }}
                                className={`h-9 px-4 text-xs font-black gap-2 transition-all ${viewMode === 'freeform' ? 'bg-indigo-600 hover:bg-indigo-500' : 'border-zinc-800 bg-zinc-900 text-indigo-400 hover:bg-zinc-800'}`}
                            >
                                <Layout className="w-4 h-4" />
                                {viewMode === 'freeform' ? "SINGLE LABEL DESIGNER" : "STICKER SHEET EDITOR"}
                            </Button>
                            <Button 
                                 variant="outline" 
                                 onClick={() => {
                                     if (onOpenRefChart) onOpenRefChart();
                                 }}
                                 className="h-9 px-4 text-xs font-black gap-2 border-amber-500/30 bg-zinc-900 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                             >
                                 <FileText className="w-4 h-4" /> REF CHART
                             </Button>
                        </div>
                    </div>
                </DialogHeader>


                {/* Mobile Tabs Switcher */}
                <div className="lg:hidden shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 pt-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
                            <TabsTrigger value="edit">Edit Content</TabsTrigger>
                            <TabsTrigger value="preview">Preview Label</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-zinc-950">
                    {/* Sidebar: Controls */}
                    <div className={`${activeTab === 'preview' ? 'hidden lg:flex' : 'flex'} w-full lg:w-[380px] 2xl:w-[460px] border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/30 flex-col shrink-0`}>
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-6">
                                {/* Chemical Selection */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider">Select Chemical</Label>
                                    <Select 
                                        value={selectedChemical?.id || ""} 
                                        onValueChange={(val) => setSelectedChemical(chemicals.find(c => c.id === val) || null)}
                                    >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
                                            <SelectValue placeholder="Choose a chemical..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                            {chemicals.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>{c.name}</span>
                                                        {(c as any).is_inventory_only && (
                                                            <Badge variant="outline" className="ml-2 text-[8px] h-3 border-amber-500/50 text-amber-500 uppercase px-1">New</Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator className="bg-zinc-800" />

                                {/* Design Config */}
                                <div className="space-y-4">
                                    <h4 className="text-[14px] uppercase font-bold text-zinc-400 flex items-center gap-2">
                                        <Settings2 className="w-4 h-4 text-purple-400" />
                                        Design Configuration
                                    </h4>

                                    <div className="space-y-3 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 shadow-inner">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] uppercase text-zinc-500 font-bold px-1">Design Management</Label>
                                                {selectedChemical && activeTemplateId && hasChanges && labelContent.name.trim() && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={handleUpdateTemplate}
                                                        className="h-5 px-2 text-[9px] bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black font-black border border-yellow-500/30 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                                                    >
                                                        SAVE CHANGES?
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="Design Name..." 
                                                    value={newTemplateName}
                                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs font-bold"
                                                />
                                                <Button 
                                                    onClick={handleSaveTemplate}
                                                    disabled={!selectedChemical}
                                                    className="bg-purple-600 hover:bg-purple-500 h-8 px-3 text-[10px] font-bold shadow-lg shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    SAVE NEW
                                                </Button>
                                            </div>
                                        </div>

                                        <Separator className="bg-zinc-800/30 my-2" />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Size</Label>
                                                <Select 
                                                    value={labelStyle.size} 
                                                    onValueChange={(val) => setLabelStyle(prev => ({ ...prev, size: val as any }))}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-[11px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                        <SelectItem value="4oz">4oz Bottle</SelectItem>
                                                        <SelectItem value="8oz">8oz Bottle</SelectItem>
                                                        <SelectItem value="16oz">16oz Bottle</SelectItem>
                                                        <SelectItem value="24oz">24oz Bottle</SelectItem>
                                                        <SelectItem value="32oz">32oz Bottle</SelectItem>
                                                        <SelectItem value="Sticker">Custom Sticker</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Font</Label>
                                                <Select 
                                                    value={labelStyle.fontSize} 
                                                    onValueChange={(val) => setLabelStyle(prev => ({ ...prev, fontSize: val as any }))}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-[11px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                        <SelectItem value="Small">Small</SelectItem>
                                                        <SelectItem value="Medium">Medium</SelectItem>
                                                        <SelectItem value="Large">Large</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-zinc-500 text-[10px] uppercase font-bold">Print Theme</Label>
                                            <div className="flex gap-1 p-1 bg-zinc-950 rounded border border-zinc-800">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`flex-1 h-7 text-[9px] font-bold ${labelStyle.printTheme === 'Light' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                                                    onClick={() => setLabelStyle(prev => ({ ...prev, printTheme: 'Light' }))}
                                                >
                                                    <Sun className="w-3 h-3 mr-1.5" /> Light
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`flex-1 h-7 text-[9px] font-bold ${labelStyle.printTheme === 'Dark' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                                                    onClick={() => setLabelStyle(prev => ({ ...prev, printTheme: 'Dark' }))}
                                                >
                                                    <Moon className="w-3 h-3 mr-1.5" /> Dark
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex-1">
                                            <h4 className="text-[12px] uppercase font-black text-zinc-400 flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                                Content Tools
                                            </h4>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={handleAiGenerate}
                                                className="h-7 px-2 text-[9px] bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white font-black border border-purple-500/20"
                                            >
                                                AI FIX
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={handleResetContent}
                                                title="Reset to Original"
                                                className="h-7 w-7 p-0 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-black border border-red-500/20"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider px-1">Component Toggles</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-5 px-2 text-[9px] text-zinc-400 hover:text-white"
                                            onClick={() => {
                                                const keys = ["showImage", "showBrand", "showDescription", "showDilutionTable", "showInstructions", "showPrimaryRatio", "showWarnings", "showFreeform", "showBlankForm", "boldMode", "splitRatios"];
                                                const allOn = keys.every(k => (labelStyle as any)[k]);
                                                const newState = { ...labelStyle };
                                                keys.forEach(k => (newState as any)[k] = !allOn);
                                                setLabelStyle(newState);
                                            }}
                                        >
                                            All / None
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: "Pic", key: "showImage" },
                                            { label: "Brand", key: "showBrand" },
                                            { label: "Summary", key: "showDescription" },
                                            { label: "Table", key: "showDilutionTable" },
                                            { label: "Instructions", key: "showInstructions" },
                                            { label: "Ratio", key: "showPrimaryRatio" },
                                            { label: "Alert", key: "showWarnings" },
                                            { label: "Bold", key: "boldMode" },
                                            { label: "Split", key: "splitRatios" },
                                            { label: "Note", key: "showFreeform" },
                                            { label: "Blank", key: "showBlankForm" }
                                        ].map((toggle) => (
                                            <Button 
                                                key={toggle.key} 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setLabelStyle(prev => ({ ...prev, [toggle.key]: !(prev as any)[toggle.key] }))}
                                                className={`h-8 text-[9px] font-bold border transition-all ${labelStyle[toggle.key as keyof typeof labelStyle] ? 'text-green-500 border-green-500/30 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.05)]' : 'text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                                            >
                                                {toggle.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <Separator className="bg-zinc-800" />

                                {/* Scenario Filters */}
                                <div className="space-y-3 pt-1 text-left px-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[12px] uppercase font-black text-zinc-400 flex items-center gap-2">
                                            <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                                            Scenario Filters
                                        </h4>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setViewMode('calculator')}
                                            className="h-7 px-3 text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white font-black border border-blue-500/20 shadow-lg"
                                        >
                                            <Calculator className="w-3.5 h-3.5 mr-2" />
                                            DILUTION CALC
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { label: "Interior", key: "showInterior", contentKey: "interior" },
                                            { label: "Exterior", key: "showExterior", contentKey: "exterior" },
                                            { label: "Very Dirty", key: "showHeavy", contentKey: "heavy" },
                                            { label: "Slightly Dirty", key: "showLight", contentKey: "light" }
                                        ].map((toggle) => (
                                            <div key={toggle.key} className="flex gap-2 items-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setLabelStyle(prev => ({ ...prev, [toggle.key]: !(prev as any)[toggle.key] }))}
                                                    className={`h-8 flex-1 text-[10px] font-black border transition-all ${labelStyle[toggle.key as keyof typeof labelStyle] ? 'text-blue-500 border-blue-500/30 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                                                >
                                                    {toggle.label}
                                                </Button>
                                                {labelStyle[toggle.key as keyof typeof labelStyle] && (
                                                    <Input 
                                                        placeholder="Manual Ratio (20 chars max)"
                                                        value={labelContent.scenarioRatios[toggle.contentKey as keyof typeof labelContent.scenarioRatios]}
                                                        onChange={(e) => setLabelContent(prev => ({
                                                            ...prev,
                                                            scenarioRatios: { ...prev.scenarioRatios, [toggle.contentKey]: e.target.value }
                                                        }))}
                                                        className="h-8 w-48 text-[10px] bg-zinc-950 border-zinc-800 tracking-wider font-mono bold px-2"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-zinc-600 leading-tight italic">
                                        Only selected scenarios show in dilution table.
                                    </p>
                                </div>

                                <Separator className="bg-zinc-800" />

                                {/* Saved List */}
                                <div className="space-y-3 px-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] uppercase font-bold text-zinc-400 flex items-center gap-2">
                                            <Layout className="w-3.5 h-3.5 text-blue-400" />
                                            Saved Templates
                                        </h4>
                                        {savedTemplates.length > 0 && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-5 px-2 text-[9px] text-zinc-500 hover:text-white"
                                                onClick={() => {
                                                    if (selectedForBatch.length === savedTemplates.length) setSelectedForBatch([]);
                                                    else setSelectedForBatch(savedTemplates.map(t => t.id));
                                                }}
                                            >
                                                {selectedForBatch.length === savedTemplates.length ? 'Deselect All' : 'Select All'}
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {savedTemplates.length === 0 ? (
                                        <div className="text-[10px] text-zinc-600 italic px-2">No designs saved.</div>
                                    ) : (
                                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1 scrollbar-hide">
                                            {savedTemplates.map((template) => (
                                                <div 
                                                    key={template.id} 
                                                    className={`group flex items-center gap-3 p-2 rounded border transition-all cursor-pointer ${selectedForBatch.includes(template.id) ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'}`}
                                                    onClick={() => {
                                                        const isSelected = selectedForBatch.includes(template.id);
                                                        if (isSelected) setSelectedForBatch(prev => prev.filter(id => id !== template.id));
                                                        else setSelectedForBatch(prev => [...prev, template.id]);
                                                    }}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${selectedForBatch.includes(template.id) ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-zinc-800 bg-zinc-900 group-hover:border-zinc-600'}`}>
                                                        {selectedForBatch.includes(template.id) && <div className="w-1.5 h-1.5 bg-white rounded-full scale-75" />}
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        <div className="text-[10px] font-black text-zinc-300">{template.templateName}</div>
                                                        <div className="text-[8px] text-zinc-600 uppercase font-bold">{template.content.name || 'Untitled'}</div>
                                                    </div>
                                                    <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={(e) => { e.stopPropagation(); handleLoadTemplate(template); }}
                                                            className="h-7 px-2 text-[8px] text-zinc-500 hover:text-white hover:bg-zinc-800 uppercase font-bold"
                                                        >
                                                            Load
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                                            className="h-7 w-7 p-0 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Separator className="bg-zinc-800" />
                                
                                {selectedChemical && (
                                    <Button 
                                        onClick={handleAiGenerate}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg text-[11px] h-9 font-bold"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                                        AUTO-FIX WITH AI
                                    </Button>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Content: Editor & Preview */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-zinc-950">
                        {/* Editor Forms */}
                        <div className={`${activeTab === 'preview' ? 'hidden md:flex' : 'flex'} flex-[1.6] border-r border-zinc-800 flex-col min-w-0`}>
                            {viewMode === 'calculator' ? (
                                <div className="flex-1 bg-zinc-950 flex flex-col">
                                    <DilutionCalculator 
                                        isModal={true} 
                                        onBack={() => setViewMode('editor')} 
                                        onHelp={() => {
                                            window.dispatchEvent(new CustomEvent('open-help', { 
                                                detail: { topicId: 'prime-dilution-masterclass', role: 'admin' } 
                                            }));
                                        }}
                                    />
                                </div>
                            ) : (
                                <ScrollArea className="flex-1">
                                    <div className="p-6 sm:p-10">
                                        <Accordion type="single" collapsible defaultValue="quick-label" className="w-full space-y-4">
                                            {/* Top Level: Quick Choice Accordion */}
                                            <AccordionItem value="quick-label" className="border border-zinc-800 rounded-xl bg-zinc-900/40 px-6 overflow-hidden shadow-2xl transition-all data-[state=open]:bg-zinc-900/60 data-[state=open]:ring-1 data-[state=open]:ring-amber-500/20">
                                                <AccordionTrigger className="hover:no-underline py-6 group">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 group-data-[state=open]:bg-amber-500 group-data-[state=open]:text-black transition-all">
                                                            <Calculator className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black uppercase tracking-tighter text-white">Quick Dilution Choice</h3>
                                                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Choose scenario from ref chart</p>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 mt-2">
                                                    <div className="space-y-4">
                                                        <Label className="text-amber-500 text-xs font-black uppercase tracking-[0.2em]">Product Reference</Label>
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <div className="flex-1 bg-zinc-950/80 p-5 rounded-xl border border-zinc-800 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-12 w-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold overflow-hidden">
                                                                        {selectedChemical?.primary_image_url ? (
                                                                            <img src={selectedChemical.primary_image_url} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Droplets className="w-6 h-6" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xl font-black text-white uppercase tracking-tighter">
                                                                            {selectedChemical?.name || "Choose a chemical..."}
                                                                        </div>
                                                                        <div className="text-xs text-zinc-500 font-bold">
                                                                            {selectedChemical?.brand || "No brand specified"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Switch Chemical</Label>
                                                                <Select 
                                                                    value={selectedChemical?.id} 
                                                                    onValueChange={(val) => {
                                                                        const found = chemicals.find(c => c.id === val);
                                                                        if (found) setSelectedChemical(found);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-14 font-bold text-zinc-300">
                                                                        <SelectValue placeholder="Pick another product..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                                                                        {chemicals.map(c => (
                                                                            <SelectItem key={c.id} value={c.id} className="focus:bg-zinc-800 focus:text-white py-3">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-bold">{c.name}</span>
                                                                                    <span className="text-[10px] text-zinc-500 uppercase">{c.brand}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 shadow-inner">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
                                                                            <Save className="w-3.5 h-3.5" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Reference Chart Sync</div>
                                                                            <p className="text-[8px] text-zinc-500 font-bold uppercase">Update global chart with these ratios</p>
                                                                        </div>
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        type="button"
                                                                        onClick={saveRatiosToLibrary}
                                                                        className="h-8 px-4 text-[10px] bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white font-black transition-all"
                                                                    >
                                                                        SAVE TO CHART
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-amber-500 text-xs font-black uppercase tracking-[0.2em]">Select Dilution Scenario</Label>
                                                            <Badge variant="outline" className="border-amber-500/20 text-indigo-400 text-[9px] font-black tracking-widest bg-indigo-500/5 uppercase">Synced From Interactive Chart</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {(() => {
                                                                const ratios = selectedChemical?.dilution_ratios || [];
                                                                const sorted = [...ratios].sort((a,b) => {
                                                                    const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                                                                    const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                                                                    return pA - pB;
                                                                });
                                                                const standard = sorted.find(r => r.soil_level.toLowerCase().includes('standard'));
                                                                const heavy = sorted.find(r => r.soil_level.toLowerCase().includes('heavy duty') || r.soil_level.toLowerCase().includes('heavy'));
                                                                const maintenance = sorted.find(r => r.soil_level.toLowerCase().includes('maintenance') || r.soil_level.toLowerCase().includes('light'));

                                                                return [
                                                                    { 
                                                                        label: "Standard", 
                                                                        ratio: standard?.ratio || "Unknown", 
                                                                        activeClass: "border-blue-500 bg-blue-500/20 ring-4 ring-blue-500/10",
                                                                        iconClass: standard ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500",
                                                                        badgeClass: standard ? "bg-blue-500" : "bg-zinc-700",
                                                                        icon: <Waves className="w-4 h-4" /> 
                                                                    },
                                                                    { 
                                                                        label: "Heavy Duty", 
                                                                        ratio: heavy?.ratio || "Unknown", 
                                                                        activeClass: "border-orange-500 bg-orange-500/20 ring-4 ring-orange-500/10",
                                                                        iconClass: heavy ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-500",
                                                                        badgeClass: heavy ? "bg-orange-500" : "bg-zinc-700",
                                                                        icon: <Flame className="w-4 h-4" /> 
                                                                    },
                                                                    { 
                                                                        label: "Maintenance", 
                                                                        ratio: maintenance?.ratio || "Unknown", 
                                                                        activeClass: "border-emerald-500 bg-emerald-500/20 ring-4 ring-emerald-500/10",
                                                                        iconClass: maintenance ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500",
                                                                        badgeClass: maintenance ? "bg-emerald-500" : "bg-zinc-700",
                                                                        icon: <Sparkle className="w-4 h-4" /> 
                                                                    }
                                                                ].map((item) => {
                                                                    const isActive = labelContent.dilutionRatio === item.ratio;
                                                                    return (
                                                                        <button
                                                                            key={item.label}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (item.ratio && item.ratio !== "Unknown") {
                                                                                    setLabelContent(prev => ({ 
                                                                                        ...prev, 
                                                                                        dilutionRatio: item.ratio,
                                                                                        name: selectedChemical?.name || prev.name 
                                                                                    }));
                                                                                    toast({
                                                                                        title: `${item.label} Selected`,
                                                                                        description: `Ratio updated to ${item.ratio}`,
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all gap-2 relative overflow-hidden group ${
                                                                                isActive 
                                                                                    ? item.activeClass 
                                                                                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                                            }`}
                                                                        >
                                                                            <div className={`p-3 rounded-full ${isActive ? item.iconClass : `bg-zinc-900 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300`} transition-all`}>
                                                                                {item.icon}
                                                                            </div>
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{item.label}</div>
                                                                            <div className={`text-2xl font-black ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                                                                {item.ratio || "N/A"}
                                                                            </div>
                                                                            {isActive && (
                                                                                <div className={`absolute top-0 right-0 w-8 h-8 ${item.badgeClass} flex items-center justify-center rounded-bl-xl`}>
                                                                                    <Check className="w-4 h-4 text-white" />
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>

                                            {/* Second Level: Advanced Design Accordion (Collapsed by default) */}
                                            <AccordionItem value="advanced-design" className="border border-zinc-800 rounded-xl bg-zinc-900/20 px-6 overflow-hidden shadow-lg transition-all hover:bg-zinc-900/30">
                                                <AccordionTrigger className="hover:no-underline py-4 group">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="p-2 rounded-full bg-zinc-800 text-zinc-500 group-data-[state=open]:bg-purple-500 group-data-[state=open]:text-white transition-all">
                                                            <Settings2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 group-data-[state=open]:text-zinc-100">Advanced Design Settings</h3>
                                                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Customize all label fields manually</p>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-8 space-y-10 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex flex-col sm:flex-row gap-8 mt-4">
                                                        <div className="space-y-3">
                                                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Product Name Override</Label>
                                                            <Input 
                                                                value={labelContent.name} 
                                                                onChange={(e) => setLabelContent(prev => ({ ...prev, name: e.target.value }))}
                                                                className="bg-zinc-900 border-zinc-800 h-9"
                                                            />
                                                        </div>
                                                        {labelStyle.showBrand && (
                                                            <div className="space-y-3">
                                                                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Brand / Series</Label>
                                                                <Input 
                                                                    value={labelContent.brand} 
                                                                    onChange={(e) => setLabelContent(prev => ({ ...prev, brand: e.target.value }))}
                                                                    className="bg-zinc-900 border-zinc-800 h-9"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {labelStyle.showDescription && (
                                                        <div className="space-y-3">
                                                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Summary Description</Label>
                                                            <Textarea 
                                                                value={labelContent.description} 
                                                                onChange={(e) => setLabelContent(prev => ({ ...prev, description: e.target.value }))}
                                                                className="bg-zinc-900 border-zinc-800 min-h-[140px] text-sm"
                                                            />
                                                        </div>
                                                    )}

                                                    {labelStyle.showPrimaryRatio && (
                                                        <div className="flex flex-col sm:flex-row gap-8">
                                                            <div className="flex-1 space-y-3">
                                                                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Ratio Selection</Label>
                                                                <Select 
                                                                    value={labelContent.dilutionRatio} 
                                                                    onValueChange={(val) => setLabelContent(prev => ({ ...prev, dilutionRatio: val }))}
                                                                >
                                                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
                                                                        <SelectValue placeholder="Select ratio" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                                        <SelectItem value="RTU">RTU (Ready to Use)</SelectItem>
                                                                        {selectedChemical?.dilution_ratios?.map((d, i) => (
                                                                            <SelectItem key={i} value={d.ratio}>{d.ratio} ({d.method})</SelectItem>
                                                                        ))}
                                                                        <SelectItem value="Custom">Manual Entry...</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            {labelContent.dilutionRatio === 'Custom' && (
                                                                <div className="space-y-3">
                                                                     <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Manual Entry</Label>
                                                                     <Input 
                                                                         placeholder="e.g. 1:15"
                                                                         className="bg-zinc-900 border-zinc-800 h-9"
                                                                         onChange={(e) => setLabelContent(prev => ({ ...prev, dilutionRatio: e.target.value }))}
                                                                     />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {labelStyle.showInstructions && (
                                                        <div className="space-y-3">
                                                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Usage Instructions</Label>
                                                            <Textarea 
                                                                value={labelContent.instructions} 
                                                                onChange={(e) => setLabelContent(prev => ({ ...prev, instructions: e.target.value }))}
                                                                className="bg-zinc-900 border-zinc-800 min-h-[250px] text-sm"
                                                            />
                                                        </div>
                                                    )}

                                                    {labelStyle.showWarnings && (
                                                        <div className="space-y-3">
                                                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                                                Safety Alert
                                                            </Label>
                                                            <Input 
                                                                value={labelContent.safetyWarning} 
                                                                onChange={(e) => setLabelContent(prev => ({ ...prev, safetyWarning: e.target.value }))}
                                                                className="bg-zinc-900 border-zinc-800 h-9 text-sm text-red-200"
                                                            />
                                                        </div>
                                                    )}

                                                    {labelStyle.showFreeform && (
                                                        <div className="space-y-3">
                                                            <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Freeform Custom Text</Label>
                                                            <Textarea 
                                                                value={labelContent.freeformText} 
                                                                onChange={(e) => setLabelContent(prev => ({ ...prev, freeformText: e.target.value }))}
                                                                placeholder="Type custom text here..."
                                                                className="bg-zinc-900 border-zinc-800 min-h-[80px] text-sm"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Image Selection */}
                                                    {labelStyle.showImage && selectedChemical?.gallery_image_urls && selectedChemical.gallery_image_urls.length > 0 && (
                                                        <div className="space-y-4">
                                                            <Label className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Choose Photo</Label>
                                                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                                                <button 
                                                                    onClick={() => setLabelContent(prev => ({ ...prev, imageUrl: selectedChemical.primary_image_url || '' }))}
                                                                    className={`shrink-0 w-20 h-20 rounded-xl border-2 transition-all ${labelContent.imageUrl === selectedChemical.primary_image_url ? 'border-purple-500 scale-105 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-zinc-800 hover:border-zinc-700'}`}
                                                                >
                                                                    <img src={selectedChemical.primary_image_url} className="w-full h-full object-cover rounded-lg" />
                                                                </button>
                                                                {selectedChemical.gallery_image_urls.map((url, i) => (
                                                                    <button 
                                                                        key={i}
                                                                        onClick={() => setLabelContent(prev => ({ ...prev, imageUrl: url }))}
                                                                        className={`shrink-0 w-20 h-20 rounded-xl border-2 transition-all ${labelContent.imageUrl === url ? 'border-purple-500 scale-105 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-zinc-800 hover:border-zinc-700'}`}
                                                                    >
                                                                        <img src={url} className="w-full h-full object-cover rounded-lg" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        {viewMode === 'freeform' ? (
                            <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
                                <div className="p-6 border-b border-zinc-900 bg-zinc-950 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-2">Toggle Info:</div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setFreeformConfig(prev => ({ ...prev, name: !prev.name }))}
                                            className={`h-8 px-3 text-[10px] font-bold border ${freeformConfig.name ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-zinc-500 border-zinc-800'}`}
                                        >
                                            Product Name
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setFreeformConfig(prev => ({ ...prev, ratio: !prev.ratio }))}
                                            className={`h-8 px-3 text-[10px] font-bold border ${freeformConfig.ratio ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-zinc-500 border-zinc-800'}`}
                                        >
                                            Precise Ratio
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setFreeformConfig(prev => ({ ...prev, notes: !prev.notes }))}
                                            className={`h-8 px-3 text-[10px] font-bold border ${freeformConfig.notes ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-zinc-500 border-zinc-800'}`}
                                        >
                                            Sticker Style
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 border-l border-zinc-800 pl-6 ml-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-2">Sheet Tools:</div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSheetLabels(Array(10).fill({ ...labelContent }))}
                                            className="h-8 px-3 text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white font-black border border-indigo-500/20"
                                        >
                                            FILL ENTIRE SHEET
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSheetLabels(Array(10).fill(null))}
                                            className="h-8 px-3 text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-black border border-red-500/20"
                                        >
                                            CLEAR SHEET
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex flex-col">
                                            <Label className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Preview Zoom</Label>
                                            <div className="text-[10px] font-black text-indigo-400">
                                                {Math.round(freeformConfig.pageZoom * 100)}%
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <Label className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Font Size</Label>
                                            <Input 
                                                type="number" 
                                                value={freeformConfig.fontSize}
                                                onChange={(e) => setFreeformConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 12 }))}
                                                className="h-8 w-16 bg-zinc-900 border-zinc-800 text-xs"
                                            />
                                        </div>
                                        <Button 
                                            onClick={() => window.print()}
                                            className="bg-green-600 hover:bg-green-500 text-white h-9 px-4 text-xs font-black shadow-lg"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            PRINT STICKER SHEET
                                        </Button>
                                    </div>
                                </div>

                                <div ref={pageContainerRef} className="flex-1 bg-zinc-900 overflow-hidden flex items-center justify-center p-6 relative">
                                    <div className="absolute top-4 left-6 flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-zinc-800 z-10">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Sheet Preview</span>
                                        <span className="text-[10px] font-black text-indigo-400 ml-2">{Math.round(freeformConfig.pageZoom * 100)}% SCALE</span>
                                    </div>

                                    <div 
                                        className="bg-white shadow-[0_0_60px_rgba(0,0,0,0.8)] rounded-sm border border-zinc-200 origin-center flex flex-col freeform-print-page transition-all duration-300 overflow-hidden"
                                        style={{ 
                                            width: '8.5in', 
                                            height: '11.0in', 
                                            transform: `scale(${freeformConfig.pageZoom})`,
                                            padding: '0.5in 0.156in',
                                            flexShrink: 0,
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <div className="grid grid-cols-2 gap-x-[0.187in] gap-y-0 h-full w-full overflow-hidden box-border">
                                            {sheetLabels.map((slot, i) => (
                                                <div 
                                                    key={i} 
                                                    className="w-[4.0in] h-[2.0in] border border-zinc-100/30 p-4 flex flex-col justify-between bg-white text-black overflow-hidden hover:border-indigo-400 group relative box-border"
                                                    style={{ borderRadius: '1.25rem' }}
                                                >
                                                    <div className="absolute top-2 left-3 text-[7px] text-zinc-300 font-bold tracking-widest opacity-40 uppercase no-print">Label Slot {i + 1}</div>
                                                    <div className="absolute top-2 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => {
                                                                const newSheet = [...sheetLabels];
                                                                newSheet[i] = { ...labelContent };
                                                                setSheetLabels(newSheet);
                                                            }}
                                                            className="h-6 px-2 text-[8px] bg-indigo-600 text-white hover:bg-indigo-500 rounded-md font-black shadow-lg"
                                                            title="Apply Current Design to Slot"
                                                        >
                                                            USE CURRENT
                                                        </Button>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-6 px-2 text-[8px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-md font-black border border-zinc-700"
                                                                >
                                                                    PICK SAVED
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-sm font-black uppercase">Assign Saved Design</DialogTitle>
                                                                    <DialogDescription className="text-xs text-zinc-500">Pick a design for Label Slot {i + 1}</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="max-h-[300px] overflow-y-auto space-y-1 p-2">
                                                                    {savedTemplates.map(t => (
                                                                        <button
                                                                            key={t.id}
                                                                            onClick={() => {
                                                                                const newSheet = [...sheetLabels];
                                                                                newSheet[i] = { ...t.content };
                                                                                setSheetLabels(newSheet);
                                                                            }}
                                                                            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all group"
                                                                        >
                                                                            <div className="text-left">
                                                                                <div className="text-[10px] font-black uppercase text-zinc-300 group-hover:text-white">{t.templateName}</div>
                                                                                <div className="text-[8px] text-zinc-600 font-bold uppercase">{t.content.name}</div>
                                                                            </div>
                                                                            <Check className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100" />
                                                                        </button>
                                                                    ))}
                                                                    {savedTemplates.length === 0 && <div className="text-center py-8 text-zinc-600 text-xs italic">No saved designs found</div>}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => {
                                                                const newSheet = [...sheetLabels];
                                                                newSheet[i] = null;
                                                                setSheetLabels(newSheet);
                                                            }}
                                                            className="h-6 w-6 p-0 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-md border border-red-500/20"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>

                                                    {slot ? (
                                                        <>
                                                            {freeformConfig.name && (
                                                                <div className="font-extrabold uppercase tracking-tighter leading-[0.9] border-l-4 border-indigo-600 pl-4" style={{ fontSize: `${freeformConfig.fontSize + 12}px` }}>
                                                                    {slot.name || 'Chemical Name'}
                                                                </div>
                                                            )}

                                                            <div className="flex items-end justify-between gap-8 pointer-events-none">
                                                                <div className="flex-1 min-w-0">
                                                                    {freeformConfig.notes && (
                                                                        <div className="space-y-4">
                                                                            <div className="text-[9px] font-bold uppercase opacity-30 tracking-[0.2em] text-zinc-600">Handwritten Area</div>
                                                                            <div className="border-b-2 border-zinc-950/10 w-full h-[1px]" />
                                                                            <div className="border-b-2 border-zinc-950/10 w-full h-[1px]" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {freeformConfig.ratio && (
                                                                    <div className="border-[4px] border-black p-4 rounded-[20px] flex flex-col items-center justify-center min-w-[90px] shrink-0 bg-white">
                                                                        <div className="text-[10px] uppercase font-black mb-1 opacity-50 tracking-tighter leading-none">Ratio</div>
                                                                        <div className="font-black leading-none" style={{ fontSize: `${freeformConfig.fontSize + 6}px` }}>
                                                                            {slot.dilutionRatio || '1:10'}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex-1 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-300 opacity-50 group-hover:opacity-100 transition-all group-hover:border-indigo-400 group-hover:text-indigo-400">
                                                            <Plus className="w-8 h-8" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Assign Chemical to this Slot</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className={`${activeTab === 'edit' ? 'hidden md:flex' : 'flex'} flex-1 p-6 sm:p-20 flex-col items-center justify-start overflow-auto min-h-[500px] relative bg-black/40`}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.1),transparent)] pointer-events-none" />
                                <div className="absolute top-10 right-10">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => setViewMode('freeform')}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] gap-2 shadow-xl ring-2 ring-indigo-400/20 ring-offset-2 ring-offset-black"
                                    >
                                        <Layout className="w-3 h-3" /> OPEN FULL STICKER SHEET
                                    </Button>
                                </div>
                                <div ref={previewRef} className="flex flex-col items-center gap-12 w-fit min-w-[300px] pt-10 pb-60 origin-top transition-all duration-500">
                                    {labelStyle.splitRatios ? (
                                        <>
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">Label 1: Primary</div>
                                            <LabelBlock labelStyle={labelStyle} labelContent={labelContent} selectedChemical={selectedChemical} mode="primary" />
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">Label 2: Technical</div>
                                            <LabelBlock labelStyle={labelStyle} labelContent={labelContent} selectedChemical={selectedChemical} mode="ratios" />
                                        </>
                                    ) : (
                                        <LabelBlock labelStyle={labelStyle} labelContent={labelContent} selectedChemical={selectedChemical} mode="all" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                <DialogFooter className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-800 bg-zinc-900 text-zinc-400 h-9 text-xs">Cancel</Button>
                    
                    {selectedForBatch.length > 0 && (
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-black shadow-[0_0_15px_rgba(37,99,235,0.3)] animate-in fade-in slide-in-from-right-4" 
                            onClick={handleBatchPrint}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            PRINT GRID ({selectedForBatch.length})
                        </Button>
                    )}

                    <Button 
                        variant="secondary" 
                        className="bg-zinc-800 hover:bg-zinc-700 text-white h-9 text-xs font-bold" 
                        onClick={handleDownloadPdf} 
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 ml-2" /> : <Download className="w-4 h-4 mr-2" />}
                        SAVE PDF
                    </Button>
                    <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white h-9 text-xs font-bold shadow-lg" 
                        onClick={handleDirectPrint} 
                        disabled={loading}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        PRINT LABEL
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LabelBlock({ labelStyle, labelContent, selectedChemical, mode }: any) {
    const isLight = labelStyle.printTheme === 'Light';
    const s = labelStyle.size;
    const w = s.includes('4oz') ? '360px' : s.includes('8oz') ? '398px' : s.includes('16oz') ? '435px' : s.includes('24oz') ? '510px' : s.includes('32oz') ? '570px' : '600px';
    const h = s.includes('4oz') ? '510px' : s.includes('8oz') ? '570px' : s.includes('16oz') ? '645px' : s.includes('24oz') ? '735px' : s.includes('32oz') ? '840px' : '450px';

    const activeFiltersCount = [labelStyle.showInterior, labelStyle.showExterior, labelStyle.showHeavy, labelStyle.showLight].filter(Boolean).length;

    let displayRatios: {label: string, ratio: string}[] = [];
    if (activeFiltersCount === 0) {
        // Show everything available if no specific task filters are toggled
        displayRatios = (selectedChemical?.dilution_ratios || []).map(r => ({
            label: mapScenarioLabel(r.soil_level || r.method || 'General'),
            ratio: r.ratio
        }));
    } else {
        // Build the list precisely based on user-selected toggles
        const ratios = labelContent.scenarioRatios || { interior: '', exterior: '', heavy: '', light: '' };
        
        if (labelStyle.showInterior) displayRatios.push({ label: 'INTERIOR', ratio: ratios.interior });
        if (labelStyle.showExterior) displayRatios.push({ label: 'EXTERIOR', ratio: ratios.exterior });
        if (labelStyle.showHeavy) displayRatios.push({ label: 'VERY DIRTY', ratio: ratios.heavy });
        if (labelStyle.showLight) displayRatios.push({ label: 'SLIGHTLY DIRTY', ratio: ratios.light });
    }


    return (
        <div 
            className={`print-label-block border-2 shadow-2xl overflow-hidden flex flex-col relative shrink-0 transition-colors duration-500 ${isLight ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'}`} 
            style={{ width: w, height: h }}
        >
            <div className="h-2.5 shrink-0" style={{ backgroundColor: labelStyle.themeColor }} />
            <div className={`flex-1 p-4 flex flex-col min-h-0 ${isLight ? 'text-black' : 'text-zinc-100'}`}>
                <div className="flex justify-between items-center mb-4 shrink-0 w-full gap-3">
                    <div className="flex-1 min-w-0">
                        {labelStyle.showBrand && labelContent.brand && (
                            <div className={`text-[9px] uppercase font-black tracking-tighter mb-0.5 ${isLight ? 'text-black opacity-70' : 'text-zinc-500'}`}>
                                {labelContent.brand}
                            </div>
                        )}
                        <h1 
                            className={`font-black uppercase leading-[0.95] tracking-[-0.04em] ${labelStyle.boldMode ? 'italic' : ''}`}
                            style={{ 
                                fontSize: labelStyle.fontSize === 'Small' ? '1.1rem' : 
                                         labelStyle.fontSize === 'Medium' ? '1.5rem' : 
                                         labelStyle.fontSize === 'Large' ? '2.1rem' : '2.6rem',
                                wordBreak: 'normal',
                                whiteSpace: 'normal',
                                overflowWrap: 'normal'
                            }}
                        >
                            {labelContent.name || 'Product'}
                        </h1>
                    </div>
                    {labelStyle.showPrimaryRatio && (
                        <div className={`ratio-box p-1.5 rounded-lg border-2 flex flex-col items-center justify-center min-w-[75px] shrink-0 ${isLight ? 'bg-white border-black text-black' : 'bg-black/50 border-zinc-800 text-white shadow-inner'}`}>
                            <div className="text-[7px] uppercase font-black opacity-60">Ratio</div>
                            <div className="text-[11px] font-black">{labelContent.dilutionRatio}</div>
                        </div>
                    )}
                </div>

                {/* Content Area - Uses flex-1 to push footer down */}
                <div className="flex-1 flex flex-col min-h-0 container-content">
                    {/* TOP AREA: Primary content and Instructions (in single mode) */}
                    <div className={`flex flex-col min-h-0 ${mode === 'all' ? '' : 'flex-1'}`}>
                        {/* 1. Primary Block (Image & Desc) */}
                        {(mode === 'all' || mode === 'primary') && (
                            <>
                                {labelStyle.showImage && labelContent.imageUrl && (
                                    <div className={`w-full ${mode === 'all' ? 'h-[110px]' : 'flex-1'} min-h-0 rounded-xl overflow-hidden mb-3 border flex items-center justify-center p-2 bg-white shrink-0 ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                                        <img src={labelContent.imageUrl} crossOrigin="anonymous" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                                {labelStyle.showDescription && (
                                    <div 
                                        className={`leading-tight italic mb-3 border-l-4 pr-3 py-1 shrink-0 ${isLight ? 'border-black text-black' : 'border-zinc-700 text-zinc-400'} ${labelStyle.boldMode ? 'font-black' : 'font-medium'}`}
                                        style={{ 
                                            fontSize: labelStyle.fontSize === 'Small' ? '9px' : '10px',
                                            maxHeight: mode === 'all' ? '60px' : 'none',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {labelContent.description || 'Professional detailing formula.'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* 2. Usage Guide (Always in technical split, or following desc in single) */}
                        {(mode === 'all' || mode === 'ratios') && labelStyle.showInstructions && (
                            <div className={`min-h-0 overflow-hidden ${mode === 'ratios' ? 'flex-1 mb-2' : 'mb-3'}`}>
                                <div className={`text-[7.5px] uppercase font-black tracking-widest mb-1 ${isLight ? 'text-black' : 'text-zinc-500'}`}>
                                    Usage Guide & Instructions
                                </div>
                                <div 
                                    className={`leading-[1.12] overflow-hidden whitespace-pre-wrap ${isLight ? 'text-black' : 'text-zinc-300'} ${labelStyle.boldMode ? 'font-black' : 'font-bold'}`}
                                    style={{ 
                                        fontSize: labelStyle.fontSize === 'Small' ? '9.5px' : 
                                                 labelStyle.fontSize === 'Medium' ? '11px' : '13px',
                                        flexShrink: 0
                                    }}
                                >
                                    {labelContent.instructions}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BOTTOM AREA: Ratios, Freeform, and Blank Form */}
                    <div className="shrink-0 mt-3">
                        {/* 3. Dilution Table (Always in technical split, or footer in single) */}
                        {(mode === 'all' || mode === 'ratios') && labelStyle.showDilutionTable && displayRatios.length > 0 && (
                            <div className={`mb-3 border-2 rounded-lg overflow-hidden shrink-0 ${isLight ? 'border-black bg-zinc-50' : 'border-zinc-800 bg-black/20'}`}>
                                <div className={`grid grid-cols-2 text-[7px] font-black uppercase p-1.5 border-b-2 ${isLight ? 'border-black bg-zinc-200' : 'border-zinc-800 bg-white/5'}`}>
                                    <div>USAGE SCENARIO</div>
                                    <div className="text-right">MIX RATIO</div>
                                </div>
                                {displayRatios.map((r: any, i: number) => (
                                    <div key={i} className={`grid grid-cols-2 text-[8.5px] p-1.5 font-bold ${i > 0 ? 'border-t' : ''} ${isLight ? 'border-black text-black' : 'border-zinc-800 text-zinc-300'}`}>
                                        <div className="truncate pr-1 uppercase">{r.label}</div>
                                        <div className="text-right font-black tracking-tight">{r.ratio}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 4. Notes & Forms (Always in primary split, or footer in single) */}
                        {(mode === 'all' || mode === 'primary') && (
                            <>
                                {labelStyle.showFreeform && (
                                    <div 
                                        className={`mt-2 p-2.5 border-2 border-dashed rounded-lg mb-3 shrink-0 ${isLight ? 'border-black text-black font-black' : 'border-zinc-700 text-zinc-300'}`}
                                        style={{ fontSize: labelStyle.fontSize === 'Small' ? '9px' : '11px' }}
                                    >
                                        {labelContent.freeformText || 'Custom handwritten notes block...'}
                                    </div>
                                )}

                                {labelStyle.showBlankForm && (
                                    <div className={`mt-1 p-2 border-2 border-dotted rounded-lg min-h-[50px] shrink flex flex-col justify-end mb-2 ${isLight ? 'border-black' : 'border-zinc-700'}`}>
                                        <div className={`border-b-2 w-full mb-2 ${isLight ? 'border-black' : 'border-zinc-800/50'}`} />
                                        <div className={`border-b-2 w-full mb-0.5 ${isLight ? 'border-black' : 'border-zinc-800/50'}`} />
                                        <div className="text-[5.5px] uppercase font-black text-right opacity-40">Notes</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Danger - Always at the very bottom */}
                {labelStyle.showWarnings && mode !== 'primary' && (
                    <div className={`mt-auto pt-2 border-t-2 shrink-0 ${isLight ? 'border-black' : 'border-zinc-800'}`}>
                        <div className="flex items-center gap-2">
                            <span className="bg-red-600 text-white text-[7px] font-black px-1 rounded-sm">DANGER</span>
                            <span className="text-[8px] font-black text-red-500 uppercase truncate">
                                {labelContent.safetyWarning}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
