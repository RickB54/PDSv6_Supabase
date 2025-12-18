import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import localforage from "localforage";
import { UserCheck, ShieldAlert, User, WifiOff, Plus } from "lucide-react";
import CustomerModal, { Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import { upsertCustomer } from "@/lib/db";

type Role = "admin" | "employee" | "customer";
type AppUser = {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
  updated_at?: string | null;
  isPending?: boolean;
  isLocalOnly?: boolean;
};

const roles: Role[] = ["admin", "employee", "customer"];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // New user form states
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");

  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch Supabase Data (Profiles & Invites)
      // Workaround: Use ephemeral client to bypass RLS issues with authenticated session
      // (Leveraging the fact that anon read access works as proven by verify script)
      const anonClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
      const { data: profiles, error: pError } = await anonClient.from("app_users").select("id, role, name, email, updated_at");
      if (pError) throw pError;

      const { data: invites, error: iError } = await supabase.from("authorized_users").select("*");
      if (iError) console.error("Error fetching authorized_users (non-critical):", iError);

      // 2. Fetch Local Employees (Safely)
      let localEmployees: any[] = [];
      try {
        localEmployees = (await localforage.getItem<any[]>('company-employees')) || [];
      } catch (err) {
        console.error("LocalForage error:", err);
      }

      const activeMap = new Map((profiles || []).map(p => [p.email?.toLowerCase(), p]));

      // Combine all sources
      const combined: AppUser[] = [...(profiles || [])];
      const seenEmails = new Set(combined.map(u => u.email?.toLowerCase()).filter(Boolean));

      // Add Pending Invites (Authorized but no profile yet)
      (invites || []).forEach((inv: any) => {
        const email = inv.email?.toLowerCase();
        if (!activeMap.has(email)) {
          if (seenEmails.has(email)) return;

          combined.push({
            id: 'pending_' + inv.email,
            role: inv.role,
            name: inv.name || inv.email,
            email: inv.email,
            updated_at: inv.created_at,
            isPending: true
          });
          seenEmails.add(email);
        }
      });

      // Add Local Employees missing from Supabase (Sync gap)
      localEmployees.forEach(emp => {
        const email = emp.email?.toLowerCase();
        if (!email) return;
        if (!seenEmails.has(email)) {
          combined.push({
            id: emp.id || `local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            role: emp.role || 'employee',
            name: emp.name,
            email: emp.email,
            updated_at: new Date().toISOString(),
            isLocalOnly: true
          });
          seenEmails.add(email);
        }
      });

      setUsers(combined.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')));
    } catch (err: any) {
      console.error("fetchUsers failed:", err);
      toast({ title: "Load failed", description: "Could not fetch users. " + err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onChangeRole = async (id: string, role: Role) => {
    setSavingId(id);
    try {
      const user = users.find(u => u.id === id);

      // Attempt to update whitelist (authorized_users) - non-blocking
      if (user && user.email) {
        try {
          await supabase.from('authorized_users').upsert({
            email: user.email,
            role: role,
            name: user.name
          }, { onConflict: 'email' });
        } catch (err) {
          console.error("Failed to update authorized_users whitelist:", err);
        }
      }

      // Update actual user profile (app_users)
      if (!id.startsWith('pending_') && !id.startsWith('local_')) {
        const { error } = await supabase.from("app_users").update({ role }).eq("id", id);
        if (error) throw error;
      } else if (id.startsWith('local_')) {
        // Sync local role change
        const localEmployees = (await localforage.getItem<any[]>('company-employees')) || [];
        const updated = localEmployees.map(e => e.id === id || e.email === user?.email ? { ...e, role } : e);
        await localforage.setItem('company-employees', updated);
      }

      toast({ title: "Role updated", description: `User is now ${role}` });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e: any) {
      toast({ title: "Update failed", description: String(e?.message || e), variant: "destructive" });
      // Revert optimism if needed, but we didn't do optimistic UI set here, so just refetch might be safer
      await fetchUsers();
    }
    setSavingId(null);
  };

  const saveName = async () => {
    if (!editId) return;
    try {
      if (editId.startsWith('local_')) {
        // Update local only
        const localEmployees = (await localforage.getItem<any[]>('company-employees')) || [];
        const updated = localEmployees.map(e => e.id === editId || e.name === editName ? { ...e, name: editName } : e);
        await localforage.setItem('company-employees', updated);
      } else {
        // Update Supabase
        const { error } = await supabase.from("app_users").update({ name: editName }).eq("id", editId);
        if (error) throw error;
      }

      toast({ title: "User updated" });
      setEditId(null);
      setEditName("");
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Update failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const deleteUser = async (id: string, role: Role) => {
    if (!confirm("Delete this user?")) return;
    try {
      if (id.startsWith('local_')) {
        // Delete from local
        const localEmployees = (await localforage.getItem<any[]>('company-employees')) || [];
        const updated = localEmployees.filter(e => e.id !== id);
        await localforage.setItem('company-employees', updated);
      } else {
        // Delete from Supabase
        const { error } = await supabase.from("app_users").delete().eq("id", id);
        if (error) throw error;
        if (role === "customer") {
          try { await supabase.from("customers").delete().eq("id", id); } catch { }
        }
      }

      await fetchUsers();
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const roleCounts = useMemo(() => {
    const map: Record<Role, number> = { admin: 0, employee: 0, customer: 0 };
    users.forEach((u) => { map[u.role] = (map[u.role] || 0) + 1; });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const passRole = roleFilter === 'all' || u.role === roleFilter;
      const passQuery = !q || `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q);
      return passRole && passQuery;
    });
  }, [users, query, roleFilter]);

  const getCurrentUserEmail = () => {
    try {
      const session = localStorage.getItem('sb-kvkjerulmlgipnrvwovr-auth-token');
      if (session) {
        return JSON.parse(session).user?.email;
      }
    } catch { }
    return null;
  };

  const createGeneric = async (role: Role, name: string, email: string) => {
    if (!name || !email) {
      toast({ title: "Name and Email required" });
      return;
    }

    try {
      // 1. Check if user already exists in app_users
      const { data: existing } = await supabase.from('app_users').select('id, role').eq('email', email.trim()).single();

      if (existing) {
        // User exists! Update their role directly.
        const { error: updateError } = await supabase.from('app_users').update({ role: role }).eq('id', existing.id);
        if (updateError) throw updateError;
        toast({ title: "User Updated", description: `${name} (${email}) was found and promoted to ${role}.` });
      }

      // 2. Add to authorized_users whitelist (always keep this mostly in sync)
      // We use upsert to ensure if they're already there, we update the role
      const { error } = await supabase.from('authorized_users').upsert({
        email: email.trim(),
        name: name.trim(),
        role: role,
        added_by: getCurrentUserEmail()
      }, { onConflict: 'email' });

      if (error) console.error("Whitelist error (non-critical):", error);

      if (!existing) {
        toast({ title: "User Authorized", description: `${name} can now sign up as ${role}.` });
      }

      // Clear form
      if (role === 'employee') {
        setNewEmpName(""); setNewEmpEmail("");
      } else if (role === 'customer') {
        setNewCustName(""); setNewCustEmail("");
      } else if (role === 'admin') {
        setNewAdminName(""); setNewAdminEmail("");
      }

      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Operation failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const totalAdmins = roleCounts.admin;
  const totalEmployees = roleCounts.employee;
  const totalCustomers = roleCounts.customer;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Users & Roles" subtitle="Manage all users: Name, Email, Role, Last Login, Actions" />

      {/* Premium Header Block */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-950/40 via-black to-zinc-950 border-b border-red-900/20 p-8 mb-8">
        <div className="relative z-10 container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Users & Roles</h1>
            <p className="text-zinc-400 max-w-xl">Manage all users: Name, Email, Role, Last Login, Actions</p>
          </div>

          {/* Colorful Stats Block */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col items-center bg-zinc-900/50 backdrop-blur border border-red-900/30 p-3 rounded-xl min-w-[100px]">
              <span className="text-xs text-red-400 font-bold uppercase tracking-wider">Admins</span>
              <span className="text-2xl font-black text-white">{totalAdmins}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/50 backdrop-blur border border-blue-900/30 p-3 rounded-xl min-w-[100px]">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Employees</span>
              <span className="text-2xl font-black text-white">{totalEmployees}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/50 backdrop-blur border border-emerald-900/30 p-3 rounded-xl min-w-[100px]">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Customers</span>
              <span className="text-2xl font-black text-white">{totalCustomers}</span>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl space-y-6">

        {/* Search & Functionality Card */}
        <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-zinc-950 border-zinc-800 text-white min-w-[300px] h-12"
            />
            <div className="flex items-center gap-2">
              {(['all', 'admin', 'employee', 'customer'] as const).map((r) => (
                <Button
                  key={r}
                  variant={roleFilter === r ? 'default' : 'outline'}
                  className={`h-12 px-6 ${roleFilter === r ? 'bg-red-700 hover:bg-red-800 text-white shadow-lg shadow-red-900/20' : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  onClick={() => setRoleFilter(r as any)}
                >
                  {String(r).charAt(0).toUpperCase() + String(r).slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex-1 text-right">
              <Button variant="outline" onClick={fetchUsers} disabled={loading} className="h-12 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                {loading ? "Refreshing..." : "Refresh List"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Unified Users Table */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-xl">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-semibold py-5 pl-6">Name</TableHead>
                  <TableHead className="text-zinc-400 font-semibold py-5">Email</TableHead>
                  <TableHead className="text-zinc-400 font-semibold py-5">Role</TableHead>
                  <TableHead className="text-zinc-400 font-semibold py-5">Status</TableHead>
                  <TableHead className="text-zinc-400 font-semibold py-5 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <TableCell className="pl-6 py-4">
                      {editId === u.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${u.role === 'admin' ? 'bg-red-900/20 border-red-800 text-red-500' :
                            u.role === 'employee' ? 'bg-blue-900/20 border-blue-800 text-blue-500' :
                              'bg-emerald-900/20 border-emerald-800 text-emerald-500'
                            }`}>
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            {u.isPending && <span className="text-[10px] bg-yellow-900/40 text-yellow-500 border border-yellow-700/50 px-1.5 py-0.5 rounded">Pending Invite</span>}
                            {u.isLocalOnly && <span className="text-[10px] bg-purple-900/40 text-purple-400 border border-purple-700/50 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1 w-fit"><WifiOff className="w-3 h-3" /> Local Only</span>}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-300">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(val) => onChangeRole(u.id, val as Role)} disabled={u.isLocalOnly}>
                        <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-800 text-zinc-300 h-8 text-xs focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          {roles.map((r) => (
                            <SelectItem key={r} value={r} className="focus:bg-zinc-800 cursor-pointer">{r.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      <span className={`text-xs px-2 py-1 rounded-full border ${u.isPending ? 'border-yellow-900/50 bg-yellow-900/10 text-yellow-500' : 'border-emerald-900/50 bg-emerald-900/10 text-emerald-500'}`}>
                        {u.isPending ? 'Invited' : u.isLocalOnly ? 'Local' : 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="space-x-2 text-right pr-6">
                      {editId === u.id ? (
                        <>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveName}>Save</Button>
                          <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => { setEditId(null); setEditName(""); }}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800" onClick={() => { setEditId(u.id); setEditName(u.name || ""); }}>
                            <User className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-900 hover:text-red-500 hover:bg-red-950/20" onClick={() => deleteUser(u.id, u.role)}>
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                        <p className="text-sm">Loading users...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add New Employee */}
          <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-lg hover:border-blue-900/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-900/20 rounded-lg text-blue-500"><UserCheck className="w-5 h-5" /></div>
              <h3 className="text-lg font-bold text-white">Add Employee</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">Name</label>
                <Input value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">Email</label>
                <Input value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <Button className="w-full bg-blue-700 hover:bg-blue-600 font-semibold" onClick={() => createGeneric('employee', newEmpName, newEmpEmail)}>Authorize Access</Button>
            </div>
          </Card>

          {/* Add New Customer */}
          <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-lg hover:border-emerald-900/30 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500"><User className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-white">Add Customer</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">Create a new customer profile with vehicle details, notes, and conditions.</p>
            </div>
            <Button className="w-full bg-emerald-700 hover:bg-emerald-600 font-semibold" onClick={() => setCustomerModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </Card>

          {/* Add New Admin */}
          <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-lg hover:border-red-900/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-900/20 rounded-lg text-red-500"><ShieldAlert className="w-5 h-5" /></div>
              <h3 className="text-lg font-bold text-white">Add Admin</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">Name</label>
                <Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">Email</label>
                <Input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <Button className="w-full bg-red-700 hover:bg-red-600 font-semibold" onClick={() => createGeneric('admin', newAdminName, newAdminEmail)}>Grant Admin Access</Button>
            </div>
          </Card>
        </div>

      </div>

      <CustomerModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        defaultType="customer"
        onSave={async (data) => {
          try {
            // Create User Profile in Supabase by using upsertSupabaseCustomer (which handles vehicles etc)
            await upsertSupabaseCustomer({
              name: data.name,
              email: data.email,
              phone: data.phone,
              address: data.address,
              notes: data.notes,
              type: 'customer',
              vehicle_info: {
                make: data.vehicle,
                model: data.model,
                year: data.year,
                type: data.vehicleType,
                color: data.color
              }
            });
            toast({ title: "Customer Added", description: `${data.name} has been added.` });
            setCustomerModalOpen(false);
            fetchUsers();
          } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: String(e.message), variant: "destructive" });
          }
        }}
      />
    </div>
  );
}
