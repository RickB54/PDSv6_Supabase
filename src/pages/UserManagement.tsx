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
import { Search, UserPlus, Users, Edit, Trash2, Shield, UserCog, Key, Save, X, RefreshCw, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function UserManagement() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [empEditId, setEmpEditId] = useState<string | null>(null);
  const [empEditName, setEmpEditName] = useState("");
  const [empEditEmail, setEmpEditEmail] = useState("");
  const [empNewName, setEmpNewName] = useState("");
  const [empNewEmail, setEmpNewEmail] = useState("");
  const [empNewPassword, setEmpNewPassword] = useState("");

  // Customer form state
  const [custNewName, setCustNewName] = useState("");
  const [custNewEmail, setCustNewEmail] = useState("");
  const [custNewPhone, setCustNewPhone] = useState("");

  // Admin form state
  const [adminNewName, setAdminNewName] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

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

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("id,email,name,role,updated_at")
        .in("role", ["admin", "owner"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setAdmins((data || []) as any[]);
    } catch {
      setAdmins([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id,full_name,email,phone,type,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCustomers((data || []) as any[]);
    } catch {
      setCustomers([]);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadEmployees(),
        loadAdmins(),
        loadCustomers()
      ]);
      toast({ title: "Refreshed", description: "All user data has been updated." });
    } catch (error) {
      toast({ title: "Refresh failed", description: "Could not refresh user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always load fresh data on mount
    refreshAll();
  }, []);

  const createEmployee = async () => {
    if (!empNewName || !empNewEmail) {
      toast({ title: "Validation Error", description: "Name and Email are required.", variant: "destructive" });
      return;
    }

    // Generate a random password if not provided
    const password = empNewPassword || `Temp${Math.random().toString(36).slice(2)}!`;

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: empNewEmail.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'employee',
          name: empNewName.trim()
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create auth user");

      // Step 2: Add to app_users table with role='employee'
      const { error: dbError } = await supabase
        .from('app_users')
        .upsert({
          id: authData.user.id,
          email: empNewEmail.trim().toLowerCase(),
          role: 'employee',
          name: empNewName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (dbError) throw dbError;

      // Success!
      setEmpNewName("");
      setEmpNewEmail("");
      setEmpNewPassword("");
      await loadEmployees();
      toast({
        title: "Employee created",
        description: `${empNewName} (${empNewEmail}) added successfully.${!empNewPassword ? ' Temporary password generated.' : ''}`
      });
    } catch (e: any) {
      toast({
        title: "Failed to create employee",
        description: e?.message || String(e),
        variant: "destructive"
      });
    }
  };

  const createCustomer = async () => {
    if (!custNewName) {
      toast({ title: "Validation Error", description: "Customer name is required.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("customers")
        .insert({
          full_name: custNewName,
          email: custNewEmail || null,
          phone: custNewPhone || null,
        });
      if (error) throw error;
      setCustNewName("");
      setCustNewEmail("");
      setCustNewPhone("");
      await loadCustomers();
      toast({ title: "Customer created", description: `${custNewName} added successfully.` });
    } catch (e: any) {
      toast({ title: "Failed to create customer", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const createAdmin = async () => {
    if (!adminNewName || !adminNewEmail) {
      toast({ title: "Validation Error", description: "Name and Email are required.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: { name: adminNewName, email: adminNewEmail, password: adminNewPassword },
      });
      if (error || !data?.ok) throw error || new Error("create_admin_failed");
      setAdminNewName("");
      setAdminNewEmail("");
      setAdminNewPassword("");
      await loadAdmins();
      toast({ title: "Admin created", description: `${adminNewName} (${adminNewEmail}) added successfully.` });
    } catch (e: any) {
      toast({ title: "Failed to create admin", description: String(e?.message || e), variant: "destructive" });
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

  const deleteAdmin = async (id: string) => {
    if (!confirm("Are you sure you want to delete this administrator? This action cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("id", id)
        .in("role", ["admin", "owner"]);
      if (error) throw error;
      await loadAdmins();
      toast({ title: "Admin deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;

    try {
      // First, check if customer has any vehicles
      const { data: vehicles, error: vehicleCheckError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("customer_id", id);

      if (vehicleCheckError) throw vehicleCheckError;

      if (vehicles && vehicles.length > 0) {
        toast({
          title: "Cannot delete customer",
          description: `This customer has ${vehicles.length} vehicle(s) linked. Please delete or reassign their vehicles first.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      // If no vehicles, proceed with deletion
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadCustomers();
      toast({ title: "Customer deleted" });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "An error occurred while deleting the customer.",
        variant: "destructive"
      });
    }
  };

  const filteredEmployees = employees.filter((u) => {
    const q = empSearch.trim().toLowerCase();
    const combo = `${u.name || ""} ${u.email || ""}`.toLowerCase();
    return !q || combo.includes(q);
  });

  const filteredCustomers = customers.filter((u) => {
    const q = custSearch.trim().toLowerCase();
    const combo = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
    return (!q || combo.includes(q)) && u.type !== 'prospect';
  });

  const filteredProspects = customers.filter((u) => {
    const q = custSearch.trim().toLowerCase();
    const combo = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
    return (!q || combo.includes(q)) && u.type === 'prospect';
  });

  const filteredAdmins = admins.filter((a) => {
    const q = adminSearch.trim().toLowerCase();
    const combo = `${a.name || ""} ${a.email || ""}`.toLowerCase();
    return !q || combo.includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Users & Roles" subtitle="Admin • Employees • Customers • Prospects" />

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            onClick={refreshAll}
            disabled={isLoading}
            variant="outline"
            className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh All Users'}
          </Button>
        </div>

        {/* Quick Tips Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="quick-tips" className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl rounded-lg">
            <AccordionTrigger className="px-6 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                <span className="text-white text-base font-semibold">Quick Tips - When to Use Each Page</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                {/* Users & Roles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-lg">🎯</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Users & Roles</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">Use for: Quick admin tasks</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>✅ Add new users (any type)</li>
                    <li>✅ Delete users</li>
                    <li>✅ View stats/overview</li>
                    <li>❌ NOT for: Detailed info, vehicles</li>
                  </ul>
                </div>

                {/* Customer Profiles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Customer Profiles</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">Use for: Customer details</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>✅ Search customers</li>
                    <li>✅ Manage vehicles</li>
                    <li>✅ View booking history</li>
                    <li>✅ Detailed customer info</li>
                  </ul>
                </div>

                {/* Prospects */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <span className="text-lg">🎯</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Prospects</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">Use for: Sales & leads</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>✅ Track leads</li>
                    <li>✅ Lead source tracking</li>
                    <li>✅ Follow-up management</li>
                    <li>✅ Convert to customers</li>
                  </ul>
                </div>

                {/* Company Employees */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-lg">💼</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Company Employees</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">Use for: HR tasks</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>✅ Employee details</li>
                    <li>✅ Contact information</li>
                    <li>✅ Payroll management</li>
                    <li>✅ Role management</li>
                  </ul>
                </div>
              </div>

              {/* Color Guide & Pro Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-800">
                <div>
                  <h4 className="text-sm font-bold text-white mb-3">Color Guide</h4>
                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span>Amber = Admins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Blue = Employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span>Purple = Customers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Orange = Prospects</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-3">Pro Tips 💡</h4>
                  <ul className="space-y-2 text-xs text-zinc-400">
                    <li>• Use this page for quick adds, dedicated pages for detailed work</li>
                    <li>• Edit buttons navigate to the appropriate detailed page</li>
                    <li>• Can't delete customers/prospects with vehicles (safety feature)</li>
                    <li>• Click refresh after creating users to see them immediately</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{admins.length}</div>
                <div className="text-sm text-zinc-400">Admins</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <UserCog className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{employees.length}</div>
                <div className="text-sm text-zinc-400">Employees</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{filteredCustomers.length}</div>
                <div className="text-sm text-zinc-400">Customers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{filteredProspects.length}</div>
                <div className="text-sm text-zinc-400">Prospects</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{admins.length + employees.length + customers.length}</div>
                <div className="text-sm text-zinc-400">Total Users</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admins List */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-white text-lg">Administrators</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search admins..."
                    className="pl-9 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 h-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Add New Admin Accordion */}
          <Accordion type="single" collapsible className="border-b border-zinc-800/50">
            <AccordionItem value="add-admin" className="border-none">
              <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-zinc-300">Add New Administrator</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Full Name *</label>
                    <Input
                      value={adminNewName}
                      onChange={(e) => setAdminNewName(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-amber-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Email Address *</label>
                    <Input
                      value={adminNewEmail}
                      onChange={(e) => setAdminNewEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-amber-500/50"
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Initial Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                      <Input
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="Auto-generate if blank"
                        className="bg-zinc-950 border-zinc-700 text-white pl-9 focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10" onClick={createAdmin}>
                      <UserPlus className="w-4 h-4 mr-2" /> Create Admin
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  * Admins have full access to all system features. Use with caution.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Last Update</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((a) => (
                  <TableRow key={a.id} className="hover:bg-zinc-800/30 border-zinc-800/50">
                    <TableCell className="text-zinc-200 font-medium py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-900/20 flex items-center justify-center text-xs font-bold text-amber-400 border border-amber-900/30">
                          {a.name?.charAt(0).toUpperCase() || "A"}
                        </div>
                        {a.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-900/10 text-amber-400 border-amber-900/30 capitalize">
                        {a.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                        onClick={() => deleteAdmin(a.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      <p>No admins found matching your search.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Employee List */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-white text-lg">Active Employees</CardTitle>
            </div>
          </CardHeader>

          {/* Add New Employee Accordion */}
          <Accordion type="single" collapsible className="border-b border-zinc-800/50">
            <AccordionItem value="add-employee" className="border-none">
              <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-zinc-300">Onboard New Employee</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Full Name</label>
                    <Input
                      value={empNewName}
                      onChange={(e) => setEmpNewName(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-blue-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Email Address</label>
                    <Input
                      value={empNewEmail}
                      onChange={(e) => setEmpNewEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-blue-500/50"
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
                        className="bg-zinc-950 border-zinc-700 text-white pl-9 focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10" onClick={createEmployee}>
                      <UserPlus className="w-4 h-4 mr-2" /> Create Account
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  * New employees will receive an email verification if Supabase Auth is configured for it. Otherwise, providing a password allows immediate login.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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

        {/* Customers Section */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-white text-lg">Customers</CardTitle>
                <Badge variant="outline" className="bg-purple-900/10 text-purple-400 border-purple-900/30">
                  {customers.length} Total
                </Badge>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="pl-9 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 h-9"
                />
              </div>
            </div>
          </CardHeader>

          {/* Add New Customer Accordion */}
          <Accordion type="single" collapsible className="border-b border-zinc-800/50">
            <AccordionItem value="add-customer" className="border-none">
              <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-zinc-300">Add New Customer</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Full Name *</label>
                    <Input
                      value={custNewName}
                      onChange={(e) => setCustNewName(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-purple-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Email Address</label>
                    <Input
                      value={custNewEmail}
                      onChange={(e) => setCustNewEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-purple-500/50"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Phone Number</label>
                    <Input
                      value={custNewPhone}
                      onChange={(e) => setCustNewPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-purple-500/50"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-10" onClick={createCustomer}>
                      <UserPlus className="w-4 h-4 mr-2" /> Add Customer
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  * Only name is required. Email and phone are optional but recommended for contact purposes.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Phone</TableHead>
                  <TableHead className="text-zinc-400">Registered</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-zinc-800/30 border-zinc-800/50">
                    <TableCell className="text-zinc-200 font-medium py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-900/20 flex items-center justify-center text-xs font-bold text-purple-400 border border-purple-900/30">
                          {c.full_name?.charAt(0).toUpperCase() || "C"}
                        </div>
                        {c.full_name || "Unnamed Customer"}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => {
                            // Navigate to customer details or edit
                            window.location.href = `/search-customer?id=${c.id}`;
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                          onClick={() => deleteCustomer(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      <p>No customers found matching your search.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Prospects Section */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-white text-lg">Prospects</CardTitle>
                <Badge variant="outline" className="bg-orange-900/10 text-orange-400 border-orange-900/30">
                  {filteredProspects.length} Total
                </Badge>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Search prospects..."
                  className="pl-9 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 h-9"
                />
              </div>
            </div>
          </CardHeader>

          {/* Add New Prospect Accordion */}
          <Accordion type="single" collapsible className="border-b border-zinc-800/50">
            <AccordionItem value="add-prospect" className="border-none">
              <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-zinc-300">Add New Prospect</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Full Name *</label>
                    <Input
                      value={custNewName}
                      onChange={(e) => setCustNewName(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-orange-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Email Address</label>
                    <Input
                      value={custNewEmail}
                      onChange={(e) => setCustNewEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-orange-500/50"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold uppercase">Phone Number</label>
                    <Input
                      value={custNewPhone}
                      onChange={(e) => setCustNewPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white focus:border-orange-500/50"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-10" onClick={createCustomer}>
                      <UserPlus className="w-4 h-4 mr-2" /> Add Prospect
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  * Only name is required. Email and phone are optional but recommended for contact purposes.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Phone</TableHead>
                  <TableHead className="text-zinc-400">Registered</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((p) => (
                  <TableRow key={p.id} className="hover:bg-zinc-800/30 border-zinc-800/50">
                    <TableCell className="text-zinc-200 font-medium py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-xs font-bold text-orange-400 border border-orange-900/30">
                          {p.full_name?.charAt(0).toUpperCase() || "P"}
                        </div>
                        {p.full_name || "Unnamed Prospect"}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {p.email || "\u2014"}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {p.phone || "\u2014"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => {
                            // Navigate to prospects page
                            window.location.href = `/prospects`;
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                          onClick={() => deleteCustomer(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProspects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      <p>No prospects found matching your search.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
