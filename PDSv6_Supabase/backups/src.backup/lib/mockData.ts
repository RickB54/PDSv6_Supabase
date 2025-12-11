import localforage from 'localforage';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import api from '@/lib/api';
import { upsertCustomer, upsertInvoice } from '@/lib/db';
import { savePDFToArchive } from '@/lib/pdfArchive';
import { servicePackages, addOns, getServicePrice, getAddOnPrice } from '@/lib/services';

type CreatedUser = { id: string; name: string; email: string; role: 'customer'|'employee' };
type MockJob = {
  id: string;
  customerId: string;
  customerName: string;
  employeeId: string;
  employeeName: string;
  packageName: string;
  vehicleType: string;
  invoice?: { id?: string; total: number; paidAmount: number; paymentStatus: string; invoiceNumber?: number };
};
type MockInventoryItem = { name: string; category: 'Chemical'|'Material' };

function mockEmail(slug: string, role: 'customer'|'employee', n: number) {
  return `mock+${role}${n}.${slug}@example.com`;
}

async function createUserViaEdge(name: string, email: string, role: 'customer'|'employee'): Promise<CreatedUser> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.functions.invoke('create-user', { body: { name, email, role } });
    if (!error && data?.ok && data?.id) {
      return { id: data.id, name, email, role };
    }
  }
  // Fallback local-only
  const id = `mock_${role}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  return { id, name, email, role };
}

async function addLocalUserRecord(u: CreatedUser) {
  // Customers table
  if (u.role === 'customer') {
    await upsertCustomer({ id: u.id, name: u.name, email: u.email, role: 'customer', isMock: true });
  }
  // Users cache used by /api/users
  const users = (await localforage.getItem<any[]>('users')) || [];
  users.push({ id: u.id, name: u.name, email: u.email, role: u.role, isMock: true, updatedAt: new Date().toISOString() });
  await localforage.setItem('users', users);
  // Company employees list
  if (u.role === 'employee') {
    const emps = (await localforage.getItem<any[]>('company-employees')) || [];
    emps.push({ id: u.id, name: u.name, email: u.email, role: 'employee', isMock: true, updatedAt: new Date().toISOString() });
    await localforage.setItem('company-employees', emps);
  }
}

function pick<T>(arr: T[], n = 1): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

function buildJobPDF(customerName: string, employeeName: string, pkgName: string, items: Array<{ name: string; price: number }>, checklistId: string) {
  try {
    const { default: jsPDF } = (window as any).jspdf || {};
    if (!jsPDF) {
      // Skip PDF creation gracefully if jsPDF is not available in this environment
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Prime Detail Solutions', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Service Checklist — Job Completed (Mock)', 105, 26, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 38);
    doc.text(`Customer: ${customerName}`, 20, 46);
    if (employeeName) doc.text(`Employee: ${employeeName}`, 20, 54);
    let y = employeeName ? 62 : 58;
    doc.text(`Package: ${pkgName}`, 20, y); y += 8;
    doc.text('Selected Services:', 20, y); y += 8;
    items.forEach(it => { doc.text(`${it.name}: $${(it.price || 0).toFixed(2)}`, 28, y); y += 6; });
    const dataUrl = doc.output('datauristring');
    savePDFToArchive('Job', customerName, checklistId, dataUrl, { fileName: `Job_Completion_${customerName}_${new Date().toISOString().split('T')[0]}.pdf` });
  } catch {
    // Ignore PDF generation errors in mock flow
  }
}

async function addMockInventory(): Promise<MockInventoryItem[]> {
  // Add 3 chemicals
  const chemicals = (await localforage.getItem<any[]>("chemicals")) || [];
  const mockChemicals = [
    { id: `chem_${Date.now()}_apc`, name: 'All-Purpose Cleaner', bottleSize: '32 oz', costPerBottle: 12.99, currentStock: 8, threshold: 2 },
    { id: `chem_${Date.now()}_glass`, name: 'Glass Cleaner', bottleSize: '16 oz', costPerBottle: 7.49, currentStock: 5, threshold: 2 },
    { id: `chem_${Date.now()}_degreaser`, name: 'Wheel Degreaser', bottleSize: '24 oz', costPerBottle: 9.99, currentStock: 4, threshold: 2 },
  ];
  // Deduplicate by name
  const chemNames = new Set(chemicals.map(c => String(c.name || '').toLowerCase()));
  for (const c of mockChemicals) {
    if (!chemNames.has(c.name.toLowerCase())) chemicals.push(c);
  }
  await localforage.setItem("chemicals", chemicals);
  const inv: MockInventoryItem[] = [
    { name: 'All-Purpose Cleaner', category: 'Chemical' },
    { name: 'Glass Cleaner', category: 'Chemical' },
    { name: 'Wheel Degreaser', category: 'Chemical' },
  ];

  // Add 3 materials
  const materials = (await localforage.getItem<any[]>("materials")) || [];
  const nowIso = new Date().toISOString();
  const mockMaterials = [
    { id: `mat_${Date.now()}_rag`, name: 'Microfiber Rag', category: 'Rag', subtype: 'Large', quantity: 30, costPerItem: 1.25, lowThreshold: 10, createdAt: nowIso },
    { id: `mat_${Date.now()}_brush`, name: 'Soft Brush', category: 'Brush', subtype: 'Medium', quantity: 12, costPerItem: 3.5, lowThreshold: 4, createdAt: nowIso },
    { id: `mat_${Date.now()}_clay`, name: 'Detailing Clay', category: 'Tool', subtype: 'Fine', quantity: 6, costPerItem: 8.0, lowThreshold: 2, createdAt: nowIso },
  ];
  const matNames = new Set(materials.map(m => String(m.name || '').toLowerCase()));
  for (const m of mockMaterials) {
    if (!matNames.has(m.name.toLowerCase())) materials.push(m);
  }
  await localforage.setItem("materials", materials);
  inv.push(
    { name: 'Microfiber Rag', category: 'Material' },
    { name: 'Soft Brush', category: 'Material' },
    { name: 'Detailing Clay', category: 'Material' },
  );

  try { window.dispatchEvent(new CustomEvent('inventory-changed')); } catch {}
  return inv;
}

export async function insertMockData(reporter?: (msg: string) => void) {
  const report = (msg: string) => { try { reporter && reporter(msg); } catch {} };
  const tracker: { users: CreatedUser[]; jobs: string[]; invoices: string[]; jobDetails: MockJob[]; inventory: MockInventoryItem[] } = { users: [], jobs: [], invoices: [], jobDetails: [], inventory: [] };
  const custNames = ['Alex Carter', 'Brooke Reed', 'Charlie Nguyen'];
  const empNames = ['Evan Green', 'Faith Morgan', 'Gabe Ortiz'];

  // Create customers
  report('Creating customers…');
  for (let i = 0; i < custNames.length; i++) {
    const name = custNames[i];
    const email = mockEmail(name.split(' ')[0].toLowerCase(), 'customer', i+1);
    const u = await createUserViaEdge(name, email, 'customer');
    await addLocalUserRecord(u);
    tracker.users.push(u);
    report(`Customer created: ${u.name} (${u.email})`);
  }
  // Create employees
  report('Creating employees…');
  for (let i = 0; i < empNames.length; i++) {
    const name = empNames[i];
    const email = mockEmail(name.split(' ')[0].toLowerCase(), 'employee', i+1);
    const u = await createUserViaEdge(name, email, 'employee');
    await addLocalUserRecord(u);
    tracker.users.push(u);
    report(`Employee created: ${u.name} (${u.email})`);
  }

  // Create 2 jobs via normal checklist flow
  report('Creating jobs and checklists…');
  const customers = tracker.users.filter(u => u.role === 'customer');
  const employees = tracker.users.filter(u => u.role === 'employee');
  const pkgChoices = pick(servicePackages, 2);
  for (let j = 0; j < 2; j++) {
    const cust = customers[j % customers.length];
    const emp = employees[j % employees.length];
    const pkg = pkgChoices[j];
    const addOnChoices = pick(addOns, 2);
    const vehicleType = ['compact','midsize','truck','luxury'][j % 4];
    const tasks = (pkg.steps || []).map((s: any) => ({ id: s.id || s, name: s.name || s, category: s.category || 'exterior', checked: true }));
    const payload = {
      packageId: pkg.id,
      vehicleType,
      vehicleTypeNote: '',
      addons: addOnChoices.map(a => a.id),
      tasks,
      progress: 100,
      employeeId: emp.id,
      estimatedTime: `${90 + j*15} mins`,
      customerId: cust.id,
    };
    report(`Starting job ${j+1}/2 for ${cust.name} with ${emp.name} (${pkg.name})`);
    const res: any = await api('/api/checklist/generic', { method: 'POST', body: JSON.stringify(payload) });
    const checklistId = res?.id || `gc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    // Link to customer (normal flow)
    await api(`/api/checklist/${checklistId}/link-customer`, { method: 'PUT', body: JSON.stringify({ customerId: cust.id }) });
    report(`Linked checklist ${checklistId} to customer ${cust.name}`);
    // Build selected items for invoice & PDF
    const items = [
      { name: pkg.name, price: getServicePrice(pkg.id, vehicleType as any) },
      ...addOnChoices.map(a => ({ name: a.name, price: getAddOnPrice(a.id, vehicleType as any) })),
    ];
    // Archive job PDF
    try { buildJobPDF(cust.name, emp.name, pkg.name, items, checklistId); report(`Archived job PDF for checklist ${checklistId}`); } catch { report('PDF generation skipped/unavailable'); }
    tracker.jobs.push(checklistId);
    // Create invoice
    const subtotal = items.reduce((s, it) => s + (it.price || 0), 0);
    const total = subtotal;
    const inv: any = await upsertInvoice({
      customerId: cust.id,
      customerName: cust.name,
      services: items,
      total,
      paidAmount: j === 0 ? total : Math.round(total * 0.5),
      paymentStatus: j === 0 ? 'paid' : 'unpaid',
      invoiceNumber: 100 + Math.floor(Math.random()*100),
      date: new Date().toISOString(),
    });
    tracker.invoices.push(inv.id);
    report(`Created invoice ${inv?.invoiceNumber || inv?.id} (${j===0?'paid':'unpaid'}) for ${cust.name}`);
    tracker.jobDetails.push({
      id: checklistId,
      customerId: cust.id,
      customerName: cust.name,
      employeeId: emp.id,
      employeeName: emp.name,
      packageName: pkg.name,
      vehicleType,
      invoice: { id: inv?.id, total, paidAmount: j === 0 ? total : Math.round(total * 0.5), paymentStatus: j === 0 ? 'paid' : 'unpaid', invoiceNumber: inv?.invoiceNumber },
    });
  }

  // Add mock inventory items
  report('Adding mock inventory (chemicals and materials)…');
  const inventory = await addMockInventory();
  tracker.inventory = inventory;
  report('Inventory added');

  await localforage.setItem('mock-tracker', tracker);
  report('Saved tracker and notifying UI listeners');
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'mock-data' } })); } catch {}
  report('Mock data insertion complete');
  return tracker;
}

