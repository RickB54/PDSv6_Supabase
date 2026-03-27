
import jsPDF from "jspdf";
import { Chemical } from "@/types/chemicals";

export const printChemicalCard = (chemical: Chemical, pdf?: jsPDF, startY?: number) => {
    const doc = pdf || new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = startY || 18;

    const transformRatio = (r: string) => {
        if (!r) return "";
        if (r.indexOf(':') !== -1) return r;
        return `1:${r}`;
    };

    const addSection = (title: string, color: [number, number, number]) => {
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += 2;
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
    };

    const addLine = (text: string, x: number, size: number, bold = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, pageWidth - margin - x);
        doc.text(lines, x, y);
        y += (lines.length * (size / 2)) + 2;
    };

    const checkNewPage = (needed: number = 20) => {
        if (y + needed > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

    // WHITE background for printing
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header with theme color bar
    if (chemical.theme_color) {
        const colorStr = chemical.theme_color.startsWith('#') ? chemical.theme_color.slice(1) : chemical.theme_color;
        const rgb = parseInt(colorStr, 16);
        if (!isNaN(rgb)) {
            doc.setFillColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
            doc.rect(0, 0, pageWidth, 8, 'F');
        }
    }

    // TITLE
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(chemical.name || 'Chemical Card', margin, y);
    y += 10;

    // Category & Brand
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`${chemical.category || ''}  ${chemical.brand ? '• ' + chemical.brand : ''}`, margin, y);
    y += 10;

    // HIGH RISK WARNING
    if (chemical.warnings?.damage_risk === 'High') {
        doc.setFillColor(255, 230, 230);
        doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ HIGH RISK CHEMICAL', margin + 2, y);
        y += 10;
    }

    //=== USED FOR ===
    addSection('USED FOR', [0, 100, 200]);
    chemical.used_for?.forEach((use: string) => {
        addLine(`• ${use}`, margin + 3, 10);
    });

    //=== WHAT IT IS ===
    checkNewPage();
    addSection('WHAT IT IS', [0, 100, 200]);
    addLine(chemical.description || 'No description provided.', margin + 2, 10);

    //=== WHEN TO USE ===
    checkNewPage();
    addSection('WHEN TO USE', [0, 150, 50]);
    addLine(chemical.when_to_use || 'Not specified.', margin + 2, 10);

    //=== WHY USE IT ===
    checkNewPage();
    addSection('WHY USE IT', [100, 50, 150]);
    addLine(chemical.why_to_use || 'Not specified.', margin + 2, 10);

    //=== DILUTION RATIOS ===
    const ratios = chemical.dilutionRatios || (chemical as any).dilution_ratios || [];
    if (ratios.length > 0) {
        checkNewPage();
        addSection('DILUTION RATIOS', [200, 100, 0]);
        ratios.forEach((d: any) => {
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`${d.method} - ${d.soil_level}`, margin + 2, y);
            y += 6;
            doc.setTextColor(0, 120, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`     ${transformRatio(d.ratio)}`, margin + 2, y);
            y += 7;
            if (d.notes) {
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                const noteLines = doc.splitTextToSize(`     ${d.notes}`, pageWidth - 2 * margin - 10);
                doc.text(noteLines, margin + 2, y);
                y += noteLines.length * 5;
            }
            y += 4;
            checkNewPage(15);
        });
    }

    //=== WARNINGS & RISKS ===
    if (chemical.warnings) {
        checkNewPage();
        addSection('CRITICAL WARNINGS & RISKS', [200, 0, 0]);
        if (chemical.warnings.risks && chemical.warnings.risks.length > 0) {
            doc.setTextColor(180, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Potential Damage:', margin + 2, y);
            y += 7;
            chemical.warnings.risks.forEach((risk: string) => {
                addLine(`  ' ${risk}`, margin + 3, 10, false, [180, 0, 0]);
            });
            y += 3;
        }

        if (chemical.interactions?.do_not_mix && chemical.interactions.do_not_mix.length > 0) {
            doc.setTextColor(180, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Do Not Mix With:', margin + 2, y);
            y += 7;
            chemical.interactions.do_not_mix.forEach((mix: string) => {
                addLine(`  ☠ ${mix}`, margin + 3, 10, false, [180, 0, 0]);
            });
        }
    }

    //=== APPLICATION GUIDE ===
    checkNewPage();
    if (chemical.application_guide) {
        addSection('HOW TO APPLY', [0, 150, 100]);
        const guide = chemical.application_guide;
        if (guide.method) addLine(`Method: ${guide.method}`, margin + 2, 10);
        if (guide.dwell_time_min) addLine(`Dwell Time: ${guide.dwell_time_min}-${guide.dwell_time_max} minutes`, margin + 2, 10);
        if (guide.agitation) addLine(`Agitation: ${guide.agitation}`, margin + 2, 10);
        if (guide.notes) {
            y += 2;
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            const noteLines = doc.splitTextToSize(`Note: ${guide.notes}`, pageWidth - 2 * margin - 5);
            doc.text(noteLines, margin + 2, y);
            y += noteLines.length * 5;
        }
    }

    //=== SURFACE COMPATIBILITY ===
    checkNewPage();
    if (chemical.surface_compatibility) {
        addSection('SURFACE COMPATIBILITY', [0, 150, 100]);

        if (chemical.surface_compatibility.safe && chemical.surface_compatibility.safe.length > 0) {
            doc.setTextColor(0, 150, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('SAFE ON:', margin + 2, y);
            y += 6;
            addLine(chemical.surface_compatibility.safe.join(', '), margin + 3, 10, false, [0, 120, 0]);
            y += 3;
        }

        if (chemical.surface_compatibility.risky && chemical.surface_compatibility.risky.length > 0) {
            doc.setTextColor(200, 150, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('USE CAUTION:', margin + 2, y);
            y += 6;
            addLine(chemical.surface_compatibility.risky.join(', '), margin + 3, 10, false, [180, 120, 0]);
            y += 3;
        }

        if (chemical.surface_compatibility.avoid && chemical.surface_compatibility.avoid.length > 0) {
            doc.setTextColor(200, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('DO NOT USE ON:', margin + 2, y);
            y += 6;
            addLine(chemical.surface_compatibility.avoid.join(', '), margin + 3, 10, false, [200, 0, 0]);
        }
    }

    //=== TRAINING VIDEOS ===
    if (chemical.video_urls && chemical.video_urls.length > 0) {
        checkNewPage();
        addSection('TRAINING VIDEOS', [100, 50, 200]);
        chemical.video_urls.forEach((url: string, idx: number) => {
            addLine(`Video ${idx + 1}: ${url}`, margin + 2, 10, false, [80, 80, 180]);
        });
    }

    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Printed: ${new Date().toLocaleDateString()} | Prime Auto Detail Chemical Training Card`, margin, pageHeight - 10);

    if (!pdf) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    }

    return doc;
};
