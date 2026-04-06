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
import { Label } from '@/components/ui/label';
import { 
    Printer, 
    Download, 
    Plus, 
    Trash2, 
    RotateCcw,
    Layout,
    Image as ImageIcon,
    Settings2,
    Type,
    Sparkles,
    MousePointer2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface StickerMakerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function StickerMakerModal({ open, onOpenChange }: StickerMakerModalProps) {
    // Default image provided by the user
    const DEFAULT_IMAGE = "https://kcaqshdgnobuhsqpzdun.supabase.co/storage/v1/object/public/blog-media/1775498961726_business_card_qr.png";
    
    const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
    const [config, setConfig] = useState({
        labelsPerPage: 10,
        columns: 2,
        rows: 5,
        margin: 0.5, // inches
        gap: 0.2, // inches
        pageZoom: 0.8,
        stickerWidth: 3.5, // inches
        stickerHeight: 2.0, // inches
        borderRadius: 8, // px
        showCutMarks: true,
        brightness: 100,
        contrast: 100
    });

    const [sheetLabels, setSheetLabels] = useState<Array<string | null>>(Array(10).fill(imageUrl));
    const [loading, setLoading] = useState(false);
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Auto-fill sheet when image changes
    useEffect(() => {
        setSheetLabels(prev => prev.map(() => imageUrl));
    }, [imageUrl]);

    // Handle Image Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setImageUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Auto-fit scale effect
    useEffect(() => {
        if (open && pageContainerRef.current) {
            const updateScale = () => {
                const container = pageContainerRef.current;
                if (!container) return;
                
                const containerWidth = container.clientWidth - 40;
                const containerHeight = container.clientHeight - 40;
                const pageWidth = 816; // 8.5in at 96dpi
                const pageHeight = 1056; // 11in at 96dpi
                
                const scaleW = containerWidth / pageWidth;
                const scaleH = containerHeight / pageHeight;
                const newScale = Math.min(scaleW, scaleH, 0.95);
                
                setConfig(prev => ({ ...prev, pageZoom: newScale }));
            };
            
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [open]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!sheetRef.current) return;
        
        try {
            setLoading(true);
            toast({ title: "Generating PDF...", description: "Optimizing high-resolution stickers." });
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: [8.5, 11]
            });

            const canvas = await html2canvas(sheetRef.current, {
                scale: 3, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11, undefined, 'FAST');
            pdf.save(`Business_Card_Stickers_${Date.now()}.pdf`);
            
            toast({ title: "Success!", description: "High-quality sticker sheet downloaded." });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({ title: "Error", description: "Failed to create PDF.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetLayout = () => {
        setConfig({
            labelsPerPage: 10,
            columns: 2,
            rows: 5,
            margin: 0.5,
            gap: 0.2,
            pageZoom: config.pageZoom,
            stickerWidth: 3.5,
            stickerHeight: 2.0,
            borderRadius: 8,
            showCutMarks: true,
            brightness: 100,
            contrast: 100
        });
        setImageUrl(DEFAULT_IMAGE);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex flex-col">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body * { visibility: hidden !important; }
                        #sticker-print-sheet, #sticker-print-sheet * { visibility: visible !important; }
                        #sticker-print-sheet { 
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
                            z-index: 99999 !important;
                        }
                        @page { size: letter portrait; margin: 0; }
                    }
                `}} />

                <DialogHeader className="p-6 border-b border-white/5 bg-black/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                                <Layout className="h-6 w-6 text-blue-500" />
                                BUSINESS CARD STICKER MAKER
                            </DialogTitle>
                            <DialogDescription className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                Format high-quality QR card stickers for standard 8.5 x 11 inch sheets
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={resetLayout} className="h-9 border-zinc-800 text-zinc-400 hover:text-white">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 border-zinc-800 text-zinc-100 hover:bg-zinc-900">
                                <Printer className="h-4 w-4 mr-2" />
                                Quick Print
                            </Button>
                            <Button size="sm" onClick={handleDownloadPdf} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-500 text-white font-bold">
                                {loading ? <Layout className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                Export PDF
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-80 border-r border-white/5 bg-zinc-900/30 overflow-y-auto p-4 flex flex-col gap-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <ImageIcon className="h-3 w-3 text-blue-400" />
                                Sticker Image Source
                            </Label>
                            <div className="space-y-3">
                                <div className="aspect-video bg-black rounded-lg border border-zinc-800 overflow-hidden relative">
                                    <img 
                                        src={imageUrl} 
                                        alt="Current Sticker" 
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "https://via.placeholder.com/400x225/000000/FFFFFF?text=No+Image+Selected";
                                        }}
                                    />
                                </div>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    <Button variant="outline" className="w-full h-10 border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 font-black uppercase text-[10px] tracking-widest">
                                        <Plus className="h-3 w-3 mr-2" />
                                        Select New Image
                                    </Button>
                                </div>
                                <p className="text-[10px] text-zinc-500 italic text-center px-4">
                                    You can upload your own QR card image or use the default one
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Settings2 className="h-3 w-3 text-emerald-400" />
                                Page Layout Configuration
                            </Label>
                            <div className="space-y-6 px-1">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-zinc-400">Total stickers</span>
                                        <span className="text-white">{config.labelsPerPage}</span>
                                    </div>
                                    <Slider 
                                        value={[config.labelsPerPage]} 
                                        min={1} 
                                        max={24} 
                                        step={1}
                                        onValueChange={([val]) => {
                                            setConfig(prev => ({ ...prev, labelsPerPage: val }));
                                            setSheetLabels(Array(val).fill(imageUrl));
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] text-zinc-500">Columns</Label>
                                        <Input 
                                            type="number" 
                                            value={config.columns} 
                                            onChange={(e) => setConfig(prev => ({ ...prev, columns: parseInt(e.target.value) || 1 }))}
                                            className="h-8 bg-black border-zinc-800 text-[11px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] text-zinc-500">Sticker Padding</Label>
                                        <Input 
                                            type="number" 
                                            step="0.05"
                                            value={config.margin} 
                                            onChange={(e) => setConfig(prev => ({ ...prev, margin: parseFloat(e.target.value) || 0 }))}
                                            className="h-8 bg-black border-zinc-800 text-[11px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[9px] text-zinc-500 uppercase tracking-tighter">Gap Between Stickers</Label>
                                    <Slider 
                                        value={[config.gap * 100]} 
                                        max={50} 
                                        onValueChange={([val]) => setConfig(prev => ({ ...prev, gap: val / 100 }))}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-[9px] text-zinc-500 uppercase tracking-tighter">Border Radius</Label>
                                    <Slider 
                                        value={[config.borderRadius]} 
                                        max={40} 
                                        onValueChange={([val]) => setConfig(prev => ({ ...prev, borderRadius: val }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] text-zinc-500 uppercase tracking-tighter">Total Width (Small Adjustment)</Label>
                                    <Slider 
                                        value={[config.stickerWidth * 100]} 
                                        min={200}
                                        max={400}
                                        onValueChange={([val]) => setConfig(prev => ({ ...prev, stickerWidth: val / 100 }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/5">
                             <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="h-3 w-3 text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-tight">Print Tip</span>
                                </div>
                                <p className="text-[10px] text-blue-200/60 leading-relaxed">
                                    For perfect alignment on sticker paper, set "Margins: None" and "Scale: 100%" in your browser's print dialog.
                                </p>
                             </div>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div 
                        ref={pageContainerRef}
                        className="flex-1 bg-zinc-950 p-8 overflow-auto flex justify-center items-start"
                    >
                        <div 
                            ref={sheetRef}
                            id="sticker-print-sheet"
                            style={{ 
                                width: '8.5in',
                                height: '11in',
                                minWidth: '8.5in',
                                minHeight: '11in',
                                backgroundColor: 'white',
                                padding: '0.4in', // Fixed safe page margin
                                boxSizing: 'border-box',
                                transform: `scale(${config.pageZoom})`,
                                transformOrigin: 'top center',
                                display: 'grid',
                                gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                                gap: `${config.gap}in`,
                                alignContent: 'start',
                                justifyItems: 'center'
                            }}
                        >
                            {sheetLabels.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        width: `${config.stickerWidth}in`,
                                        height: `${config.stickerHeight}in`,
                                        maxWidth: '100%',
                                        border: config.showCutMarks ? '1px dashed #00000020' : 'none',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: `${config.borderRadius}px`,
                                        backgroundColor: '#000000',
                                        padding: `${config.margin}in`, // This puts the image INSIDE with a margin
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <img 
                                        src={img || imageUrl} 
                                        alt="Sticker" 
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'contain'
                                        }} 
                                    />
                                    {/* Corner Cut Helper Marks */}
                                    {config.showCutMarks && (
                                        <div className="absolute inset-0 pointer-events-none opacity-20">
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white" />
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white" />
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-white/5 bg-black/40 flex justify-between items-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest hidden md:block">
                        Proprietary Detailing Marketing System v2.0
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-500 hover:text-white">
                            Close Architect
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
