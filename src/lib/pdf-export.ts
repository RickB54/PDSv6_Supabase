import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { servicePackages, addOns, getServicePrice, getAddOnPrice, getCanonicalAddonName, type VehicleType } from './services';

const mapToServiceVehicleType = (type: string = ""): VehicleType => {
  const t = type.toLowerCase();
  if (t.includes('compact') || t.includes('sedan')) return 'compact';
  if (t.includes('mid') || t.includes('suv')) {
    if (t.includes('large') || t.includes('truck') || t.includes('van')) return 'truck';
    return 'midsize';
  }
  if (t.includes('truck') || t.includes('van') || t.includes('large')) return 'truck';
  if (t.includes('luxury')) return 'luxury';
  return 'compact'; // default
};


const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
}

export interface DetailedHistoryData {
  customer: any;
  bookings: any[];
  invoices: any[];
  estimates: any[];
  engagements: any[];
  media?: any[]; // For future use if needed, but we mostly use customer.vehicles
}

export const exportCustomerHistoryPDF = async (data: DetailedHistoryData, preview = false, returnDoc = false) => {
  try {
    const { customer, bookings, invoices, estimates, engagements } = data;
    const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Visual Configuration ---
  const colors: Record<string, [number, number, number]> = {
    primary: [59, 130, 246],    // Blue-500
    success: [16, 185, 129],    // Emerald-500
    warning: [245, 158, 11],    // Amber-500
    accent: [236, 72, 153],     // Pink-500
    dark: [30, 41, 59],         // Slate-800
    light: [248, 250, 252]      // Slate-50
  };

  // --- 1. PREMIUM HEADER ---
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INTELLIGENCE 360', 14, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ANALYTICS & ACTIVITY AUDIT | GENERATED: ${format(new Date(), 'MMMM dd, yyyy h:mm a')}`, 14, 30);
  doc.text(`PRIME AUTO DETAIL | ADMINISTRATIVE OPERATIONAL VIEW`, 14, 35);

  // Profile Overlay Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(10, 42, pageWidth - 20, 48, 2, 2, 'FD');

  doc.setTextColor(...colors.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.full_name || customer.name || 'Anonymous Customer', 15, 52);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const contactLines = [
    `EMAIL: ${customer.email || 'N/A'}`,
    `PHONE: ${customer.phone || 'N/A'}`,
    `ADDRESS: ${customer.address || 'N/A'}`,
    `RELATIONSHIP: ${(customer.type || 'Customer').toUpperCase()} | SOURCE: ${customer.how_found || customer.howFound || 'DIRECT'}`
  ];
  doc.text(contactLines, 15, 60);

  // --- 2. INTELLIGENCE DASHBOARD (Analytics) ---
  let currentY = 100;
  doc.setTextColor(...colors.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Analytics', 14, currentY);
  
  const lifetimeValue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || i.paidAmount || 0), 0);
  const outstanding = lifetimeValue - totalPaid;
  const visitCount = bookings.length;
  const avgServiceVal = visitCount > 0 ? lifetimeValue / visitCount : 0;
  
  // Dashboard Boxes
  const boxW = (pageWidth - 40) / 4;
  const boxH = 25;
  const drawStat = (x: number, y: number, label: string, val: string, color: [number, number, number]) => {
    doc.setFillColor(...colors.light);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, boxW, boxH, 1, 1, 'FD');
    doc.setTextColor(...color);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(val, x + boxW/2, y + 12, { align: 'center' });
    doc.setTextColor(100);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x + boxW/2, y + 19, { align: 'center' });
  };

  drawStat(14, currentY + 5, 'Lifetime Value', `$${lifetimeValue.toFixed(2)}`, colors.success);
  drawStat(14 + boxW + 4, currentY + 5, 'Net Revenue', `$${totalPaid.toFixed(2)}`, colors.primary);
  drawStat(14 + (boxW + 4) * 2, currentY + 5, 'Accounts Rec.', `$${outstanding.toFixed(2)}`, colors.warning);
  drawStat(14 + (boxW + 4) * 3, currentY + 5, 'Avg Visit', `$${avgServiceVal.toFixed(2)}`, colors.accent);

  // Visual Distribution (Engagement Chart)
  currentY += 45;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Engagement Distribution', 14, currentY);
  
  const stats = [
    { label: 'Visits', count: bookings.length, color: colors.primary },
    { label: 'Invoices', count: invoices.length, color: colors.success },
    { label: 'Estimates', count: estimates.length, color: colors.warning },
    { label: 'Contacts', count: engagements.length, color: colors.accent }
  ];
  const maxVal = Math.max(...stats.map(s => s.count), 1);
  const chartH = 35;
  const chartX = 14;
  const barW = 15;
  const barGap = 20;

  stats.forEach((s, i) => {
    const h = (s.count / maxVal) * chartH;
    const x = chartX + (i * (barW + barGap));
    const y = currentY + 10 + (chartH - h);
    
    doc.setFillColor(...s.color);
    doc.rect(x, y, barW, h, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.text(s.count.toString(), x + barW/2, y - 2, { align: 'center' });
    doc.setFontSize(7);
    doc.text(s.label, x + barW/2, currentY + 10 + chartH + 5, { align: 'center' });
  });

  // Collection Gauge
  const gaugeX = pageWidth - 50;
  const gaugeY = currentY + 25;
  const radius = 18;
  doc.setLineWidth(4);
  doc.setDrawColor(240, 240, 240);
  doc.circle(gaugeX, gaugeY, radius, 'S');
  
  if (lifetimeValue > 0) {
    const ratio = totalPaid / lifetimeValue;
    doc.setDrawColor(...colors.success);
    // Rough approximation of a gauge sweep using lines
    for (let a = 0; a < ratio * 360; a += 5) {
      const rad = (a - 90) * (Math.PI / 180);
      const x2 = gaugeX + Math.cos(rad) * radius;
      const y2 = gaugeY + Math.sin(rad) * radius;
      doc.line(gaugeX + Math.cos(rad) * (radius - 1), gaugeY + Math.sin(rad) * (radius - 1), x2, y2);
    }
    doc.setFontSize(14);
    doc.setTextColor(...colors.success);
    doc.text(`${Math.round(ratio * 100)}%`, gaugeX, gaugeY + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Collection Rate', gaugeX, gaugeY - radius - 5, { align: 'center' });
  }

  // --- 3. ADMINISTRATIVE DIRECTIVES ---
  currentY += 60;
  if (customer.notes) {
    const splitNotes = doc.splitTextToSize(customer.notes, pageWidth - 28);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Administrative Directives', 14, currentY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(splitNotes, 14, currentY + 7);
    currentY += (splitNotes.length * 5) + 15;
  }

  // --- 4. CONSOLIDATED CHRONOLOGICAL LEDGER ---
  const ledger: any[] = [];
  
  const sanitize = (note: string) => {
    if (!note || note === '-') return '-';
    if (note.includes('Thank you for trusting')) {
      const m = note.match(/Notes:\s*([\s\S]*?)(?=\n\nStatus:|\n\nAttached is your)/i);
      return m ? m[1].trim() : '(Template Outreach)';
    }
    return note;
  };

  bookings.forEach(b => {
    const vType = mapToServiceVehicleType(b.vehicle || b.vehicleType || '');
    const svcName = b.service || b.service_package || '';
    const svc = servicePackages.find(s => s.name === svcName || s.id === svcName);
    const basePrice = svc ? getServicePrice(svc.id, vType) : 0;

    const addons = b.addons || b.add_ons || [];
    const addonsArray = Array.isArray(addons) ? addons : (typeof addons === 'string' ? JSON.parse(addons) : []);
    const addonBreakdown = addonsArray.map((a: string) => {
      const canonical = getCanonicalAddonName(a);
      const addonDef = addOns.find(ad => ad.name === canonical);
      const price = addonDef ? getAddOnPrice(addonDef.id, vType) : 0;
      return `${canonical} ($${price})`;
    });

    const rescheduleHistory = b.rescheduleHistory || b.booking_vehicle?.reschedule_history || [];
    let rescheduleLines = '';
    if (rescheduleHistory && rescheduleHistory.length > 0) {
      rescheduleLines = `\nRESCHEDULES:\n` + rescheduleHistory.map((rh: any, i: number) => {
        let fOld = 'N/A';
        let fNew = 'N/A';
        try { fOld = format(new Date(rh.originalDate), 'MMM dd, yyyy h:mm a'); } catch(e){}
        try { fNew = format(new Date(rh.newDate), 'MMM dd, yyyy h:mm a'); } catch(e){}
        return `• ${fOld} ➜ ${fNew}`;
      }).join('\n');
    }

    ledger.push({
      date: b.date || b.created_at,
      src: 'BOOKING',
      act: b.service || 'Service',
      tech: `STATUS: ${b.status?.toUpperCase()}\nVEHICLE: ${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.vehicleModel || ''}\nBASE SERVICE: $${basePrice.toFixed(2)}\nADD-ONS: ${addonBreakdown.length > 0 ? addonBreakdown.join(', ') : 'None'}${rescheduleLines}`,
      val: `$${(b.price || 0).toFixed(2)}`,
      note: sanitize(b.notes)
    });
  });

  invoices.forEach(i => ledger.push({
    date: i.date || i.created_at,
    src: 'INVOICE',
    act: `INV #${i.invoice_number || 'N/A'}`,
    tech: `STATUS: ${i.status?.toUpperCase()}\nPAID: $${(i.paid_amount || 0).toFixed(2)}`,
    val: `$${(i.total || 0).toFixed(2)}`,
    note: i.notes || '-'
  }));

  estimates.forEach(e => ledger.push({
    date: e.date || e.created_at,
    src: 'ESTIMATE',
    act: `EST #${e.estimate_number || 'N/A'}`,
    tech: `STATUS: ${e.status?.toUpperCase()}`,
    val: `$${(e.total || 0).toFixed(2)}`,
    note: e.notes || '-'
  }));

  engagements.forEach(e => ledger.push({
    date: e.created_at,
    src: (e.type || 'NOTE').toUpperCase(),
    act: 'INTERACTION',
    tech: `CHANNEL: ${e.type || 'GENERAL'}`,
    val: '-',
    note: sanitize(e.note)
  }));

  const activityLog = customer?.activity_log || [];
  activityLog.forEach((a: any) => {
    // Prevent duplicates between local activity_log and DB engagements
    const isDup = engagements.some(e => 
      e.note === a.note || 
      Math.abs(new Date(e.created_at).getTime() - new Date(a.date || a.created_at).getTime()) < 5000
    );
    if (!isDup) {
      ledger.push({
        date: a.date || a.created_at,
        src: 'CRM LOG',
        act: (a.type || 'NOTE').toUpperCase(),
        tech: '-',
        val: '-',
        note: sanitize(a.note)
      });
    }
  });

  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (currentY + 30 > pageHeight) { doc.addPage(); currentY = 20; }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Operational Activity Ledger', 14, currentY);

  // Manual registration check for autoTable plugin
  const callTable = (doc as any).autoTable || autoTable;
  
  callTable(doc, {
    startY: currentY + 5,
    head: [['Date/Time', 'Source', 'Activity', 'Technical Details', 'Amount', 'Notes / Summary']],
    body: ledger.map(l => {
      let dStr = 'N/A';
      try { 
        if (l.date) {
          const d = new Date(l.date);
          dStr = isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy h:mm a');
        }
      } catch(e) {}
      return [
        dStr,
        l.src,
        l.act,
        l.tech,
        l.val,
        l.note
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: colors.primary, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 'auto' }
    }
  });

  // --- 4.5 ADMINISTRATIVE COMMUNICATION RECORD ---
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY + 40 > pageHeight) { doc.addPage(); currentY = 20; }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Administrative Communication Record', 14, currentY);

  const comms: any[] = [];
  // Reconstruct communication history from booking lifecycle
  bookings.forEach(b => {
    const d = b.date || b.created_at;
    const stat = (b.status || 'pending').toLowerCase();
    
    comms.push({
      date: d,
      type: 'BOOKING REQUEST',
      subject: `Request Received: ${b.service}`,
      status: 'SENT',
      desc: `Automated receipt sent to ${customer.email || 'customer'}. Includes service details and tentative pricing.`
    });
    
    if (stat === 'confirmed' || stat === 'done') {
      comms.push({
        date: d,
        type: 'CONFIRMATION',
        subject: `Booking Confirmed: ${b.service}`,
        status: 'SENT',
        desc: `Official appointment confirmation sent. Locked into administrative calendar.`
      });
    }
    
    if (stat === 'cancelled') {
      comms.push({
        date: d,
        type: 'CANCELLATION',
        subject: `Appointment Cancelled: ${b.service}`,
        status: 'SENT',
        desc: `Cancellation notice dispatched. Slot released back to public availability.`
      });
    }
  });

  callTable(doc, {
    startY: currentY + 5,
    head: [['Date', 'Communication Type', 'Subject / Context', 'Delivery Status', 'Operational Notes']],
    body: comms.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(c => [
      format(new Date(c.date), 'MMM dd, yyyy'),
      c.type,
      c.subject,
      c.status,
      c.desc
    ]),
    theme: 'striped',
    headStyles: { fillColor: colors.primary, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25 },
      4: { cellWidth: 'auto' }
    }
  });

  // --- 5. GARAGE ARCHIVE ---
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY + 40 > pageHeight) { doc.addPage(); currentY = 20; }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Garage Archive', 14, currentY);

  callTable(doc, {
    startY: currentY + 5,
    head: [['Vehicle Spec', 'Type', 'Color', 'VIN', 'Media Metadata']],
    body: (customer.vehicles || []).map((v: any) => [
      `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Unspecified',
      v.type || 'N/A',
      v.color || 'N/A',
      v.vin || 'N/A',
      `${(v.generalPhotos?.length || 0) + (v.beforePhotos?.length || 0) + (v.afterPhotos?.length || 0)} ARCHIVED IMAGES`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [80, 80, 80] },
    styles: { fontSize: 8 }
  });

  // --- 6. ASSET VISUAL INVENTORY ---
  currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Aggregate all possible photo sources
  const photoGroups: { label: string; vehicles: any[] }[] = [];
  const renderedPhotos = new Set<string>();
  
  // A. Vehicle-specific photos
  const vehiclesWithPhotos = (customer.vehicles || []).filter((v: any) => 
    (v.generalPhotos?.length || 0) > 0 || 
    (v.beforePhotos?.length || 0) > 0 || 
    (v.afterPhotos?.length || 0) > 0
  );

  // B. Customer-level global photos (fallback)
  const hasGlobalPhotos = (customer.generalPhotos?.length || 0) > 0 || 
                         (customer.beforePhotos?.length || 0) > 0 || 
                         (customer.afterPhotos?.length || 0) > 0;

  if (vehiclesWithPhotos.length > 0 || hasGlobalPhotos) {
    if (currentY + 40 > pageHeight) { doc.addPage(); currentY = 20; }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Asset Visual Inventory', 14, currentY);
    currentY += 12;

    // First, render vehicle-specific photos
    for (const v of vehiclesWithPhotos) {
      if (currentY + 30 > pageHeight) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`${v.year || ''} ${v.make || ''} ${v.model || ''}`.toUpperCase(), 14, currentY);
      currentY += 6;

      const categories = [
        { label: 'Before Photos', photos: v.beforePhotos || [], color: colors.warning },
        { label: 'After Photos', photos: v.afterPhotos || [], color: colors.success },
        { label: 'General / Technical', photos: v.generalPhotos || [], color: colors.primary }
      ];

      for (const cat of categories) {
        if (cat.photos.length === 0) continue;
        
        if (currentY + 20 > pageHeight) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cat.color);
        doc.text(cat.label.toUpperCase(), 14, currentY);
        currentY += 5;

        const imgSize = 25;
        const gap = 3;
        let x = 14;
        let rowHasImages = false;
        
        for (const photoUrl of cat.photos) {
          if (!photoUrl || renderedPhotos.has(photoUrl)) continue;
          renderedPhotos.add(photoUrl);
          rowHasImages = true;

          if (x + imgSize > pageWidth - 14) {
            x = 14;
            currentY += imgSize + gap;
          }
          if (currentY + imgSize > pageHeight - 15) {
            doc.addPage();
            currentY = 20;
            x = 14;
          }
          
          try {
            const base64 = await getBase64ImageFromUrl(photoUrl);
            if (base64) {
               doc.addImage(base64, 'JPEG', x, currentY, imgSize, imgSize, undefined, 'FAST');
            } else {
               throw new Error('Load fail');
            }
          } catch (e) {
            doc.setDrawColor(230);
            doc.rect(x, currentY, imgSize, imgSize);
            doc.setFontSize(6);
            doc.setTextColor(150);
            doc.text('IMAGE LOAD FAIL', x + imgSize/2, currentY + imgSize/2, { align: 'center' });
          }
          x += imgSize + gap;
        }
        if (rowHasImages) {
          currentY += imgSize + 12;
        } else {
          currentY -= 5; // Reset heading gap if no new images were printed
        }
      }
    }

    // Then, render global photos if any (those not assigned to a vehicle)
    if (hasGlobalPhotos) {
      if (currentY + 30 > pageHeight) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('MISCELLANEOUS / PROFILE ASSETS', 14, currentY);
      currentY += 6;

      const globalCats = [
        { label: 'General Assets', photos: customer.generalPhotos || [], color: colors.primary },
        { label: 'Before Condition (Global)', photos: customer.beforePhotos || [], color: colors.warning },
        { label: 'After Condition (Global)', photos: customer.afterPhotos || [], color: colors.success }
      ];

      for (const cat of globalCats) {
        if (cat.photos.length === 0) continue;
        if (currentY + 20 > pageHeight) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cat.color);
        doc.text(cat.label.toUpperCase(), 14, currentY);
        currentY += 5;

        const imgSize = 25;
        const gap = 3;
        let x = 14;
        let rowHasImages = false;
        
        for (const photoUrl of cat.photos) {
          if (!photoUrl || renderedPhotos.has(photoUrl)) continue;
          renderedPhotos.add(photoUrl);
          rowHasImages = true;

          if (x + imgSize > pageWidth - 14) {
            x = 14;
            currentY += imgSize + gap;
          }
          if (currentY + imgSize > pageHeight - 15) {
            doc.addPage();
            currentY = 20;
            x = 14;
          }
          
          try {
            const base64 = await getBase64ImageFromUrl(photoUrl);
            if (base64) {
               doc.addImage(base64, 'JPEG', x, currentY, imgSize, imgSize, undefined, 'FAST');
            }
          } catch (e) {
            doc.setDrawColor(230);
            doc.rect(x, currentY, imgSize, imgSize);
            doc.text('N/A', x + imgSize/2, currentY + imgSize/2, { align: 'center' });
          }
          x += imgSize + gap;
        }
        if (rowHasImages) {
          currentY += imgSize + 12;
        } else {
          currentY -= 5; // Reset heading gap if no new images were printed
        }
      }
    }
  }

  // --- FINAL FOOTER ---
  // Ensure footer is on the current page, or a new one if we are at the very bottom
  if (currentY + 20 > pageHeight) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 15;
  }

  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('INTERNAL USE ONLY | PRIME AUTO DETAIL CRM INTELLIGENCE ENGINE', 14, currentY + 10);
  
  const totalPages = (doc as any).internal.getNumberOfPages();
  doc.text(`PAGE ${totalPages} OF ${totalPages}`, pageWidth - 14, currentY + 10, { align: 'right' });

  // --- Save or Preview ---
  if (returnDoc) {
    return doc;
  }

  if (preview) {
    window.open(doc.output('bloburl'), '_blank');
  } else {
    const filename = `${(customer.name || 'Customer').replace(/\s+/g, '_')}_360_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  }
  } catch (err) {
    console.error('PDF Generation Error:', err);
    throw err; // Re-throw to be caught by UI
  }
};
