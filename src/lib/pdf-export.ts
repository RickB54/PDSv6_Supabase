import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const exportCustomerHistoryPDF = (customer: any, bookings: any[], preview = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('CRM ACTIVITY & HISTORY REPORT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy p')}`, pageWidth / 2, 28, { align: 'center' });

  // Customer Information Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Customer Profile', 14, 45);
  
  doc.setFontSize(10);
  const profileData = [
    ['Name', customer.name || 'N/A'],
    ['Email', customer.email || 'N/A'],
    ['Phone', customer.phone || 'N/A'],
    ['Address', customer.address || 'N/A'],
    ['Lead Source', customer.howFound || 'Manual Entry'],
    ['Created Date', customer.created_at ? format(new Date(customer.created_at), 'MMM dd, yyyy') : 'N/A']
  ];

  autoTable(doc, {
    startY: 50,
    head: [],
    body: profileData,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
  });

  // Admin Directives / Notes
  if (customer.notes) {
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.text('Admin Directives', 14, finalY + 15);
    doc.setFontSize(10);
    doc.setTextColor(80);
    const splitNotes = doc.splitTextToSize(customer.notes, pageWidth - 28);
    doc.text(splitNotes, 14, finalY + 22);
  }

  // Combined Timeline Table
  const items: any[] = [];
  (bookings || []).forEach(b => items.push({ 
    date: b.date || b.created_at || new Date().toISOString(), 
    type: 'Booking', 
    title: b.title || 'Premium Service', 
    details: `Vehicle: ${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.vehicleModel || ''}\nStatus: ${b.status}\nValue: $${b.price?.toFixed(2) || '0.00'}`,
    notes: b.notes || '-'
  }));

  const activityLog = customer.activity_log || [];
  activityLog.forEach((a: any) => items.push({
    date: a.created_at || new Date().toISOString(),
    type: 'Interaction',
    title: (a.type || 'note').replace('_', ' ').toUpperCase(),
    details: `Type: ${a.type || 'General Note'}`,
    notes: a.note || '-'
  }));

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const tableBody = items.map(item => [
    item.date ? format(new Date(item.date), 'MMM dd, yyyy\np') : 'N/A',
    item.type,
    item.title,
    item.details,
    item.notes
  ]);

  const finalY2 = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Chronological Activity Log', 14, Math.max(finalY2 + 30, 100));

  autoTable(doc, {
    startY: Math.max(finalY2 + 35, 105),
    head: [['Date/Time', 'Category', 'Action/Item', 'Technical Details', 'Notes']],
    body: tableBody,
    headStyles: { fillColor: [59, 130, 246] }, // Blue-500
    styles: { fontSize: 8, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: 50 },
      4: { cellWidth: 'auto' }
    }
  });

  // Summary Footer
  const finalY3 = (doc as any).lastAutoTable.finalY || 200;
  const totalSpend = (bookings || []).reduce((sum, b) => sum + (b.price || 0), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Lifetime Value: $${totalSpend.toFixed(2)}`, pageWidth - 14, finalY3 + 15, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Sessions: ${bookings.length}  |  Total Manual Interactions: ${activityLog.length}`, pageWidth - 14, finalY3 + 22, { align: 'right' });

  // Save or Preview
  if (preview) {
    window.open(doc.output('bloburl'), '_blank');
  } else {
    const filename = `${(customer.name || 'Customer').replace(/\s+/g, '_')}_Activity_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  }
};
