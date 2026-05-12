import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { 
    Printer, 
    Download, 
    Trash2, 
    Save, 
    Plus, 
    Image as ImageIcon,
    Building2,
    X,
    ExternalLink,
    AlertTriangle,
    Info,
    RotateCcw,
    Search,
    ChevronDown,
    Layout,
    ChevronLeft,
    Tag
} from 'lucide-react';
import { Chemical } from '@/types/chemicals';
import { getCombinedSelectableProducts } from '@/lib/chemicals';
import { getCurrentUser } from '@/lib/auth';
import { getAppSetting, saveAppSetting } from '@/services/supabase/appSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// OL125 Template Specs (Inches)
const TEMPLATE = {
    sheetWidth: 8.5,
    sheetHeight: 11,
    labelWidth: 4.0,
    labelHeight: 2.0,
    topMargin: 0.5,
    bottomMargin: 0.5,
    leftMargin: 0.18,
    rightMargin: 0.18,
    horizontalGutter: 0.14,
    verticalGutter: 0,
    cols: 2,
    rows: 5,
    labelsPerPage: 10
};

// Convert inches to points for jsPDF (1 inch = 72 points)
const toPt = (inches: number) => inches * 72;

interface LabelData {
    id: number; // 0 to 9 representing the slot
    chemicalId?: string;
    productName: string;
    brandName: string;
    dilutionRatio: string;
    status: string; // e.g. "RTU", "Concentrate"
    notes: string;
    businessName: string;
    extraText: string;
    showLogo: boolean;
    isEmpty: boolean;
}

interface MixedLabelMakerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MixedLabelMaker({ open, onOpenChange }: MixedLabelMakerProps) {
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [labels, setLabels] = useState<LabelData[]>(() => {
        // Try to load from local storage
        const saved = localStorage.getItem('mixed_label_sheet_v1');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved labels", e);
            }
        }
        
