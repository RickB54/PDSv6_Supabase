import { useState, useEffect } from "react";
import { Customer, supabase, getSupabaseEstimates } from "@/lib/supa-data";
import { useBookingsStore, Booking } from "@/store/bookings";
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
import { History, Send, Zap, Clock, ExternalLink, MessageSquare, TicketPercent, Star, ShieldCheck, Activity, Info, Eye, AlertCircle, Sparkles, Wand2, ArrowRight, CheckCircle2, PhoneIncoming, PhoneOutgoing, Mail, StickyNote, Trash2, FileText, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import jsPDF from "jspdf";

interface Props {
  customer: Customer;
  onRefresh?: () => void;
}

export function RetentionHub({ customer, onRefresh }: Props) {
  const { items: allBookings } = useBookingsStore();
  const { items: allCoupons, refresh: refreshCoupons } = useCouponsStore();
  const { addLog } = useFollowUpStore();

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
    if (customer.email) {
      refreshCoupons();
      fetchEngagements();
    }
  }, [customer.email, customer.id]);

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

  const fetchEngagements = async () => {
    setLoadingEngs(true);
    try {
      let combinedData: any[] = [];
      
      // 1. Get from activity_log field if present
      const activityLog = (customer as any).activity_log || (customer as any).activityLog || [];
      combinedData = [...activityLog];

      // 2. Try to get from engagements table (legacy/automated)
      if (customer.email || customer.name) {
        const { data, error } = await supabase
          .from('engagements')
          .select('*')
          .or(`customer_email.eq.${customer.email},customer_name.eq.${customer.name}`)
          .order('created_at', { ascending: false });
        
        if (data) {
          combinedData = [...combinedData, ...data];
        }
      }

      // Sort combined data by date
      combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setEngagements(combinedData);
    } catch (e) {
      console.warn("Could not fetch engagements", e);
      const log = (customer as any).activity_log || (customer as any).activityLog || [];
      setEngagements(log);
    } finally {
      setLoadingEngs(false);
    }
  };

  const relatedBookings = allBookings
    .filter(b => 
      (b.customerId === customer.id) || 
      (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
      (b.customer?.toLowerCase() === customer.name?.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestBooking = relatedBookings[0];

  const getRetentionStatus = () => {
    if (isProspect) return { label: "New Lead", color: "text-purple-400", bg: "bg-purple-500/10", icon: <Activity className="h-3 w-3 text-purple-400" /> };
    if (!latestBooking || !latestBooking.date) return { label: "Cold Record", color: "text-zinc-500", bg: "bg-zinc-500/10", icon: <Clock className="h-3 w-3 text-zinc-500" /> };

    try {
      const lastDate = new Date(latestBooking.date);
      if (isNaN(lastDate.getTime())) throw new Error("Invalid Date");
      
      const freq = latestBooking.reminderFrequency || 6;
      const dueDate = addMonths(lastDate, freq);
      const isDue = isBefore(dueDate, new Date());
      const daysDiff = differenceInDays(dueDate, new Date());

      if (isDue) return { label: "Retention Due", color: "text-red-500", bg: "bg-red-500/10", icon: <Zap className="h-3 w-3 text-red-500 animate-pulse" />, sub: `${Math.abs(daysDiff)} days overdue` };
      return { label: "Active Client", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: <ShieldCheck className="h-3 w-3 text-emerald-500" />, sub: `${daysDiff} days until refresh` };
    } catch (e) {
      return { label: "Data Incomplete", color: "text-zinc-500", bg: "bg-zinc-500/10", icon: <Info className="h-3 w-3 text-zinc-500" /> };
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
      toast.info("AI Draft Generated", { description: "You can now edit this message as you wish." });
    }, 600);
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
        // 1. Generate beautifully styled PDF letter
        const doc = new jsPDF();
        const year = new Date().getFullYear();
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        
        // Professional Header
        doc.setFontSize(18);
        doc.setTextColor(30, 58, 138); // Dark Blue
        doc.setFont("helvetica", "bold");
        doc.text("Prime Auto Detail", 20, 20);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text("54 Boston Street, Methuen MA 01844", 20, 25);
        doc.text("Rick.PrimeAutoDetail@gmail.com | 978-566-1008", 20, 30);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, 190, 35);
        
        // Date & Addressee
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.setFont(undefined, 'bold');
        doc.text(`To: ${customer.name}`, 20, 52);
        if (customer.email) doc.text(`Email: ${customer.email}`, 20, 57);
        
        // Subject
        doc.setFontSize(11);
        doc.text(`Subject: ${customSubject}`, 20, 67);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // Clean letter body from non-ASCII (emojis) for PDF rendering
        const cleanBody = outreachNote
          .replace(/[^\x00-\x7F]/g, "")
          .trim();
          
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
        
        // Sign-off
        doc.text("Sincerely,", 20, currentY);
        doc.setFont(undefined, 'bold');
        doc.text("Rick Berube", 20, currentY + 6);
        doc.setFont(undefined, 'normal');
        doc.text("Prime Auto Detail Team", 20, currentY + 11);
        
        const pdfDataUrl = doc.output('dataurlstring');
        const pdfFileName = `LETTER_${customer.name.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        
        // Save PDF to file manager
        await uploadToFileManager(pdfDataUrl, `Outreach Letters/${year}/${monthName}/`, { customer: customer.name, date: new Date().toISOString() } as any, {
          service: "Outreach Letter",
          silent: true
        });

        // 2. Email correspondence to customer via Resend Edge Function
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

        // Log locally first
        const tempLog = {
          created_at: new Date().toISOString(),
          customer_name: customer.name,
          customer_email: customer.email,
          note: `Letter Sent: "${customSubject}"`,
          coupon_code: includeDiscount ? coupon?.code : undefined,
          type: 'letter'
        };
        setEngagements([tempLog, ...engagements]);

        // Insert to engagements in Supabase
        await supabase.from('engagements').insert({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_id: customer.id,
          type: 'letter',
          note: `Letter sent: ${customSubject}`,
          coupon_code: includeDiscount ? coupon?.code : undefined
        });

        // Trigger email
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

      // Log locally first for immediate UI response
      const logId = `log_${Date.now()}`;
      const tempLog = {
        created_at: new Date().toISOString(),
        customer_name: customer.name,
        customer_email: customer.email,
        note: outreachNote.trim() || (isProspect ? "Introductory Outreach" : "Maintenance Reminder"),
        coupon_code: includeDiscount ? coupon?.code : undefined,
        type: isProspect ? 'initial' : 'retention',
        addons: latestBooking?.addons || []
      };
      setEngagements([tempLog, ...engagements]);

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
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Workflow Guidance */}
      <div className="bg-blue-600/5 border border-blue-600/10 rounded-2xl p-4 flex gap-4 items-center">
         <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-blue-400" />
         </div>
         <div className="space-y-0.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400">Retention Workflow</h4>
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">Follow the 3 steps below to analyze, draft, and securely dispatch personalized outreach.</p>
         </div>
      </div>

      {/* STEP 1: ANALYSIS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
           <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-white">1</span>
           Analysis: Current standing
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn("p-4 rounded-2xl border border-white/5 shadow-inner", status.bg)}>
            <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-1.5 opacity-60">
              {status.icon} {isProspect ? 'Lead Pipeline' : 'Retention State'}
            </div>
            <div className={cn("text-lg font-black uppercase tracking-tight", status.color)}>
              {status.label}
            </div>
            {status.sub && <div className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">{status.sub}</div>}
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-inner">
            <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-1.5 opacity-60">
              <History className="h-3 w-3" /> Audit History
            </div>
            <div className="text-lg font-black text-white uppercase tracking-tight">
              {engagements.length} Logs
            </div>
            <div className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-wider">
              {engagements[0] ? `Last: ${format(new Date(engagements[0].created_at), 'MMM dd, yyyy')}` : 'No history found'}
            </div>
            {latestBooking && latestBooking.addons && latestBooking.addons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {latestBooking.addons.slice(0, 3).map((a: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 h-4 bg-blue-500/5 text-blue-400/60 border-blue-500/10">
                    {a}
                  </Badge>
                ))}
                {latestBooking.addons.length > 3 && <span className="text-[8px] text-zinc-600 font-bold">+{latestBooking.addons.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="h-px bg-zinc-800/50 mx-2" />

      {/* STEP 2 & 3: COMPOSITION & HISTORY */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
             <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-white">2</span>
             Composition: Design the offer
          </div>

          <div className="space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-white/5 h-full flex flex-col">
              
              {/* outreachType Segmented Button */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setOutreachType("campaign");
                    setOutreachNote("");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                    outreachType === "campaign"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Mail className="h-3 w-3" /> Campaign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOutreachType("letter");
                    setOutreachNote("");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                    outreachType === "letter"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <FileText className="h-3 w-3" /> Letter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOutreachType("estimate");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                    outreachType === "estimate"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <FileBarChart className="h-3 w-3" /> Estimate
                </button>
              </div>

              {outreachType === "campaign" && (
                <>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Outreach Campaign Template</label>
                      <Select 
                        value={selectedCampaignId}
                        onValueChange={handleCampaignChange}
                      >
                        <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase rounded-xl tracking-tight">
                          <SelectValue placeholder="SELECT AN EMAIL CAMPAIGN..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-900 text-white rounded-xl shadow-2xl">
                          {(isProspect ? PROSPECT_CAMPAIGNS : CLIENT_CAMPAIGNS).map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase tracking-tight">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Personal Message</label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={generateAIDraft}
                          disabled={isGenerating}
                          className="h-6 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/10 px-2"
                        >
                          <Sparkles className={cn("w-3 h-3 mr-1.5", isGenerating && "animate-pulse")} /> 
                          {isGenerating ? "Drafting..." : "AI Auto-Draft"}
                        </Button>
                      </div>
                      <Textarea 
                        placeholder={isProspect ? "e.g. Welcome to Prime! Here is a special offer to get you started..." : "e.g. It's been a while since your last detail! We'd love to refresh your vehicle..."}
                        value={outreachNote}
                        onChange={(e) => setOutreachNote(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 min-h-[140px] text-xs font-semibold rounded-xl focus:ring-blue-500/20 placeholder:text-zinc-800 resize-none w-full"
                      />
                  </div>
                </>
              )}

              {outreachType === "letter" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Letter Subject</label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 h-10 text-xs font-semibold rounded-xl text-white placeholder:text-zinc-700"
                      placeholder="Letter Subject..."
                    />
                  </div>

                  <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Letter Body</label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={generateAIDraft}
                          disabled={isGenerating}
                          className="h-6 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/10 px-2"
                        >
                          <Sparkles className={cn("w-3 h-3 mr-1.5", isGenerating && "animate-pulse")} /> 
                          {isGenerating ? "Drafting..." : "AI Auto-Draft"}
                        </Button>
                      </div>
                      <Textarea 
                        placeholder="Write a completely custom, freeform letter to this client..."
                        value={outreachNote}
                        onChange={(e) => setOutreachNote(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 min-h-[140px] text-xs font-semibold rounded-xl focus:ring-blue-500/20 placeholder:text-zinc-800 resize-none w-full"
                      />
                  </div>
                </>
              )}

              {outreachType === "estimate" && (
                <div className="space-y-4 flex-1 flex flex-col justify-start">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Select Estimate to Send</label>
                    {loadingEstimates ? (
                      <div className="h-10 bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-zinc-500 rounded-xl flex items-center justify-center animate-pulse">
                        Loading estimates...
                      </div>
                    ) : estimates.length === 0 ? (
                      <div className="p-6 bg-zinc-950/50 border border-dashed border-zinc-800/80 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                        <p className="text-[10px] text-zinc-500 italic">No estimates recorded for this customer.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/estimates?customerId=${customer.id}`, '_blank')}
                          className="h-7 text-[9px] font-black uppercase bg-zinc-900 border-zinc-800 text-zinc-300 gap-1.5 mt-1"
                        >
                          CREATE NEW ESTIMATE <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Select value={selectedEstimateId} onValueChange={setSelectedEstimateId}>
                        <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase rounded-xl tracking-tight">
                          <SelectValue placeholder="SELECT AN ESTIMATE..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-900 text-white rounded-xl shadow-2xl">
                          {estimates.map((e) => (
                            <SelectItem key={e.id} value={e.id!} className="text-[10px] font-black uppercase tracking-tight">
                              Estimate #{e.estimateNumber} — ${(e.total || 0).toFixed(2)} ({formatDisplayDate(e.estimateDate || e.date)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedEstimateId && (
                    (() => {
                      const est = estimates.find(e => e.id === selectedEstimateId);
                      if (!est) return null;
                      return (
                        <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3 animate-in fade-in duration-300">
                          <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                            <span className="text-[10px] font-black uppercase text-emerald-400">ESTIMATE #{est.estimateNumber}</span>
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 h-4 bg-zinc-900 border-zinc-800 text-blue-400">
                              {est.status || 'open'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-zinc-500 uppercase font-black tracking-wider block">Date</span>
                              <span className="text-zinc-300 font-bold">{formatDisplayDate(est.estimateDate || est.date)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 uppercase font-black tracking-wider block">Vehicle</span>
                              <span className="text-zinc-300 font-bold truncate block">{est.vehicle}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 uppercase font-black tracking-wider text-[9px] block">Services Proposed</span>
                            <div className="max-h-20 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {est.services?.map((s: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[9px] font-medium text-zinc-400">
                                  <span className="truncate pr-2">{s.name}</span>
                                  <span className="font-bold shrink-0">${(s.price || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-zinc-400">Estimated Total</span>
                            <span className="text-xs font-black text-emerald-400">${(est.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
              
              {outreachType !== "estimate" && (
                <>
                  <div className="flex items-center justify-between px-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50 mt-4">
                     <div className="flex items-center gap-2">
                        <TicketPercent className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Include Incentive?</span>
                     </div>
                     <Switch 
                       checked={includeDiscount} 
                       onCheckedChange={setIncludeDiscount}
                       className="scale-75 data-[state=checked]:bg-blue-600"
                     />
                  </div>

                  {includeDiscount && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 mt-2">
                      <Select 
                        value={outreachCouponId}
                        onValueChange={setOutreachCouponId}
                      >
                        <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase rounded-xl tracking-tight">
                          <SelectValue placeholder="SELECT COUPON CODE..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-900 text-white rounded-xl shadow-2xl">
                          {allCoupons.filter(c => c.active).length > 0 ? (
                            allCoupons.filter(c => c.active).map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase tracking-tight">
                                {c.code} — {c.percent ? `${c.percent}% OFF` : `$${c.amount} OFF`}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-[10px] text-zinc-500 italic text-center">No active coupons available</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 px-1 mt-6">
                 <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-white">3</span>
                 Dispatch: Final Review & Send
              </div>

              {outreachType === "estimate" ? (
                <Button 
                   variant="default"
                   size="lg"
                   disabled={isSending || !customer.email || !selectedEstimateId}
                   onClick={handleSendOutreach}
                   className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest h-14 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-4 whitespace-normal"
                 >
                   {isSending ? "Sending Estimate..." : "Dispatch Estimate Email Now"}
                   <Send className="h-4 w-4 ml-2" />
                 </Button>
              ) : (
                <Button 
                   variant="default"
                   size="lg"
                   disabled={isSending || !customer.email || !outreachNote.trim()}
                   onClick={() => setShowPreview(true)}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-widest h-14 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-4 whitespace-normal"
                 >
                   <Eye className="h-4 w-4 mr-2" /> Review {outreachType === "letter" ? "Letter" : "Outreach Email"}
                 </Button>
              )}
          </div>
        </section>

        {/* Engagement History Column */}
        <section className="space-y-4 flex flex-col">
          <div className="flex items-center gap-1.5 px-1 opacity-50">
             <History className="h-3 w-3 text-zinc-500" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Communication Audit Trail</span>
          </div>
          <div className="space-y-3 flex-1 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 bg-zinc-900/20 p-4 rounded-2xl border border-white/5">
             {loadingEngs && <div className="text-[10px] text-zinc-700 italic px-4 py-8 border border-dashed border-zinc-800 rounded-2xl text-center flex items-center justify-center gap-2 animate-pulse"><Clock className="h-3 w-3" /> Syncing communication history...</div>}
             {!loadingEngs && engagements.length === 0 && (
               <div className="text-[10px] text-zinc-500 italic px-4 py-12 border border-dashed border-zinc-800/80 rounded-2xl text-center flex flex-col items-center gap-3 h-full justify-center">
                  <div className="h-10 w-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700"><MessageSquare className="h-5 w-5" /></div>
                  No prior outreach recorded for this profile.
               </div>
             )}
             {engagements.map((eng, idx) => (
               <div key={idx} className="flex flex-col gap-2 p-4 bg-zinc-950/40 rounded-2xl border border-white/5 text-[10px] group/item hover:border-blue-500/20 transition-all shadow-sm">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 h-4 bg-zinc-900 border-zinc-800 text-blue-400">
                         {eng.type === 'initial' ? 'Intro' : eng.type === 'letter' ? 'Letter' : 'Retention'}
                       </Badge>
                       <span className="text-zinc-500 font-bold tracking-tight">{format(new Date(eng.created_at), 'MMMM dd, yyyy · p')}</span>
                     </div>
                     {eng.coupon_code && <span className="text-emerald-500 font-black tracking-tighter text-[9px] bg-emerald-500/10 px-2 h-4 flex items-center rounded-full border-emerald-500/20">{eng.coupon_code}</span>}
                  </div>
                  <div className="text-zinc-300 font-medium italic leading-relaxed pl-3 border-l-2 border-blue-500/20 py-1">
                     "{eng.note}"
                  </div>
                  {eng.addons && Array.isArray(eng.addons) && eng.addons.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-3">
                      {eng.addons.map((a: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[7px] font-black uppercase px-1 py-0 h-3 bg-zinc-900 border-zinc-800 text-zinc-500">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
               </div>
             ))}
          </div>
        </section>
      </div>

      {!customer.email && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
           <Info className="h-5 w-5 text-amber-500" />
           <p className="text-[11px] text-amber-200/80 font-medium">To use the CRM Hub, please provide a valid email address on the Profile tab. This allows the system to log interactions and send professional communications.</p>
        </div>
      )}

      {/* Outreach Preview & Modification Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl w-[90vw] bg-zinc-950 border-zinc-800 text-white rounded-[32px] overflow-hidden p-0">
           <DialogHeader className="p-6 bg-zinc-900/50 border-b border-white/5">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Eye className="h-5 w-5 text-blue-400" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Review {outreachType === "letter" ? "Custom Letter" : "Outreach Message"}</DialogTitle>
                    <DialogDescription className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verify text and rewards before sending to {customer.name}</DialogDescription>
                 </div>
              </div>
           </DialogHeader>

           <div className="p-6 space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
                 <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-amber-200/70 font-medium leading-relaxed">
                    <strong>PREVIEW MODE:</strong> This is the final draft. You can still modify the subject and body below. Emojis and complex formatting will be automatically cleaned for the PDF records to ensure absolute clarity.
                 </p>
              </div>

              <div className="space-y-4">
                 {outreachType === "letter" && (
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Edit Letter Subject</label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-10 text-xs font-semibold rounded-xl text-white"
                      />
                   </div>
                 )}

                 <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1 px-1">
                       <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                         {outreachType === "letter" ? "Edit Letter Body" : "Edit Personalized Note"}
                       </label>
                       {outreachType !== "letter" && (
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={generateAIDraft}
                           disabled={isGenerating}
                           className="h-6 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/10"
                         >
                            <Sparkles className={cn("w-3 h-3 mr-1.5", isGenerating && "animate-pulse")} /> 
                            {isGenerating ? "Writing..." : "AI Refine"}
                         </Button>
                       )}
                    </div>
                    <Textarea 
                      value={outreachNote}
                      onChange={(e) => setOutreachNote(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 min-h-[140px] text-xs font-semibold rounded-2xl focus:ring-blue-500/20"
                      placeholder={outreachType === "letter" ? "Write custom letter..." : "Add a final personal touch..."}
                    />
                 </div>

                 <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 space-y-3">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                       <span className="text-zinc-500">Recipient:</span>
                       <span className="text-white">{customer.name}</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                       <span className="text-zinc-500">Email:</span>
                       <span className="text-white">{customer.email}</span>
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-indigo-400" />
                          <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">BCC to my Gmail?</span>
                       </div>
                       <Switch 
                         checked={bccMe} 
                         onCheckedChange={setBccMe}
                         className="scale-75 data-[state=checked]:bg-indigo-600"
                       />
                    </div>

                    {includeDiscount && (
                       <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                          <span className="text-emerald-500">Active Incentive:</span>
                          <span className="text-emerald-400">Coupon Included</span>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           <DialogFooter className="p-6 bg-zinc-900/30 border-t border-white/5 gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowPreview(false)}
                className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
              >
                Back to Editor
              </Button>
              <Button 
                onClick={handleSendOutreach}
                disabled={isSending}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] h-12 rounded-xl shadow-lg shadow-blue-600/20"
              >
                {isSending ? "Sending Outreach..." : "Dispatch Email Now"}
                <Send className="h-4 w-4 ml-2" />
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
