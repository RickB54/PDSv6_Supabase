import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Chemical, DilutionRatio } from '@/types/chemicals';
import { Textarea } from '@/components/ui/textarea';
import { updateChemicalPartial } from '@/lib/chemicals';
import { upsertLibraryItem, getLibraryItems } from '@/lib/supa-data';
import { useToast } from '@/hooks/use-toast';
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
    Download,
    Loader2,
    BookOpen,
    Images
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { ChemicalEditForm } from './ChemicalEditForm';
import { PhotoGalleryLightbox } from '../gallery/PhotoGalleryLightbox';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ChemicalDetailProps {
    chemical: Chemical | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    isAdmin?: boolean;
}

export function ChemicalDetail({ chemical, open, onOpenChange, onUpdate, isAdmin = false }: ChemicalDetailProps) {
    // Always start in view mode - admin can click Edit button to switch
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);
    const [viewingDilutionNote, setViewingDilutionNote] = useState<{ method: string; note: string } | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [initialPhotoIndex, setInitialPhotoIndex] = useState(0);
    const { toast } = useToast();

    // Helper to extract YouTube ID
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Sync notes when chemical changes
    useEffect(() => {
        if (chemical) {
            setNotes(chemical.user_notes || "");
        }
    }, [chemical]);

    const handleSaveNotes = async () => {
        // ... (existing save notes logic stays same, implied reference)
        if (!chemical) return;
        setIsSavingNotes(true);
        try {
            const { error } = await updateChemicalPartial(chemical.id, { user_notes: notes });
            if (error) throw error;
            toast({ title: "Notes Saved", description: "User notes have been updated." });
            if (onUpdate) onUpdate();
            chemical.user_notes = notes;
        } catch (e: any) {
            console.error("Save Notes Error:", e);
            toast({ title: "Error Saving Notes", description: e.message || "Unknown error occurred", variant: "destructive" });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleAddToLibrary = async (videoUrl: string, idx: number) => {
        if (!chemical) return;

        try {
            // 1. Check for duplicates
            const existingItems = await getLibraryItems();
            const exists = existingItems.find(i => i.resource_url === videoUrl);

            if (exists) {
                toast({
                    title: "Already Exists",
                    description: "This video is already in the Learning Library.",
                    variant: "destructive"
                });
                return;
            }

            // 2. Add to Library
            const newItem = {
                id: crypto.randomUUID(), // Generate ID
                title: `Training: ${chemical.name} (Part ${idx + 1})`,
                description: `Official training video for **${chemical.name}**.\n\n**Category:** ${chemical.category}\n**Source:** Chemical Knowledge Base.`,
                resource_url: videoUrl,
                type: 'video' as 'video',
                category: 'Chemical Training',
                created_by: 'ChemicalLibrary', // System tag
            };

            const result = await upsertLibraryItem(newItem);

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Video added to Learning Library.",
                    className: "bg-green-900 border-green-800 text-white"
                });
            } else {
                throw result.error;
            }

        } catch (error: any) {
            console.error("Library Add Error:", error);
            toast({ title: "Failed", description: "Could not add to library.", variant: "destructive" });
        }
    };

    const handleDownloadPdf = async () => {
        if (!chemical) return;

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const lineHeight = 7;
            let y = margin;

            // Helper to add text with word wrap
            const addLine = (text: string, x: number, fontSize: number = 10, bold: boolean = false, color: number[] = [255, 255, 255]) => {
                pdf.setFontSize(fontSize);
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                pdf.setTextColor(color[0], color[1], color[2]);
                const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - x);
                pdf.text(lines, x, y);
                y += lines.length * lineHeight * (fontSize / 10);
            };

            const addSection = (title: string, color: number[] = [100, 200, 255]) => {
                y += 3;
                pdf.setFillColor(30, 30, 40);
                pdf.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
                pdf.setTextColor(color[0], color[1], color[2]);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title.toUpperCase(), margin + 2, y);
                y += 8;
                pdf.setTextColor(255, 255, 255);
            };

            const checkNewPage = (neededSpace: number = 40) => {
                if (y + neededSpace > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
            };

            // BACKGROUND
            pdf.setFillColor(9, 9, 11);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // HEADER with theme color bar
            if (chemical.theme_color) {
                const rgb = parseInt(chemical.theme_color.slice(1), 16);
                pdf.setFillColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
                pdf.rect(0, 0, pageWidth, 8, 'F');
            }

            y = 18;

            // TITLE
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text(chemical.name || 'Chemical Card', margin, y);
            y += 10;

            // Category & Brand
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(160, 160, 180);
            pdf.text(`${chemical.category || ''}  ${chemical.brand ? '• ' + chemical.brand : ''}`, margin, y);
            y += 10;

            // HIGH RISK WARNING
            if (chemical.warnings?.damage_risk === 'High') {
                pdf.setFillColor(80, 20, 20);
                pdf.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
                pdf.setTextColor(255, 100, 100);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text('⚠ HIGH RISK CHEMICAL', margin + 2, y);
                y += 10;
            }

            //=== USED FOR ===
            addSection('USED FOR', [100, 200, 255]);
            chemical.used_for?.forEach((use: string) => {
                addLine(`• ${use}`, margin + 3, 9);
            });

            //=== WHAT IT IS ===
            checkNewPage();
            addSection('WHAT IT IS', [100, 200, 255]);
            addLine(chemical.description || 'No description provided.', margin + 2, 9);

            //=== WHEN TO USE ===
            checkNewPage();
            addSection('WHEN TO USE', [100, 255, 150]);
            addLine(chemical.when_to_use || 'Not specified.', margin + 2, 9);

            //=== WHY USE IT ===
            checkNewPage();
            addSection('WHY USE IT', [200, 150, 255]);
            addLine(chemical.why_to_use || 'Not specified.', margin + 2, 9);

            //=== DILUTION RATIOS ===
            if (chemical.dilution_ratios && chemical.dilution_ratios.length > 0) {
                checkNewPage();
                addSection('DILUTION RATIOS', [255, 200, 100]);
                chemical.dilution_ratios.forEach((d: any) => {
                    pdf.setTextColor(200, 200, 220);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${d.method} - ${d.soil_level}`, margin + 2, y);
                    y += 6;
                    pdf.setTextColor(150, 255, 150);
                    pdf.setFontSize(11);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`     ${d.ratio}`, margin + 2, y);
                    y += 6;
                    if (d.notes) {
                        pdf.setTextColor(180, 180, 180);
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'italic');
                        const noteLines = pdf.splitTextToSize(`     ${d.notes}`, pageWidth - 2 * margin - 10);
                        pdf.text(noteLines, margin + 2, y);
                        y += noteLines.length * 4;
                    }
                    y += 3;
                });
            }

            //=== WARNINGS & RISKS ===
            if (chemical.warnings) {
                checkNewPage();
                addSection('CRITICAL WARNINGS & RISKS', [255, 100, 100]);

                if (chemical.warnings.risks && chemical.warnings.risks.length > 0) {
                    pdf.setTextColor(255, 150, 150);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Potential Damage:', margin + 2, y);
                    y += 6;
                    chemical.warnings.risks.forEach((risk: string) => {
                        addLine(`  ✗ ${risk}`, margin + 3, 8, false, [255, 180, 180]);
                    });
                    y += 3;
                }

                if (chemical.interactions?.do_not_mix && chemical.interactions.do_not_mix.length > 0) {
                    pdf.setTextColor(255, 150, 150);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Do Not Mix With:', margin + 2, y);
                    y += 6;
                    chemical.interactions.do_not_mix.forEach((mix: string) => {
                        addLine(`  ☠ ${mix}`, margin + 3, 8, false, [255, 200, 200]);
                    });
                }
            }

            //=== APPLICATION GUIDE ===
            if (chemical.application_guide) {
                checkNewPage();
                addSection('HOW TO APPLY', [150, 255, 200]);
                const guide = chemical.application_guide;
                if (guide.method) addLine(`Method: ${guide.method}`, margin + 2, 9);
                if (guide.dwell_time_min) addLine(`Dwell Time: ${guide.dwell_time_min}-${guide.dwell_time_max} minutes`, margin + 2, 9);
                if (guide.agitation) addLine(`Agitation: ${guide.agitation}`, margin + 2, 9);
                if (guide.notes) {
                    y += 2;
                    pdf.setTextColor(200, 200, 200);
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'italic');
                    const noteLines = pdf.splitTextToSize(`Note: ${guide.notes}`, pageWidth - 2 * margin - 5);
                    pdf.text(noteLines, margin + 2, y);
                    y += noteLines.length * 5;
                }
            }

            //=== SURFACE COMPATIBILITY ===
            if (chemical.surface_compatibility) {
                checkNewPage();
                addSection('SURFACE COMPATIBILITY', [100, 255, 200]);

                if (chemical.surface_compatibility.safe && chemical.surface_compatibility.safe.length > 0) {
                    pdf.setTextColor(100, 255, 150);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('SAFE ON:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.safe.join(', '), margin + 3, 8, false, [150, 255, 180]);
                    y += 2;
                }

                if (chemical.surface_compatibility.risky && chemical.surface_compatibility.risky.length > 0) {
                    pdf.setTextColor(255, 200, 100);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('USE CAUTION:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.risky.join(', '), margin + 3, 8, false, [255, 220, 150]);
                    y += 2;
                }

                if (chemical.surface_compatibility.avoid && chemical.surface_compatibility.avoid.length > 0) {
                    pdf.setTextColor(255, 100, 100);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('DO NOT USE ON:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.avoid.join(', '), margin + 3, 8, false, [255, 150, 150]);
                }
            }

            //=== TRAINING VIDEOS ===
            if (chemical.video_urls && chemical.video_urls.length > 0) {
                checkNewPage();
                addSection('TRAINING VIDEOS', [200, 150, 255]);
                chemical.video_urls.forEach((url: string, idx: number) => {
                    addLine(`Video ${idx + 1}: ${url}`, margin + 2, 8, false, [180, 180, 255]);
                });
            }

            // FOOTER
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 120);
            pdf.text(`Generated: ${new Date().toLocaleDateString()} | Prime Auto Detail Chemical Training Card`, margin, pageHeight - 10);

            // SAVE
            pdf.save(`${chemical.name?.replace(/[^a-z0-9]/gi, '_') || 'Chemical'}_Training_Card.pdf`);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            toast({ title: "PDF Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
        }
    };

    // Reset editing state on close
    if (!open && isEditing) setIsEditing(false);

    if (!chemical) return null;

    const handlePrint = async () => {
        if (!chemical) return;

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const lineHeight = 7;
            let y = margin;

            // Helper to add text with word wrap
            const addLine = (text: string, x: number, fontSize: number = 10, bold: boolean = false, color: number[] = [0, 0, 0]) => {
                pdf.setFontSize(fontSize);
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                pdf.setTextColor(color[0], color[1], color[2]);
                const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - x);
                pdf.text(lines, x, y);
                y += lines.length * lineHeight * (fontSize / 10);
            };

            const addSection = (title: string, color: number[] = [0, 100, 200]) => {
                y += 3;
                pdf.setFillColor(240, 240, 245);
                pdf.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
                pdf.setTextColor(color[0], color[1], color[2]);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title.toUpperCase(), margin + 2, y);
                y += 8;
                pdf.setTextColor(0, 0, 0);
            };

            const checkNewPage = (neededSpace: number = 40) => {
                if (y + neededSpace > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
            };

            // WHITE background for printing
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Header with theme color bar
            if (chemical.theme_color) {
                const rgb = parseInt(chemical.theme_color.slice(1), 16);
                pdf.setFillColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
                pdf.rect(0, 0, pageWidth, 8, 'F');
            }

            y = 18;

            // TITLE
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text(chemical.name || 'Chemical Card', margin, y);
            y += 10;

            // Category & Brand
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            pdf.text(`${chemical.category || ''}  ${chemical.brand ? '• ' + chemical.brand : ''}`, margin, y);
            y += 10;

            // HIGH RISK WARNING
            if (chemical.warnings?.damage_risk === 'High') {
                pdf.setFillColor(255, 230, 230);
                pdf.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
                pdf.setTextColor(200, 0, 0);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text('⚠ HIGH RISK CHEMICAL', margin + 2, y);
                y += 10;
            }

            //=== USED FOR ===
            addSection('USED FOR', [0, 100, 200]);
            chemical.used_for?.forEach((use: string) => {
                addLine(`• ${use}`, margin + 3, 9);
            });

            //=== WHAT IT IS ===
            checkNewPage();
            addSection('WHAT IT IS', [0, 100, 200]);
            addLine(chemical.description || 'No description provided.', margin + 2, 9);

            //=== WHEN TO USE ===
            checkNewPage();
            addSection('WHEN TO USE', [0, 150, 50]);
            addLine(chemical.when_to_use || 'Not specified.', margin + 2, 9);

            //=== WHY USE IT ===
            checkNewPage();
            addSection('WHY USE IT', [100, 50, 150]);
            addLine(chemical.why_to_use || 'Not specified.', margin + 2, 9);

            //=== DILUTION RATIOS ===
            if (chemical.dilution_ratios && chemical.dilution_ratios.length > 0) {
                checkNewPage();
                addSection('DILUTION RATIOS', [200, 100, 0]);
                chemical.dilution_ratios.forEach((d: any) => {
                    pdf.setTextColor(60, 60, 60);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${d.method} - ${d.soil_level}`, margin + 2, y);
                    y += 6;
                    pdf.setTextColor(0, 120, 0);
                    pdf.setFontSize(11);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`     ${d.ratio}`, margin + 2, y);
                    y += 6;
                    if (d.notes) {
                        pdf.setTextColor(80, 80, 80);
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'italic');
                        const noteLines = pdf.splitTextToSize(`     ${d.notes}`, pageWidth - 2 * margin - 10);
                        pdf.text(noteLines, margin + 2, y);
                        y += noteLines.length * 4;
                    }
                    y += 3;
                });
            }

            //=== WARNINGS & RISKS ===
            if (chemical.warnings) {
                checkNewPage();
                addSection('CRITICAL WARNINGS & RISKS', [200, 0, 0]);

                if (chemical.warnings.risks && chemical.warnings.risks.length > 0) {
                    pdf.setTextColor(180, 0, 0);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Potential Damage:', margin + 2, y);
                    y += 6;
                    chemical.warnings.risks.forEach((risk: string) => {
                        addLine(`  ✗ ${risk}`, margin + 3, 8, false, [150, 0, 0]);
                    });
                    y += 3;
                }

                if (chemical.interactions?.do_not_mix && chemical.interactions.do_not_mix.length > 0) {
                    pdf.setTextColor(180, 0, 0);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Do Not Mix With:', margin + 2, y);
                    y += 6;
                    chemical.interactions.do_not_mix.forEach((mix: string) => {
                        addLine(`  ☠ ${mix}`, margin + 3, 8, false, [150, 0, 0]);
                    });
                }
            }

            //=== APPLICATION GUIDE ===
            if (chemical.application_guide) {
                checkNewPage();
                addSection('HOW TO APPLY', [0, 150, 100]);
                const guide = chemical.application_guide;
                if (guide.method) addLine(`Method: ${guide.method}`, margin + 2, 9);
                if (guide.dwell_time_min) addLine(`Dwell Time: ${guide.dwell_time_min}-${guide.dwell_time_max} minutes`, margin + 2, 9);
                if (guide.agitation) addLine(`Agitation: ${guide.agitation}`, margin + 2, 9);
                if (guide.notes) {
                    y += 2;
                    pdf.setTextColor(80, 80, 80);
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'italic');
                    const noteLines = pdf.splitTextToSize(`Note: ${guide.notes}`, pageWidth - 2 * margin - 5);
                    pdf.text(noteLines, margin + 2, y);
                    y += noteLines.length * 5;
                }
            }

            //=== SURFACE COMPATIBILITY ===
            if (chemical.surface_compatibility) {
                checkNewPage();
                addSection('SURFACE COMPATIBILITY', [0, 150, 100]);

                if (chemical.surface_compatibility.safe && chemical.surface_compatibility.safe.length > 0) {
                    pdf.setTextColor(0, 150, 0);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('SAFE ON:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.safe.join(', '), margin + 3, 8, false, [0, 120, 0]);
                    y += 2;
                }

                if (chemical.surface_compatibility.risky && chemical.surface_compatibility.risky.length > 0) {
                    pdf.setTextColor(200, 150, 0);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('USE CAUTION:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.risky.join(', '), margin + 3, 8, false, [180, 120, 0]);
                    y += 2;
                }

                if (chemical.surface_compatibility.avoid && chemical.surface_compatibility.avoid.length > 0) {
                    pdf.setTextColor(200, 0, 0);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('DO NOT USE ON:', margin + 2, y);
                    y += 5;
                    addLine(chemical.surface_compatibility.avoid.join(', '), margin + 3, 8, false, [180, 0, 0]);
                }
            }

            //=== TRAINING VIDEOS ===
            if (chemical.video_urls && chemical.video_urls.length > 0) {
                checkNewPage();
                addSection('TRAINING VIDEOS', [100, 50, 200]);
                chemical.video_urls.forEach((url: string, idx: number) => {
                    addLine(`Video ${idx + 1}: ${url}`, margin + 2, 8, false, [80, 80, 180]);
                });
            }

            // FOOTER
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`Printed: ${new Date().toLocaleDateString()} | Prime Auto Detail Chemical Training Card`, margin, pageHeight - 10);

            // Open print dialog
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');

        } catch (error) {
            console.error("Print Generation Error:", error);
            toast({ title: "Print Error", description: "Failed to generate print version. Please try again.", variant: "destructive" });
        }
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
                            {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-zinc-400 hover:text-white" title="Edit Card">
                                    <Pencil className="w-5 h-5" />
                                </Button>
                            )}
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

                            {/* WHAT / WHEN / WHY as Full-Width Accordions */}
                            <div className="spacey-4">
                                {/* What It Is */}
                                <details className="group bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                    <summary className="cursor-pointer px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                        <h4 className="flex items-center text-sm font-bold text-zinc-300 uppercase">
                                            <Info className="w-4 h-4 mr-2 text-blue-500" /> What it is
                                        </h4>
                                        <span className="text-zinc-500 group-open:rotate-90 transition-transform">▶</span>
                                    </summary>
                                    <div className="px-6 pb-4">
                                        <p className="text-sm text-zinc-300 leading-relaxed">{chemical.description}</p>
                                    </div>
                                </details>

                                {/* When to Use */}
                                <details className="group bg-zinc-900/50 border border-zinc-800 rounded-lg mt-3">
                                    <summary className="cursor-pointer px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                        <h4 className="flex items-center text-sm font-bold text-zinc-300 uppercase">
                                            <Clock className="w-4 h-4 mr-2 text-green-500" /> When to use
                                        </h4>
                                        <span className="text-zinc-500 group-open:rotate-90 transition-transform">▶</span>
                                    </summary>
                                    <div className="px-6 pb-4">
                                        <p className="text-sm text-zinc-300 leading-relaxed">{chemical.when_to_use}</p>
                                    </div>
                                </details>

                                {/* Why Use It */}
                                <details className="group bg-zinc-900/50 border border-zinc-800 rounded-lg mt-3">
                                    <summary className="cursor-pointer px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                        <h4 className="flex items-center text-sm font-bold text-zinc-300 uppercase">
                                            <FlaskConical className="w-4 h-4 mr-2 text-purple-500" /> Why use it
                                        </h4>
                                        <span className="text-zinc-500 group-open:rotate-90 transition-transform">▶</span>
                                    </summary>
                                    <div className="px-6 pb-4">
                                        <p className="text-sm text-zinc-300 leading-relaxed">{chemical.why_to_use}</p>
                                    </div>
                                </details>
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* USER NOTES (Admin Editable, Employee View) */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="flex items-center text-sm font-bold text-zinc-500 uppercase">
                                        <FileText className="w-4 h-4 mr-2" /> User Notes
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-zinc-500 hover:text-white"
                                            onClick={() => {
                                                const doc = new jsPDF();
                                                doc.setFontSize(16);
                                                doc.text(`${chemical.name} - User Notes`, 10, 10);
                                                doc.setFontSize(12);
                                                const splitNotes = doc.splitTextToSize(notes || "No notes available.", 180);
                                                doc.text(splitNotes, 10, 20);
                                                doc.save(`${chemical.name}_Notes.pdf`);
                                            }}
                                            title="Download Notes as PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        {isAdmin && (
                                            <span className="text-[10px] text-zinc-600 uppercase border border-zinc-800 px-2 py-0.5 rounded">
                                                Admin Only Edit
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="relative">
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        disabled={!isAdmin}
                                        placeholder={isAdmin ? "Add detailed internal notes, tips, or warnings here..." : "No additional notes provided."}
                                        className={`bg-zinc-900 border-zinc-800 text-sm min-h-[100px] pb-10 resize-none focus-visible:ring-1 focus-visible:ring-purple-500/50 ${!isAdmin ? 'opacity-80 cursor-default' : ''}`}
                                    />
                                    {isAdmin && notes !== (chemical.user_notes || '') && (
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setNotes(chemical.user_notes || '')}
                                                className="h-7 text-xs text-zinc-400 hover:text-white"
                                            >
                                                Undo
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveNotes}
                                                disabled={isSavingNotes}
                                                className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                                            >
                                                {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Notes"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </section>

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
                                                        <td
                                                            className="px-4 py-3 text-zinc-400 text-xs cursor-pointer hover:text-blue-400 hover:underline transition-colors"
                                                            onClick={() => d.notes && setViewingDilutionNote({ method: d.method, note: d.notes || '' })}
                                                            title={d.notes ? "Click to view full notes" : "No notes"}
                                                        >
                                                            {d.notes || <span className="text-zinc-600 italic">—</span>}
                                                        </td>
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

                            {/* Photo Gallery (New) */}
                            {(chemical.primary_image_url || (chemical.gallery_image_urls?.length ?? 0) > 0) && (
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                        <Images className="w-5 h-5 mr-2 text-purple-400" /> Photo Gallery
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            ...(chemical.primary_image_url ? [{ url: chemical.primary_image_url, label: "Primary" }] : []),
                                            ...(chemical.gallery_image_urls || []).map(url => ({ url, label: undefined }))
                                        ].map((img: { url: string; label?: string }, idx) => (
                                            <div 
                                                key={idx} 
                                                className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer hover:border-purple-500 transition-all group relative"
                                                onClick={() => {
                                                    setInitialPhotoIndex(idx);
                                                    setLightboxOpen(true);
                                                }}
                                            >
                                                <img src={img.url} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                {img.label && (
                                                    <div className="absolute top-2 left-2 bg-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-lg">
                                                        {img.label}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Multimedia */}
                            {chemical.video_urls && chemical.video_urls.length > 0 && (
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                                        <Video className="w-5 h-5 mr-2" /> Training Videos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {chemical.video_urls.map((url, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto py-3 justify-start border-zinc-800 hover:bg-zinc-800 flex-1"
                                                    onClick={() => setPlayingVideo(url)}
                                                >
                                                    <Video className="w-4 h-4 mr-2 text-zinc-500" />
                                                    <div className="text-left overflow-hidden">
                                                        <div className="text-white font-semibold truncate w-full">Training Video {idx + 1}</div>
                                                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">{url}</div>
                                                    </div>
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-full border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-blue-400"
                                                        onClick={() => handleAddToLibrary(url, idx)}
                                                        title="Add to Learning Library"
                                                    >
                                                        <BookOpen className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>

            {/* Video Player Modal */}
            <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
                <DialogContent className="max-w-4xl bg-black border-zinc-800 p-0 overflow-hidden aspect-video">
                    {playingVideo && (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${getYouTubeId(playingVideo)}?autoplay=1`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Dilution Notes Viewer Modal */}
            <Dialog open={!!viewingDilutionNote} onOpenChange={(open) => !open && setViewingDilutionNote(null)}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-purple-400" />
                            Dilution Notes: {viewingDilutionNote?.method}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {viewingDilutionNote?.note}
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setViewingDilutionNote(null)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Photo Gallery Lightbox */}
            <PhotoGalleryLightbox
                photos={[
                    ...(chemical.primary_image_url ? [{ url: chemical.primary_image_url, label: "Primary" }] : []),
                    ...(chemical.gallery_image_urls || []).map(url => ({ url }))
                ]}
                initialIndex={initialPhotoIndex}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
            />
        </Dialog>
    );
}
