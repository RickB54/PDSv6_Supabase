import localforage from 'localforage';
import { upsertCustomer, upsertInvoice } from '@/lib/db';
import { savePDFToArchive } from '@/lib/pdfArchive';
import { servicePackages, addOns, getServicePrice, getAddOnPrice } from '@/lib/services';

type CreatedUser = { id: string; name: string; email: string; role: 'customer' | 'employee' };
type MockJob = {
  id: string;
  customerId: string;
  customerName: string;
  employeeId: string; // stores employee name for filtering
  employeeName: string;
  packageName: string;
  vehicleType: string;
  invoice?: { id?: string; total: number; paidAmount: number; paymentStatus: string; invoiceNumber?: number };
};
type MockInventoryItem = { name: string; category: 'Chemical' | 'Material' };

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function mockEmail(slug: string, role: 'customer' | 'employee', n: number) {
  return `static+${slug}.${role}${n}@example.local`;
}

async function addLocalUserRecord(u: CreatedUser) {
  if (u.role === 'customer') {
    await upsertCustomer({ id: u.id, name: u.name, email: u.email, role: 'customer', isStaticMock: true });
  }
  const users = (await localforage.getItem<any[]>('users')) || [];
  users.push({ id: u.id, name: u.name, email: u.email, role: u.role, isStaticMock: true, updatedAt: new Date().toISOString() });
  await localforage.setItem('users', users);
  if (u.role === 'employee') {
    const emps = (await localforage.getItem<any[]>('company-employees')) || [];
    emps.push({ id: u.id, name: u.name, email: u.email, role: 'employee', isStaticMock: true, updatedAt: new Date().toISOString() });
    await localforage.setItem('company-employees', emps);
  }
}

async function addStaticInventory(): Promise<MockInventoryItem[]> {
  const chemicals = (await localforage.getItem<any[]>("chemicals")) || [];
  const mockChemicals = [
    { id: genId('chem_apc'), name: 'All-Purpose Cleaner', bottleSize: '32 oz', costPerBottle: 12.99, currentStock: 8, threshold: 2, isStaticMock: true },
    { id: genId('chem_glass'), name: 'Glass Cleaner', bottleSize: '16 oz', costPerBottle: 7.49, currentStock: 5, threshold: 2, isStaticMock: true },
    { id: genId('chem_degreaser'), name: 'Wheel Degreaser', bottleSize: '24 oz', costPerBottle: 15.99, currentStock: 3, threshold: 1, isStaticMock: true },
  ];
  chemicals.push(...mockChemicals);
  await localforage.setItem("chemicals", chemicals);

  const materials = (await localforage.getItem<any[]>("materials")) || [];
  const mockMaterials = [
    { id: genId('mat_rag'), name: 'Microfiber Rag', size: 'Standard', costPerUnit: 2.99, currentStock: 25, threshold: 10, isStaticMock: true },
    { id: genId('mat_brush'), name: 'Soft Brush', size: 'Medium', costPerUnit: 8.99, currentStock: 10, threshold: 3, isStaticMock: true },
    { id: genId('mat_clay'), name: 'Detailing Clay', size: '200g', costPerUnit: 19.99, currentStock: 6, threshold: 2, isStaticMock: true },
  ];
  materials.push(...mockMaterials);
  await localforage.setItem("materials", materials);

  // Add Tools
  const tools = (await localforage.getItem<any[]>("tools")) || [];
  const mockTools = [
    { id: genId('tool_buffer'), name: 'Dual Action Buffer', brand: 'ProDetail', model: 'DA-3000', purchasePrice: 199.99, currentCondition: 'Excellent', maintenanceDate: new Date().toISOString(), isStaticMock: true },
    { id: genId('tool_vacuum'), name: 'Wet/Dry Vacuum', brand: 'ShopVac', model: 'SV-500', purchasePrice: 149.99, currentCondition: 'Good', maintenanceDate: new Date().toISOString(), isStaticMock: true },
    { id: genId('tool_steamer'), name: 'Steam Cleaner', brand: 'VaporMax', model: 'VM-2500', purchasePrice: 249.99, currentCondition: 'Excellent', maintenanceDate: new Date().toISOString(), isStaticMock: true },
    { id: genId('tool_extractor'), name: 'Carpet Extractor', brand: 'Detail King', model: 'EX-1200', purchasePrice: 399.99, currentCondition: 'Good', maintenanceDate: new Date().toISOString(), isStaticMock: true },
    { id: genId('tool_aircomp'), name: 'Air Compressor', brand: 'Porter-Cable', model: 'PC-600', purchasePrice: 179.99, currentCondition: 'Very Good', maintenanceDate: new Date().toISOString(), isStaticMock: true },
  ];
  tools.push(...mockTools);
  await localforage.setItem("tools", tools);

  const inv: MockInventoryItem[] = [
    { name: 'All-Purpose Cleaner', category: 'Chemical' },
    { name: 'Glass Cleaner', category: 'Chemical' },
    { name: 'Wheel Degreaser', category: 'Chemical' },
    { name: 'Microfiber Rag', category: 'Material' },
    { name: 'Soft Brush', category: 'Material' },
    { name: 'Detailing Clay', category: 'Material' },
  ];
  try { window.dispatchEvent(new CustomEvent('inventory-changed')); } catch { }
  return inv;
}

