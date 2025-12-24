import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, HelpCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import OrientationModal from "@/components/training/OrientationModal";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { getCurrentUser } from "@/lib/auth";
import HelpModal from "@/components/help/HelpModal";
import localforage from "localforage";
import { Lightbulb, UserCheck, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProTip {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

const EmployeeDashboard = () => {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [certifiedDate, setCertifiedDate] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [startExamOnOpen, setStartExamOnOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tips, setTips] = useState<ProTip[]>([]);
  const [tipsChecked, setTipsChecked] = useState<boolean[]>([]);

  // Admin Edit State
  const [editingTip, setEditingTip] = useState<ProTip | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const isAdmin = user?.role === 'admin';


  // Notify Admin form state
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("URGENT");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const location = useLocation();
  useEffect(() => {
    const cert = localStorage.getItem("employee_training_certified");
    if (cert) setCertifiedDate(cert);
    try { localStorage.removeItem("employee_tasks"); } catch { }

    // Load persisted pro tips (Rich Format from Manual)
    const loadTips = async () => {
      const saved = await localforage.getItem<ProTip[]>("rick_pro_tips");
      if (saved && saved.length > 0) {
        setTips(saved);
        // Load checks
        const savedAck = JSON.parse(localStorage.getItem("pro_tips_ack") || "[]");
        setTipsChecked(savedAck);
      } else {
        // Fallback to defaults if empty (simulating Manual's default seed if needed, or just empty)
        // For dashboard, we'll just wait for manual to seed or showed empty.
        // Actually, let's seed same defaults to be safe/consistent if manual wasn't run yet.
        const defaults: ProTip[] = [
          { id: '1', title: 'Always Verify Water Source', content: 'Before hooking up, run the customer\'s spigot for 10 seconds to clear rust/sediment.', createdAt: Date.now() },
          { id: '2', title: 'Emblem Cleaning', content: 'Use a soft boar\'s hair brush on emblems while the foam cannon soap is dwelling. Rinse thoroughly from multiple angles.', createdAt: Date.now() },
          { id: '3', title: 'The Two-Bucket Method', content: 'Always keep your rinse bucket clean. If it gets dark, change the water. A dirty MITT creates swirls.', createdAt: Date.now() },
          { id: '4', title: 'Door Jamb Protocol', content: 'Don\'t blast door jambs with high pressure. Mist them with APC, agitate with a detailing brush, and use a gentle stream or damp microfiber to wipe clean.', createdAt: Date.now() },
          { id: '5', title: 'Glass Streak Prevention', content: 'Use two towels. One wet (with glass cleaner) to clean, one bone dry to buff. Clean interior glass horizontally and exterior vertically to trace streaks.', createdAt: Date.now() },
          { id: '6', title: 'Generator Safety', content: 'Face the generator exhaust AWAY from the customer\'s garage or windows. Carbon monoxide is dangerous and smells bad.', createdAt: Date.now() }
        ];
        setTips(defaults);
        localforage.setItem("rick_pro_tips", defaults);
      }
    };
    loadTips();

    try {
      const params = new URLSearchParams(location.search);
      const startExam = params.get('startExam');
      if (startExam === '1' || startExam === 'true') {
        setOrientationOpen(true);
        setStartExamOnOpen(true);
      }
    } catch { }
  }, [location.search]);

  // Sync checks
  useEffect(() => {
    try { localStorage.setItem("pro_tips_ack", JSON.stringify(tipsChecked)); } catch { }
  }, [tipsChecked]);

  // Admin Actions (Match Manual)
  const saveTip = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    let updated: ProTip[];
    if (editingTip) {
      updated = tips.map(t => t.id === editingTip.id ? { ...t, title: newTitle.trim(), content: newContent.trim() } : t);
      toast({ title: "Tip Updated", description: "Changes saved." });
    } else {
      const tip: ProTip = { id: Date.now().toString(), title: newTitle.trim(), content: newContent.trim(), createdAt: Date.now() };
      updated = [tip, ...tips];
      toast({ title: "Tip Added", description: "Pro tip saved successfully." });
    }
    setTips(updated);
    await localforage.setItem("rick_pro_tips", updated);
    setNewTitle(""); setNewContent(""); setEditingTip(null);
  };

  const startEdit = (tip: ProTip) => {
    setEditingTip(tip);
    setNewTitle(tip.title);
    setNewContent(tip.content);
  };

  const cancelEdit = () => {
    setEditingTip(null);
    setNewTitle(""); setNewContent("");
  };

  const deleteTip = async (id: string) => {
    if (!confirm("Delete this tip?")) return;
    const updated = tips.filter(t => t.id !== id);
    setTips(updated);
    await localforage.setItem("rick_pro_tips", updated);
    if (editingTip?.id === id) cancelEdit();
  };

  const handleNotifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Missing info", description: "Please enter a subject and message.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const actor = user?.name || user?.email || "Employee";
      const now = new Date();

      // Generate PDF for File Manager → Employee Contact
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Employee Contact", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Date: ${now.toLocaleString()}`, 20, 35);
      doc.text(`Employee: ${actor}`, 20, 45);
      doc.text(`Priority: ${priority}`, 20, 55);
      doc.text(`Subject: ${subject}`, 20, 65);
      doc.text("Message:", 20, 80);
      const lines = doc.splitTextToSize(message, 170);
      doc.text(lines, 20, 90);
      const pdfDataUrl = doc.output("dataurlstring");
      const fileName = `Employee_Contact_${now.toLocaleDateString().replace(/\//g, '-')}.pdf`;
      savePDFToArchive("Employee Contact", actor, `emp_contact_${Date.now()}`, pdfDataUrl, { fileName, path: "Employee Contact/" });

      // Alert admin
      pushAdminAlert("admin_email_sent", `Employee contact: ${subject}`, actor, { priority });

      // Attempt background email via local API (port 6066)
      try {
        await fetch("http://localhost:6066/api/email/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: actor, subject, message, priority, pdfDataUrl })
        });
      } catch { }

      // Open Gmail compose for reliability
      const body = `Priority: ${priority}\nEmployee: ${actor}\n\n${message}`;
      const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=primedetailsolutions.ma.nh@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailLink, "_blank");

      toast({ title: "Sent", description: "Your message was prepared; PDF saved in File Manager." });
      setSubject(""); setMessage(""); setPriority("URGENT");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Employee Dashboard" />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Employee Dashboard</h1>
            <div className="flex items-center gap-2">
              {certifiedDate && (
                <Badge className="bg-green-600">Certified Detailer — {certifiedDate}</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                onClick={() => setHelpOpen(true)}
                title="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Big cards arranged in two rows (2 columns on md+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/service-checklist" className="block">
              <Card className="p-6 bg-green-700 text-white rounded-xl">
                <div className="text-2xl font-bold">SERVICE CHECKLIST</div>
                <div className="text-sm opacity-90">Start Job • View Active Jobs</div>
                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-green-900 text-xs">[ 0 Active Jobs ]</div>
              </Card>
            </Link>

            <Link to="/staff-schedule" className="block">
              <Card className="p-6 bg-teal-700 text-white rounded-xl">
                <div className="text-2xl font-bold">WORK SCHEDULE</div>
                <div className="text-sm opacity-90">View your upcoming shifts and times.</div>
              </Card>
            </Link>

            {/* Orientation box (orange) */}
            {/* Prime Training Center */}
            <Link to="/training-manual" className="block text-left">
              <Card className="p-6 bg-purple-700 text-white rounded-xl hover:bg-purple-800 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-2xl font-bold">PRIME TRAINING CENTER</div>
                </div>
                <div className="text-sm opacity-90">Video Courses • SOPs • Certification</div>
                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-purple-900 text-xs">Learn & Grow</div>
              </Card>
            </Link>

            <Link to="/exam" className="block text-left">
              <Card className="p-6 bg-orange-600 text-white rounded-xl">
                <div className="text-2xl font-bold">ORIENTATION (EXAM)</div>
                <div className="text-sm opacity-90">Company overview • Policies • Final Exam</div>
                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-orange-800 text-xs">New Employee</div>
              </Card>
            </Link>

            <Link to="/services" className="block">
              <Card className="p-6 bg-blue-700 text-white rounded-xl">
                <div className="text-2xl font-bold">VIEW WEBSITE</div>
                <div className="text-sm opacity-90">To view our current package pricelist, add-ons and other website tools.</div>
              </Card>
            </Link>

            {/* Rick's Pro Tips (purple) */}
            <button type="button" onClick={() => setTipsOpen(true)} className="block text-left">
              <Card className="p-6 bg-purple-700 text-white rounded-xl">
                <div className="text-2xl font-bold">RICK’S PRO TIPS</div>
                <div className="text-sm opacity-90">Quick professional reminders to reduce rework.</div>
              </Card>
            </button>

            {/* App Team Chat (green) */}
            <Link to="/team-chat" className="block">
              <Card className="p-6 bg-green-700 text-white rounded-xl">
                <div className="text-2xl font-bold">APP TEAM CHAT</div>
                <div className="text-sm opacity-90">Communicate with your team in real-time.</div>
              </Card>
            </Link>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link to="/tasks" className="block">
              <Card className="p-4 text-center bg-muted/30 hover:bg-muted/50 transition rounded-xl">
                <div className="font-semibold text-white">Todo</div>
                <div className="text-xs text-muted-foreground">(Calendar)</div>
              </Card>
            </Link>
            <Link to="/search-customer" className="block">
              <Card className="p-4 text-center bg-muted/30 hover:bg-muted/50 transition rounded-xl">
                <div className="font-semibold text-white">ADD CUSTOMER</div>
              </Card>
            </Link>
            <Link to="/book-now" className="block">
              <Card className="p-4 text-center bg-muted/30 hover:bg-muted/50 transition rounded-xl">
                <div className="font-semibold text-white">NEW BOOKING</div>
              </Card>
            </Link>
            <Link to="/app-manual" className="block">
              <Card className="p-4 text-center bg-muted/30 hover:bg-muted/50 transition rounded-xl">
                <div className="font-semibold text-white">APP MANUAL</div>
              </Card>
            </Link>
            <Link to="/f150-setup" className="block">
              <Card className="p-4 text-center bg-muted/30 hover:bg-muted/50 transition rounded-xl">
                <div className="font-semibold text-white">BLOG</div>
              </Card>
            </Link>
          </div>

          {/* Notify Admin */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="text-xl font-bold text-foreground mb-4">NOTIFY ADMIN</div>
            <form onSubmit={handleNotifyAdmin} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">URGENT</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[140px]" />
              <div className="flex justify-end">
                <Button type="submit" disabled={sending} className="bg-red-600 hover:bg-red-700">
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
      {/* Orientation Modal */}
      <OrientationModal open={orientationOpen} onOpenChange={setOrientationOpen} startExamOnOpen={startExamOnOpen} />

      {/* Rick's Pro Tips Modal */}
      <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-purple-400">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              Rick's Pro Tips
            </DialogTitle>
          </DialogHeader>

          <div className="h-[60vh] flex flex-col gap-4">
            {/* Admin Add/Edit Section */}
            {isAdmin && (
              <div className={`border p-4 rounded-lg space-y-3 shrink-0 ${editingTip ? 'bg-orange-900/20 border-orange-500/30' : 'bg-purple-900/20 border-purple-500/30'}`}>
                <div className={`flex items-center gap-2 font-semibold mb-1 ${editingTip ? 'text-orange-300' : 'text-purple-300'}`}>
                  <UserCheck className="w-4 h-4" /> {editingTip ? 'Admin: Edit Tip' : 'Admin: Add New Tip'}
                </div>
                <Input
                  placeholder="Tip Title (e.g., 'Windshield Cleaning')"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-purple-500"
                />
                <Textarea
                  placeholder="Tip Content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 min-h-[80px] focus:border-purple-500"
                />
                <div className="flex justify-end gap-2">
                  {editingTip && (
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="text-zinc-400 hover:text-white">
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" onClick={saveTip} className={editingTip ? "bg-orange-600 hover:bg-orange-500" : "bg-purple-600 hover:bg-purple-500"}>
                    {editingTip ? "Save Changes" : <> <Plus className="w-4 h-4 mr-1" /> Add Tip </>}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2">
              <Accordion type="single" collapsible className="w-full">
                {tips.map((tip, i) => (
                  <AccordionItem value={`tip-${i}`} key={tip.id} className="border-zinc-800">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-left font-bold text-purple-200">{tip.title}</span>
                        {user?.role === 'admin' && ( // Explicit check
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-orange-400" onClick={() => startEdit(tip)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={() => deleteTip(tip.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-zinc-900/50 p-3 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={Boolean(tipsChecked[i])}
                          onCheckedChange={(v) => {
                            const next = [...tipsChecked];
                            next[i] = Boolean(v);
                            setTipsChecked(next);
                          }}
                        />
                        <span className="text-sm font-medium text-white">I have read and understood this tip.</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed pl-6 border-l-2 border-purple-500/30">
                        {tip.content}
                      </p>
                      <div className="mt-2 pl-6 text-[10px] text-zinc-600 font-mono">
                        Updated: {new Date(tip.createdAt).toLocaleDateString()}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role={(user?.role === 'admin') ? 'admin' : 'employee'} />
    </div>
  );
};

export default EmployeeDashboard;
