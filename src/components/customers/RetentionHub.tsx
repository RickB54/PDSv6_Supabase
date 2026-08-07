import { useState, useEffect } from "react";
import { Customer, supabase, getSupabaseEstimates } from "@/lib/supa-data";
import { useBookingsStore } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { useFollowUpStore } from "@/store/followup";
import { onSendReminderEmail, onSendProspectEmail, onSendProspectEstimateEmail, uploadToFileManager, CLIENT_CAMPAIGNS, PROSPECT_CAMPAIGNS } from "@/lib/bookingsSync";
import { format, differenceInDays, addMonths, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Send, Zap, Clock, ExternalLink, MessageSquare, TicketPercent, ShieldCheck, Info, Eye, AlertCircle, Sparkles, FileText, FileBarChart, Mail, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import jsPDF from "jspdf";

interface Props {
  customer: Customer;
  onRefresh?: () => void;
  onOpenEstimate?: () => void;
  refreshTrigger?: number;
}

export function RetentionHub({ customer, onRefresh, onOpenEstimate, refreshTrigger }: Props) {
  const { items: allBookings } = useBookingsStore();
  const { items: allCoupons, refresh: refreshCoupons } = useCouponsStore();
  const { addLog } = useFollowUpStore();

  const [activeSubTab, setActiveSubTab] = useState<"timeline" | "send">("timeline");
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loadingEngs, setLoadingEngs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Custom Outreach Modes
  const [outreachType, setOutreachType] = useState<"campaign" | "letter" | "estimate">("campaign");
  const [customSubject, setCustomSubject] = useState("A Personal Note from Prime Auto Detail");
  
  // Custom Estimates State
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [loadingEstimates, setLoadingEstimates] = useState(false);

  const [outreachNote, setOutreachNote] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [outreachCouponId, setOutreachCouponId] = useState("");
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bccMe, setBccMe] = useState(true);

  const isProspect = customer.type === 'prospect';

  useEffect(() => {
    if (customer.email || customer.id) {
      refreshCoupons();
      fetchEngagements();
    }
  }, [customer.email, customer.id, customer.notes, refreshTrigger]);

  useEffect(() => {
    if (customer.id) {
      fetchCustomerEstimates();
    }
  }, [customer.id]);

  const fetchCustomerEstimates = async () => {
    setLoadingEstimates(true);
    try {
      const allEsts = await getSupabaseEstimates();
      const filtered = allEsts.filter((e: any) => e.customerId === customer.id);
      setEstimates(filtered);
    } catch (e) {
      console.warn("Could not fetch customer estimates", e);
    } finally {
      setLoadingEstimates(false);
    }
  };

  const relatedBookings = allBookings
    .filter(b => {
      if (customer.id) return b.customerId === customer.id;
      return (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
             (b.customer?.toLowerCase() === customer.name?.toLowerCase());
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestBooking = relatedBookings[0];

  const fetchEngagements = async () => {
    setLoadingEngs(true);
    try {
      let combinedData: any[] = [];
      
      // 1. Get from manual activity_log field if present
      const activityLog = (customer as any).activity_log || (customer as any).activityLog || [];
      activityLog.forEach((log: any) => {
        combinedData.push({
          id: log.id || `activity_${log.timestamp || log.created_at || Date.now()}`,
          created_at: log.created_at || new Date().toISOString(),
          timestamp: log.timestamp || log.created_at || new Date().toISOString(),
          customer_name: customer.name,
          customer_email: customer.email,
          type: log.type || 'activity',
          note: log.note || log.text || 'Manual CRM Interaction logged',
          source: 'CRM Activity Log'
        });
      });

      // 2. Dynamically pull Customer Profile internal notes as a correspondence event
      if (customer.notes && customer.notes.trim()) {
        combinedData.push({
          id: `profile_note_${customer.id}`,
          created_at: customer.updated_at || customer.created_at || new Date().toISOString(),
          customer_name: customer.name,
          customer_email: customer.email,
          type: 'profile_note',
          note: `${customer.notes}`,
          source: 'Profile Internal Notes'
        });
      }

      // 3. Dynamically pull Booking Appointment notes as correspondence events
      relatedBookings.forEach((b: any) => {
        if (b.notes && b.notes.trim()) {
          combinedData.push({
            id: `booking_note_${b.id}`,
            created_at: b.created_at || b.createdAt || b.date || new Date().toISOString(),
            timestamp: b.date || b.created_at || new Date().toISOString(),
            customer_name: customer.name,
            customer_email: customer.email,
            type: 'booking_note',
            note: `Appointment Note (${b.title}): ${b.notes}`,
            source: `Booking System`
          });
        }
      });

      // 4. Get from engagements table (letters, estimates, Resend automated emails)
      if (customer.id) {
        const { data, error } = await supabase
          .from('engagements')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          data.forEach((eng: any) => {
            let src = 'Engagement Table';
            if (eng.type === 'letter') src = 'Letter Maker';
            else if (eng.type === 'email') src = 'Automated Email';
            else if (eng.type === 'estimate') src = 'Estimate Module';
            else if (eng.type === 'retention') src = 'Outreach Campaign';
            
            combinedData.push({
              ...eng,
              source: src
            });
          });
        }
      } else if (customer.email || customer.name) {
        const { data, error } = await supabase
          .from('engagements')
          .select('*')
          .or(`customer_email.eq.${customer.email},customer_name.eq.${customer.name}`)
          .order('created_at', { ascending: false });
        
        if (data) {
          data.forEach((eng: any) => {
            let src = 'Engagement Table';
            if (eng.type === 'letter') src = 'Letter Maker';
            else if (eng.type === 'email') src = 'Automated Email';
            else if (eng.type === 'estimate') src = 'Estimate Module';
            else if (eng.type === 'retention') src = 'Outreach Campaign';
            
            combinedData.push({
              ...eng,
              source: src
            });
          });
        }
      }

      // De-duplicate items by exact date/note combination to avoid duplicates
      const uniqueData: any[] = [];
      const seen = new Set<string>();
      combinedData.forEach(item => {
        const key = `${item.created_at}_${item.note}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(item);
        }
      });

      // Sort combined data by date (newest first)
      uniqueData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setEngagements(uniqueData);
    } catch (e) {
      console.warn("Could not fetch engagements", e);
      const log = (customer as any).activity_log || (customer as any).activityLog || [];
      setEngagements(log);
    } finally {
      setLoadingEngs(false);
    }
  };

  const handleDeleteEngagement = async (eng: any) => {
    if (!confirm("Remove this engagement entry?")) return;
    try {
      if (eng.id && !eng.id.startsWith("activity_") && !eng.id.startsWith("profile_note_") && !eng.id.startsWith("booking_note_")) {
        const { error } = await supabase.from('engagements').delete().eq('id', eng.id);
        if (error) throw error;
      }

      if ((customer as any).activity_log) {
        (customer as any).activity_log = (customer as any).activity_log.filter((a: any) => a.id !== eng.id && a.created_at !== eng.created_at);
      }
      if ((customer as any).activityLog) {
        (customer as any).activityLog = (customer as any).activityLog.filter((a: any) => a.id !== eng.id && a.created_at !== eng.created_at);
      }

      setEngagements(prev => prev.filter(item => item.id !== eng.id));
      toast.success("Engagement log removed");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error("Failed to delete", { description: e.message });
    }
  };

  const getRetentionStatus = () => {
    if (isProspect) return { label: "New Lead", color: "text-purple-400", bg: "bg-purple-500/10", icon: <Zap className="h-3.5 w-3.5 text-purple-400" /> };
    if (!latestBooking || !latestBooking.date) return { label: "Cold Lead", color: "text-zinc-500", bg: "bg-zinc-500/10", icon: <Clock className="h-3.5 w-3.5 text-zinc-500" /> };

    try {
      const lastDate = new Date(latestBooking.date);
      if (isNaN(lastDate.getTime())) throw new Error("Invalid Date");
      
      const freq = latestBooking.reminderFrequency || 6;
      const dueDate = addMonths(lastDate, freq);
      const isDue = isBefore(dueDate, new Date());
      const daysDiff = differenceInDays(dueDate, new Date());

      if (isDue) return { label: "Retention Due", color: "text-red-500", bg: "bg-red-500/10", icon: <Zap className="h-3.5 w-3.5 text-red-500 animate-pulse" />, sub: `${Math.abs(daysDiff)} days overdue` };
      return { label: "Active Client", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />, sub: `${daysDiff} days until refresh` };
    } catch (e) {
      return { label: "Data Incomplete", color: "text-zinc-500", bg: "bg-zinc-500/10", icon: <Info className="h-3.5 w-3.5 text-zinc-500" /> };
    }
  };

  const status = getRetentionStatus();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let draft = "";
      if (outreachType === "letter") {
        draft = `Dear ${customer.name},\n\nWe appreciate you choosing Prime Auto Detail for your automotive care needs. Our primary objective is to guarantee that your vehicle maintains its premium protection, extreme shine, and pristine interior condition.\n\nWe wanted to write this personal note to thank you for your support and offer our professional assistance. Whether you need a seasonal paint refresh, an interior deep clean, or an advanced ceramic coating checkup, we are here to deliver a flawless result.\n\nPlease let us know if we can set up an appointment that fits into your schedule perfectly.\n\nSincerely,\nRick Berube`;
      } else if (isProspect) {
        draft = `Hi ${customer.name},\n\nThank you for your interest in Prime Auto Detail! We pride ourselves on delivering a showroom-quality finish and absolute protection. I'd love to discuss how our signature detailing and ceramic protection packages can keep your vehicle looking its absolute best.\n\nAre you looking for an interior refresh, exterior protection, or a full detail?`;
      } else {
        const lastService = latestBooking?.title || "your last service";
        draft = `Hi ${customer.name},\n\nIt's been a while since your ${lastService} with us, and we wanted to check in to see how your vehicle is looking! Regular maintenance is key to preserving that showroom shine. We'd love to have you back in for a refresh to keep everything protected.\n\nLet me know if you'd like to get something on the schedule!`;
      }
      setOutreachNote(draft);
      setIsGenerating(false);
      toast.info("AI Draft Generated", { description: "You can now edit this message." });
    }, 500);
  };

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const campaigns = isProspect ? PROSPECT_CAMPAIGNS : CLIENT_CAMPAIGNS;
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setOutreachNote(campaign.defaultText);
      if (campaign.suggestedIncentive) {
        setIncludeDiscount(true);
        if (!outreachCouponId) {
          const activeCoupons = allCoupons.filter(c => c.active);
          if (activeCoupons.length > 0) {
            setOutreachCouponId(activeCoupons[0].id);
          }
        }
      }
      toast.info(`Campaign Loaded: ${campaign.name}`);
    }
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    if (dStr.includes('-')) {
      const parts = dStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
      }
    }
    return dStr;
  };

  const handleSendOutreach = async () => {
    setIsSending(true);
    try {
      const activeCoupons = allCoupons.filter(c => c.active);
      const coupon = activeCoupons.find(c => c.id === outreachCouponId);
      const discountLabel = coupon ? (coupon.percent ? `${coupon.percent}% OFF` : `$${coupon.amount} OFF`) : undefined;

      if (outreachType === "estimate") {
        const estObj = estimates.find(e => e.id === selectedEstimateId);
        if (!estObj) throw new Error("Please select an estimate first.");
        
        await onSendProspectEstimateEmail(customer, estObj);
        
        toast.success("Estimate Dispatched", { description: `Estimate #${estObj.estimateNumber} sent to ${customer.name}.` });
        setSelectedEstimateId("");
        setShowPreview(false);
        fetchEngagements();
        if (onRefresh) onRefresh();
        return;
      }

      if (outreachType === "letter") {
        const doc = new jsPDF();
        const year = new Date().getFullYear();
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        
        doc.setFontSize(18);
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.text("Prime Auto Detail", 20, 20);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text("54 Boston Street, Methuen MA 01844", 20, 25);
        doc.text("Rick.PrimeAutoDetail@gmail.com | 978-566-1008", 20, 30);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, 190, 35);
        
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.setFont(undefined, 'bold');
        doc.text(`To: ${customer.name}`, 20, 52);
        if (customer.email) doc.text(`Email: ${customer.email}`, 20, 57);
        
        doc.setFontSize(11);
        doc.text(`Subject: ${customSubject}`, 20, 67);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        const cleanBody = outreachNote.replace(/[^\x00-\x7F]/g, "").trim();
        const bodyLines = doc.splitTextToSize(cleanBody, 170);
        doc.text(bodyLines, 20, 77);
        
        let currentY = 77 + (bodyLines.length * 5) + 15;
        
        if (includeDiscount && coupon) {
          doc.setFont(undefined, 'bold');
          doc.text(`LOYALTY OFFER INCLUDED: ${discountLabel || 'Special Discount'}`, 20, currentY);
          doc.setFont(undefined, 'normal');
          doc.text(`USE CODE: ${coupon.code}`, 20, currentY + 5);
          currentY += 15;
        }
        
        doc.text("Sincerely,", 20, currentY);
        doc.setFont(undefined, 'bold');
        doc.text("Rick Berube", 20, currentY + 6);
        doc.setFont(undefined, 'normal');
        doc.text("Prime Auto Detail Team", 20, currentY + 11);
        
        const pdfDataUrl = doc.output('dataurlstring');
        const pdfFileName = `LETTER_${customer.name.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        
        await uploadToFileManager(pdfDataUrl, `Outreach Letters/${year}/${monthName}/`, { customer: customer.name, date: new Date().toISOString() } as any, {
          service: "Outreach Letter",
          silent: true
        });

        const letterHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 35px 20px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Prime Auto Detail</h1>
              <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Professional Detailing Solutions</p>
            </div>
            <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 15px;">
              <p>Hi <strong>${customer.name}</strong>,</p>
              <div style="margin: 20px 0; line-height: 1.7; white-space: pre-wrap; font-size: 15px; color: #374151;">
                ${outreachNote.replace(/\n/g, '<br/>')}
              </div>
              ${includeDiscount && coupon ? `
                <div style="background: linear-gradient(to right, #fdf2f2, #fff); border: 2px dashed #f87171; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                  <p style="margin: 0; color: #991b1b; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Special Loyalty Offer</p>
                  <h2 style="margin: 10px 0; color: #dc2626; font-size: 28px; font-weight: 900;">${discountLabel || 'SPECIAL OFFER'}</h2>
                  <div style="display: inline-block; background-color: #ffffff; border: 1px solid #fee2e2; padding: 8px 20px; border-radius: 6px; font-family: monospace; font-size: 20px; font-weight: bold; color: #b91c1c;">
                    ${coupon.code}
                  </div>
                </div>
              ` : ''}
              <p style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 25px; color: #4b5563;">
                Sincerely,<br/>
                <strong style="color: #111827;">Rick Berube</strong><br/>
                Prime Auto Detail Team<br/>
                <span style="font-size: 13px; color: #9ca3af;">Methuen, MA | 978-566-1008</span>
              </p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} Prime Auto Detail. All rights reserved.
            </div>
          </div>
        `;

        await supabase.from('engagements').insert({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_id: customer.id,
          type: 'letter',
          note: `Custom Letter Sent: "${customSubject}"`,
          coupon_code: includeDiscount ? coupon?.code : undefined
        });

        const { error } = await supabase.functions.invoke('send-booking-email', {
          body: {
            to: customer.email,
            bcc: bccMe ? "rick.primeautodetail@gmail.com" : undefined,
            subject: customSubject,
            customerName: customer.name,
            service: "Correspondence",
            html: letterHtml,
            type: 'retention'
          }
        });

        if (error) throw error;

        toast.success("Letter Dispatched", { description: `Custom letter has been successfully emailed to ${customer.name}.` });
        
        setOutreachNote("");
        setIncludeDiscount(false);
        setOutreachCouponId("");
        setShowPreview(false);
        fetchEngagements();
        if (onRefresh) onRefresh();
        return;
      }

      if (isProspect) {
        await onSendProspectEmail(customer, {
          customNote: outreachNote.trim() || undefined,
          couponCode: includeDiscount ? coupon?.code : undefined,
          discountLabel: includeDiscount ? discountLabel : undefined,
          bccMe: bccMe
        });

        addLog({
          id: `log_p_${Date.now()}`,
          customerName: customer.name,
          customerEmail: customer.email || "",
          dateSent: new Date().toISOString(),
          frequency: "Manual Lead Outreach",
          emailType: "prospect_intro",
          customNote: outreachNote.trim() || undefined,
          couponCode: includeDiscount ? coupon?.code : undefined
        });
      } else {
        if (latestBooking) {
          await onSendReminderEmail(latestBooking, "Manual Outreach", {
            customNote: outreachNote.trim() || undefined,
            couponCode: includeDiscount ? coupon?.code : undefined,
            discountLabel: includeDiscount ? discountLabel : undefined,
            bccMe: bccMe
          });
        } else {
          await onSendProspectEmail(customer, {
            customNote: outreachNote.trim() || "Thank you for choosing Prime. We'd love to see you again!",
            couponCode: includeDiscount ? coupon?.code : undefined,
            discountLabel: includeDiscount ? discountLabel : undefined,
            bccMe: bccMe
          });
        }

        addLog({
          id: `log_c_${Date.now()}`,
          customerName: customer.name,
          customerEmail: customer.email || "",
          dateSent: new Date().toISOString(),
          frequency: "Manual Outreach",
          emailType: "maintenance_reminder",
          customNote: outreachNote.trim() || undefined,
          couponCode: includeDiscount ? coupon?.code : undefined
        });
      }

      toast.success("Engagement Dispatched", { description: `Message sent to ${customer.name}.` });
      
      setOutreachNote("");
      setSelectedCampaignId("");
      setIncludeDiscount(false);
      setOutreachCouponId("");
      setShowPreview(false);
      fetchEngagements();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error("Dispatch Failed", { description: e.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Dynamic Status Header */}
      <div className={cn("p-4 border-b border-zinc-800 flex items-center justify-between gap-4", status.bg)}>
         <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
               {status.icon}
            </div>
            <div>
               <h4 className={cn("text-xs font-black uppercase tracking-widest", status.color)}>{status.label}</h4>
               {status.sub && <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{status.sub}</p>}
            </div>
         </div>
         <Button 
           variant="ghost" 
           size="icon" 
           onClick={fetchEngagements} 
           disabled={loadingEngs}
           className="h-7 w-7 text-zinc-400 hover:text-white rounded-full"
           title="Sync correspondence history"
         >
           <RefreshCw className={cn("h-3.5 w-3.5", loadingEngs && "animate-spin")} />
         </Button>
      </div>

      {/* Tabs list for simplified navigation */}
      <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b border-zinc-800/80 bg-zinc-950">
          <TabsList className="bg-transparent border-none p-0 h-10 gap-6 flex">
            <TabsTrigger 
              value="timeline" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-10 px-0 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <History className="h-3 w-3 mr-1.5" /> Unified Timeline ({engagements.length})
            </TabsTrigger>
            <TabsTrigger 
              value="send" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none h-10 px-0 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <Send className="h-3 w-3 mr-1.5" /> Send Message
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-zinc-950/20">
          
          {/* TAB 1: UNIFIED TIMELINE */}
          <TabsContent value="timeline" className="m-0 space-y-3 outline-none">
            {loadingEngs && (
              <div className="text-[10px] text-zinc-500 italic p-8 text-center flex items-center justify-center gap-2">
                <Clock className="h-3.5 w-3.5 animate-spin" /> Gathering all correspondence logs...
              </div>
            )}
            
            {!loadingEngs && engagements.length === 0 && (
              <div className="text-center p-8 border border-dashed border-zinc-900 rounded-xl space-y-2">
                <p className="text-[10px] text-zinc-500 italic">No correspondence records or notes found.</p>
                <p className="text-[9px] text-zinc-600 uppercase font-black">Generate a letter or send an outreach to start this timeline.</p>
              </div>
            )}

            {!loadingEngs && engagements.map((eng, idx) => (
              <div 
                key={eng.id || idx} 
                className="p-3.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl space-y-2 transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-800 text-[8px] font-black uppercase border-none text-zinc-400 px-1.5 py-0">
                      {eng.source || 'Engagement'}
                    </Badge>
                    <div className="flex flex-wrap items-center gap-x-2 text-[9px]">
                      <span className="text-zinc-300 font-bold">
                        {format(new Date(eng.timestamp || eng.created_at), 'MMM dd, yyyy · p')}
                      </span>
                      {eng.created_at && eng.timestamp && Math.abs(new Date(eng.created_at).getTime() - new Date(eng.timestamp).getTime()) > 60000 && (
                        <span className="text-zinc-500 font-medium">
                          (Logged: {format(new Date(eng.created_at), 'MMM dd, yyyy · p')})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {eng.coupon_code && (
                      <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 rounded border border-emerald-500/10">
                        {eng.coupon_code}
                      </span>
                    )}
                    {(!eng.id || (!eng.id.startsWith("profile_note_") && !eng.id.startsWith("booking_note_"))) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteEngagement(eng)}
                        title="Delete engagement log"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {eng.note || eng.text}
                </p>
              </div>
            ))}
          </TabsContent>

          {/* TAB 2: SEND MESSAGE */}
          <TabsContent value="send" className="m-0 space-y-4 outline-none">
            {/* Outreach Type Selector */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => { setOutreachType("campaign"); setOutreachNote(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                  outreachType === "campaign" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Mail className="h-3 w-3" /> Campaign
              </button>
              <button
                type="button"
                onClick={() => { setOutreachType("letter"); setOutreachNote(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                  outreachType === "letter" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <FileText className="h-3 w-3" /> Custom Letter
              </button>
              <button
                type="button"
                onClick={() => { setOutreachType("estimate"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                  outreachType === "estimate" ? "bg-emerald-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <FileBarChart className="h-3 w-3" /> Send Estimate
              </button>
            </div>

            {/* Campaign Selection */}
            {outreachType === "campaign" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Select Campaign Template</label>
                  <Select value={selectedCampaignId} onValueChange={handleCampaignChange}>
                    <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-[10px] uppercase font-bold rounded-lg">
                      <SelectValue placeholder="CHOOSE CAMPAIGN..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {(isProspect ? PROSPECT_CAMPAIGNS : CLIENT_CAMPAIGNS).map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold uppercase">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Custom Letter Subject */}
            {outreachType === "letter" && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Letter Subject</label>
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 h-9 text-xs rounded-lg text-white"
                  placeholder="Enter email subject line..."
                />
              </div>
            )}

            {/* Estimate Selector */}
            {outreachType === "estimate" && (
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Choose Customer Estimate</label>
                {loadingEstimates ? (
                  <div className="h-9 bg-zinc-900 border border-zinc-800 text-[10px] rounded-lg flex items-center justify-center animate-pulse text-zinc-500">
                    Loading estimates...
                  </div>
                ) : estimates.length === 0 ? (
                  <div className="p-4 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl text-center space-y-2">
                    <p className="text-[10px] text-zinc-500 italic">No estimates found for this profile.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onOpenEstimate) onOpenEstimate();
                        else window.open(`/estimates?customerId=${customer.id}`, '_blank');
                      }}
                      className="h-7 text-[9px] font-black uppercase bg-zinc-900 border-zinc-800 text-zinc-400"
                    >
                      New Estimate {onOpenEstimate ? <FileBarChart className="h-3 w-3 ml-1" /> : <ExternalLink className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedEstimateId} onValueChange={setSelectedEstimateId}>
                    <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-[10px] font-bold uppercase rounded-lg">
                      <SelectValue placeholder="SELECT AN ESTIMATE..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {estimates.map((e) => (
                        <SelectItem key={e.id} value={e.id!} className="text-[10px] font-bold">
                          Estimate #{e.estimateNumber} — ${(e.total || 0).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedEstimateId && (
                  (() => {
                    const est = estimates.find(e => e.id === selectedEstimateId);
                    if (!est) return null;
                    return (
                      <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-emerald-400">Estimate #{est.estimateNumber}</span>
                          <span className="text-zinc-400">${(est.total || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 truncate">Vehicle: {est.vehicle}</p>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Note/Draft Textarea */}
            {outreachType !== "estimate" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Message Draft</label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={generateAIDraft}
                    disabled={isGenerating}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 rounded"
                  >
                    <Sparkles className="w-3 h-3 mr-1" /> AI Auto-Draft
                  </Button>
                </div>
                <Textarea 
                  placeholder="Draft your personalized message here..."
                  value={outreachNote}
                  onChange={(e) => setOutreachNote(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 min-h-[120px] text-xs rounded-lg placeholder:text-zinc-700 resize-none w-full"
                />
              </div>
            )}

            {/* Coupon Incentive */}
            {outreachType !== "estimate" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-900">
                  <div className="flex items-center gap-2">
                    <TicketPercent className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[9px] font-black uppercase text-zinc-300">Add Loyalty Reward?</span>
                  </div>
                  <Switch checked={includeDiscount} onCheckedChange={setIncludeDiscount} className="scale-75 data-[state=checked]:bg-blue-600" />
                </div>

                {includeDiscount && (
                  <Select value={outreachCouponId} onValueChange={setOutreachCouponId}>
                    <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-[10px] font-bold uppercase rounded-lg">
                      <SelectValue placeholder="SELECT COUPON CODE..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {allCoupons.filter(c => c.active).length > 0 ? (
                        allCoupons.filter(c => c.active).map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold uppercase">
                            {c.code} — {c.percent ? `${c.percent}% OFF` : `$${c.amount} OFF`}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-[10px] text-zinc-500 italic text-center">No active coupons found</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Dispatch Buttons */}
            <div className="pt-2">
              {outreachType === "estimate" ? (
                <Button 
                  disabled={isSending || !customer.email || !selectedEstimateId}
                  onClick={handleSendOutreach}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                >
                  Send Estimate Email
                </Button>
              ) : (
                <Button 
                  disabled={isSending || !customer.email || !outreachNote.trim()}
                  onClick={() => setShowPreview(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Review & Send
                </Button>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {!customer.email && (
        <div className="p-3 bg-amber-500/5 border-t border-amber-500/10 flex items-center gap-2">
           <Info className="h-4 w-4 text-amber-500 shrink-0" />
           <p className="text-[9px] text-amber-400 font-bold uppercase leading-normal">
             CRM Hub requires customer email to send out message correspondence.
           </p>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-xl w-[90vw] bg-zinc-950 border-zinc-800 text-white rounded-2xl overflow-hidden p-0">
           <DialogHeader className="p-5 bg-zinc-900 border-b border-zinc-800">
              <DialogTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-400" /> Final Message Review
              </DialogTitle>
              <DialogDescription className="text-[9px] text-zinc-500 font-black uppercase">
                Sending outreach email to {customer.name}
              </DialogDescription>
           </DialogHeader>

           <div className="p-5 space-y-4">
              <div className="space-y-3">
                 {outreachType === "letter" && (
                   <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-zinc-500">Letter Subject</label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-9 text-xs rounded-lg text-white"
                      />
                   </div>
                 )}

                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Message Content</label>
                    <Textarea 
                      value={outreachNote}
                      onChange={(e) => setOutreachNote(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 min-h-[140px] text-xs rounded-lg"
                    />
                 </div>

                 <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400">
                       <span>Recipient:</span>
                       <span className="text-zinc-200">{customer.name}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400">
                       <span>Email:</span>
                       <span className="text-zinc-200">{customer.email}</span>
                    </div>
                    <div className="h-px bg-zinc-800/80 my-1.5" />
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                         <MessageSquare className="h-3 w-3 text-indigo-400" /> BCC Rick's Gmail?
                       </span>
                       <Switch checked={bccMe} onCheckedChange={setBccMe} className="scale-75 data-[state=checked]:bg-indigo-600" />
                    </div>
                 </div>
              </div>
           </div>

           <DialogFooter className="p-4 bg-zinc-900/50 border-t border-zinc-800 gap-2 flex flex-col sm:flex-row">
              <Button variant="ghost" onClick={() => setShowPreview(false)} className="h-9 text-xs uppercase font-bold text-zinc-400">
                Cancel
              </Button>
              <Button 
                onClick={handleSendOutreach}
                disabled={isSending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-wider h-9 px-6 rounded-lg ml-auto"
              >
                {isSending ? "Sending Message..." : "Send Email Now"}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