        // Default empty labels
        return Array.from({ length: 10 }, (_, i) => ({
            id: i,
            productName: '',
            brandName: '',
            dilutionRatio: '',
            status: '',
            notes: '',
            businessName: 'PrimeAutoDetail.net',
            extraText: '',
            showLogo: true,
            isEmpty: true
        }));
    });

    const [editingSlot, setEditingSlot] = useState<number | null>(null);
    const [zoomSlot, setZoomSlot] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [previewZoom, setPreviewZoom] = useState(0.4);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    // Auto-scaling logic
    useEffect(() => {
        if (!open) return;

        const updateScale = () => {
            if (!containerRef.current || !pageContainerRef.current) return;
            
            const container = containerRef.current;
            // High padding for mobile to account for shared height with editor
            const padW = window.innerWidth < 1024 ? 32 : 64; 
            const padH = window.innerWidth < 1024 ? 180 : 120;
            
            const targetW = TEMPLATE.sheetWidth * 100;
            const targetH = TEMPLATE.sheetHeight * 100;
            
            const availableW = Math.max(container.clientWidth - padW, 100);
            const availableH = Math.max(container.clientHeight - padH, 100);
            
            const scaleW = availableW / targetW;
            const scaleH = availableH / targetH;
            
            let finalScale = Math.min(scaleW, scaleH);
            
            // Limit range: 0.2 to 1.1x
            finalScale = Math.max(0.2, Math.min(finalScale, 1.1));

            setPreviewZoom(finalScale);
        };

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateScale);
        });

        if (containerRef.current) resizeObserver.observe(containerRef.current);
        
        // Run immediately and after a delay to catch modal settling
        updateScale();
        const timers = [
            setTimeout(updateScale, 100),
            setTimeout(updateScale, 400),
            setTimeout(updateScale, 1000)
        ];

        window.addEventListener('resize', updateScale);
        
        return () => {
            resizeObserver.disconnect();
            timers.forEach(clearTimeout);
            window.removeEventListener('resize', updateScale);
        };
    }, [open, editingSlot]);

    useEffect(() => {
        const load = async () => {
            const data = await getCombinedSelectableProducts();
            // User requested to be able to search for any product, ensure we have the full data
            setChemicals(data || []);
        };
        load();
    }, []);

    useEffect(() => {
        // Handle local storage synchronization whenever labels change
        // This provides instant feedback and persistence within the session/tab
        localStorage.setItem('mixed_label_sheet_v1', JSON.stringify(labels));
    }, [labels]);

    const handleSaveToCloud = async () => {
        const user = getCurrentUser();
        if (!user?.id) {
            toast({
                title: "Authentication Required",
                description: "You must be signed in to sync labels to the cloud.",
                variant: "destructive"
            });
            return;
        }

        setIsCloudSyncing(true);
        try {
            const success = await saveAppSetting(`label_sheet_${user.id}`, labels);
            if (success) {
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                toast({
                    title: "Page Saved to Cloud",
                    description: "Your label layout is now synced across all devices.",
                    className: "bg-green-600 border-green-500 text-white font-bold"
                });
            } else {
                throw new Error("Upsert returned false");
            }
        } catch (error) {
            console.error("Cloud save failed", error);
            toast({
                title: "Cloud Sync Failed",
                description: "Ensure you have a stable internet connection.",
                variant: "destructive"
            });
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const handleLoadFromCloud = async () => {
        const user = getCurrentUser();
        if (!user?.id) return;

        setIsCloudLoading(true);
        try {
            const cloudLabels = await getAppSetting<LabelData[]>(`label_sheet_${user.id}`);
            if (cloudLabels && Array.isArray(cloudLabels) && cloudLabels.length === 10) {
                setLabels(cloudLabels);
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                toast({
                    title: "Cloud Data Restored",
                    description: "Your previous session labels have been loaded.",
                    className: "bg-indigo-600 text-white"
                });
            } else {
                toast({
                    title: "No Cloud Data",
                    description: "No saved label sheet was found for your account.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error("Cloud load error:", err);
        } finally {
            setIsCloudLoading(false);
        }
    };

    useEffect(() => {
        // Fetch from cloud when modal opens to ensure multi-device sync
        if (open) {
            const fetchCloudData = async () => {
                const user = getCurrentUser();
                if (!user?.id) return;

                const cloudLabels = await getAppSetting<LabelData[]>(`label_sheet_${user.id}`);
                if (cloudLabels && Array.isArray(cloudLabels) && cloudLabels.length === 10) {
                    // Check if local is different from cloud
                    const localHash = JSON.stringify(labels);
                    const cloudHash = JSON.stringify(cloudLabels);
                    if (localHash !== cloudHash) {
                        setLabels(cloudLabels);
                    }
                    // Even if hashes match/don't match, we can assume this is the latest known state
                    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
            };
            fetchCloudData();
        }
    }, [open]);

    useEffect(() => {
        // Handle external requests to add a chemical (e.g. from ChemicalEditForm)
        const handleAddExternal = (e: CustomEvent<Chemical>) => {
            const chemical = e.detail;
            if (!chemical) return;

            // Find first empty slot
            const emptyIdx = labels.findIndex(l => l.isEmpty);
            const targetIdx = emptyIdx === -1 ? 0 : emptyIdx;

            handleUpdateSlot(targetIdx, {
                chemicalId: chemical.id,
                productName: chemical.name,
                brandName: chemical.brand || '',
                dilutionRatio: chemical.dilution_ratios?.[0]?.ratio || '1:1',
                notes: (chemical.used_for && chemical.used_for.length > 0) 
                    ? chemical.used_for.join(', ') 
                    : (chemical.description || ''),
                isEmpty: false
            });

            toast({
                title: "Label Staged",
                description: `Added ${chemical.name} to Sheet Position ${targetIdx + 1}`,
                className: "bg-purple-900 border-purple-800 text-white"
            });
        };

        window.addEventListener('add-chemical-to-label-sheet' as any, handleAddExternal as any);
        return () => window.removeEventListener('add-chemical-to-label-sheet' as any, handleAddExternal as any);
    }, [labels]);

    const handleResetSlot = (slotIndex: number) => {
        setLabels(prev => {
            const next = [...prev];
            next[slotIndex] = {
                id: slotIndex,
                productName: '',
                brandName: '',
                dilutionRatio: '',
                status: '',
                notes: '',
                businessName: 'PrimeAutoDetail.net',
                extraText: '',
                showLogo: true,
                isEmpty: true
            };
            return next;
        });
        setEditingSlot(null);
        toast({ title: "Slot Reset", description: `Label #${slotIndex + 1} cleared.` });
    };

    const handleUpdateSlot = (slotIndex: number, data: Partial<LabelData>) => {
        setLabels(prev => {
            const next = [...prev];
            next[slotIndex] = { ...next[slotIndex], ...data, isEmpty: false };
            return next;
        });
    };

    const handleSelectChemical = (slotIndex: number, chemicalId: string) => {
        const chemical = chemicals.find(c => c.id === chemicalId);
        if (chemical) {
            handleUpdateSlot(slotIndex, {
                chemicalId: chemical.id,
                productName: chemical.name,
                brandName: chemical.brand || '',
                dilutionRatio: chemical.dilution_ratios?.[0]?.ratio || '1:1',
                notes: (chemical.used_for && chemical.used_for.length > 0) 
                    ? chemical.used_for.join(', ') 
                    : (chemical.description || ''),
                isEmpty: false
            });
            
            toast({
                title: "Label Updated",
                description: `Added ${chemical.name} to Slot ${slotIndex + 1}`,
                className: "bg-green-900 border-green-800 text-white"
            });
        }
    };

    const handleDirectPrint = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const baseStyle = `
                @page { 
                    size: 8.5in 11in; 
                    margin: 0; 
                }
                * { -webkit-print-color-adjust: exact; box-sizing: border-box; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                }
                .sheet-container { 
                    width: 8.5in; 
                    height: 11in; 
                    position: relative; 
                    overflow: hidden;
                    padding: ${TEMPLATE.topMargin}in ${TEMPLATE.leftMargin}in;
                    background: white;
                }
                .label-grid {
                    display: grid;
                    grid-template-columns: ${TEMPLATE.labelWidth}in ${TEMPLATE.labelWidth}in;
                    column-gap: ${TEMPLATE.horizontalGutter}in;
                    row-gap: 0;
                    height: 10in; /* 5 rows x 2in */
                }
                .label-cell {
                    width: ${TEMPLATE.labelWidth}in;
                    height: ${TEMPLATE.labelHeight}in;
                    padding: 0.25in;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    background: white;
                    color: black;
                    overflow: hidden;
                    position: relative;
                }
                .label-title {
                    font-size: 22pt;
                    font-weight: 900;
                    text-transform: uppercase;
                    line-height: 1.1;
                    height: 2.2em; /* Exactly 2 lines */
                    border-left: 6px solid #4f46e5;
                    padding-left: 10px;
                    margin-top: 4px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .label-footer {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 2px;
                    height: 0.8in;
                }
                .ratio-box {
                    border: 3px solid black;
                    padding: 4px 12px;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-width: 80px;
                    background: white;
                    margin-bottom: 5px;
                }
                .ratio-label { font-size: 7pt; font-weight: 800; text-transform: uppercase; opacity: 0.6; line-height: 1; }
                .ratio-value { font-size: 18pt; font-weight: 900; line-height: 1; margin-top: 1px; }
                .notes-area { 
                    flex: 1; 
                    font-size: 9pt; 
                    font-weight: 600; 
                    color: #333; 
                    line-height: 1.2;
                    max-height: 0.6in;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    padding-right: 5px;
                    margin-bottom: 5px;
                }
                .notes-lines { 
                    position: absolute;
                    bottom: 0.25in;
                    left: 0.25in;
                    right: 1.5in;
                    display: flex; 
                    flex-direction: column; 
                    gap: 6px; 
                    z-index: 0;
                }
                .line { border-bottom: 1px solid #eee; width: 100%; height: 1px; }
                .logo-accent {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    opacity: 0.15;
                }
                .business-tag {
                    position: absolute;
                    bottom: 10px;
                    left: 25px;
                    font-size: 7pt;
                    font-weight: 900;
                    text-transform: uppercase;
                    color: #999;
                }
            `;

            const labelHtmlSet = labels.map(label => {
                if (label.isEmpty) {
                    return `<div class="label-cell"></div>`;
                }
                return `
                    <div class="label-cell">
                        ${label.showLogo ? `
                            <div class="logo-accent">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                                    <path d="M7 7h.01" />
                                </svg>
                            </div>
                        ` : ''}
                        <div class="business-tag">${label.businessName || 'PRIMEAUTODETAIL.NET'}</div>
                        <div>
                            <div style="font-size: 8pt; font-weight: 900; color: #4f46e5; margin-bottom: 1px; text-transform: uppercase; letter-spacing: 0.05em;">${label.brandName || 'Product'}</div>
                            <div class="label-title">${label.productName || 'UNNAMED'}</div>
                        </div>
                        <div class="label-footer">
                            <div class="notes-area">
                                ${label.notes || ''}
                            </div>
                            <div class="notes-lines">
                                <div class="line"></div>
                                <div class="line"></div>
                                <div class="line"></div>
                            </div>
                            <div class="ratio-box">
                                <div class="ratio-label">RATIO</div>
                                <div class="ratio-value">${label.dilutionRatio || '1:1'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Label Sheet - OL125</title>
                        <style>${baseStyle}</style>
                    </head>
                    <body>
                        <div class="sheet-container">
                            <div class="label-grid">
                                ${labelHtmlSet}
                            </div>
                        </div>
                        <script>
                            window.onload = () => {
                                setTimeout(() => { 
                                    window.print(); 
                                    // Remove auto-close for better debugging if user wants to see it
                                    // window.close(); 
                                }, 800);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            toast({ title: "Sending to Printer", description: "Direct print window opened. Ensure 'Margins' is set to 'None' in the print dialog." });
        } catch (e) {
            console.error(e);
            toast({ title: "Print Error", description: "Could not initiate direct print.", variant: "destructive" });
        }
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            // Create a hidden container for the HQ render
            const element = document.createElement('div');
            element.style.width = '8.5in';
            element.style.height = '11in';
            element.style.background = 'white';
            element.style.position = 'fixed';
            element.style.left = '-9999px';
            element.style.top = '0';
            
            // Insert same HTML structure as print
            const baseStyle = `
                display: grid;
                grid-template-columns: ${TEMPLATE.labelWidth}in ${TEMPLATE.labelWidth}in;
                column-gap: ${TEMPLATE.horizontalGutter}in;
                padding: ${TEMPLATE.topMargin}in ${TEMPLATE.leftMargin}in;
                background: white;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
            `;
            
            element.innerHTML = `
                <div style="${baseStyle}">
                    ${labels.map(l => {
                        if (l.isEmpty) return `<div style="width:${TEMPLATE.labelWidth}in; height:${TEMPLATE.labelHeight}in;"></div>`;
                        return `
                            <div style="width:${TEMPLATE.labelWidth}in; height:${TEMPLATE.labelHeight}in; padding: 0.25in; border: 0.1px solid #eee; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; color: black; position: relative; font-family: sans-serif; background: white;">
                                <div style="position: absolute; bottom: 10px; left: 25px; font-size: 6pt; font-weight: 900; text-transform: uppercase; color: #999;">${l.businessName || 'PRIMEAUTODETAIL.NET'}</div>
                                <div>
                                    <div style="font-size: 8pt; font-weight: 900; color: #4f46e5; margin-bottom: 2px; text-transform: uppercase;">${l.brandName || 'Product'}</div>
                                    <div style="font-size: 20pt; font-weight: 900; text-transform: uppercase; line-height: 1.1; height: 2.2em; border-left: 6px solid #4f46e5; padding-left: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${l.productName || 'UNNAMED'}</div>
                                </div>
                                <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; position: relative; z-index: 1;">
                                    <div style="flex: 1; font-size: 8pt; font-weight: 600; line-height: 1.2; max-height: 0.6in; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: 5px;">
                                        ${l.notes || ''}
                                    </div>
                                    <div style="border: 3px solid black; padding: 4px 12px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 80px; background: white;">
                                        <div style="font-size: 7pt; font-weight: 800; text-transform: uppercase; opacity: 0.6; line-height: 1;">RATIO</div>
                                        <div style="font-size: 16pt; font-weight: 900; line-height: 1; margin-top: 2px;">${l.dilutionRatio || '1:1'}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            document.body.appendChild(element);
            
            const canvas = await html2canvas(element, {
                scale: 3, // High quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'in', [8.5, 11]);
            pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11);
            pdf.save(`Mixed_Labels_${new Date().getTime()}.pdf`);
            
            document.body.removeChild(element);
            toast({ title: "PDF Generated", description: "Your label sheet has been downloaded." });
        } catch (e) {
            console.error(e);
            toast({ title: "PDF Error", description: "Failed to generate PDF.", variant: "destructive" });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const LabelPreview = ({ data, isEditing = false }: { data: LabelData, isEditing?: boolean }) => (
        <div className={`relative w-full h-full bg-white flex flex-col p-4 text-black overflow-hidden ${data.isEmpty ? 'items-center justify-center' : ''}`}>
            {data.isEmpty ? (
                <div className="flex flex-col items-center justify-center text-zinc-200 gap-1">
                    <Plus className="w-8 h-8 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Empty Slot</span>
                </div>
            ) : (
                <>
                    {/* Header: Product Name with Vertical Bar */}
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center flex-1">
                            <div className="w-1.5 h-8 bg-indigo-600 rounded-full shrink-0" />
                            <div className="flex flex-col">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter leading-none mb-1">
                                    {data.brandName || "Product"}
                                </div>
                                <div className="text-xl font-black leading-none uppercase tracking-tight line-clamp-2">
                                    {data.productName || "PRODUCT NAME"}
                                </div>
                            </div>
                        </div>
                        <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">2" x 4" Label</div>
                    </div>

                    {/* Middle: Notes / Handwritten Area */}
                    <div className="mt-6 flex-1 flex flex-col">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 pl-1 flex items-center gap-2">
                             Notes / Instructions
                        </div>
                        <div className="flex-1 relative">
                            {/* Visual Lines for "Handwritten" feel */}
                            <div className="absolute inset-0 border-b border-zinc-100 h-1/2" />
                            <div className="absolute inset-0 border-b border-zinc-100" />
                            
                            <div className="relative z-10 text-[11px] font-bold text-zinc-800 leading-[1.6] px-1 py-1 italic line-clamp-2">
                                {data.notes}
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Ratio Box and Business Name */}
                    <div className="mt-4 flex items-end justify-between">
                         <div className="pb-1">
                             <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{data.businessName}</div>
                             <div className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">{data.status || "READY TO USE"}</div>
                         </div>
                         
                         {/* Distinct Ratio Box */}
                         <div className="flex flex-col items-center p-2 px-4 border-[3px] border-black rounded-[22px] bg-white min-w-[90px]">
                            <span className="text-[8px] font-black uppercase tracking-widest mb-0.5">Ratio</span>
                            <span className="text-xl font-black leading-none">{data.dilutionRatio || "1:1"}</span>
                         </div>
                    </div>

                    {/* Extra Text (Overlay) */}
                    {data.extraText && (
                        <div className="absolute top-2 right-4 text-[7px] font-bold text-zinc-300 bg-white px-1 uppercase tracking-tighter">
                            {data.extraText}
                        </div>
                    )}
                </>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[100vw] w-full h-[100dvh] sm:max-w-[95vw] sm:h-[95vh] bg-black text-white p-0 border-zinc-800 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-6 border-b border-zinc-800 bg-zinc-950 gap-2 sm:gap-4 shrink-0">
                    <div className="flex-1 min-w-0">
                        <DialogTitle className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 sm:gap-3 truncate">
                            <Printer className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                            <span className="truncate">10-Label Sheet – OL125</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 sm:mt-1">
                            <span className="flex items-center gap-1 text-[9px] sm:text-xs"><Info className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" /> 8.5"x11" Sheet</span>
                            <span className="flex items-center gap-1 text-[9px] sm:text-xs"><Info className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" /> Mixed Printing</span>
                            {lastSaved && (
                                <span className="flex items-center gap-1 text-[9px] sm:text-xs text-green-500 font-black uppercase tracking-tighter bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                    <Save className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Last Synced: {lastSaved}
                                </span>
                            )}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white h-7 sm:h-9 text-[9px] sm:text-xs px-2 sm:px-3"
                            onClick={() => window.open('https://www.onlinelabels.com/templates/blank/ol125', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" /> <span className="hidden sm:inline">Template Ref</span>
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm"
                            disabled={isCloudSyncing || isCloudLoading}
                            className={`bg-indigo-600 hover:bg-indigo-500 text-white h-7 sm:h-9 text-[9px] sm:text-xs px-2 sm:px-4 font-black uppercase tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.3)] shrink-0 ${labels.every(l => l.isEmpty) ? 'opacity-50' : ''}`}
                            onClick={() => {
                                if (labels.every(l => l.isEmpty)) {
                                    if (!confirm("Your sheet is empty. Do you really want to save an empty layout to the cloud?")) return;
                                }
                                handleSaveToCloud();
                            }}
                        >
                            {isCloudSyncing ? (
                                <>
                                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                                    SAVING...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                    SAVE PAGE
                                </>
                            )}
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isCloudLoading}
                            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white h-7 sm:h-9 px-2 sm:px-3 text-[9px] sm:text-xs shrink-0"
                            onClick={handleLoadFromCloud}
                            title="Emergency Load from Cloud"
                        >
                            <RotateCcw className={`w-3 h-3 mr-1 ${isCloudLoading ? 'animate-spin' : ''}`} /> 
                            <span className="hidden sm:inline">RESTORE</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onOpenChange(false)}
                            className="h-7 w-7 sm:h-10 sm:w-10 text-zinc-500 hover:text-white"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left: Interactive Grid */}
                    <div 
                        ref={containerRef}
                        className="flex-1 p-4 sm:p-8 bg-zinc-950/50 flex flex-col items-center justify-start lg:justify-center overflow-auto custom-scrollbar relative min-h-[400px] lg:min-h-0 pt-16 lg:pt-8"
                    >
                        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 bg-zinc-900/50 p-3 sm:p-4 rounded-xl border border-zinc-800 w-full max-w-[800px]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">Grid Layout</span>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">2 Columns x 5 Rows</span>
                            </div>
                            <div className="h-8 w-px bg-zinc-800 hidden sm:block" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">Preview Fit</span>
                                <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{Math.round(previewZoom * 100)}% Scale</span>
                            </div>
                            <div className="hidden md:block h-8 w-px bg-zinc-800" />
                            <div className="hidden lg:block">
                                <p className="text-[10px] text-zinc-400 max-w-[280px] leading-tight font-medium">
                                    Each box below matches a sticker on your 8.5x11 sheet. 
                                    <span className="text-purple-400 ml-1">Tap a box to edit its contents.</span>
                                </p>
                            </div>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 px-3 text-[10px] font-black uppercase bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-900/40 ml-auto"
                                onClick={() => {
                                    if(confirm("Clear all 10 labels and start fresh?")) {
                                        setLabels(Array.from({ length: 10 }, (_, i) => ({
                                            id: i, productName: '', brandName: '', dilutionRatio: '', status: '', notes: '', businessName: 'PrimeAutoDetail.net', extraText: '', showLogo: true, isEmpty: true
                                        })));
                                    }
                                }}
                            >
                                <RotateCcw className="w-3 h-3 mr-2" /> Reset
                            </Button>
                        </div>                        <div 
                            className="relative mb-8 lg:mb-0"
                            style={{ 
                                width: `${TEMPLATE.sheetWidth * 100 * previewZoom}px`, 
                                height: `${TEMPLATE.sheetHeight * 100 * previewZoom}px`,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div 
                                className="bg-white shadow-2xl origin-top-left"
                                ref={pageContainerRef}
                                style={{ 
                                    width: `${TEMPLATE.sheetWidth * 100}px`, 
                                    height: `${TEMPLATE.sheetHeight * 100}px`,
                                    padding: `${TEMPLATE.topMargin}in ${TEMPLATE.rightMargin}in ${TEMPLATE.bottomMargin}in ${TEMPLATE.leftMargin}in`,
                                    transform: `scale(${previewZoom})`
                                }}
                            >
                            <div 
                                className="grid h-full"
                                style={{ 
                                    gridTemplateColumns: `repeat(${TEMPLATE.cols}, 1fr)`,
                                    gridTemplateRows: `repeat(${TEMPLATE.rows}, 1fr)`,
                                    columnGap: `${TEMPLATE.horizontalGutter}in`,
                                    rowGap: `${TEMPLATE.verticalGutter}in`
                                }}
                            >
                                {labels.map((label, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setEditingSlot(idx)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setZoomSlot(idx);
                                        }}
                                        className={`group cursor-pointer rounded-lg relative overflow-hidden transition-all ${editingSlot === idx ? 'ring-4 ring-purple-500 ring-offset-4 ring-offset-zinc-950 z-10 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                                        title="Double click to zoom"
                                    >
                                        <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/5 z-2 transition-colors" />
                                        
                                        {/* This is the element we screenshot for PDF */}
                                        <div 
                                            className="label-slot-print bg-white" 
                                            style={{ 
                                                width: `${TEMPLATE.labelWidth * 100}px`, 
                                                height: `${TEMPLATE.labelHeight * 100}px` 
                                            }}
                                        >
                                            <LabelPreview data={label} />
                                        </div>

                                        {/* Overlay Identifier */}
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-zinc-900 text-white text-[8px] font-black rounded border border-white/10 opacity-50 group-hover:opacity-100 transition-opacity">
                                            SLOT {idx + 1}
                                        </div>

                                        {/* Quick Actions (Mobile Friendly) */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all">
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setZoomSlot(idx);
                                                }}
                                                className="w-7 h-7 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-md flex items-center justify-center text-white hover:bg-purple-600 hover:scale-110 active:scale-95 shadow-lg"
                                                title="View Full Size"
                                            >
                                                <Tag className="w-3.5 h-3.5" />
                                            </div>
                                            
                                            {!label.isEmpty && (
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(confirm(`Clear slot ${idx + 1}?`)) handleResetSlot(idx);
                                                    }}
                                                    className="w-7 h-7 bg-red-900/80 backdrop-blur-md border border-red-500/20 rounded-md flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white hover:scale-110 active:scale-95 shadow-lg"
                                                    title="Clear Slot"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                         <div className="mt-8 flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-[500px]">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-amber-200/80 leading-relaxed font-medium">
                                <span className="font-black text-amber-400 block mb-0.5 uppercase tracking-wider">Printing Instructions:</span>
                                Test print on plain paper first at <span className="text-white font-bold underline">100% scale (No Margins / Fit-To-Page)</span>. 
                                Match it against your sticker sheet to ensure the grid alignment is perfect before using expensive labels.
                            </div>
                        </div>
                    </div>

                    {/* Right: Slot Editor (Sidebar / Responsive Bottom Sheet) */}
                    <div className={`
                        ${editingSlot !== null ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 lg:translate-y-0 lg:opacity-100 hidden lg:flex'}
                        fixed lg:relative inset-0 lg:inset-auto z-50 lg:z-0
                        w-full lg:w-[450px] border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col bg-zinc-950 transition-all duration-300 ease-out
                    `}>
                        {editingSlot !== null ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                                            <span className="text-purple-400 font-black">{editingSlot + 1}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Edit Slot Content</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold">Position: Row {Math.floor(editingSlot/2) + 1}, Col {(editingSlot % 2) + 1}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingSlot(null)} className="h-8 w-8 text-zinc-500 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-6">
                                        {/* Chemical Search & Select */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Inventory Quick Select</Label>
                                                <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{chemicals.length} Products Found</div>
                                            </div>
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                                                <Input 
                                                    placeholder="Search brand, name, or type..."
                                                    className="pl-10 pr-10 bg-zinc-900 border-zinc-800 h-10 text-xs font-bold focus:ring-purple-500/20"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
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
                                            
                                            <div className="bg-zinc-900/50 rounded-xl border border-zinc-900 overflow-hidden">
                                                <ScrollArea className="h-[200px]">
                                                    <div className="p-2 space-y-1">
                                                        {chemicals.length === 0 ? (
                                                            <div className="p-4 text-center text-zinc-600 text-[10px] font-bold italic">Loading Inventory...</div>
                                                        ) : (
                                                            chemicals
                                                                .filter(c => {
                                                                    const term = searchQuery.toLowerCase();
                                                                    return c.name.toLowerCase().includes(term) || 
                                                                           (c.brand || '').toLowerCase().includes(term) ||
                                                                           (c.category || '').toLowerCase().includes(term);
                                                                })
                                                                .map(c => {
                                                                    const isSelectedInAnySlot = labels.some(l => l.chemicalId === c.id);
                                                                    return (
                                                                        <button
                                                                            key={c.id}
                                                                            onClick={() => {
                                                                                handleSelectChemical(editingSlot!, c.id);
                                                                                setSearchQuery(''); // Reset search on select
                                                                            }}
                                                                            className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between group ${isSelectedInAnySlot ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-zinc-800'}`}
                                                                        >
                                                                            <div className="flex-1 truncate">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="text-[10px] font-black uppercase tracking-tight text-white">{c.name}</div>
                                                                                    {isSelectedInAnySlot && <div className="text-[8px] font-black bg-indigo-500 text-white px-1.5 rounded-full uppercase">On Sheet</div>}
                                                                                    {(c as any).is_inventory_only && (
                                                                                        <div className="text-[8px] font-black bg-amber-600 text-white px-1.5 rounded-full uppercase">New Product</div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[9px] text-zinc-500 group-hover:text-zinc-400">{c.brand || 'No Brand'} • {c.category || 'Chemical'}</div>
                                                                            </div>
                                                                            <Plus className={`w-3.5 h-3.5 ${isSelectedInAnySlot ? 'text-indigo-400' : 'opacity-0 group-hover:opacity-100'}`} />
                                                                        </button>
                                                                    );
                                                                })
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>

                                        <Separator className="bg-zinc-800" />

                                        {/* Manual Fields */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Product Name</Label>
                                                <Input 
                                                    value={labels[editingSlot].productName}
                                                    onChange={(e) => handleUpdateSlot(editingSlot, { productName: e.target.value })}
                                                    className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                                                    placeholder="e.g. Iron Remover"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Brand Name</Label>
                                                <Input 
                                                    value={labels[editingSlot].brandName}
                                                    onChange={(e) => handleUpdateSlot(editingSlot, { brandName: e.target.value })}
                                                    className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                                                    placeholder="e.g. Superior"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Dilution Ratio</Label>
                                                <Input 
                                                    value={labels[editingSlot].dilutionRatio}
                                                    onChange={(e) => handleUpdateSlot(editingSlot, { dilutionRatio: e.target.value })}
                                                    className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                                                    placeholder="e.g. 1:10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Status / Label</Label>
                                                <Input 
                                                    value={labels[editingSlot].status}
                                                    onChange={(e) => handleUpdateSlot(editingSlot, { status: e.target.value })}
                                                    className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                                                    placeholder="e.g. READY"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Handwritten / Notes Area</Label>
                                            <Textarea 
                                                value={labels[editingSlot].notes}
                                                onChange={(e) => handleUpdateSlot(editingSlot, { notes: e.target.value })}
                                                className="bg-zinc-900 border-zinc-800 text-xs min-h-[80px] resize-none"
                                                placeholder="Enter usage tips or safety warnings..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">Bottom Footer (Business)</Label>
                                            <Input 
                                                value={labels[editingSlot].businessName}
                                                onChange={(e) => handleUpdateSlot(editingSlot, { businessName: e.target.value })}
                                                className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                                                placeholder="PrimeAutoDetail.net"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-zinc-400" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Show Mini Logo</div>
                                                    <div className="text-[9px] text-zinc-500">Visual accent on top right</div>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className={`h-7 px-3 text-[9px] font-black uppercase tracking-tighter rounded-full border ${labels[editingSlot].showLogo ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                                                onClick={() => handleUpdateSlot(editingSlot, { showLogo: !labels[editingSlot].showLogo })}
                                            >
                                                {labels[editingSlot].showLogo ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>

                                        <div className="pt-4 flex gap-3">
                                            <Button 
                                                variant="outline"
                                                className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 font-black text-[10px] uppercase tracking-widest h-10 shadow-lg"
                                                onClick={() => handleResetSlot(editingSlot)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Clear Slot
                                            </Button>
                                            <Button 
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest h-10 shadow-lg shadow-indigo-600/20"
                                                onClick={() => setEditingSlot(null)}
                                            >
                                                <Save className="w-4 h-4 mr-2" /> Save Slot
                                            </Button>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6">
                                    <Tag className="w-10 h-10 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Editor Ready</h3>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                    Tap any label on the sheet to began designing. You can design 10 unique labels for a single sheet.
                                </p>
                            </div>
                        )}

                        <div className="mt-auto p-6 bg-zinc-950 border-t border-zinc-800 flex flex-col gap-3">
                             <Button 
                                variant="outline"
                                className="w-full h-12 border-zinc-800 bg-zinc-900 text-white font-bold uppercase tracking-widest hover:bg-zinc-800"
                                onClick={handleDirectPrint}
                            >
                                <Printer className="w-5 h-5 mr-3 text-purple-400" />
                                DIRECT PRINT (BETA)
                            </Button>
                             <Button 
                                className="w-full h-14 bg-green-600 hover:bg-green-500 text-white font-black text-base uppercase tracking-widest shadow-xl shadow-green-600/20 group relative overflow-hidden"
                                disabled={isGeneratingPdf}
                                onClick={handleDownloadPdf}
                            >
                                <span className={`flex items-center justify-center gap-3 transition-transform ${isGeneratingPdf ? 'translate-y-12' : 'translate-y-0'}`}>
                                    <Download className="w-6 h-6" />
                                    SAVE PRINTABLE PDF
                                </span>
                                {isGeneratingPdf && (
                                    <span className="absolute inset-0 flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        GENERATING...
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <Dialog open={zoomSlot !== null} onOpenChange={(open) => !open && setZoomSlot(null)}>
                <DialogContent className="max-w-fit max-h-[95vh] bg-zinc-950 border-zinc-800 p-6 sm:p-8 flex flex-col items-center overflow-y-auto overflow-x-hidden">
                    <DialogHeader className="w-full mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setZoomSlot(null)}
                                    className="h-9 w-9 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <DialogTitle className="text-sm sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Search className="w-4 h-4 text-purple-400" />
                                        High-Res Label Preview
                                    </DialogTitle>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">
                                        Rendered at 200% (4" x 8")
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setZoomSlot(null)} className="text-zinc-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </DialogHeader>
                    
                    {zoomSlot !== null && (
                        <div className="w-full h-full flex items-center justify-center overflow-hidden py-4 sm:py-8">
                            <div className="relative group p-1.5 sm:p-4 bg-zinc-900/40 rounded-2xl border border-white/5 max-w-full">
                                {/* Guideline Decorations */}
                                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-zinc-700 hidden sm:block" />
                                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-zinc-700 hidden sm:block" />
                                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-zinc-700 hidden sm:block" />
                                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-zinc-700 hidden sm:block" />

                                <div 
                                    className="bg-white shadow-[0_0_80px_rgba(0,0,0,0.8)] border-[1px] border-zinc-200 overflow-hidden relative shrink-0"
                                    style={{ 
                                        width: `calc(min(85vw, 800px))`, 
                                        height: `calc(min(41.5vw, 400px))`,
                                    }}
                                >
                                    <div 
                                        className="origin-top-left"
                                        style={{
                                            width: '400px',
                                            height: '200px',
                                            transform: `scale(calc(min(85vw, 800px) / 400))`
                                        }}
                                    >
                                        <LabelPreview data={labels[zoomSlot]} />
                                    </div>
                                    
                                    {/* Overlay simulated cut line */}
                                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-zinc-100/50" />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 w-full">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <Info className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white uppercase tracking-widest">Single Sticker View</div>
                                <div className="text-[9px] text-zinc-500 leading-tight">This represents exactly how one {TEMPLATE.labelWidth}" x {TEMPLATE.labelHeight}" label will look when printed.</div>
                            </div>
                        </div>
                        <Button 
                            className="w-full sm:w-auto px-8 h-14 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs shrink-0"
                            onClick={() => setZoomSlot(null)}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" /> Return to Sheet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
