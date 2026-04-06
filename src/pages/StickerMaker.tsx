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
    Grid3X3,
    ChevronLeft
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Preset = 'business-card' | 'custom' | 'small-sticker' | 'avery-5163' | '3x10-label';

export default function StickerMaker() {
    const navigate = useNavigate();
    const DEFAULT_IMAGE = "https://kcaqshdgnobuhsqpzdun.supabase.co/storage/v1/object/public/blog-media/1775498961726_business_card_qr.png";
    
    const [imageUrl, setImageUrl] = useState(() => {
        const saved = localStorage.getItem('sticker_maker_image');
        return saved || DEFAULT_IMAGE;
    });
    const [preset, setPreset] = useState<Preset>('business-card');
    
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('sticker_maker_config');
        if (saved) return JSON.parse(saved);
        return {
            labelsPerPage: 10,
            columns: 2,
            rows: 5,
            margin: 0.3, 
            stickerPadding: 0.02, 
            gap: 0.08, 
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
            rowOffsets: Array(25).fill(0),
            stickerText: "Scan to Order",
            textSize: 12,
            textOffsetY: 0
        };
    });

    useEffect(() => {
        localStorage.setItem('sticker_maker_config', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        localStorage.setItem('sticker_maker_image', imageUrl);
    }, [imageUrl]);

    const [sheetLabels, setSheetLabels] = useState<Array<string | null>>(Array(10).fill(imageUrl));
    const [loading, setLoading] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSheetLabels(Array(config.labelsPerPage).fill(imageUrl));
    }, [imageUrl, config.labelsPerPage]);

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
        } else if (preset === 'avery-5163') {
            setConfig(prev => ({
                ...prev,
                labelsPerPage: 10,
                columns: 2,
                rows: 5,
                stickerWidth: 4.0,
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
        } else if (preset === '3x10-label') {
            setConfig(prev => ({
                ...prev,
                labelsPerPage: 30,
                columns: 3,
                rows: 10,
                stickerWidth: 2.625,
                stickerHeight: 1.0,
                gap: 0.05
            }));
        }
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

    const handleResetAlignment = () => {
        setConfig(prev => ({
            ...prev,
            sheetOffsetX: 0,
            sheetOffsetY: 0,
            rowOffsets: [0, 0, 0, 0, 0, 0, 0, 0]
        }));
        toast({ title: "Alignment Reset", description: "All master shifts and row offsets cleared." });
    };

    const handleExportSetup = () => {
        const setup = {
            config,
            imageUrl,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(setup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sticker_Setup_${Date.now()}.sticker`;
        link.click();
        toast({ title: "Setup Exported", description: "Your .sticker calibration file has been downloaded." });
    };

    const handleImportSetup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const setup = JSON.parse(event.target?.result as string);
                if (setup.config) setConfig(setup.config);
                if (setup.imageUrl) setImageUrl(setup.imageUrl);
                toast({ title: "Setup Recalled", description: "All image and offset settings restored." });
            } catch (err) {
                toast({ title: "Import Error", description: "Could not read sticker file.", variant: "destructive" });
            }
        };
        reader.readAsText(file);
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
                <aside className="w-80 border-r border-white/5 bg-zinc-900/20 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Plus className="h-3 w-3 text-purple-400" />
                            Setup Vault (Project Files)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportSetup}
                                className="h-10 text-[9px] font-black uppercase bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white"
                            >
                                <Plus className="h-3 w-3 mr-2" />
                                Export
                            </Button>
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    accept=".sticker,.json"
                                    onChange={handleImportSetup}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full h-10 text-[9px] font-black uppercase bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white"
                                >
                                    <RotateCcw className="h-3 w-3 mr-2" />
                                    Recall
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Grid3X3 className="h-3 w-3 text-emerald-400" />
                            Dimensions Preset
                        </Label>
                        <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
                            <SelectTrigger className="w-full bg-black border-zinc-800 text-white font-bold h-11">
                                <SelectValue placeholder="Choose a size..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="business-card">Standard Business Card (3.5" x 2")</SelectItem>
                                <SelectItem value="extreme-density">Extreme Density (80 Labels - 4x20)</SelectItem>
                                <SelectItem value="avery-5163">Avery 5163 Address Label (2" x 4")</SelectItem>
                                <SelectItem value="small-sticker">Small Grid (2.25" x 1.25")</SelectItem>
                                <SelectItem value="3x10-label">Avery 5160 - 3x10 (1" x 2.6")</SelectItem>
                                <SelectItem value="custom">Full Custom Dimensions</SelectItem>
                            </SelectContent>
                        </Select>
                    </section>

                    <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <ImageIcon className="h-3 w-3 text-blue-400" />
                            Design Source
                        </Label>
                        <div className="space-y-4">
                            <div className="aspect-video bg-black rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
                                <img 
                                    src={imageUrl} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <Button variant="outline" className="w-full h-10 border-blue-500/20 bg-blue-500/5 text-blue-400 font-black uppercase text-[10px]">
                                    <Plus className="h-3 w-3 mr-2" />
                                    Replace Image
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Settings2 className="h-3 w-3 text-blue-400" />
                            Sticker Branding & Text
                        </Label>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] text-zinc-500 uppercase">TITLE OVERLAY</Label>
                                <Input 
                                    value={config.stickerText} 
                                    onChange={(e) => setConfig(prev => ({ ...prev, stickerText: e.target.value }))}
                                    placeholder="e.g. Scan for Bio" 
                                    className="h-8 bg-black border-white/5 text-[11px] font-bold text-emerald-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-500">
                                        <span>FONT SIZE</span>
                                        <span className="text-blue-400">{config.textSize}px</span>
                                    </div>
                                    <Slider value={[config.textSize]} min={4} max={48} onValueChange={([val]) => setConfig(prev => ({ ...prev, textSize: val }))} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-500">
                                        <span>TEXT RISE</span>
                                        <span className="text-blue-400">{config.textOffsetY}px</span>
                                    </div>
                                    <Slider value={[config.textOffsetY]} min={-50} max={50} onValueChange={([val]) => setConfig(prev => ({ ...prev, textOffsetY: val }))} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>IMAGE ZOOM</span>
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
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">IMG X</span>
                                    <Slider value={[config.imageOffsetX]} min={-100} max={100} onValueChange={([val]) => setConfig(prev => ({ ...prev, imageOffsetX: val }))} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">IMG Y</span>
                                    <Slider value={[config.imageOffsetY]} min={-100} max={100} onValueChange={([val]) => setConfig(prev => ({ ...prev, imageOffsetY: val }))} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-emerald-400" />
                                Sheet Alignment
                            </Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toast({ title: "Calibration Saved!", description: "All offsets and row settings have been committed to memory." })} 
                                className="h-7 text-[9px] font-black uppercase bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all px-3"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Save Setup
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleResetAlignment} 
                                className="h-7 text-[9px] font-black uppercase bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all px-3"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset All
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>VERTICAL SHIFT</span>
                                    <span className="text-emerald-400">{config.sheetOffsetY.toFixed(2)}"</span>
                                </div>
                                <Slider value={[config.sheetOffsetY * 100]} min={-100} max={100} onValueChange={([val]) => setConfig(prev => ({ ...prev, sheetOffsetY: val / 100 }))} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>HORIZONTAL SHIFT</span>
                                    <span className="text-emerald-400">{config.sheetOffsetX.toFixed(2)}"</span>
                                </div>
                                <Slider value={[config.sheetOffsetX * 100]} min={-100} max={100} onValueChange={([val]) => setConfig(prev => ({ ...prev, sheetOffsetX: val / 100 }))} />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <Label className="text-[8px] font-black uppercase text-zinc-500 mb-2 block">Row Fine-Tuning</Label>
                            <div className="space-y-3 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {Array.from({ length: Math.ceil(config.labelsPerPage / config.columns) }).map((_, rIdx) => (
                                    <div key={rIdx} className="space-y-1">
                                        <div className="flex justify-between text-[7px] font-bold text-zinc-400">
                                            <span>Row {rIdx + 1}</span>
                                        </div>
                                        <Slider 
                                            value={[config.rowOffsets[rIdx] * 100]} 
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
                        </div>
                    </section>

                    <section className="space-y-6 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Grid Setup</Label>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[9px] text-zinc-500 uppercase">Cols</Label>
                                    <Input type="number" value={config.columns} onChange={(e) => setConfig(prev => ({ ...prev, columns: parseInt(e.target.value) || 1 }))} className="h-8 bg-black text-[11px]" />
                                </div>
                                <div>
                                    <Label className="text-[9px] text-zinc-500 uppercase">Gap</Label>
                                    <Input type="number" step="0.05" value={config.gap} onChange={(e) => setConfig(prev => ({ ...prev, gap: parseFloat(e.target.value) || 0 }))} className="h-8 bg-black text-[11px]" />
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>

                <div ref={pageContainerRef} className="flex-1 bg-zinc-950/40 p-12 overflow-auto flex justify-center items-start pattern-grid">
                    <div 
                        ref={sheetRef}
                        id="sticker-print-sheet"
                        style={{ 
                            width: '8.5in', height: '11in', backgroundColor: 'white',
                            paddingTop: `${0.4 + config.sheetOffsetY}in`,
                            paddingLeft: `${0.4 + config.sheetOffsetX}in`,
                            paddingRight: `${0.4 - config.sheetOffsetX}in`,
                            paddingBottom: `${0.4 - config.sheetOffsetY}in`,
                            boxSizing: 'border-box',
                            transform: `scale(${config.pageZoom})`,
                            transformOrigin: 'top center',
                            display: 'grid', gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                            columnGap: `${config.gap}in`, rowGap: `${config.gap * 1.5}in`,
                            alignContent: 'start', justifyItems: 'center', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                            position: 'relative'
                        }}
                    >
                        {sheetLabels.map((img, idx) => {
                            const rowIndex = Math.floor(idx / config.columns);
                            const rowOffset = config.rowOffsets[rowIndex] || 0;
                            return (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        width: `${config.stickerWidth}in`, height: `${config.stickerHeight}in`,
                                        backgroundColor: '#000', borderRadius: `${config.borderRadius}px`,
                                        overflow: 'hidden', padding: `${config.stickerPadding}in`, boxSizing: 'border-box',
                                        marginTop: `${rowOffset}in`, marginBottom: `${-rowOffset}in`,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative'
                                    }}
                                >
                                    {config.stickerText && (
                                        <div 
                                            style={{ 
                                                color: 'white', 
                                                fontSize: `${config.textSize}px`, 
                                                fontWeight: '900', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em',
                                                transform: `translateY(${config.textOffsetY}px)`,
                                                pointerEvents: 'none',
                                                zIndex: 10,
                                                marginBottom: '2px'
                                            }}
                                        >
                                            {config.stickerText}
                                        </div>
                                    )}
                                    <img 
                                        src={img || imageUrl} 
                                        alt="" 
                                        style={{ 
                                            width: `${config.imageScale}%`, 
                                            height: config.stickerText ? 'auto' : '100%', 
                                            maxHeight: config.stickerText ? '60%' : '100%',
                                            objectFit: 'contain', 
                                            transform: `translate(${config.imageOffsetX}%, ${config.imageOffsetY}%)` 
                                        }} 
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <div className="fixed bottom-8 right-8 flex items-center gap-4 bg-zinc-900 border border-white/5 p-2 rounded-full shadow-2xl backdrop-blur-xl">
                 <Button variant="ghost" size="sm" onClick={() => setConfig(prev => ({ ...prev, pageZoom: Math.max(0.1, prev.pageZoom - 0.1) }))} className="rounded-full h-10 w-10 text-zinc-400"> - </Button>
                 <span className="text-[10px] font-black text-white w-12 text-center">{(config.pageZoom * 100).toFixed(0)}%</span>
                 <Button variant="ghost" size="sm" onClick={() => setConfig(prev => ({ ...prev, pageZoom: Math.min(2.0, prev.pageZoom + 0.1) }))} className="rounded-full h-10 w-10 text-zinc-400"> + </Button>
            </div>
        </div>
    );
}