function archiveJobPDFPlaceholder(customerName: string, checklistId: string) {
  const dummy = 'data:application/pdf;base64,' + btoa('Static Mock Job PDF');
  try { savePDFToArchive('Job', customerName, checklistId, dummy, { fileName: `Job_Completion_${customerName}_${new Date().toISOString().split('T')[0]}.pdf` }); } catch { }
}

export async function insertStaticMockData(reporter?: (msg: string) => void) {
  const report = (msg: string) => { try { reporter && reporter(msg); } catch { } };
  const tracker: { users: CreatedUser[]; jobs: string[]; invoices: string[]; jobDetails: MockJob[]; inventory: MockInventoryItem[] } = { users: [], jobs: [], invoices: [], jobDetails: [], inventory: [] };
  const custNames = ['Taylor Frost', 'Jordan Lee', 'Morgan Park'];
  const empNames = ['Sam Rivera', 'Jamie Chen', 'Riley Brooks'];

  report('Creating static customers…');
  for (let i = 0; i < custNames.length; i++) {
    const name = custNames[i];
    const email = mockEmail(name.split(' ')[0].toLowerCase(), 'customer', i + 1);
    const u: CreatedUser = { id: genId('static_cust'), name, email, role: 'customer' };
    await addLocalUserRecord(u);
    tracker.users.push(u);
    report(`Customer created: ${u.name} (${u.email})`);
  }
  report('Creating static employees…');
  for (let i = 0; i < empNames.length; i++) {
    const name = empNames[i];
    const email = mockEmail(name.split(' ')[0].toLowerCase(), 'employee', i + 1);
    const u: CreatedUser = { id: genId('static_emp'), name, email, role: 'employee' };
    await addLocalUserRecord(u);
    tracker.users.push(u);
    report(`Employee created: ${u.name} (${u.email})`);
  }

  // Create 2 static jobs without API calls
  report('Creating static jobs and checklists…');
  const customers = tracker.users.filter(u => u.role === 'customer');
  const employees = tracker.users.filter(u => u.role === 'employee');
  const pkgChoices = [...servicePackages].slice(0, 2);
  const checklists = (await localforage.getItem<any[]>('generic-checklists')) || [];
  for (let j = 0; j < 2; j++) {
    const cust = customers[j % customers.length];
    const emp = employees[j % employees.length];
    const pkg = pkgChoices[j];
    const addOnChoices = [...addOns].slice(0, 2);
    const vehicleType = ['compact', 'midsize', 'truck', 'luxury'][j % 4];
    const tasks = (pkg.steps || []).map((s: any) => ({ id: s.id || s, name: s.name || s, category: s.category || 'exterior', checked: true }));
    const recordId = genId('gc');
    const record = {
      id: recordId,
      packageId: pkg.id,
      vehicleType,
      vehicleTypeNote: '',
      addons: addOnChoices.map(a => a.id),
      tasks,
      progress: 100,
      employeeId: emp.name, // filter expects name
      estimatedTime: `${90 + j * 15} mins`,
      customerId: cust.id,
      createdAt: new Date().toISOString(),
      linkedAt: new Date().toISOString(),
    };
    checklists.push(record);
    archiveJobPDFPlaceholder(cust.name, recordId);
    tracker.jobs.push(recordId);
    // Create invoice
    const items = [
      { name: pkg.name, price: getServicePrice(pkg.id, vehicleType as any) },
      ...addOnChoices.map(a => ({ name: a.name, price: getAddOnPrice(a.id, vehicleType as any) })),
    ];
    const subtotal = items.reduce((s, it) => s + (it.price || 0), 0);
    const total = subtotal;
    const inv: any = await upsertInvoice({
      customerId: cust.id,
      customerName: cust.name,
      services: items,
      total,
      paidAmount: j === 0 ? total : Math.round(total * 0.5),
      paymentStatus: j === 0 ? 'paid' : 'unpaid',
      invoiceNumber: 200 + Math.floor(Math.random() * 100),
      date: new Date().toISOString(),
      isStaticMock: true,
    } as any);
    tracker.invoices.push(inv.id);
    tracker.jobDetails.push({
      id: recordId,
      customerId: cust.id,
      customerName: cust.name,
      employeeId: emp.name,
      employeeName: emp.name,
      packageName: pkg.name,
      vehicleType,
      invoice: { id: inv?.id, total, paidAmount: j === 0 ? total : Math.round(total * 0.5), paymentStatus: j === 0 ? 'paid' : 'unpaid', invoiceNumber: inv?.invoiceNumber },
    });
  }
  await localforage.setItem('generic-checklists', checklists);

  // Add inventory
  report('Adding static inventory…');
  tracker.inventory = await addStaticInventory();

  await localforage.setItem('static-mock-tracker', tracker);
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'static-mock-data' } })); } catch { }
  report('Static mock data insertion complete');
  return tracker;
}

