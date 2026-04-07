import supabase from '@/lib/supabase';
import { logDelete } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';
import { isDemoActive } from '@/lib/supa-data';


function dbg(label: string, payload?: any) {
  try {
    console.debug(`[adminOps] ${label}`, payload ?? '');
  } catch { }
}

function toIsoCutoff(daysStr: string | null | undefined): string | null {
  const raw = String(daysStr ?? '').trim().toLowerCase();
  if (!raw || raw === 'all') return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const now = new Date();
  const cutoff = new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

async function requireAdminOrEmployee() {
  // 1. Check for active Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user;

  // 2. Fallback to verification if session is ambiguous
  if (!user) {
    const { data: auth } = await supabase.auth.getUser();
    user = auth?.user || undefined;
  }

  if (!user) {
    throw new Error('Not authenticated. Please log out and back in to refresh your server session.');
  }

  const u = getCurrentUser();
  const role = u?.role || 'customer';

  // 3. Admin/Employee Role Check
  if (!['admin', 'employee', 'owner'].includes(role)) {
    throw new Error('Insufficient permissions: only admins or employees can perform this action.');
  }

  // Sync role to Supabase app_users to satisfy RLS checks
  try {
    await supabase.from('app_users').upsert({
      id: user.id,
      email: user.email || u?.email || '',
      role: role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) {
    dbg('requireAdminOrEmployee:role_sync_error', e);
  }

  dbg('requireAdminOrEmployee', { sessionUserId: user.id, role });
}

async function count(table: string, filter: (q: any) => any) {
  try {
    let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
    q = filter(q);
    const { count: c } = await q;
    return c || 0;
  } catch { return 0; }
}

export async function previewDeleteCustomers(days: string) {
  const cutoff = toIsoCutoff(days);
  await requireAdminOrEmployee();
  return {
    tables: [
      { name: 'customers', count: await count('customers', (q: any) => q.lt('created_at', cutoff)) + await count('customers', (q: any) => q.lt('updated_at', cutoff)) },
      { name: 'app_users', count: await count('app_users', (q: any) => q.eq('role', 'customer').lt('created_at', cutoff)) + await count('app_users', (q: any) => q.eq('role', 'customer').lt('updated_at', cutoff)) },
    ],
  };
}

export async function deleteCustomersOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  // Delete dependent rows first to avoid FK violations
  dbg('deleteCustomersOlderThan:start', { cutoff });
  if (cutoff) {
    const bookingsDel = await supabase.from('bookings').delete().lt('date', cutoff);
    if (bookingsDel.error) { dbg('deleteCustomersOlderThan:bookings:error', bookingsDel.error); throw bookingsDel.error; }
    dbg('deleteCustomersOlderThan:bookings:count', bookingsDel.count);

    const custCreatedDel = await supabase.from('customers').delete().lt('created_at', cutoff);
    if (custCreatedDel.error) { dbg('deleteCustomersOlderThan:customers(created_at):error', custCreatedDel.error); throw custCreatedDel.error; }
    dbg('deleteCustomersOlderThan:customers(created_at):count', custCreatedDel.count);

    const custUpdatedDel = await supabase.from('customers').delete().lt('updated_at', cutoff);
    if (custUpdatedDel.error) { dbg('deleteCustomersOlderThan:customers(updated_at):error', custUpdatedDel.error); throw custUpdatedDel.error; }
    dbg('deleteCustomersOlderThan:customers(updated_at):count', custUpdatedDel.count);

    const appUsersCreatedDel = await supabase.from('app_users').delete().eq('role', 'customer').lt('created_at', cutoff);
    if (appUsersCreatedDel.error) { dbg('deleteCustomersOlderThan:app_users(created_at):error', appUsersCreatedDel.error); throw appUsersCreatedDel.error; }
    dbg('deleteCustomersOlderThan:app_users(created_at):count', appUsersCreatedDel.count);

    const appUsersUpdatedDel = await supabase.from('app_users').delete().eq('role', 'customer').lt('updated_at', cutoff);
    if (appUsersUpdatedDel.error) { dbg('deleteCustomersOlderThan:app_users(updated_at):error', appUsersUpdatedDel.error); throw appUsersUpdatedDel.error; }
    dbg('deleteCustomersOlderThan:app_users(updated_at):count', appUsersUpdatedDel.count);
  } else {
    const bookingsDel = await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (bookingsDel.error) { dbg('deleteCustomersOlderThan:bookings:error', bookingsDel.error); throw bookingsDel.error; }
    dbg('deleteCustomersOlderThan:bookings:count(all)', bookingsDel.count);

    const custDel = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (custDel.error) { dbg('deleteCustomersOlderThan:customers:error', custDel.error); throw custDel.error; }
    dbg('deleteCustomersOlderThan:customers:count(all)', custDel.count);

    const auDel = await supabase.from('app_users').delete().eq('role', 'customer');
    if (auDel.error) { dbg('deleteCustomersOlderThan:app_users:error', auDel.error); throw auDel.error; }
    dbg('deleteCustomersOlderThan:app_users:count(all)', auDel.count);
  }

  const audit = await logDelete({ type: 'customers', cutoff });
  dbg('deleteCustomersOlderThan:audit', audit);
}

// Delete employees (role=employee) based on cutoff or delete all
export async function deleteEmployeesOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  dbg('deleteEmployeesOlderThan:start', { cutoff });
  if (cutoff) {
    const createdDel = await supabase.from('app_users').delete().eq('role', 'employee').lt('created_at', cutoff);
    if (createdDel.error) { dbg('deleteEmployeesOlderThan:app_users(created_at):error', createdDel.error); throw createdDel.error; }
    dbg('deleteEmployeesOlderThan:app_users(created_at):count', createdDel.count);

    const updatedDel = await supabase.from('app_users').delete().eq('role', 'employee').lt('updated_at', cutoff);
    if (updatedDel.error) { dbg('deleteEmployeesOlderThan:app_users(updated_at):error', updatedDel.error); throw updatedDel.error; }
    dbg('deleteEmployeesOlderThan:app_users(updated_at):count', updatedDel.count);
  } else {
    const delAll = await supabase.from('app_users').delete().eq('role', 'employee');
    if (delAll.error) { dbg('deleteEmployeesOlderThan:app_users(all):error', delAll.error); throw delAll.error; }
    dbg('deleteEmployeesOlderThan:app_users(all):count', delAll.count);
  }
  const audit = await logDelete({ type: 'employees', cutoff });
  dbg('deleteEmployeesOlderThan:audit', audit);
}

export async function deleteInvoicesOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  dbg('deleteInvoicesOlderThan:start', { cutoff });
  const res = cutoff
    ? await supabase.from('invoices').delete().lt('created_at', cutoff)
    : await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (res.error) { dbg('deleteInvoicesOlderThan:error', res.error); throw res.error; }
  dbg('deleteInvoicesOlderThan:count', res.count);
  const audit = await logDelete({ type: 'invoices', cutoff });
  dbg('deleteInvoicesOlderThan:audit', audit);
}

