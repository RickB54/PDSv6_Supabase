import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
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
        .eq("role", "employee")
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
      toast({ title: "Name and Email required" });
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
      toast({ title: "Employee created", description: data?.user?.email || empNewEmail });
    } catch (e: any) {
      toast({ title: "Failed to create employee", description: String(e?.message || e) });
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
      toast({ title: "Employee updated" });
    } catch {
      toast({ title: "Update failed" });
    }
  };

  const impersonateEmployee = async (_id: string) => {
    toast({ title: "Impersonation disabled", description: "Use role-based login instead." });
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
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
      toast({ title: "Delete failed" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle="Admin • Employee Rights" />

      {/* Search */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <Input
          value={empSearch}
          onChange={(e) => setEmpSearch(e.target.value)}
          placeholder="Search employees by name or email"
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </Card>

      {/* Employee List */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Employees</h3>
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
              {employees
                .filter((u) => {
                  const q = empSearch.trim().toLowerCase();
                  const combo = `${u.name || ""} ${u.email || ""}`.toLowerCase();
                  return !q || combo.includes(q);
                })
                .map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-white">
                      {empEditId === u.id ? (
                        <Input
                          value={empEditName}
                          onChange={(e) => setEmpEditName(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      ) : (
                        u.name
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      {empEditId === u.id ? (
                        <Input
                          value={empEditEmail}
                          onChange={(e) => setEmpEditEmail(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      ) : (
                        u.email
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-300">Employee</TableCell>
                    <TableCell className="text-zinc-300">
                      {u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {empEditId === u.id ? (
                        <>
                          <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={updateEmployee}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300"
                            onClick={() => {
                              setEmpEditId(null);
                              setEmpEditName("");
                              setEmpEditEmail("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-700 text-red-700 hover:bg-red-700/10"
                            onClick={() => {
                              setEmpEditId(u.id);
                              setEmpEditName(u.name || "");
                              setEmpEditEmail(u.email || "");
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => impersonateEmployee(u.id)}>
                            Impersonate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-700 text-red-700 hover:bg-red-700/10"
                            onClick={() => deleteEmployee(u.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-400 py-8">
                    No employees found.
                  </TableCell>
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
            <Input value={empNewName} onChange={(e) => setEmpNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <Input value={empNewEmail} onChange={(e) => setEmpNewEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Password</label>
            <Input value={empNewPassword} onChange={(e) => setEmpNewPassword(e.target.value)} placeholder="Blank to auto-generate" className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button className="bg-red-700 hover:bg-red-800" onClick={createEmployee}>Create Employee</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