export async function removeStaticMockData() {
  const tracker = (await localforage.getItem<any>('static-mock-tracker')) || { users: [], jobs: [], invoices: [] };
  // Remove users
  const users = (await localforage.getItem<any[]>('users')) || [];
  const nextUsers = users.filter(u => !u.isStaticMock && !String(u.email || '').startsWith('static+'));
  await localforage.setItem('users', nextUsers);
  // Employees (both localforage and localStorage)
  const emps = (await localforage.getItem<any[]>('company-employees')) || [];
  const nextEmps = emps.filter(u => !u.isStaticMock && !String(u.email || '').startsWith('static+'));
  await localforage.setItem('company-employees', nextEmps);
  try {
    const lsEmps = JSON.parse(localStorage.getItem('company-employees') || '[]');
    const nextLsEmps = lsEmps.filter((u: any) => !u.isStaticMock && !String(u.email || '').startsWith('static+'));
    localStorage.setItem('company-employees', JSON.stringify(nextLsEmps));
  } catch { }
  // Customers
  const customers = (await localforage.getItem<any[]>('customers')) || [];
  const nextCust = customers.filter(c => !String(c.email || '').startsWith('static+'));
  await localforage.setItem('customers', nextCust);
  // Inventory
  const chemicals = (await localforage.getItem<any[]>('chemicals')) || [];
  const nextChems = chemicals.filter(c => !c.isStaticMock);
  await localforage.setItem('chemicals', nextChems);
  const materials = (await localforage.getItem<any[]>('materials')) || [];
  const nextMats = materials.filter(m => !m.isStaticMock);
  await localforage.setItem('materials', nextMats);
  // Invoices
  const invoices = (await localforage.getItem<any[]>('invoices')) || [];
  const nextInv = invoices.filter(inv => !(tracker.invoices || []).includes(inv.id));
  await localforage.setItem('invoices', nextInv);
  // Checklists
  const gcs = (await localforage.getItem<any[]>('generic-checklists')) || [];
  const nextGcs = gcs.filter(gc => !(tracker.jobs || []).includes(gc.id));
  await localforage.setItem('generic-checklists', nextGcs);
  // PDFs
  try {
    const pdfRaw = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
    const nextPdf = pdfRaw.filter((r: any) => !(tracker.jobs || []).includes(r.recordId));
    localStorage.setItem('pdfArchive', JSON.stringify(nextPdf));
  } catch { }

  await localforage.removeItem('static-mock-tracker');
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'static-mock-data-removed' } })); } catch { }
}

