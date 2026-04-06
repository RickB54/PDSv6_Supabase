import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Printer, 
    Download, 
    Plus, 
    RotateCcw,
    Layout,
    Image as ImageIcon,
    Settings2,
    Sparkles,
    Maximize2,
    CreditCard,
    Grid3X3,
    ChevronLeft
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Preset = 'business-card' | 'custom' | 'small-sticker';

export default function StickerMaker() {
    const navigate = useNavigate();
    const DEFAULT_IMAGE = "https://kcaqshdgnobuhsqpzdun.supabase.co/storage/v1/object/public/blog-media/1775498961726_business_card_qr.png";
    
    const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
    const [preset, setPreset] = useState<Preset>('business-card');
    
    const [config, setConfig] = useState({
        labelsPerPage: 10,
        columns: 2,
        rows: 5,
        margin: 0.4, // Sheet margin
        stickerPadding: 0.02, // Interior image padding
        gap: 0.1, // inches between stickers
        pageZoom: 0.7,
        stickerWidth: 3.5,
        stickerHeight: 2.0,
        borderRadius: 8,
        showCutMarks: true,
        imageScale: 100,
        imageOffsetX: 0,
        imageOffsetY: 0,
        sheetOffsetX: 0,
        sheetOffsetY: 0,
        rowOffsets: [0, 0, 0, 0, 0, 0, 0, 0] // Support up to 8 rows for calibration
    });

    const [sheetLabels, setSheetLabels] = useState<Array<string | null>>(Array(10).fill(imageUrl));
    const [loading, setLoading] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);

    // Auto-update labels
    useEffect(() => {
        setSheetLabels(Array(config.labelsPerPage).fill(imageUrl));
    }, [imageUrl, config.labelsPerPage]);

    // Handle Presets
    useEffect(() => {
        if (preset === 'business-card') {
            setConfig(prev => ({
                ...prev,
                labelsPerPage: 10,
                columns: 2,
                rows: 5,
                stickerWidth: 3.5,
                stickerHeight: 2.0,
                gap: 0.1
            }));
        } else if (preset === 'small-sticker') {
            setConfig(prev => ({
                ...prev,
                labelsPerPage: 21,
                columns: 3,
                rows: 7,
                stickerWidth: 2.25,
                stickerHeight: 1.25,
                gap: 0.05
            }));
        }
        // Custom lets you change everything manually
    }, [preset]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setImageUrl(event.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handlePrint = () => {
        const root = document.getElementById('root');
        if (root) root.classList.add('printing-sticker-mode');
        window.print();
        setTimeout(() => {
            if (root) root.classList.remove('printing-sticker-mode');
        }, 500);
    };

    const handleDownloadPdf = async () => {
        if (!sheetRef.current) return;
        try {
            setLoading(true);
            toast({ title: "Generating PDF...", description: "Optimizing high-resolution sticker sheet." });
            
            // To get high quality, we'll temporarily remove scaling
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 11] });
            const canvas = await html2canvas(sheetRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11, undefined, 'FAST');
            pdf.save(`Prime_Stickers_${Date.now()}.pdf`);
            
            toast({ title: "Success!", description: "PDF downloaded successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
            <style dangerouslySetInnerHTML={{ __html: `
                .printing-sticker-mode * { visibility: hidden !important; }
                .printing-sticker-mode #sticker-print-sheet, 
                .printing-sticker-mode #sticker-print-sheet * { visibility: visible !important; }
                .printing-sticker-mode #sticker-print-sheet { 
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
                    z-index: 99999 !important;
                    display: grid !important;
                }
                @page { size: 8.5in 11in; margin: 0; }
                @media print {
                    .printing-sticker-mode { background: white !important; }
                }
            `}} />

            {/* Header */}
            <header className="h-16 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                            <Layout className="h-5 w-5 text-blue-500" />
                            Business Card & Sticker Architect
                        </h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Marketing Utility v2.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                        <Printer className="h-4 w-4 mr-2" />
                        Quick Print
                    </Button>
                    <Button size="sm" onClick={handleDownloadPdf} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6">
                        {loading ? <Maximize2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Export PDF
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Left Controls */}
                <aside className="w-80 border-r border-white/5 bg-zinc-900/20 overflow-y-auto p-6 space-y-8">
                    <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Grid3X3 className="h-3 w-3 text-emerald-400" />
                            Slot Dimension Preset
                        </Label>
                        <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
                            <SelectTrigger className="w-full bg-black border-zinc-800 text-white font-bold h-11">
                                <SelectValue placeholder="Choose a size..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="business-card" className="focus:bg-blue-600">Standard Business Card (3.5" x 2")</SelectItem>
                                <SelectItem value="small-sticker" className="focus:bg-blue-600">Circle/Small Sticker (2.25" x 1.25")</SelectItem>
                                <SelectItem value="custom" className="focus:bg-blue-600">Full Custom Dimensions</SelectItem>
                            </SelectContent>
                        </Select>
                    </section>

                    <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <ImageIcon className="h-3 w-3 text-blue-400" />
                            Branding Design Source
                        </Label>
                        <div className="space-y-4">
                            <div className="aspect-video bg-black rounded-xl border border-white/5 overflow-hidden shadow-2xl relative group">
                                <img 
                                    src={imageUrl} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x225/000?text=No+Image")}
                                />
                            </div>
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <Button variant="outline" className="w-full h-10 border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 font-black uppercase text-[10px] tracking-widest">
                                    <Plus className="h-3 w-3 mr-2" />
                                    Replace Image
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Settings2 className="h-3 w-3 text-blue-400" />
                            Precise Design Controls
                        </Label>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>ZOOM SCALE</span>
                                    <span className="text-blue-400">{config.imageScale}%</span>
                                </div>
                                <Slider 
                                    value={[config.imageScale]} 
                                    min={10} 
                                    max={200} 
                                    onValueChange={([val]) => setConfig(prev => ({ ...prev, imageScale: val }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-zinc-500">OFFSET X</span>
                                    <Slider 
                                        value={[config.imageOffsetX]} 
                                        min={-100} 
                                        max={100} 
                                        onValueChange={([val]) => setConfig(prev => ({ ...prev, imageOffsetX: val }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-zinc-500">OFFSET Y</span>
                                    <Slider 
                                        value={[config.imageOffsetY]} 
                                        min={-100} 
                                        max={100} 
                                        onValueChange={([val]) => setConfig(prev => ({ ...prev, imageOffsetY: val }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>INT. PADDING</span>
                                    <span>{(config.stickerPadding * 100).toFixed(0)}%</span>
                                </div>
                                <Slider 
                                    value={[config.stickerPadding * 100]} 
                                    min={0} 
                                    max={40} 
                                    onValueChange={([val]) => setConfig(prev => ({ ...prev, stickerPadding: val / 100 }))}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            Master Sheet Alignment (Calibration)
                        </Label>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>VERTICAL SHIFT (UP/DOWN)</span>
                                    <span className="text-emerald-400">{config.sheetOffsetY > 0 ? '+' : ''}{config.sheetOffsetY.toFixed(2)}"</span>
                                </div>
                                <Slider 
                                    value={[config.sheetOffsetY * 100]} 
                                    min={-100} 
                                    max={100} 
                                    onValueChange={([val]) => setConfig(prev => ({ ...prev, sheetOffsetY: val / 100 }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>HORIZONTAL SHIFT (L/R)</span>
                                    <span className="text-emerald-400">{config.sheetOffsetX > 0 ? '+' : ''}{config.sheetOffsetX.toFixed(2)}"</span>
                                </div>
                                <Slider 
                                    value={[config.sheetOffsetX * 100]} 
                                    min={-100} 
                                    max={100} 
                                    onValueChange={([val]) => setConfig(prev => ({ ...prev, sheetOffsetX: val / 100 }))}
                                />
                            </div>
                        </div>
                    </section>
 
                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Settings2 className="h-3 w-3 text-emerald-400" />
                            Row-by-Row Fine Tuning
                        </Label>
                        
                        <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 pr-4 custom-scrollbar">
                            {Array.from({ length: Math.ceil(config.labelsPerPage / config.columns) }).map((_, rIdx) => (
                                <div key={rIdx} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                                        <span>ROW {rIdx + 1} OFFSET</span>
                                        <span className={config.rowOffsets && config.rowOffsets[rIdx] === 0 ? "text-zinc-600" : "text-emerald-400"}>
                                            {config.rowOffsets && config.rowOffsets[rIdx] > 0 ? '+' : ''}{config.rowOffsets ? config.rowOffsets[rIdx].toFixed(2) : '0.00'}"
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[config.rowOffsets ? config.rowOffsets[rIdx] * 100 : 0]} 
                                        min={-50} 
                                        max={50} 
                                        onValueChange={([val]) => {
                                            const newOffsets = [...config.rowOffsets];
                                            newOffsets[rIdx] = val / 100;
                                            setConfig(prev => ({ ...prev, rowOffsets: newOffsets }));
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
 
                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sheet Calibration</Label>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>TOTAL SLOTS</span>
                                    <span>{config.labelsPerPage}</span>
                                </div>
                                <Slider 
                                    value={[config.labelsPerPage]} 
                                    min={1} 
                                    max={40} 
                                    onValueChange={([val]) => setConfig(prev => ({ ...prev, labelsPerPage: val }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] text-zinc-500">COLUMNS</Label>
                                    <Input 
                                        type="number" 
                                        value={config.columns} 
                                        onChange={(e) => setConfig(prev => ({ ...prev, columns: parseInt(e.target.value) || 1 }))}
                                        className="h-8 bg-black border-white/5 text-[11px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] text-zinc-500">GAPS (IN)</Label>
                                    <Input 
                                        type="number" 
                                        step="0.05"
                                        value={config.gap} 
                                        onChange={(e) => setConfig(prev => ({ ...prev, gap: parseFloat(e.target.value) || 0 }))}
                                        className="h-8 bg-black border-white/5 text-[11px]"
                                    />
                                </div>
                            </div>

                            {preset === 'custom' && (
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] text-emerald-500">WIDTH (IN)</Label>
                                        <Input 
                                            type="number" 
                                            step="0.1"
                                            value={config.stickerWidth} 
                                            onChange={(e) => setConfig(prev => ({ ...prev, stickerWidth: parseFloat(e.target.value) || 1 }))}
                                            className="h-8 bg-black border-emerald-500/20 text-[11px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] text-emerald-500">HEIGHT (IN)</Label>
                                        <Input 
                                            type="number" 
                                            step="0.1"
                                            value={config.stickerHeight} 
                                            onChange={(e) => setConfig(prev => ({ ...prev, stickerHeight: parseFloat(e.target.value) || 1 }))}
                                            className="h-8 bg-black border-emerald-500/20 text-[11px]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="mt-auto pt-6">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-blue-400" />
                                <span className="text-[10px] font-black text-blue-300 uppercase">Pro Tip</span>
                            </div>
                            <p className="text-[10px] text-blue-100/60 leading-relaxed font-bold uppercase tracking-tight">
                                For precision alignment, set your printer scaling to "None" or "100%".
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Preview Area */}
                <div 
                    ref={pageContainerRef}
                    className="flex-1 bg-zinc-950/40 p-12 overflow-auto flex justify-center items-start pattern-grid"
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
                            paddingTop: `${0.4 + config.sheetOffsetY}in`,
                            paddingLeft: `${0.4 + config.sheetOffsetX}in`,
                            paddingRight: `${0.4 - config.sheetOffsetX}in`,
                            paddingBottom: `${0.4 - config.sheetOffsetY}in`,
                            boxSizing: 'border-box',
                            transform: `scale(${config.pageZoom})`,
                            transformOrigin: 'top center',
                            display: 'grid',
                            gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                            columnGap: `${config.gap}in`,
                            rowGap: `${config.gap * 1.5}in`,
                            alignContent: 'start',
                            justifyItems: 'center',
                            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                            position: 'relative'
                        }}
                    >
                        {/* Page Center Guide (Invisible in Print) */}
                        <div className="absolute inset-y-0 left-1/2 w-px bg-blue-500/5 -translate-x-1/2 pointer-events-none print:hidden" />
                        
                        {sheetLabels.map((img, idx) => {
                            const rowIndex = Math.floor(idx / config.columns);
                            const rowOffset = (config.rowOffsets as number[])[rowIndex] || 0;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className="group relative"
                                    style={{ 
                                        width: `${config.stickerWidth}in`,
                                        height: `${config.stickerHeight}in`,
                                        maxWidth: '100%',
                                        backgroundColor: '#000000',
                                        borderRadius: `${config.borderRadius}px`,
                                        overflow: 'hidden',
                                        padding: `${config.stickerPadding}in`,
                                        boxSizing: 'border-box',
                                        marginTop: `${rowOffset}in`,
                                        marginBottom: `${-rowOffset}in`
                                    }}
                                >
                                    <img 
                                        src={img || imageUrl} 
                                        alt="User Component" 
                                        style={{ 
                                            width: `${config.imageScale}%`, 
                                            height: '100%', 
                                            objectFit: 'contain',
                                            transform: `translate(${config.imageOffsetX}%, ${config.imageOffsetY}%)`,
                                            transition: 'none'
                                        }} 
                                    />
                                    {config.showCutMarks && (
                                        <div className="absolute inset-0 pointer-events-none opacity-30 border border-white/10" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Float Controls for Zoom */}
            <div className="fixed bottom-8 right-8 flex items-center gap-4 bg-zinc-900 border border-white/5 p-2 rounded-full shadow-2xl backdrop-blur-xl">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setConfig(prev => ({ ...prev, pageZoom: Math.max(0.1, prev.pageZoom - 0.1) }))}
                    className="rounded-full h-10 w-10 text-zinc-400 hover:text-white"
                 > - </Button>
                 <span className="text-[10px] font-black text-white w-12 text-center">{(config.pageZoom * 100).toFixed(0)}%</span>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setConfig(prev => ({ ...prev, pageZoom: Math.min(2.0, prev.pageZoom + 0.1) }))}
                    className="rounded-full h-10 w-10 text-zinc-400 hover:text-white"
                 > + </Button>
            </div>
        </div>
    );
}
