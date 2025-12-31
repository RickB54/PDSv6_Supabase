import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Chemical, DilutionRatio } from '@/types/chemicals';
import {
    AlertTriangle,
    Beaker,
    CheckCircle2,
    Clock,
    Droplet,
    FileText,
    FlaskConical,
    Info,
    ShieldAlert,
    Skull,
    Video,
    XCircle,
    Printer,
    Pencil,
    Download
} from 'lucide-react';
import { useState } from 'react';
import { ChemicalEditForm } from './ChemicalEditForm';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ChemicalDetailProps {
    chemical: Chemical | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function ChemicalDetail({ chemical, open, onOpenChange, onUpdate }: ChemicalDetailProps) {
    const [isEditing, setIsEditing] = useState(false);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('chemical-detail-content');
        if (!element) return;

        // Clone explicitly for capture to avoid layout issues with ScrollArea/Dialog
        const clone = element.cloneNode(true) as HTMLElement;

        // Force desktop-like width and unconstrained height
        clone.style.position = 'absolute';
        clone.style.left = '-9999px'; // Render off-screen but visible to DOM
        clone.style.top = '0';
        clone.style.width = '1000px';
        clone.style.height = 'auto';
        clone.style.minHeight = '100vh';
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        clone.style.borderRadius = '0';
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.backgroundColor = '#09090b';
        clone.id = 'chemical-card-clone';

        // Fix internal ScrollArea for capture
        const scrollAreas = clone.querySelectorAll('[data-radix-scroll-area-viewport]');
        scrollAreas.forEach((sa: any) => {
            sa.style.overflow = 'visible';
            sa.style.height = 'auto';
            sa.style.display = 'block';
        });

        // Hide non-printable elements in clone
        const toHide = clone.querySelectorAll('.print\\:hidden');
        toHide.forEach((el: any) => el.style.display = 'none');

        document.body.appendChild(clone);

        try {
            // Wait a tick for styles to apply
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(clone, {
                scale: 2, // Retina quality
                useCORS: true,
                backgroundColor: "#09090b",
                logging: false,
                width: 1000,
                windowWidth: 1000
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = pageWidth / imgWidth;
            const finalHeight = imgHeight * ratio;

            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, finalHeight);
            pdf.save(`${chemical?.name?.replace(/[^a-z0-9]/gi, '_') || 'Chemical'}_Card.pdf`);

        } catch (error) {
            console.error("PDF Gen Error", error);
            alert("PDF generation using Canvas failed. Using Print fallback.");
            window.print();
        } finally {
            document.body.removeChild(clone);
        }
    };

    // Reset editing state on close
    if (!open && isEditing) setIsEditing(false);

    if (!chemical) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>

            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body {
                        background-color: #09090b !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #chemical-detail-content, #chemical-detail-content * {
                        visibility: visible;
                    }
                    #chemical-detail-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        margin: 0 !important;
                        transform: none !important; /* Critical to remove centering */
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        min-height: 100%;
                        background-color: #09090b !important;
                        color: white !important;
                        overflow: visible !important;
                        border: none !important;
                        box-shadow: none !important;
                        z-index: 9999;
                    }
                    /* Force ScrollArea to be fully expanded */
                    [data-radix-scroll-area-viewport] {
                        overflow: visible !important;
                        height: auto !important;
                        display: block !important;
                    }
                    [data-radix-scroll-area-viewport] > div {
                        display: block !important;
                    }
                    .print\\:hidden { display: none !important; }
                    .dialog-overlay { opacity: 0; display: none; }
                }
            `}</style>
            <DialogContent id="chemical-detail-content" className="max-w-4xl h-[90vh] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden flex flex-col print:h-auto print:max-w-none print:border-0">
                {/* Header with Theme Color */}
                <div
                    className="h-2 w-full shrink-0"
                    style={{ backgroundColor: chemical.theme_color }}
                />

                <DialogHeader className="px-6 py-4 shrink-0 bg-zinc-900/50 border-b border-zinc-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400">{chemical.category}</Badge>
                                {chemical.brand && <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">{chemical.brand}</span>}
                            </div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                {chemical.name}
                            </DialogTitle>
                        </div>
                        {chemical.warnings?.damage_risk === 'High' && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full">
                                <Skull className="w-5 h-5" />
                                <span className="text-sm font-bold uppercase">High Risk Chemical</span>
                            </div>
                        )}
                        <div className="flex gap-1 print:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-zinc-400 hover:text-white" title="Edit Card">
                                <Pencil className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handlePrint} className="text-zinc-400 hover:text-white" title="Print Card">
                                <Printer className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleDownloadPdf} className="text-zinc-400 hover:text-white" title="Save as PDF">
                                <Download className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {isEditing ? (
                    <div className="flex-1 overflow-hidden p-6 bg-zinc-950">
                        <ChemicalEditForm
                            initialData={chemical}
                            onSave={() => {
                                setIsEditing(false);
                                onUpdate?.();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">

                            {/* TOP SECTION: USED FOR (Mandatory) */}
                            <section className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4">
                                <h4 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-3 flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Used For
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {chemical.used_for?.map((use, i) => (
                                        <li key={i} className="flex items-start text-zinc-300 text-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 shrink-0" />
                                            {use}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* WHAT / WHEN / WHY Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <h4 className="flex items-center text-sm font-bold text-zinc-500 uppercase">
                                        <Info className="w-4 h-4 mr-2" /> What it is
                                    </h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{chemical.description}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="flex items-center text-sm font-bold text-zinc-500 uppercase">
                                        <Clock className="w-4 h-4 mr-2" /> When to use
                                    </h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{chemical.when_to_use}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="flex items-center text-sm font-bold text-zinc-500 uppercase">
                                        <FlaskConical className="w-4 h-4 mr-2" /> Why use it
                                    </h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{chemical.why_to_use}</p>
                                </div>
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* DILUTION RATIOS (Critical) */}
                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                    <Beaker className="w-5 h-5 mr-2 text-purple-500" /> Dilution Ratios
                                </h3>
                                <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                                    <table className="w-full text-sm text-left text-zinc-300">
                                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Method</th>
                                                <th className="px-4 py-3 font-medium">Soil Level</th>
                                                <th className="px-4 py-3 font-medium text-white">Ratio / Amount</th>
                                                <th className="px-4 py-3 font-medium">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {chemical.dilution_ratios?.length ? (
                                                chemical.dilution_ratios.map((d: DilutionRatio, i: number) => (
                                                    <tr key={i} className="hover:bg-zinc-800/30">
                                                        <td className="px-4 py-3 font-medium text-white">{d.method}</td>
                                                        <td className="px-4 py-3">{d.soil_level}</td>
                                                        <td className="px-4 py-3 text-purple-400 font-bold font-mono text-base">{d.ratio}</td>
                                                        <td className="px-4 py-3 text-zinc-500 text-xs italic">{d.notes}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500 italic">No dilution data available (Use full strength or strictly per label).</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* WARNINGS / RISKS (High Visibility) */}
                            <section className="space-y-4">
                                {chemical.warnings && (
                                    <div className={`rounded-xl border p-5 ${chemical.warnings.damage_risk === 'High' ? 'bg-red-950/20 border-red-900/50' : 'bg-yellow-950/20 border-yellow-900/50'}`}>
                                        <h3 className={`text-lg font-bold mb-3 flex items-center ${chemical.warnings.damage_risk === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            <AlertTriangle className="w-5 h-5 mr-2" />
                                            Critical Warnings & Risks
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs uppercase font-bold text-zinc-500 mb-2">Potential Damage</p>
                                                <ul className="space-y-1">
                                                    {chemical.warnings.risks?.map((risk, i) => (
                                                        <li key={i} className="flex items-start text-sm text-zinc-300">
                                                            <XCircle className="w-4 h-4 mr-2 mt-0.5 text-red-500/70 shrink-0" />
                                                            {risk}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase font-bold text-zinc-500 mb-2">Interactions (Do Not Mix)</p>
                                                <ul className="space-y-1">
                                                    {chemical.interactions?.do_not_mix?.length ? (
                                                        chemical.interactions.do_not_mix.map((mix, i) => (
                                                            <li key={i} className="flex items-start text-sm text-zinc-300">
                                                                <Skull className="w-4 h-4 mr-2 mt-0.5 text-zinc-500 shrink-0" />
                                                                Top mixing {mix}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-sm text-zinc-500 italic">No specific dangerous interactions logged.</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Application & Surfaces */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3">How to Apply</h3>
                                    <div className="space-y-4 text-sm text-zinc-300">
                                        <div className="flex justify-between py-2 border-b border-zinc-800">
                                            <span className="text-zinc-500">Method</span>
                                            <span className="text-white">{chemical.application_guide?.method || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-zinc-800">
                                            <span className="text-zinc-500">Dwell Time</span>
                                            <span className="text-white font-mono">
                                                {chemical.application_guide?.dwell_time_min ? `${chemical.application_guide.dwell_time_min}-${chemical.application_guide.dwell_time_max} mins` : 'Immediate Wipe'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-zinc-800">
                                            <span className="text-zinc-500">Agitation</span>
                                            <span className="text-white">{chemical.application_guide?.agitation || 'None'}</span>
                                        </div>
                                        {chemical.application_guide?.notes && (
                                            <div className="bg-zinc-900 p-3 rounded text-zinc-400 text-xs mt-2 italic">
                                                Note: {chemical.application_guide.notes}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3">Surface Compatibility</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs font-bold text-green-500 uppercase block mb-1">Safe On</span>
                                            <div className="flex flex-wrap gap-1">
                                                {chemical.surface_compatibility?.safe?.map(s => <Badge key={s} variant="outline" className="border-green-900 text-green-400 bg-green-900/10">{s}</Badge>)}
                                            </div>
                                        </div>
                                        {chemical.surface_compatibility?.risky?.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-yellow-500 uppercase block mb-1">Use Caution</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {chemical.surface_compatibility.risky.map(s => <Badge key={s} variant="outline" className="border-yellow-900 text-yellow-400 bg-yellow-900/10">{s}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                        {chemical.surface_compatibility?.avoid?.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-red-500 uppercase block mb-1">Do Not Use On</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {chemical.surface_compatibility.avoid.map(s => <Badge key={s} variant="outline" className="border-red-900 text-red-400 bg-red-900/10">{s}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Multimedia */}
                            {chemical.video_urls && chemical.video_urls.length > 0 && (
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                                        <Video className="w-5 h-5 mr-2" /> Training Videos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {chemical.video_urls.map((vid, idx) => (
                                            <Button key={idx} variant="outline" className="h-auto py-3 justify-start border-zinc-800 hover:bg-zinc-800" onClick={() => window.open(vid.url, '_blank')}>
                                                <Video className="w-4 h-4 mr-2 text-zinc-500" />
                                                <div className="text-left">
                                                    <div className="text-white font-semibold">{vid.title}</div>
                                                    <div className="text-xs text-zinc-500">Click to watch training</div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