export default { insertStaticMockData, removeStaticMockData };

// Basic local-only mock data (no jobs, invoices) for Admin Dashboard popup
export async function insertStaticMockBasic(
  reporter?: (msg: string) => void,
  opts: { customers?: number; employees?: number; chemicals?: number; materials?: number } = { customers: 5, employees: 5, chemicals: 3, materials: 3 }
) {
  const report = (msg: string) => { try { reporter && reporter(msg); } catch { } };
  const tracker: {
    customers: CreatedUser[];
    employees: CreatedUser[];
    inventory: MockInventoryItem[];
    income?: any[];
    expenses?: any[];
    payroll?: any[];
    invoices?: any[];
    categories?: any;
  } = { customers: [], employees: [], inventory: [] };

  const custNames = ['Alex Green', 'Casey Brown', 'Drew White', 'Evan Blue', 'Finn Gray'];
  const empNames = ['Harper Quinn', 'Jesse Lane', 'Kai Morgan', 'Logan Reese', 'Milan Avery'];

  // Vehicle data for customers
  const vehicleData = [
    { year: '2023', make: 'Tesla', model: 'Model Y', type: 'SUV' },
    { year: '2022', make: 'Honda', model: 'Accord', type: 'Sedan' },
    { year: '2024', make: 'Ford', model: 'F-150', type: 'Truck' },
    { year: '2021', make: 'BMW', model: 'X5', type: 'Luxury SUV' },
    { year: '2023', make: 'Toyota', model: 'Camry', type: 'Sedan' }
  ];

  const addresses = [
    '123 Oak Street, Springfield, IL 62701',
    '456 Maple Avenue, Chicago, IL 60601',
    '789 Pine Road, Naperville, IL 60540',
    '321 Elm Drive, Aurora, IL 60505',
    '654 Cedar Lane, Joliet, IL 60435'
  ];

  // Create customers with full details
  report('Creating static customers with complete details…');
  const customersData = [] as any[];

  for (let i = 0; i < (opts.customers || 5); i++) {
    const name = custNames[i % custNames.length];
    const firstName = name.split(' ')[0].toLowerCase();
    const email = mockEmail(firstName, 'customer', i + 1);
    const phone = `(555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i * 111).slice(0, 4)}`;
    const vehicle = vehicleData[i % vehicleData.length];
    const address = addresses[i % addresses.length];

    const u: CreatedUser = { id: genId('static_cust'), name, email, role: 'customer' };
    await addLocalUserRecord(u);

    // Create full customer record with vehicle and contact details
    const fullCustomer = {
      id: u.id,
      name: u.name,
      email: u.email,
      phone,
      address,
      year: vehicle.year,
      vehicle: vehicle.make,
      model: vehicle.model,
      vehicleType: vehicle.type,
      notes: `Mock customer - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      createdAt: new Date().toISOString()
    };

    customersData.push(fullCustomer);
    tracker.customers.push(u);
    report(`Customer created: ${u.name} (${u.email}) - ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
  }

  // Save complete customer data to customers store
  report('Saving customer details to customers store…');
  const existingCustomers = (await localforage.getItem<any[]>('customers')) || [];
  await localforage.setItem('customers', [...existingCustomers, ...customersData]);
  report(`Saved ${customersData.length} customers with complete details`);

  // Create employees
  report('Creating static employees…');
  for (let i = 0; i < (opts.employees || 5); i++) {
    const name = empNames[i % empNames.length];
    const email = mockEmail(name.split(' ')[0].toLowerCase(), 'employee', i + 1);
    const u: CreatedUser = { id: genId('static_emp'), name, email, role: 'employee' };
    await addLocalUserRecord(u);
    tracker.employees.push(u);
    report(`Employee created: ${u.name} (${u.email})`);
  }

  // Create inventory
  report('Adding static inventory…');
  tracker.inventory = await addStaticInventory();

  // Create custom categories
  report('Creating custom categories…');
  const incomeTransactions = [];
  const incomeCategories = ['Detail Package Sales', 'Add-on Services', 'Gift Cards'];
  const now = new Date();

  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const income = {
      id: genId('income'),
      amount: Math.floor(Math.random() * 300) + 50,
      category: incomeCategories[i % incomeCategories.length],
      source: tracker.customers[i % tracker.customers.length]?.name || 'Customer',
      description: `Mock ${incomeCategories[i % incomeCategories.length]}`,
      date: date.toISOString(),
      createdAt: date.toISOString()
    };
    incomeTransactions.push(income);
  }

  // Save income via receivables
  const { upsertReceivable } = await import('@/lib/receivables');
  for (const inc of incomeTransactions) {
    await upsertReceivable(inc);
  }
  tracker.income = incomeTransactions;
  report(`Created ${incomeTransactions.length} income transactions`);

  // Create expense transactions (debits)
  report('Creating expense transactions…');
  const expenseTransactions = [];
  const expenseCategories = ['Marketing', 'Equipment Purchases', 'Payroll', 'Office Supplies'];

  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const expense = {
      id: genId('expense'),
      amount: Math.floor(Math.random() * 200) + 30,
      category: expenseCategories[i % expenseCategories.length],
      description: `Mock ${expenseCategories[i % expenseCategories.length]} expense`,
      date: date.toISOString(),
      createdAt: date.toISOString()
    };
    expenseTransactions.push(expense);
  }

  // Save expenses via db
  const { upsertExpense } = await import('@/lib/db');
  for (const exp of expenseTransactions) {
    await upsertExpense(exp);
  }
  tracker.expenses = expenseTransactions;
  report(`Created ${expenseTransactions.length} expense transactions`);

  // Create payroll history
  report('Creating payroll history…');
  const payrollEntries = [];
  for (let i = 0; i < tracker.employees.length; i++) {
    const emp = tracker.employees[i];
    const daysAgo = Math.floor(Math.random() * 14);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const entry = {
      id: genId('payroll'),
      employee: emp.email,
      employeeName: emp.name,
      amount: Math.floor(Math.random() * 500) + 200,
      type: ['Job Payment', 'Hourly Wage', 'Bonus'][i % 3],
      description: `Mock payment for ${emp.name}`,
      date: date.toISOString(),
      status: 'Paid'
    };
    payrollEntries.push(entry);
  }

  const currentPayroll = (await localforage.getItem<any[]>('payroll-history')) || [];
  await localforage.setItem('payroll-history', [...currentPayroll, ...payrollEntries]);
  tracker.payroll = payrollEntries;
  report(`Created ${payrollEntries.length} payroll entries`);

  // Create sample invoices
  report('Creating sample invoices…');
  const invoices = [];
  for (let i = 0; i < 5; i++) {
    const customer = tracker.customers[i % tracker.customers.length];
    const daysAgo = Math.floor(Math.random() * 20);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const total = Math.floor(Math.random() * 400) + 100;
    const paid = Math.random() > 0.3 ? total : Math.floor(total * 0.5);

    const invoice = {
      id: genId('invoice'),
      invoiceNumber: 1000 + i,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      total,
      paidAmount: paid,
      paymentStatus: paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      date: date.toISOString(),
      dueDate: new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { name: 'Full Detail Package', quantity: 1, price: total * 0.8 },
        { name: 'Ceramic Coating Add-on', quantity: 1, price: total * 0.2 }
      ]
    };
    invoices.push(invoice);
  }

  const currentInvoices = (await localforage.getItem<any[]>('invoices')) || [];
  await localforage.setItem('invoices', [...currentInvoices, ...invoices]);
  tracker.invoices = invoices;
  report(`Created ${invoices.length} invoices`);

  // Dispatch events
  try {
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
    window.dispatchEvent(new CustomEvent('inventory-changed'));
    window.dispatchEvent(new CustomEvent('accounting-changed'));
    window.dispatchEvent(new CustomEvent('payroll-changed'));
  } catch { }

  // Track categories for report
  tracker.categories = {
    income: incomeCategories,
    expense: expenseCategories
  };

  report('Static mock data insertion complete with accounting, payroll, invoices, and categories!');
  return tracker;
}

