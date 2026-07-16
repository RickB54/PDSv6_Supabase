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
import RicksTipsModal from "@/components/chemicals/RicksTipsModal";

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
        await fetch("/api/email/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: actor, subject, message, priority, pdfDataUrl })
        });
      } catch { }

      // Open Gmail compose for reliability
      const body = `Priority: ${priority}\nEmployee: ${actor}\n\n${message}`;
      const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=Rick.PrimeAutoDetail@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

          {/* Unified Dashboard Grid (3 columns on Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <Link to="/service-checklist" className="block h-full">
              <Card className="p-6 bg-green-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">SERVICE CHECKLIST</div>
                <div className="text-sm opacity-90">Start Job • View Active Jobs</div>
              </Card>
            </Link>

            <Link to="/staff-schedule" className="block h-full">
              <Card className="p-6 bg-teal-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">WORK SCHEDULE</div>
                <div className="text-sm opacity-90">View your upcoming shifts and times.</div>
              </Card>
            </Link>

            <Link to="/training-manual" className="block text-left h-full">
              <Card className="p-6 bg-purple-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">PRIME TRAINING CENTER</div>
                <div className="text-sm opacity-90">Video Courses • SOPs • Certification</div>
              </Card>
            </Link>

            <Link to="/learning-library" className="block text-left h-full">
              <Card className="p-6 bg-indigo-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">LEARNING LIBRARY</div>
                <div className="text-sm opacity-90">Company knowledge base & resources.</div>
              </Card>
            </Link>

            <button type="button" onClick={() => setOrientationOpen(true)} className="block text-left h-full w-full">
              <Card className="p-6 bg-orange-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">ORIENTATION (EXAM)</div>
                <div className="text-sm opacity-90">Company overview • Policies • Final Exam</div>
              </Card>
            </button>

            <Link to="/services" className="block h-full">
              <Card className="p-6 bg-blue-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">VIEW WEBSITE</div>
                <div className="text-sm opacity-90">To view our current package pricelist.</div>
              </Card>
            </Link>

            <button type="button" onClick={() => setTipsOpen(true)} className="block text-left h-full w-full">
              <Card className="p-6 bg-purple-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">RICK’S TIPS</div>
                <div className="text-sm opacity-90">Quick professional reminders to reduce rework.</div>
              </Card>
            </button>

            <Link to="/team-chat" className="block h-full">
              <Card className="p-6 bg-green-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">APP TEAM CHAT</div>
                <div className="text-sm opacity-90">Communicate with your team in real-time.</div>
              </Card>
            </Link>

            <Link to="/sticky-notes" className="block h-full">
              <Card className="p-6 bg-yellow-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">STICKY NOTES</div>
                <div className="text-sm opacity-90">Your personal workspace for notes & lists.</div>
              </Card>
            </Link>

            <Link to="/chemicals" className="block h-full">
              <Card className="p-6 bg-cyan-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">CHEMICAL CARDS</div>
                <div className="text-sm opacity-90">Browse products, dilution ratios, and usage.</div>
              </Card>
            </Link>

            <button type="button" onClick={() => window.dispatchEvent(new Event('open-quick-pay'))} className="block text-left h-full w-full">
              <Card className="p-6 bg-emerald-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">QUICK PAY</div>
                <div className="text-sm opacity-90">Receive an in-person payment quickly.</div>
              </Card>
            </button>

            <Link to="/tasks" className="block h-full">
              <Card className="p-6 bg-amber-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">TODO LIST</div>
                <div className="text-sm opacity-90">View your assigned tasks and calendar.</div>
              </Card>
            </Link>

            <Link to="/search-customer?add=1" className="block h-full">
              <Card className="p-6 bg-blue-600 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">ADD CUSTOMER</div>
                <div className="text-sm opacity-90">Intake a brand new customer profile.</div>
              </Card>
            </Link>

            <Link to="/book-now" className="block h-full">
              <Card className="p-6 bg-indigo-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">NEW BOOKING</div>
                <div className="text-sm opacity-90">Schedule a new service appointment.</div>
              </Card>
            </Link>

            <Link to="/app-manual" className="block h-full">
              <Card className="p-6 bg-slate-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">APP MANUAL</div>
                <div className="text-sm opacity-90">Learn how to use the app effectively.</div>
              </Card>
            </Link>

            <Link to="/blog" className="block h-full">
              <Card className="p-6 bg-pink-700 text-white rounded-xl h-full transition-transform hover:scale-[1.02]">
                <div className="text-2xl font-bold">PRIME BLOG</div>
                <div className="text-sm opacity-90">Read the latest company updates and articles.</div>
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

      {/* Rick's Tips Modal */}
      <RicksTipsModal open={tipsOpen} onOpenChange={setTipsOpen} />
    </div>
  );
};

export default EmployeeDashboard;
