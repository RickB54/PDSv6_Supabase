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
import { Pencil, Trash2, HelpCircle, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const DashboardTile = ({
  title,
  desc,
  bgColor,
  href,
  onClick,
  infoTitle,
  infoContent,
  isSpecialNewBooking = false
}: {
  title: string, desc: string, bgColor: string, href?: string, onClick?: () => void,
  infoTitle: string, infoContent: React.ReactNode, isSpecialNewBooking?: boolean
}) => {
  const content = (
    <Card className={`p-6 ${bgColor} text-white rounded-xl h-full transition-transform hover:scale-[1.02] relative group`}>
      <div className="text-2xl font-bold pr-8">{title}</div>
      <div className="text-sm opacity-90">{desc}</div>
      {!isSpecialNewBooking && (
        <div className="absolute top-4 right-4 z-10" onClick={e => e.preventDefault()}>
          <Popover>
            <PopoverTrigger asChild>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1">
                <Info className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-zinc-900 border-zinc-700 text-white p-4 shadow-2xl z-50">
              <h4 className="font-bold text-lg mb-2 text-white">{infoTitle}</h4>
              <div className="text-sm text-zinc-300 space-y-2">{infoContent}</div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      {isSpecialNewBooking && (
        <div className="absolute top-4 right-4">
          <div className="bg-black/20 rounded-full p-1 text-white/80"><Info className="w-5 h-5" /></div>
        </div>
      )}
    </Card>
  );

  if (isSpecialNewBooking) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="block text-left h-full w-full outline-none">
            {content}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-zinc-900 border-zinc-700 text-white p-4 shadow-2xl z-50">
          <h4 className="font-bold text-lg mb-2 text-indigo-400">{infoTitle}</h4>
          <div className="text-sm text-zinc-300 space-y-2 mb-4">{infoContent}</div>
          <Link to="/services">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">Start Booking Flow</Button>
          </Link>
        </PopoverContent>
      </Popover>
    );
  }

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }

  return <button type="button" onClick={onClick} className="block text-left h-full w-full">{content}</button>;
};

const EmployeeDashboard = () => {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [certifiedDate, setCertifiedDate] = useState<string | null>(null);
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
                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'dashboard-overview' }))}
                title="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Unified Dashboard Grid (3 columns on Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <DashboardTile 
              isSpecialNewBooking={true}
              title="NEW BOOKING" desc="Schedule a new service appointment." bgColor="bg-indigo-700"
              infoTitle="How to Book a Customer"
              infoContent={
                <>
                  <ol className="list-decimal pl-5 space-y-2 mb-2">
                    <li><strong>Choose a Service:</strong> Select the package or detail service needed.</li>
                    <li><strong>Pick a Date & Time:</strong> Find an open slot on the calendar.</li>
                    <li><strong>Confirm Booking:</strong> Enter the customer's details (name, vehicle, contact) as if you were them.</li>
                  </ol>
                  <div className="bg-indigo-900/50 p-2 rounded text-xs text-indigo-200 border border-indigo-800/50">
                    <Info className="w-3 h-3 inline mr-1" />
                    When you book a customer while logged in, that customer will be automatically assigned to you and visible in your dashboard.
                  </div>
                </>
              }
            />

            <DashboardTile 
              href="/service-checklist" title="SERVICE CHECKLIST" desc="Start Job • View Active Jobs" bgColor="bg-green-700"
              infoTitle="Service Checklist" infoContent="Access standard operating procedures for active jobs to ensure all steps are followed correctly before returning the vehicle."
            />

            <DashboardTile 
              href="/staff-schedule" title="WORK SCHEDULE" desc="View your upcoming shifts and times." bgColor="bg-teal-700"
              infoTitle="Work Schedule" infoContent="View your assigned shifts, manage time-off requests, and see when you are scheduled to work this week."
            />

            <DashboardTile 
              href="/training-manual" title="PRIME TRAINING CENTER" desc="Video Courses • SOPs • Certification" bgColor="bg-purple-700"
              infoTitle="Prime Training Center" infoContent="Watch instructional videos, complete quizzes, and earn your detailing certifications through our internal training program."
            />

            <DashboardTile 
              href="/learning-library" title="LEARNING LIBRARY" desc="Company knowledge base & resources." bgColor="bg-indigo-600"
              infoTitle="Learning Library" infoContent="Access our archive of optional resources, past training materials, and company best-practices for continuous improvement."
            />

            <DashboardTile 
              onClick={() => setOrientationOpen(true)} title="ORIENTATION (EXAM)" desc="Company overview • Policies • Final Exam" bgColor="bg-orange-600"
              infoTitle="Orientation Exam" infoContent="Take the required onboarding exam to confirm your understanding of company policies and basic safety procedures."
            />

            <DashboardTile 
              href="/services" title="VIEW WEBSITE" desc="To view our current package pricelist." bgColor="bg-blue-700"
              infoTitle="View Website" infoContent="Browse the live Prime Auto Detail website exactly as a customer sees it to verify packages, prices, and public information."
            />

            <DashboardTile 
              onClick={() => setTipsOpen(true)} title="RICK’S TIPS" desc="Quick professional reminders to reduce rework." bgColor="bg-purple-700"
              infoTitle="Rick's Tips" infoContent="Read quick, expert advice directly from Rick to avoid common detailing mistakes and improve your efficiency on the floor."
            />

            <DashboardTile 
              href="/team-chat" title="APP TEAM CHAT" desc="Communicate with your team in real-time." bgColor="bg-green-700"
              infoTitle="App Team Chat" infoContent="Send and receive instant messages with other employees and admins to ask questions or coordinate tasks."
            />

            <DashboardTile 
              href="/sticky-notes" title="STICKY NOTES" desc="Your personal workspace for notes & lists." bgColor="bg-yellow-600"
              infoTitle="Sticky Notes" infoContent="Create and manage your own private digital sticky notes. Use this to keep track of reminders or personal to-do items."
            />

            <DashboardTile 
              href="/chemicals" title="CHEMICAL CARDS" desc="Browse products, dilution ratios, and usage." bgColor="bg-cyan-700"
              infoTitle="Chemical Cards" infoContent="Search our chemical inventory to find the exact dilution ratio and intended use-case for any product in the shop."
            />

            <DashboardTile 
              onClick={() => window.dispatchEvent(new Event('open-quick-pay'))} title="QUICK PAY" desc="Receive an in-person payment quickly." bgColor="bg-emerald-600"
              infoTitle="Quick Pay" infoContent="Process an immediate, in-person credit card payment for a walk-in customer or an ad-hoc service addition."
            />

            <DashboardTile 
              href="/tasks" title="TODO LIST" desc="View your assigned tasks and calendar." bgColor="bg-amber-600"
              infoTitle="Todo List" infoContent="See a calendar and list view of all specific tasks assigned directly to you by the management team."
            />

            <DashboardTile 
              href="/app-manual" title="APP MANUAL" desc="Learn how to use the app effectively." bgColor="bg-slate-700"
              infoTitle="App Manual" infoContent="Open the full documentation guide for the Prime Auto Detail internal application to learn how every feature works."
            />

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
