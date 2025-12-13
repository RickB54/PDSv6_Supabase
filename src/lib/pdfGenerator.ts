import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFBookingData {
    id: string;
    customer: string;
    date: string;
    title?: string;
    status?: string;
}

export interface PDFMeta {
    vehicle: string;
    service: string;
    price: number | string;
    notes?: string;
}

export const generateBookingPDF = (data: PDFBookingData, meta: PDFMeta): string => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("PRIME DETAIL SOLUTIONS", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text(data.title || "Booking Confirmation", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 36, { align: "center" });

    // Customer Info
    doc.autoTable({
        startY: 45,
        head: [['Customer Details', 'Vehicle Details']],
        body: [[
            `Name: ${data.customer}\nDate: ${new Date(data.date).toLocaleDateString()}\nID: ${data.id}`,
            `Vehicle: ${meta.vehicle}\nService: ${meta.service}\nStatus: ${data.status || 'Pending'}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] }, // Brand Red
    } as any);

    // Financials
    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Description', 'Amount']],
        body: [
            [meta.service, typeof meta.price === 'number' ? `$${meta.price.toFixed(2)}` : meta.price],
            ['Total', typeof meta.price === 'number' ? `$${meta.price.toFixed(2)}` : meta.price]
        ],
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] }
    } as any);

    // Notes
    if (meta.notes) {
        doc.autoTable({
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Additional Notes']],
            body: [[meta.notes]],
            theme: 'plain',
            styles: { cellWidth: 'wrap' }
        } as any);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Thank you for choosing Prime Detail Solutions.', 105, 290, { align: 'center' });
    }

    return doc.output('datauristring');
};
