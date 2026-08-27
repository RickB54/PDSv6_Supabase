// Utility to save PDFs to the File Manager archive
import { pushAdminAlert } from "@/lib/adminAlerts";
import localforage from "localforage";

interface PDFRecord {
  id: string;
  fileName: string;
  recordType: "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" | "Sub Contractors" | "Sub-Contractors" | "Package Comparisons" | "Upsell Scripts" | "Client Evaluation" | "Detailing Vendors" | "Vehicle Classification" | "Vehicle History" | "Inventory Report" | "Prospects";
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
  opts?: { fileName?: string; path?: string; silent?: boolean }
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
  //  - Prospects: "Prospects/"
  const monthName = new Date().toLocaleString(undefined, { month: 'long' });
  const year = new Date().getFullYear();
  const safeName = String(customerName || 'Customer').trim();
  let defaultPath = '';
  switch (recordType) {
    case "Prospects":
      defaultPath = `Prospects/`;
      break;
    case "Bookings":
      defaultPath = `Bookings ${year}/${monthName}/`;
      break;
    case "Estimate":
      defaultPath = `Estimates/`;
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
    case "Sub Contractors":
    case "Sub-Contractors":
      defaultPath = `Sub-Contractors/`;
      break;
    case "Package Comparisons":
      defaultPath = `Package Comparisons/`;
      break;
    case "Upsell Scripts":
      defaultPath = `Upsell Scripts/`;
      break;
    case "Client Evaluation":
      defaultPath = `Client Evaluation/`;
      break;
    case "Detailing Vendors":
      defaultPath = `Detailing Vendors/`;
      break;
    case "Vehicle Classification":
      defaultPath = `Vehicle Classification/`;
      break;
    case "Vehicle History":
      defaultPath = `Vehicle History/`;
      break;
    case "Inventory Report":
      defaultPath = `Inventory Report/`;
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

  // 1. Local Storage fallback/immediate sync
  let existing: PDFRecord[] = [];
  try {
    existing = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
  existing.push(record);
  localStorage.setItem('pdfArchive', JSON.stringify(existing));

  // 2. Supabase Persistence (Skip in Demo Mode)
  const isDemoMode = localStorage.getItem('demo_mode_active') === 'true';
  if (!isDemoMode) {
    const syncWithSupabase = async () => {
      try {
        const { default: supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from('pdf_records').upsert({
          id: record.id,
          file_name: record.fileName,
          record_type: record.recordType,
          customer_name: record.customerName,
          date: record.date,
          record_id: record.recordId,
          pdf_data: record.pdfData,
          path: record.path
        });
        if (error) console.warn("Supabase PDF sync failed:", error);
        else console.log("✅ PDF archived to Supabase:", record.id);
      } catch (e) {
        console.warn("Supabase not available for PDF sync");
      }
    };
    syncWithSupabase();
  }

  // Proactively notify current tab so sidebar badges refresh immediately
  try {
    window.dispatchEvent(new CustomEvent('pdf_archive_updated'));
  } catch { }

  // Only trigger alerts for ESSENTIAL business functions to avoid clutter
  const essentialTypes: string[] = ['Bookings', 'Job', 'Estimate', 'Invoice', 'Prospects'];
  if (essentialTypes.includes(recordType) && !opts?.silent) {
    pushAdminAlert(
      'pdf_saved',
      `New ${recordType} for ${customerName}`,
      'System',
      { id: record.id, recordId, recordType, customerName }
    );
  }

  // 4. Dual-Save to Business Drive
  const dualSaveToBusinessDrive = async () => {
    try {
       const folderMap: Record<string, string> = {
           "Invoice": "Invoices",
           "Estimate": "Estimates",
           "Job": "Jobs",
           "Checklist": "Checklists",
           "Customer": "Customer Records",
           "Employee Training": "Employee Training",
           "Bookings": "Bookings",
           "Admin Updates": "Admin Updates",
           "Payroll": "Payroll",
           "Employee Contact": "Employee Contact",
           "add-Ons": "Addons",
           "Sub Contractors": "Admin Updates",
           "Sub-Contractors": "Admin Updates",
           "Package Comparisons": "Estimates", 
           "Upsell Scripts": "Employee Training",
           "Client Evaluation": "Customer Records",
           "Detailing Vendors": "Inventory Report",
           "Vehicle Classification": "Vehicle History",
           "Vehicle History": "Vehicle History",
           "Inventory Report": "Inventory Report",
           "Prospects": "Prospects"
       };

       const folderName = folderMap[recordType] || recordType;

       let folders: any[] = await localforage.getItem('business_drive_folders_v3') || [];
       if (!folders.some(f => f.name === folderName && f.path.length === 0)) {
           folders.push({
               id: Math.random().toString(36).substring(2, 9),
               name: folderName,
               path: []
           });
           await localforage.setItem('business_drive_folders_v3', folders);
       }

       let files: any[] = await localforage.getItem('business_drive_files_v3') || [];
       const sizeKb = record.pdfData ? Math.round(record.pdfData.length * 0.75 / 1024) : 100;
       
       files.push({
           id: Math.random().toString(36).substring(2, 9),
           name: record.fileName,
           type: "application/pdf",
           size: sizeKb > 1024 ? (sizeKb/1024).toFixed(1) + " MB" : sizeKb + " KB",
           modified: new Date().toISOString(),
           path: [folderName],
           data: record.pdfData
       });
       
       await localforage.setItem('business_drive_files_v3', files);
    } catch (e) {
       console.error("Failed to dual-save to Business Drive:", e);
    }
  };
  
  dualSaveToBusinessDrive();
}