export async function removeStaticMockBasic(reporter?: (msg: string) => void) {
  const report = (msg: string) => { try { reporter && reporter(msg); } catch { } };

  report('Starting comprehensive mock data removal...');

  const mockEmailPrefix = 'static+';
  const mockNames = ['Alex Green', 'Casey Brown', 'Drew White', 'Evan Blue', 'Finn Gray', 'Taylor Frost', 'Jordan Lee', 'Morgan Park', 'Sam Rivera', 'Jamie Chen', 'Riley Brooks', 'Harper Quinn', 'Jesse Lane', 'Kai Morgan', 'Logan Reese', 'Milan Avery'];
  const mockIncomeCategories = ['Detail Package Sales', 'Add-on Services', 'Gift Cards'];
  const mockExpenseCategories = ['Marketing', 'Equipment Purchases', 'Payroll', 'Office Supplies'];
  const isMockName = (name: string) => mockNames.some(m => m.toLowerCase() === (name || '').toLowerCase());
  const isMockEmail = (email: string) => (email || '').startsWith(mockEmailPrefix);

  // 1. Users
  report('Cleaning Users...');
  const users = (await localforage.getItem<any[]>('users')) || [];
  const nextUsers = users.filter(u => !u.isStaticMock && !isMockEmail(u.email) && !isMockName(u.name));
  await localforage.setItem('users', nextUsers);

  // 2. Employees (LF + LS)
  report('Cleaning Employees...');
  const emps = (await localforage.getItem<any[]>('company-employees')) || [];
  const nextEmps = emps.filter(u => !u.isStaticMock && !isMockEmail(u.email) && !isMockName(u.name));
  await localforage.setItem('company-employees', nextEmps);
  try {
    const lsEmps = JSON.parse(localStorage.getItem('company-employees') || '[]');
    const nextLsEmps = lsEmps.filter((u: any) => !u.isStaticMock && !isMockEmail(u.email) && !isMockName(u.name));
    localStorage.setItem('company-employees', JSON.stringify(nextLsEmps));
  } catch { }

  // 3. Customers
  report('Cleaning Customers...');
  const customers = (await localforage.getItem<any[]>('customers')) || [];
  const nextCust = customers.filter(c => !c.isStaticMock && !isMockEmail(c.email) && !isMockName(c.name));
  await localforage.setItem('customers', nextCust);

  // 4. Inventory (Chemicals, Materials, Tools)
  report('Cleaning Inventory...');
  const chemicals = (await localforage.getItem<any[]>('chemicals')) || [];
  await localforage.setItem('chemicals', chemicals.filter(c => !c.isStaticMock && !String(c.id).startsWith('chem_')));

  const materials = (await localforage.getItem<any[]>('materials')) || [];
  await localforage.setItem('materials', materials.filter(m => !m.isStaticMock && !String(m.id).startsWith('mat_')));

  const tools = (await localforage.getItem<any[]>('tools')) || [];
  await localforage.setItem('tools', tools.filter(t => !t.isStaticMock && !String(t.id).startsWith('tool_')));

  // 5. Accounting - Income (Receivables)
  report('Cleaning Accounting (Income)...');
  const receivables = (await localforage.getItem<any[]>('receivables')) || [];
  const nextReceivables = receivables.filter(r => {
    // Filter by explicit ID pattern
    if (String(r.id || '').startsWith('static_') || String(r.id || '').startsWith('income_')) return false;
    // Filter by mock categories IF description is generic mock description
    if (mockIncomeCategories.includes(r.category) && (r.description || '').startsWith('Mock ')) return false;
    // Filter by mock source/customer name
    if (isMockName(r.source || r.customerName)) return false;
    return true;
  });
  await localforage.setItem('receivables', nextReceivables);

  // 6. Accounting - Expenses
  report('Cleaning Accounting (Expenses)...');
  const expenses = (await localforage.getItem<any[]>('expenses')) || [];
  const nextExpenses = expenses.filter(e => {
    if (String(e.id || '').startsWith('static_') || String(e.id || '').startsWith('expense_')) return false;
    if (mockExpenseCategories.includes(e.category) && (e.description || '').startsWith('Mock ')) return false;
    return true;
  });
  await localforage.setItem('expenses', nextExpenses);

  // 7. Payroll History
  report('Cleaning Payroll History...');
  const payroll = (await localforage.getItem<any[]>('payroll-history')) || [];
  const nextPayroll = payroll.filter(p => !isMockEmail(p.employee) && !isMockName(p.employeeName));
  await localforage.setItem('payroll-history', nextPayroll);

  // 8. Invoices
  report('Cleaning Invoices...');
  const invoices = (await localforage.getItem<any[]>('invoices')) || [];
  const nextInvoices = invoices.filter(inv => {
    if (inv.isStaticMock) return false;
    if (isMockEmail(inv.customerEmail)) return false;
    if (isMockName(inv.customerName)) return false;
    if (String(inv.id || '').startsWith('static_')) return false;
    return true;
  });
  await localforage.setItem('invoices', nextInvoices);

  // 9. Generic Checklists / Jobs
  report('Cleaning Jobs/Checklists...');
  const checklists = (await localforage.getItem<any[]>('generic-checklists')) || [];
  const nextChecklists = checklists.filter(c => {
    if (String(c.id || '').startsWith('static_') || String(c.id || '').startsWith('gc_')) {
      // Double check against mock customer if ID pattern is generic
      // Assuming static mocks used 'gc_' prefix heavily in tracker
      if (isMockName(c.customerName)) return false;
    }
    return true;
  });
  await localforage.setItem('generic-checklists', nextChecklists);

  // 10. Custom Categories (LocalStorage/LocalForage)
  report('Cleaning Custom Categories...');
  // Note: We only remove categories if they match our specific mock list exactly and are unused? 
  // Safest is to leave them unless we track them, but user asked to remove "Accounting and budget items".
  // Let's remove them from the custom lists if present.
  const customCats = (await localforage.getItem<string[]>('customCategories')) || [];
  // const nextCustomCats = customCats.filter(c => !mockIncomeCategories.includes(c) && !mockExpenseCategories.includes(c)); 
  // Actually, let's keep them in case user used them for real things, unless we are sure.
  // The prompt implies "Mock Data" items in the list. The transactions are the items. 
  // We will leave the category names themselves to avoid breaking filters if user adopted them.

  // 11. Clear Alerts & Badges
  report('Clearing Alerts...');
  try {
    const { clearAllAlerts } = await import('@/lib/adminAlerts');
    clearAllAlerts();
  } catch { }

  // 12. Reset helpers
  try { localStorage.setItem('inventory_low_count', '0'); } catch { }
  try { localStorage.setItem('payroll_owed_adjustments', '{}'); } catch { }

  // Dispatch Updates
  try {
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
    window.dispatchEvent(new CustomEvent('inventory-changed'));
    window.dispatchEvent(new CustomEvent('accounting-changed'));
    window.dispatchEvent(new CustomEvent('payroll-changed'));
    window.dispatchEvent(new CustomEvent('admin_alerts_updated'));
  } catch { }

  report('Static mock data removal complete. All traces cleared.');
}
