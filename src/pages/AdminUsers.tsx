import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import localforage from "localforage";
import { UserCheck, ShieldAlert, User, WifiOff } from "lucide-react";

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      );

      // Wrap the actual fetch logic
      const fetchData = async () => {
        // 1. Fetch Supabase Data (Profiles & Invites)
        const { data: profiles, error: pError } = await supabase.from("app_users").select("id, role, name, email, updated_at");
        if (pError) console.error("Error fetching app_users:", pError);

        const { data: invites, error: iError } = await supabase.from("authorized_users").select("*");
        if (iError) console.error("Error fetching authorized_users:", iError);

        // 2. Fetch Local Employees (for "Ghosts" or unsynced data)
        const localEmployees = (await localforage.getItem<any[]>('company-employees')) || [];

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

        return combined.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      };

      // Race against timeout
      const result = await Promise.race([fetchData(), timeoutPromise]) as any[];
      setUsers(result);
    } catch (err: any) {
      console.error("fetchUsers failed:", err);
      if (err.message === "Request timed out") {
        toast({ title: "Connection slow", description: "Taking longer than expected...", variant: "default" });
      } else {
        toast({ title: "Refresh failed", description: "Could not fetch users.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onChangeRole = async (id: string, role: Role) => {
    setSavingId(id);
    try {
      const user = users.find(u => u.id === id);
      if (user && user.email) {
        // Normalize role in authorized_users source of truth
        await supabase.from('authorized_users').upsert({
          email: user.email,
          role: role,
          name: user.name
        }, { onConflict: 'email' });
      }

      // Also update profile if exists
      if (!id.startsWith('pending_') && !id.startsWith('local_')) {
        const { error } = await supabase.from("app_users").update({ role }).eq("id", id);
        if (error) throw error;
      }

      toast({ title: "Role updated", description: `User is now ${role}` });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e: any) {
      toast({ title: "Update failed", description: String(e?.message), variant: "destructive" });
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
      // 1. Add to authorized_users whitelist
      const { error } = await supabase.from('authorized_users').upsert({
        email: email.trim(),
        name: name.trim(),
        role: role,
        added_by: getCurrentUserEmail()
      }, { onConflict: 'email' });

      if (error) throw error;

      toast({ title: "User Authorized", description: `${name} can now sign up as ${role}.` });

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
      toast({ title: "Authorization failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-4">
      <PageHeader title="Users & Roles" subtitle="Manage all users: Name, Email, Role, Last Login, Actions" />

      {/* Search, Role Filters, and Refresh */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <div className="flex items-center gap-2">
            {(['all', 'admin', 'employee', 'customer'] as const).map((r) => (
              <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} className={roleFilter === r ? 'bg-red-700 hover:bg-red-800' : 'border-zinc-700 text-zinc-300'} onClick={() => setRoleFilter(r as any)}>
                {String(r).charAt(0).toUpperCase() + String(r).slice(1)}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={loading} className="border-zinc-700 text-zinc-300">
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <div className="text-sm text-zinc-400">
            Admins: {roleCounts.admin} • Employees: {roleCounts.employee} • Customers: {roleCounts.customer}
          </div>
        </div>
      </Card>

      {/* Unified Users Table */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-zinc-300">Name</TableHead>
                <TableHead className="text-zinc-300">Email</TableHead>
                <TableHead className="text-zinc-300">Role</TableHead>
                <TableHead className="text-zinc-300">Status</TableHead>
                <TableHead className="text-zinc-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-white">
                    {editId === u.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u.isPending && <span className="text-[10px] bg-yellow-900/40 text-yellow-500 border border-yellow-700/50 px-1.5 py-0.5 rounded">Pending Invite</span>}
                        {u.isLocalOnly && <span className="text-[10px] bg-purple-900/40 text-purple-400 border border-purple-700/50 px-1.5 py-0.5 rounded flex items-center gap-1"><WifiOff className="w-3 h-3" /> Local Only</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-white">{u.email}</TableCell>
                  <TableCell className="text-white">
                    <Select value={u.role} onValueChange={(val) => onChangeRole(u.id, val as Role)} disabled={u.isLocalOnly}>
                      <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <span className="text-xs font-mono">
                      {u.isPending ? 'Waiting for signup' : u.isLocalOnly ? 'Device Only' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {editId === u.id ? (
                      <>
                        <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={saveName}>Save</Button>
                        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setEditId(null); setEditName(""); }}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => { setEditId(u.id); setEditName(u.name || ""); }}>Edit</Button>
                        <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => deleteUser(u.id, u.role)}>Delete</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-400 py-8">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add New Employee */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Add New Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Name</label>
            <Input value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <Input value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button className="bg-red-700 hover:bg-red-800" onClick={() => createGeneric('employee', newEmpName, newEmpEmail)}>Authorize Employee</Button>
          </div>
        </div>
      </Card>

      {/* Add New Customer */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Name</label>
            <Input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <Input value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button className="bg-red-700 hover:bg-red-800" onClick={() => createGeneric('customer', newCustName, newCustEmail)}>Authorize Customer</Button>
          </div>
        </div>
      </Card>

      {/* Add New Admin */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Add New Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Name</label>
            <Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <Input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button className="bg-red-700 hover:bg-red-800" onClick={() => createGeneric('admin', newAdminName, newAdminEmail)}>Authorize Admin</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