export async function deleteExpensesOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  dbg('deleteExpensesOlderThan:start', { cutoff });
  const exp = cutoff
    ? await supabase.from('expenses').delete().lt('date', cutoff)
    : await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (exp.error) { dbg('deleteExpensesOlderThan:expenses:error', exp.error); throw exp.error; }
  dbg('deleteExpensesOlderThan:expenses:count', exp.count);
  const acc = cutoff
    ? await supabase.from('accounting').delete().lt('created_at', cutoff)
    : await supabase.from('accounting').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (acc.error) { dbg('deleteExpensesOlderThan:accounting:error', acc.error); throw acc.error; }
  dbg('deleteExpensesOlderThan:accounting:count', acc.count);
  const audit = await logDelete({ type: 'expenses', cutoff });
  dbg('deleteExpensesOlderThan:audit', audit);
}

export async function deleteInventoryUsageOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  dbg('deleteInventoryUsageOlderThan:start', { cutoff });
  const usageDel = cutoff
    ? await supabase.from('usage').delete().lt('date', cutoff)
    : await supabase.from('usage').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (usageDel.error) { dbg('deleteInventoryUsageOlderThan:usage:error', usageDel.error); throw usageDel.error; }
  dbg('deleteInventoryUsageOlderThan:usage:count', usageDel.count);
  const invDel = cutoff
    ? await supabase.from('inventory_records').delete().lt('created_at', cutoff)
    : await supabase.from('inventory_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (invDel.error) { dbg('deleteInventoryUsageOlderThan:inventory_records:error', invDel.error); throw invDel.error; }
  dbg('deleteInventoryUsageOlderThan:inventory_records:count', invDel.count);
  const audit = await logDelete({ type: 'inventory', cutoff });
  dbg('deleteInventoryUsageOlderThan:audit', audit);
}

