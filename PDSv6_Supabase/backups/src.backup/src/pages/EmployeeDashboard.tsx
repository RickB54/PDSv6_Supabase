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
import { Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import OrientationModal from "@/components/training/OrientationModal";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { getCurrentUser } from "@/lib/auth";
import HelpModal from "@/components/help/HelpModal";

const EmployeeDashboard = () => {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [certifiedDate, setCertifiedDate] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [startExamOnOpen, setStartExamOnOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tips, setTips] = useState<string[]>([
    "Always pre-rinse heavily soiled areas to prevent marring.",
    "Use dedicated wheel buckets to avoid cross-contamination.",
    "Work small sections; check results under proper lighting.",
    "Prime pads correctly; clean pads frequently for consistent cut.",
    "Decontam thoroughly before correction; coating requires perfect prep.",
    "Customer handoff: demonstrate care guide to reduce comebacks.",
  ]);
  const [tipsChecked, setTipsChecked] = useState<boolean[]>([]);
  const [newTip, setNewTip] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Notify Admin form state
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("URGENT");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const location = useLocation();
  useEffect(() => {
    const cert = localStorage.getItem("employee_training_certified");
    if (cert) setCertifiedDate(cert);
    // Remove any legacy task data from persistent storage
    try { localStorage.removeItem("employee_tasks"); } catch {}
    // Load persisted pro tips and acknowledgements
    try {
      const saved = JSON.parse(localStorage.getItem("pro_tips") || "[]");
      const savedAck = JSON.parse(localStorage.getItem("pro_tips_ack") || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        setTips(saved.map(String));
        setTipsChecked(Array(saved.length).fill(false).map((_, i) => Boolean(savedAck[i])));
      } else {
        setTipsChecked(Array(tips.length).fill(false));
      }
    } catch {
      setTipsChecked(Array(tips.length).fill(false));
    }
    // If navigated with ?startExam=1, auto-open orientation and exam
    try {
      const params = new URLSearchParams(location.search);
      const startExam = params.get('startExam');
      if (startExam === '1' || startExam === 'true') {
        setOrientationOpen(true);
        setStartExamOnOpen(true);
      }
    } catch {}
  }, [location.search]);

  useEffect(() => {
    try { localStorage.setItem("pro_tips", JSON.stringify(tips)); } catch {}
  }, [tips]);

  useEffect(() => {
    try { localStorage.setItem("pro_tips_ack", JSON.stringify(tipsChecked)); } catch {}
  }, [tipsChecked]);

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

      // Attempt background email via local API (port 6061)
      try {
        await fetch("http://localhost:6061/api/email/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: actor, subject, message, priority, pdfDataUrl })
        });
      } catch {}

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
              <Button variant="secondary" onClick={() => setHelpOpen(true)}>Help</Button>
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

            {/* Orientation box (orange) */}
            <button type="button" onClick={() => setOrientationOpen(true)} className="block text-left">
              <Card className="p-6 bg-orange-600 text-white rounded-xl">
                <div className="text-2xl font-bold">ORIENTATION</div>
                <div className="text-sm opacity-90">Company overview • Policies • Getting started</div>
                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-orange-800 text-xs">New Employee</div>
              </Card>
            </button>

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
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-purple-600">Rick’s Pro Tips</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Add a new tip..." value={newTip} onChange={(e) => setNewTip(e.target.value)} />
              <Button className="bg-purple-700 hover:bg-purple-800" onClick={() => {
                const t = newTip.trim();
                if (!t) return;
                setTips(prev => [...prev, t]);
                setTipsChecked(prev => [...prev, false]);
                setNewTip("");
              }}>Add</Button>
            </div>
            <div className="space-y-3">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                  <Checkbox
                    checked={Boolean(tipsChecked[i])}
                    onCheckedChange={(v) => {
                      const next = [...tipsChecked];
                      next[i] = Boolean(v);
                      setTipsChecked(next);
                    }}
                  />
                  <div className="flex-1">
                    {editingIndex === i ? (
                      <div className="flex items-center gap-2">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                        <Button className="bg-purple-700 hover:bg-purple-800" onClick={() => {
                          const t = editValue.trim();
                          if (!t) { setEditingIndex(null); setEditValue(""); return; }
                          setTips(prev => prev.map((v, idx) => idx === i ? t : v));
                          setEditingIndex(null);
                          setEditValue("");
                        }}>Save</Button>
                        <Button variant="outline" onClick={() => { setEditingIndex(null); setEditValue(""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-foreground font-medium">{tip}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" title="Edit" onClick={() => { setEditingIndex(i); setEditValue(tip); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" title="Delete" onClick={() => setDeleteIndex(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">Mark when acknowledged.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Tip Confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tip will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
<AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => {
              if (deleteIndex === null) return;
              setTips(prev => prev.filter((_, idx) => idx !== deleteIndex));
              setTipsChecked(prev => prev.filter((_, idx) => idx !== deleteIndex));
              setDeleteIndex(null);
              toast({ title: 'Deleted', description: 'Tip removed.' });
            }}>Delete</AlertDialogAction>
</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role={(user?.role === 'admin') ? 'admin' : 'employee'} />
    </div>
  );
};

export default EmployeeDashboard;
