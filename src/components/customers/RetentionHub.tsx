import { useState, useEffect } from "react";
import { Customer, supabase } from "@/lib/supa-data";
import { useBookingsStore, Booking } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { useFollowUpStore } from "@/store/followup";
import { onSendReminderEmail, onSendProspectEmail } from "@/lib/bookingsSync";
import { format, differenceInDays, addMonths, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, Send, Zap, Clock, ExternalLink, MessageSquare, TicketPercent, Star, ShieldCheck, Activity, Info, Eye, AlertCircle, Sparkles, Wand2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
  const [outreachNote, setOutreachNote] = useState("");
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

  const fetchEngagements = async () => {
    if (!customer.email) return;
    setLoadingEngs(true);
    try {
      // Fetch from both email and name for better history
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .or(`customer_email.eq.${customer.email},customer_name.eq.${customer.name}`)
        .order('created_at', { ascending: false });
      if (data) setEngagements(data);
    } catch (e) {
      console.warn("Could not fetch engagements", e);
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

  // Retention Logic
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
    // Simulate a brief AI thought process for premium feel
    setTimeout(() => {
      let draft = "";
      if (isProspect) {
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

  const handleSendOutreach = async () => {
    setIsSending(true);
    try {
      const activeCoupons = allCoupons.filter(c => c.active);
      const coupon = activeCoupons.find(c => c.id === outreachCouponId);
      const discountLabel = coupon ? (coupon.percent ? `${coupon.percent}% OFF` : `$${coupon.amount} OFF`) : undefined;

      // Log locally first for immediate UI response
      const logId = `log_${Date.now()}`;
      const tempLog = {
        created_at: new Date().toISOString(),
        customer_name: customer.name,
        customer_email: customer.email,
        note: outreachNote.trim() || (isProspect ? "Introductory Outreach" : "Maintenance Reminder"),
        coupon_code: includeDiscount ? coupon?.code : undefined,
        type: isProspect ? 'initial' : 'retention'
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
        // For customers, use latest booking if available, otherwise just customer info
        if (latestBooking) {
          await onSendReminderEmail(latestBooking, "Manual Outreach", {
            customNote: outreachNote.trim() || undefined,
            couponCode: includeDiscount ? coupon?.code : undefined,
            discountLabel: includeDiscount ? discountLabel : undefined,
            bccMe: bccMe
          });
        } else {
          // Fallback to prospect-style intro if no booking
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
          </div>
        </div>
      </section>

      <div className="h-px bg-zinc-800/50 mx-2" />

      {/* STEP 2: COMPOSITION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
           <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-white">2</span>
           Composition: Design the offer
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-start">
           <div className="w-full xl:w-2/3 space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
              <div className="space-y-1.5">
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
              
              <div className="flex items-center justify-between px-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50">
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
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
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

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 px-1">
                 <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-white">3</span>
                 Dispatch: Final Review & Send
              </div>

              <Button 
                 variant="default"
                 size="lg"
                 disabled={isSending || !customer.email}
                 onClick={() => setShowPreview(true)}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-widest h-14 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-4 whitespace-normal"
               >
                 <Eye className="h-4 w-4 mr-2" /> Review Outreach Email
               </Button>
           </div>

           {/* Engagement History Inline */}
           <div className="space-y-4">
              <div className="flex items-center gap-1.5 px-1 opacity-50">
                 <History className="h-3 w-3 text-zinc-500" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Communication Audit Trail</span>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                 {loadingEngs && <div className="text-[10px] text-zinc-700 italic px-4 py-8 border border-dashed border-zinc-800 rounded-2xl text-center flex items-center justify-center gap-2 animate-pulse"><Clock className="h-3 w-3" /> Syncing communication history...</div>}
                 {!loadingEngs && engagements.length === 0 && (
                   <div className="text-[10px] text-zinc-500 italic px-4 py-12 border border-dashed border-zinc-800/80 rounded-2xl text-center flex flex-col items-center gap-3">
                      <div className="h-10 w-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700"><MessageSquare className="h-5 w-5" /></div>
                      No prior outreach recorded for this profile.
                   </div>
                 )}
                 {engagements.map((eng, idx) => (
                   <div key={idx} className="flex flex-col gap-2 p-4 bg-zinc-950/40 rounded-2xl border border-white/5 text-[10px] group/item hover:border-blue-500/20 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 h-4 bg-zinc-900 border-zinc-800 text-blue-400">
                             {eng.type === 'initial' ? 'Intro' : 'Retention'}
                           </Badge>
                           <span className="text-zinc-500 font-bold tracking-tight">{format(new Date(eng.created_at), 'MMMM dd, yyyy · p')}</span>
                         </div>
                         {eng.coupon_code && <span className="text-emerald-500 font-black tracking-tighter text-[9px] bg-emerald-500/10 px-2 h-4 flex items-center rounded-full border border-emerald-500/20">{eng.coupon_code}</span>}
                      </div>
                      <div className="text-zinc-300 font-medium italic leading-relaxed pl-3 border-l-2 border-blue-500/20 py-1">
                         "{eng.note}"
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

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
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Review Outreach Message</DialogTitle>
                    <DialogDescription className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verify text and rewards before sending to {customer.name}</DialogDescription>
                 </div>
              </div>
           </DialogHeader>

           <div className="p-6 space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
                 <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-amber-200/70 font-medium leading-relaxed">
                    <strong>PREVIEW MODE:</strong> This is the final draft. You can still modify the personal message below. Emojis and complex formatting will be automatically cleaned for the PDF records to ensure clarity.
                 </p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1 px-1">
                       <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Edit Personalized Note</label>
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
                    </div>
                    <Textarea 
                      value={outreachNote}
                      onChange={(e) => setOutreachNote(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 min-h-[140px] text-xs font-semibold rounded-2xl focus:ring-blue-500/20"
                      placeholder="Add a final personal touch..."
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
