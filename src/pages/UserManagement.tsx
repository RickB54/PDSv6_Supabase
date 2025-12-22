import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { Search, UserPlus, Users, Edit, Trash2, Shield, UserCog, Key, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UserManagement() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [empEditId, setEmpEditId] = useState<string | null>(null);
  const [empEditName, setEmpEditName] = useState("");
  const [empEditEmail, setEmpEditEmail] = useState("");
  const [empNewName, setEmpNewName] = useState("");
  const [empNewEmail, setEmpNewEmail] = useState("");
  const [empNewPassword, setEmpNewPassword] = useState("");

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("id,email,name,role,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setEmployees((data || []) as any[]);
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const createEmployee = async () => {
    if (!empNewName || !empNewEmail) {
      toast({ title: "Validation Error", description: "Name and Email are required.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: { name: empNewName, email: empNewEmail, password: empNewPassword },
      });
      if (error || !data?.ok) throw error || new Error("create_employee_failed");
      setEmpNewName("");
      setEmpNewEmail("");
      setEmpNewPassword("");
      await loadEmployees();
      toast({ title: "Employee created", description: `${empNewName} (${empNewEmail}) added successfully.` });
    } catch (e: any) {
      toast({ title: "Failed to create employee", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const updateEmployee = async () => {
    if (!empEditId) return;
    try {
      const { error } = await supabase
        .from("app_users")
        .update({ name: empEditName })
        .eq("id", empEditId);
      if (error) throw error;
      setEmpEditId(null);
      setEmpEditName("");
      setEmpEditEmail("");
      await loadEmployees();
      toast({ title: "Employee updated successfully" });
    } catch {
      toast({ title: "Update failed", description: "Could not update employee details.", variant: "destructive" });
    }
  };

  const impersonateEmployee = async (_id: string) => {
    toast({ title: "Impersonation disabled", description: "Use role-based login instead." });
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("id", id)
        .eq("role", "employee");
      if (error) throw error;
      await loadEmployees();
      toast({ title: "Employee deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const filteredEmployees = employees.filter((u) => {
    const q = empSearch.trim().toLowerCase();
    const combo = `${u.name || ""} ${u.email || ""}`.toLowerCase();
    return !q || combo.includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="User Management" subtitle="Admin • Employee Access Control" />

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">

        {/* Search & Stats */}
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{employees.length}</div>
                <div className="text-sm text-zinc-400">Total Employees</div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-[2] bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center h-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Search employees by name, email..."
                  className="pl-9 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-white text-lg">Active Employees</CardTitle>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Last Profile Update</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((u) => (
                  <TableRow key={u.id} className="hover:bg-zinc-800/30 border-zinc-800/50">
                    <TableCell className="text-zinc-200 font-medium py-4">
                      {empEditId === u.id ? (
                        <Input
                          value={empEditName}
                          onChange={(e) => setEmpEditName(e.target.value)}
                          className="bg-zinc-950 border-zinc-700 text-white h-8"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          {u.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {empEditId === u.id ? (
                        <Input
                          value={empEditEmail}
                          onChange={(e) => setEmpEditEmail(e.target.value)}
                          className="bg-zinc-950 border-zinc-700 text-white h-8"
                          disabled // Often safer to not allow email edits easily
                        />
                      ) : (
                        u.email
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-900/10 text-blue-400 border-blue-900/30 capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {empEditId === u.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={updateEmployee}>
                            <Save className="w-3 h-3 mr-1" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            onClick={() => {
                              setEmpEditId(null);
                              setEmpEditName("");
                              setEmpEditEmail("");
                            }}
                          >
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            onClick={() => {
                              setEmpEditId(u.id);
                              setEmpEditName(u.name || "");
                              setEmpEditEmail(u.email || "");
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                            onClick={() => impersonateEmployee(u.id)}
                            title="Impersonate"
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                            onClick={() => deleteEmployee(u.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      <p>No employees found matching your search.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Add New Employee */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-white text-lg">Onboard New Employee</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Full Name</label>
                <Input
                  value={empNewName}
                  onChange={(e) => setEmpNewName(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-white focus:border-amber-500/50"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Email Address</label>
                <Input
                  value={empNewEmail}
                  onChange={(e) => setEmpNewEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-white focus:border-amber-500/50"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Initial Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                  <Input
                    value={empNewPassword}
                    onChange={(e) => setEmpNewPassword(e.target.value)}
                    placeholder="Auto-generate if blank"
                    className="bg-zinc-950 border-zinc-700 text-white pl-9 focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10" onClick={createEmployee}>
                  <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </Button>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              * New employees will receive an email verification if Supabase Auth is configured for it. Otherwise, providing a password allows immediate login.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