export async function deleteBookingsOlderThan(days: string): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  const cutoff = toIsoCutoff(days);
  dbg('deleteBookingsOlderThan:start', { cutoff });

  const res = cutoff
    ? await supabase.from('bookings').delete().lt('date', cutoff)
    : await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (res.error) { dbg('deleteBookingsOlderThan:error', res.error); throw res.error; }
  dbg('deleteBookingsOlderThan:count', res.count);

  const abRes = cutoff
    ? await supabase.from('availability_blocks').delete().lt('date', cutoff)
    : await supabase.from('availability_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (abRes.error) { dbg('deleteBookingsOlderThan:availability:error', abRes.error); }

  const audit = await logDelete({ type: 'bookings', cutoff });
  dbg('deleteBookingsOlderThan:audit', audit);
}

export async function deleteEverything(): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  // Supabase deletions — ONLY the allowed data
  dbg('deleteEverything:start');
  const ops = [
    ['bookings', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['availability_blocks', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['invoices', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['expenses', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['usage', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['inventory_records', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['vehicles', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    // Customers and app_users last
    ['customers', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
  ] as const;
  for (const [table, cond] of ops) {
    let q: any = supabase.from(table as any).delete();
    if (cond.op === 'neq') q = q.neq(cond.col, cond.val);
    const res = await q;
    if (res.error) { dbg(`deleteEverything:${table}:error`, res.error); throw res.error; }
    dbg(`deleteEverything:${table}:count`, res.count);
  }
  // Delete customer app_users separately with role filter
  const au = await supabase.from('app_users').delete().eq('role', 'customer');
  if (au.error) { dbg('deleteEverything:app_users:error', au.error); throw au.error; }
  dbg('deleteEverything:app_users:count', au.count);
  // Delete employees but preserve admins
  const emp = await supabase.from('app_users').delete().eq('role', 'employee');
  if (emp.error) { dbg('deleteEverything:employees:error', emp.error); throw emp.error; }
  dbg('deleteEverything:employees:count', emp.count);
  const audit = await logDelete({ type: 'all' });
  dbg('deleteEverything:audit', audit);
}

export async function deleteEverythingExceptInventory(): Promise<void> {
  if (isDemoActive()) return;
  await requireAdminOrEmployee();
  dbg('deleteEverythingExceptInventory:start');
  const ops = [
    ['bookings', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['availability_blocks', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['invoices', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['expenses', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    ['vehicles', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
    // Customers last
    ['customers', { col: 'id', op: 'neq', val: '00000000-0000-0000-0000-000000000000' }],
  ] as const;
  for (const [table, cond] of ops) {
    let q: any = supabase.from(table as any).delete();
    if (cond.op === 'neq') q = q.neq(cond.col, cond.val);
    const res = await q;
    if (res.error) { dbg(`deleteEverythingExceptInventory:${table}:error`, res.error); throw res.error; }
    dbg(`deleteEverythingExceptInventory:${table}:count`, res.count);
  }
  // Delete customer app_users
  const au = await supabase.from('app_users').delete().eq('role', 'customer');
  if (au.error) { dbg('deleteEverythingExceptInventory:app_users:error', au.error); throw au.error; }
  dbg('deleteEverythingExceptInventory:app_users:count', au.count);

  // Delete employees but preserve admins
  const emp = await supabase.from('app_users').delete().eq('role', 'employee');
  if (emp.error) { dbg('deleteEverythingExceptInventory:employees:error', emp.error); throw emp.error; }
  dbg('deleteEverythingExceptInventory:employees:count', emp.count);

  const audit = await logDelete({ type: 'all_except_inventory' });
  dbg('deleteEverythingExceptInventory:audit', audit);
}

export async function previewDeleteInvoices(days: string) {
  const cutoff = toIsoCutoff(days);
  await requireAdminOrEmployee();
  return { tables: [{ name: 'invoices', count: await count('invoices', (q: any) => q.lt('created_at', cutoff)) }] };
}

export async function previewDeleteExpenses(days: string) {
  const cutoff = toIsoCutoff(days);
  await requireAdminOrEmployee();
  return {
    tables: [
      { name: 'expenses', count: await count('expenses', (q: any) => q.lt('date', cutoff)) },
      { name: 'accounting', count: await count('accounting', (q: any) => q.lt('created_at', cutoff)) },
    ]
  };
}

export async function previewDeleteInventory(days: string) {
  const cutoff = toIsoCutoff(days);
  await requireAdminOrEmployee();
  return {
    tables: [
      { name: 'usage', count: await count('usage', (q: any) => q.lt('date', cutoff)) },
      { name: 'inventory_records', count: await count('inventory_records', (q: any) => q.lt('created_at', cutoff)) },
    ]
  };
}

export async function previewDeleteAll(days?: string) {
  const cutoff = days ? toIsoCutoff(days) : null;
  await requireAdminOrEmployee();
  const entries = [] as { name: string; count: number }[];
  const tables = [
    ['bookings', 'date'],
    ['availability_blocks', 'date'],
    ['customers', 'created_at'],
    ['invoices', 'created_at'],
    ['expenses', 'date'],
    ['usage', 'date'],
    ['inventory_records', 'created_at'],
    ['vehicles', 'created_at'],
    ['packages', 'created_at'],
    ['add_ons', 'created_at'],
  ] as const;
  for (const [name, col] of tables) {
    const c = await count(name, (q: any) => cutoff ? q.lt(col, cutoff) : q.neq('id', null));
    entries.push({ name, count: c });
  }
  return { tables: entries };
}

export async function previewDeleteAllExceptInventory() {
  await requireAdminOrEmployee();
  const entries = [] as { name: string; count: number }[];
  const tables = [
    ['bookings', 'date'],
    ['availability_blocks', 'date'],
    ['customers', 'created_at'],
    ['invoices', 'created_at'],
    ['expenses', 'date'],
    ['vehicles', 'created_at'],
    ['packages', 'created_at'],
    ['add_ons', 'created_at'],
  ] as const;
  for (const [name, col] of tables) {
    const c = await count(name, (q: any) => q.neq('id', null));
    entries.push({ name, count: c });
  }
  return { tables: entries };
}

export async function deleteAllTeamMessages(): Promise<number> {
  if (isDemoActive()) return 0;
  await requireAdminOrEmployee();
  // Delete all messages
  const { count, error } = await supabase.from('team_messages').delete().neq('id', 0);
  // Note: .neq('id', 0) is a hack if id is uuid and not null. better: .neq('content', 'THIS_STRING_WONT_EXIST') or just .neq('id', '00000000-0000-0000-0000-000000000000')
  // Actually, standard way for "Delete All" in Supabase is usually just .delete().neq('id', null) if ID is PK.
  // Let's use logic from deleteEverything
  const res = await supabase.from('team_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (res.error) throw res.error;
  return res.count || 0;
}
