import jsPDF from "jspdf";
import { savePDFToArchive } from "./pdfArchive";
import { getCurrentUser } from "./auth";

/**
 * System Audit Module
 * Logs critical actions for administrative oversight.
 * Specifically gates and audits employee actions.
 */

export async function logBackup(details: any) {
  console.log('[Audit] System Backup initiated:', details);
}

export async function logRestore(details: any) {
  console.log('[Audit] System Restore initiated:', details);
}

export async function logDelete(details: any) {
  console.log('[Audit] Data deletion audit:', details);
}

export async function auditEmployeeAction(
  action: 'create' | 'update' | 'delete',
  recordType: 'Customer' | 'Prospect' | 'Booking',
  recordData: any
) {
  const user = getCurrentUser();
  // Only audit if user is employee; admins don't audit themselves in this flow
  if (!user || user.role !== 'employee') return;

  try {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    const recordName = recordData.name || recordData.customer || 'Unnamed Record';
    const recordId = recordData.id || 'N/A';

    // Header logic
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Red
    doc.text('ADMIN NOTIFICATION: Employee Change', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${timestamp}`, 20, 28);
    doc.line(20, 32, 190, 32);

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    let y = 45;

    const addLine = (label: string, value: string) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(String(value || 'N/A'), 60, y);
      y += 10;
    };

    addLine('Employee Name:', user.name || 'Unknown');
    addLine('Employee Email:', user.email || 'Unknown');
    addLine('Action Taken:', action.toUpperCase());
    addLine('Record Type:', recordType);
    addLine('Record Target:', recordName);
    addLine('Record ID:', recordId);

    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Recorded State / Changes:', 20, y);
    y += 10;
    doc.setFont(undefined, 'normal');
    
    // Filter large data
    const cleanData = { ...recordData };
    delete cleanData.beforePhotos;
    delete cleanData.afterPhotos;
    delete cleanData.generalPhotos;
    delete cleanData.pdfData;
    
    const dataString = JSON.stringify(cleanData, null, 2);
    const splitText = doc.splitTextToSize(dataString, 170);
    doc.text(splitText, 20, y);

    // Finalize
    const pdfDataUrl = doc.output('datauristring');
    const fileName = `AUDIT_${action.toUpperCase()}_${recordType}_${user.name}_${Date.now()}.pdf`.replace(/\s/g, '_');

    // Save to Archive
    savePDFToArchive(
      'Admin Updates',
      recordName,
      `audit-${Date.now()}`,
      pdfDataUrl,
      { fileName }
    );

    console.log(`[Audit] Successfully archived ${action} for ${recordName}`);
  } catch (error) {
    console.error('[Audit] Failed to generate employee audit PDF', error);
  }
}