export async function removeMockData() {
  const tracker = (await localforage.getItem<any>('mock-tracker')) || { users: [], jobs: [], invoices: [] };
  // Remove local users cache
  const users = (await localforage.getItem<any[]>('users')) || [];
  const nextUsers = users.filter(u => !u.isMock && !String(u.email||'').startsWith('mock+'));
  await localforage.setItem('users', nextUsers);
  // Remove company employees
  const emps = (await localforage.getItem<any[]>('company-employees')) || [];
  const nextEmps = emps.filter(u => !u.isMock && !String(u.email||'').startsWith('mock+'));
  await localforage.setItem('company-employees', nextEmps);
  // Remove customers
  const customers = (await localforage.getItem<any[]>('customers')) || [];
  const nextCust = customers.filter(c => !String(c.email||'').startsWith('mock+'));
  await localforage.setItem('customers', nextCust);
  // Remove invoices
  const invoices = (await localforage.getItem<any[]>('invoices')) || [];
  const nextInv = invoices.filter(inv => !(tracker.invoices || []).includes(inv.id));
  await localforage.setItem('invoices', nextInv);
  // Remove generic checklists
  const gcs = (await localforage.getItem<any[]>('generic-checklists')) || [];
  const nextGcs = gcs.filter(gc => !(tracker.jobs || []).includes(gc.id));
  await localforage.setItem('generic-checklists', nextGcs);
  // Remove PDFs
  try {
    const pdfRaw = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
    const nextPdf = pdfRaw.filter((r: any) => !(tracker.jobs || []).includes(r.recordId));
    localStorage.setItem('pdfArchive', JSON.stringify(nextPdf));
  } catch {}

  // Supabase cleanup when configured
  if (isSupabaseConfigured()) {
    try {
      for (const u of tracker.users || []) {
        // delete auth user
        try { await (supabase as any).auth.admin.deleteUser(u.id); } catch {}
        // delete app_users
        try { await supabase.from('app_users').delete().eq('id', u.id); } catch {}
        // delete customers
        if (u.role === 'customer') { try { await supabase.from('customers').delete().eq('id', u.id); } catch {} }
      }
    } catch {}
  }

  await localforage.removeItem('mock-tracker');
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'mock-data-removed' } })); } catch {}
}

export default { insertMockData, removeMockData };
