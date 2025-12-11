import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type Role = "admin" | "employee" | "customer";
type AppUser = { id: string; role: Role; name?: string | null; email?: string | null; updated_at?: string | null };

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
  // Passwords removed in favor of Supabase Auth Invite flow

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch profiles and invites
    const { data: profiles } = await supabase.from("app_users").select("id, role, name, email, updated_at");
    const { data: invites } = await supabase.from("authorized_users").select("*");

    const activeMap = new Map((profiles || []).map(p => [p.email, p]));

    // Combine
    const combined: any[] = [...(profiles || [])];

    (invites || []).forEach((inv: any) => {
      if (!activeMap.has(inv.email)) {
        combined.push({
          id: 'pending_' + inv.email,
          role: inv.role,
          name: inv.name || inv.email,
          email: inv.email,
          updated_at: inv.created_at
        });
      }
    });

    setUsers(combined.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')));
    setLoading(false);
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
      if (!id.startsWith('pending_')) {
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
      const { error } = await supabase.from("app_users").update({ name: editName }).eq("id", editId);
      if (error) throw error;
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
      const { error } = await supabase.from("app_users").delete().eq("id", id);
      if (error) throw error;
      if (role === "customer") {
        try { await supabase.from("customers").delete().eq("id", id); } catch { }
      }
      await fetchUsers();
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const impersonate = async (_id: string) => {
    toast({ title: "Impersonation disabled", description: "Use role-based login instead." });
  };

  const roleCounts = useMemo(() => {
    const map: Record<Role, number> = { admin: 0, employee: 0, customer: 0 };
    users.forEach((u) => { map[u.role] += 1; });
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

      // Clear the specific form on success
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
                <TableHead className="text-zinc-300">Last Login</TableHead>
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
                      u.name
                    )}
                  </TableCell>
                  <TableCell className="text-white">{u.email}</TableCell>
                  <TableCell className="text-white">
                    <Select value={u.role} onValueChange={(val) => onChangeRole(u.id, val as Role)}>
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
                  <TableCell className="text-zinc-300">{u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}</TableCell>
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
