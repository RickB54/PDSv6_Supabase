// Utility to save PDFs to the File Manager archive
import { pushAdminAlert } from "@/lib/adminAlerts";

interface PDFRecord {
  id: string;
  fileName: string;
  recordType: "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" | "Mock Data";
  customerName: string;
  date: string;
  timestamp: string;
  recordId: string;
  pdfData: string;
  path?: string;
}

export function savePDFToArchive(
  recordType: PDFRecord['recordType'],
  customerName: string,
  recordId: string,
  pdfDataUrl: string,
  opts?: { fileName?: string; path?: string }
): void {
  const timestamp = new Date().toISOString();
  const date = new Date().toLocaleDateString().replace(/\//g, '-');
  const time = new Date().toLocaleTimeString().replace(/:/g, '-').replace(/\s/g, '_');

  // Default folder path mapping to restore original pipeline semantics
  // Examples:
  //  - Bookings: "Bookings YYYY/Month/"
  //  - Customer quotes: "Customers/<Name>/Quotes/"
  //  - Customer general: "Customers/<Name>/"
  //  - Jobs: "Jobs/YYYY/Month/"
  //  - Checklists: "Checklists/YYYY/Month/"
  //  - Employee Training: "Employee Training/"
  //  - Admin Updates: "Admin Updates/"
  //  - Payroll: "Payroll/YYYY/Month/"
  const monthName = new Date().toLocaleString(undefined, { month: 'long' });
  const year = new Date().getFullYear();
  const safeName = String(customerName || 'Customer').trim();
  let defaultPath = '';
  switch (recordType) {
    case "Bookings":
      defaultPath = `Bookings ${year}/${monthName}/`;
      break;
    case "Estimate":
      defaultPath = `Customers/${safeName}/Quotes/`;
      break;
    case "Customer":
      defaultPath = `Customers/${safeName}/`;
      break;
    case "Job":
      defaultPath = `Jobs/${year}/${monthName}/`;
      break;
    case "Checklist":
      defaultPath = `Checklists/${year}/${monthName}/`;
      break;
    case "Employee Training":
      defaultPath = `Employee Training/`;
      break;
    case "Admin Updates":
      defaultPath = `Admin Updates/`;
      break;
    case "Payroll":
      defaultPath = `Payroll/${year}/${monthName}/`;
      break;
    case "Employee Contact":
      defaultPath = `Employee Contact/`;
      break;
    case "add-Ons":
      defaultPath = `add-Ons/`;
      break;
    case "Mock Data":
      defaultPath = `Mock Data/`;
      break;
    default:
      defaultPath = '';
  }
  
  const record: PDFRecord = {
    id: `${recordType}_${recordId}_${Date.now()}`,
    fileName: opts?.fileName || `${recordType}_${customerName.replace(/\s/g, '_')}_${date}_${time}.pdf`,
    recordType,
    customerName,
    date,
    timestamp,
    recordId,
    pdfData: pdfDataUrl,
    path: opts?.path ?? defaultPath
  };

  // Get existing records
  const existing = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
  
  // Add new record
  existing.push(record);
  
  // Save back to localStorage
  localStorage.setItem('pdfArchive', JSON.stringify(existing));

  // Proactively notify current tab so sidebar badges refresh immediately
  try {
    window.dispatchEvent(new CustomEvent('pdf_archive_updated'));
  } catch {}

  // Push persistent admin alert about the new PDF
  pushAdminAlert(
    "pdf_saved",
    `New PDF saved: ${record.fileName}`,
    "system",
    { recordType, customerName, recordId, id: record.id }
  );
}
