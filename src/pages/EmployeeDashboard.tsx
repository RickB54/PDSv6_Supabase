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
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import OrientationModal from "@/components/training/OrientationModal";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isDemoActive } from "@/lib/supa-data";
import { ADMIN_TRAINING_PHASES } from "@/lib/training-data";
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
import { MessageCircle, Send, Zap, Bell, CheckCircle2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TeamMessage, getTeamMessages, sendTeamMessage, deleteAllTeamMessages } from "@/lib/supa-data";

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
  helpTopicId,
  isSpecialNewBooking = false,
  infoTitle,
  infoContent
}: {
  title: string, desc: string, bgColor: string, href?: string, onClick?: () => void,
  helpTopicId?: string, isSpecialNewBooking?: boolean, infoTitle?: string, infoContent?: React.ReactNode
}) => {
  const content = (
    <Card className={`p-6 ${bgColor} text-white rounded-xl h-full transition-transform hover:scale-[1.02] relative group`}>
      <div className="text-2xl font-bold pr-8">{title}</div>
      <div className="text-sm opacity-90">{desc}</div>
      <div className="absolute top-4 right-4 z-10" onClick={e => e.preventDefault()}>
        <button onClick={(e) => { 
          e.preventDefault(); 
          e.stopPropagation(); 
          if (helpTopicId) window.dispatchEvent(new CustomEvent('open-help', { detail: helpTopicId })); 
        }} className="text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1 cursor-pointer">
          <Info className="w-5 h-5" />
        </button>
      </div>
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
  const [notifyAdminOpen, setNotifyAdminOpen] = useState(false);

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
  const [notifyTab, setNotifyTab] = useState<"standard" | "chat">("standard");

  // Live Chat state in Notify Admin modal
  const [chatMessages, setChatMessages] = useState<TeamMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [examUnlocked, setExamUnlocked] = useState(false);
  const [examStatusStr, setExamStatusStr] = useState("Not Started");
  const [trainingProgress, setTrainingProgress] = useState(0);

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

    const loadUserStats = async () => {
      if (!user?.id) return;
      
      if (isDemoActive()) {
         setExamUnlocked(true);
         setExamStatusStr(`Completed — Score: 98%`);
         setTrainingProgress(100);
         return;
      }

      // 1. Get user record for exam_unlocked
      const { data: uData } = await supabase.from('app_users').select('exam_unlocked').eq('id', user.id).maybeSingle();
      if (uData) setExamUnlocked(uData.exam_unlocked || false);
      
      // 2. Get exam progress
      const { data: exData } = await supabase.from('employee_training_progress')
         .select('status, score').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1);
      if (exData && exData.length > 0) {
         const prog = exData[0];
         if (prog.status === 'completed') {
            setExamStatusStr(`Completed — Score: ${Math.round((prog.score/50)*100)}%`);
         } else if (prog.status === 'started') {
            setExamStatusStr('In Progress');
         }
      }
      
      // 3. Get checklist progress
      const { data: clData } = await supabase.from('employee_training_progress_checklist')
         .select('completed').eq('employee_id', user.id);
      if (clData) {
         const completedCount = clData.filter((c:any) => c.completed).length;
         const total = ADMIN_TRAINING_PHASES.reduce((acc, p) => acc + p.items.length, 0);
         const pct = Math.round((completedCount / total) * 100) || 0;
         setTrainingProgress(pct);
      }
      // Listen for open-notify-admin events from anywhere in the application
      const handleOpenNotify = (e: any) => {
        if (e.detail?.subject) setSubject(e.detail.subject);
        if (e.detail?.message) setMessage(e.detail.message);
        if (e.detail?.mode === 'chat') setNotifyTab('chat');
        setNotifyAdminOpen(true);
      };
      window.addEventListener('open-notify-admin', handleOpenNotify);
      return () => window.removeEventListener('open-notify-admin', handleOpenNotify);
    };
    loadUserStats();
  }, [location.search, user?.id]);

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
      if (!isDemoActive()) {
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
      }

      toast({ title: "Sent", description: "Your message was prepared; PDF saved in File Manager." });
      setSubject(""); setMessage(""); setPriority("URGENT");
      setNotifyAdminOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Live chat fetch & send inside Notify Admin
  const loadChatMessages = async () => {
    setChatLoading(true);
    try {
      const msgs = await getTeamMessages();
      setChatMessages(msgs.slice(-20)); // Last 20 messages
    } catch (err) {
      console.error("Failed to load chat in notify modal", err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (notifyAdminOpen && notifyTab === 'chat') {
      loadChatMessages();
    }
  }, [notifyAdminOpen, notifyTab]);

  const handleSendLiveChat = async (textToSend?: string) => {
    const finalMsg = textToSend || chatText;
    if (!finalMsg.trim()) return;

    const actor = user?.name || user?.email || "Employee";
    const actorEmail = user?.email || "employee@primeautodetail.com";

    try {
      pushAdminAlert("employee_chat", `🚨 URGENT Employee Live Chat from ${actor}: ${finalMsg}`, actor, { priority: "URGENT" });
      await sendTeamMessage(`🚨 URGENT ADMIN ALERT: ${finalMsg}`, actorEmail, actor, null);
      setChatText("");
      toast({ title: "Urgent Alert Sent!", description: "Live Chat alert broadcasted directly to Admin." });
      loadChatMessages();
    } catch (err: any) {
      toast({ title: "Failed to send chat", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleClearChatInModal = async () => {
    if (!window.confirm("Are you sure you want to clean out all old chats? This will permanently delete chat history.")) return;
    try {
      await deleteAllTeamMessages();
      setChatMessages([]);
      localStorage.removeItem('has_unread_chat');
      toast({ title: "Chat Cleared", description: "All old chats have been permanently deleted." });
    } catch (err: any) {
      toast({ title: "Error Clearing Chat", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleEndConversationInModal = () => {
    if (!window.confirm("Are you sure you want to end this conversation? You will not receive any more alerts until a new chat is started.")) return;
    localStorage.setItem('chat_ended', 'true');
    localStorage.removeItem('has_unread_chat');
    setChatMessages([]);
    setNotifyAdminOpen(false);
    toast({ title: "Conversation Ended", description: "Chat has been ended and alerts disabled." });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Employee Dashboard" />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">
              {isDemoActive() ? "Employee Dashboard - Marcus Detailer" : "Employee Dashboard"}
            </h1>
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
              helpTopicId="dashboard-new-booking"
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
              helpTopicId="dashboard-service-checklist"
            />

            <DashboardTile 
              href="/staff-schedule" title="WORK SCHEDULE" desc="View your upcoming shifts and times." bgColor="bg-teal-700"
              helpTopicId="dashboard-work-schedule"
            />

            <DashboardTile 
              href="/training-manual" title="PRIME TRAINING CENTER" desc={`Progress: ${trainingProgress}% complete`} bgColor="bg-purple-700"
              helpTopicId="dashboard-prime-training-center"
            />

            <DashboardTile 
              href="/learning-library" title="LEARNING LIBRARY" desc="Company knowledge base & resources." bgColor="bg-indigo-600"
              helpTopicId="dashboard-learning-library"
            />

            {examUnlocked && (
              <DashboardTile 
                onClick={() => setOrientationOpen(true)} title="ORIENTATION (EXAM)" desc={examStatusStr} bgColor="bg-orange-600"
                helpTopicId="dashboard-orientation"
              />
            )}

            <DashboardTile 
              href="/services" title="VIEW WEBSITE" desc="To view our current package pricelist." bgColor="bg-blue-700"
              helpTopicId="dashboard-view-website"
            />

            <DashboardTile 
              onClick={() => setTipsOpen(true)} title="RICK’S TIPS" desc="Quick professional reminders to reduce rework." bgColor="bg-purple-700"
              helpTopicId="dashboard-pro-tips"
            />

            <DashboardTile 
              href="/team-chat" title="APP TEAM CHAT" desc="Communicate with your team in real-time." bgColor="bg-green-700"
              helpTopicId="dashboard-team-chat"
            />

            <DashboardTile 
              href="/sticky-notes" title="STICKY NOTES" desc="Your personal workspace for notes & lists." bgColor="bg-yellow-600"
              helpTopicId="dashboard-sticky-notes"
            />

            <DashboardTile 
              href="/chemicals" title="CHEMICAL CARDS" desc="Browse products, dilution ratios, and usage." bgColor="bg-cyan-700"
              helpTopicId="dashboard-chemical-cards"
            />

            <DashboardTile 
              onClick={() => window.dispatchEvent(new Event('open-quick-pay'))} title="QUICK PAY" desc="Receive an in-person payment quickly." bgColor="bg-emerald-600"
              helpTopicId="dashboard-quick-pay"
            />

            <DashboardTile 
              href="/tasks" title="TODO LIST" desc="View your assigned tasks and calendar." bgColor="bg-amber-600"
              helpTopicId="dashboard-todo-list"
            />

            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center mt-2">
              <div className="w-full md:w-1/2 lg:w-1/3">
                <DashboardTile 
                  onClick={() => setNotifyAdminOpen(true)} title="NOTIFY ADMIN" desc="Send an urgent message to management." bgColor="bg-red-700"
                  helpTopicId="dashboard-notify-admin"
                />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Notify Admin Modal */}
      <Dialog open={notifyAdminOpen} onOpenChange={setNotifyAdminOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black text-red-500 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500 animate-pulse" /> NOTIFY ADMIN
              </DialogTitle>
              
              {/* Popover Usage Guide */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer">
                    <HelpCircle className="w-4 h-4 text-blue-400" /> How to use
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-80 sm:w-96 bg-white border-slate-200 text-slate-900 p-5 shadow-2xl z-[100000] font-sans text-xs relative rounded-xl normal-case not-italic tracking-normal font-normal">
                  <PopoverClose className="absolute right-3.5 top-3.5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-500 hover:text-slate-900 cursor-pointer">
                    <X className="h-4 w-4" />
                  </PopoverClose>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 leading-tight pr-6">Employee Contact Guide</h4>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5 pb-2.5 border-b border-slate-100">Cheat Sheet</p>
                  </div>
                  
                  <div className="space-y-3.5 mt-3">
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">1. Phone Assistant Auto-Save</h5>
                        <p className="text-slate-600 leading-relaxed">When you click <strong>Save</strong> or <strong>Confirm & Go</strong> in the Phone Assistant, caller info, vehicle type, and package info are automatically formatted and pre-filled into this modal!</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">2. Urgent Live Chat (Immediate)</h5>
                        <p className="text-slate-600 leading-relaxed">Use for immediate needs like a customer standing in front of you ready to pay, or a live call waiting. Admin gets alerted instantly!</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">3. Standard Notification</h5>
                        <p className="text-slate-600 leading-relaxed">Use for general questions, profile update requests, or non-urgent scheduling notes for admin review.</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Sub-header instruction banner */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 mt-2 text-xs text-zinc-300 flex items-center justify-between">
              <span>Need to add a customer or receive payment?</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setNotifyTab(notifyTab === 'standard' ? 'chat' : 'standard')}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline p-0 h-auto"
              >
                {notifyTab === 'standard' ? 'Switch to ⚡ Urgent Live Chat' : 'Switch to Standard Message'}
              </Button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex gap-2 mt-3">
              <Button
                variant={notifyTab === 'standard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotifyTab('standard')}
                className={`flex-1 font-bold text-xs ${notifyTab === 'standard' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
              >
                Standard Notification
              </Button>
              <Button
                variant={notifyTab === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotifyTab('chat')}
                className={`flex-1 font-bold text-xs flex items-center justify-center gap-1.5 ${notifyTab === 'chat' ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'}`}
              >
                <Zap className="w-3.5 h-3.5" /> Urgent Live Chat (Immediate)
              </Button>
            </div>
          </DialogHeader>

          {notifyTab === 'standard' ? (
            <form onSubmit={handleNotifyAdmin} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Subject</label>
                  <Input placeholder="e.g. Schedule Change / Customer Payment Needed" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white z-[10000]">
                      <SelectItem value="URGENT">🔴 URGENT (Immediate Action Required)</SelectItem>
                      <SelectItem value="Normal">🟢 Normal Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Message Details</label>
                <Textarea placeholder="Explain what you need Admin to do..." value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[120px] bg-zinc-900 border-zinc-700 text-white mt-1" />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={sending} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6">
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 mt-2">
              {/* Quick Urgent Action Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-emerald-400 ml-1">Quick Urgent Presets (1-Click Broadcast)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendLiveChat("💳 CUSTOMER READY TO PAY! Customer is on-site/phone ready to settle payment for completed service.")}
                    className="bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold justify-start"
                  >
                    💳 Customer Ready to Pay Now!
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendLiveChat("📞 NEW CUSTOMER INQUIRY: Customer is on the line needing account setup & quote approval.")}
                    className="bg-blue-950/40 border-blue-500/40 hover:bg-blue-900/60 text-blue-300 text-xs font-bold justify-start"
                  >
                    📞 Phone Inquiry Waiting
                  </Button>
                </div>
              </div>

              {/* Chat Header Toolbar */}
              <div className="flex justify-between items-center px-1 pt-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Live Chat History</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChatInModal}
                    className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 font-bold flex items-center gap-1"
                    title="Delete All Old Chats"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Chat
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEndConversationInModal}
                    className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 font-bold flex items-center gap-1"
                    title="End Conversation & Disable Alerts"
                  >
                    <X className="w-3 h-3" /> End Chat
                  </Button>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 h-48 overflow-y-auto space-y-2 text-xs">
                {chatLoading ? (
                  <div className="text-zinc-500 text-center py-8">Loading chat history...</div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-zinc-500 text-center py-8">No recent messages. Type below to send live alert.</div>
                ) : (
                  chatMessages.map(m => (
                    <div key={m.id} className="bg-zinc-950 p-2 rounded border border-zinc-800/80">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-400 text-[11px]">{m.sender_name}</span>
                        <span className="text-[9px] text-zinc-500">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-zinc-200 text-xs">{m.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type urgent live message to Admin..."
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendLiveChat()}
                  className="bg-zinc-900 border-zinc-700 text-white flex-1"
                />
                <Button 
                  onClick={() => handleSendLiveChat()}
                  disabled={!chatText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Send className="w-4 h-4 mr-1" /> Send Live
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Orientation Modal */}
      <OrientationModal open={orientationOpen} onOpenChange={setOrientationOpen} startExamOnOpen={startExamOnOpen} />

      {/* Rick's Tips Modal */}
      <RicksTipsModal open={tipsOpen} onOpenChange={setTipsOpen} />
    </div>
  );
};

export default EmployeeDashboard;
