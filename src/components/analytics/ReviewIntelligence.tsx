import React, { useState, useEffect } from "react";
import { Star, AlertCircle, ExternalLink, Mail, Zap, Trash2, Edit, Repeat, Sparkles, CheckCircle } from "lucide-react";
import { Customer, supabase } from "@/lib/supa-data";
import { Booking } from "@/store/bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { upsertCustomer } from "@/lib/db";

interface ReviewIntelligenceProps {
  customers: Customer[];
  bookings: Booking[];
}

export default function ReviewIntelligence({ customers, bookings }: ReviewIntelligenceProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [vipSearchTerm, setVipSearchTerm] = useState("");
  
  const [bookingReviews, setBookingReviews] = useState<Record<string, any>>(() => {
    try {
        return JSON.parse(localStorage.getItem('prime_booking_reviews') || '{}');
    } catch { return {}; }
  });

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  
  const [reviewForm, setReviewForm] = useState({
      performance: "",
      mistakes: "",
      sentiment: "satisfied",
      googleReview: false,
      googleStars: 5
  });

  useEffect(() => {
      const handleRefresh = () => {
          try {
              setBookingReviews(JSON.parse(localStorage.getItem('prime_booking_reviews') || '{}'));
          } catch {}
      };
      window.addEventListener('refresh-analytics', handleRefresh);
      return () => window.removeEventListener('refresh-analytics', handleRefresh);
  }, []);

  const saveReview = async () => {
      if (!selectedBookingForReview) return;
      const updated = { ...bookingReviews, [selectedBookingForReview.id]: reviewForm };
      setBookingReviews(updated);
      localStorage.setItem('prime_booking_reviews', JSON.stringify(updated));
      
      const customerToUpdate = customers.find(c => c.name === selectedBookingForReview.customer);
      if (customerToUpdate && customerToUpdate.has_google_review !== reviewForm.googleReview) {
          try {
              await upsertCustomer({ ...customerToUpdate, has_google_review: reviewForm.googleReview });
          } catch (err) { console.error(err); }
      }

      setIsReviewModalOpen(false);
      toast.success("Operational review saved.");
  };
  
  const clearReview = async (booking: any) => {
      if (!confirm("Clear this operational review? This will reset the sentiment and Google Star rating.")) return;
      
      const updated = { ...bookingReviews };
      delete updated[booking.id];
      setBookingReviews(updated);
      localStorage.setItem('prime_booking_reviews', JSON.stringify(updated));
      
      const customerToUpdate = customers.find(c => c.name === booking.customer);
      if (customerToUpdate && customerToUpdate.has_google_review) {
          try {
              await upsertCustomer({ ...customerToUpdate, has_google_review: false });
          } catch (err) { console.error(err); }
      }
      
      toast.success("Review cleared.");
  };

  const openReview = (booking: any) => {
      setSelectedBookingForReview(booking);
      const existing = bookingReviews[booking.id] || {
          performance: "",
          mistakes: "",
          sentiment: "satisfied",
          googleReview: false,
          googleStars: 5
      };
      setReviewForm(existing);
      setIsReviewModalOpen(true);
  };

  // Customers who have had at least one completed booking
  const customersWithCompletedJobs = customers.filter(c => {
    return bookings.some(b => 
      b.customerId === c.id && 
      (b.status === 'done' || b.status === 'completed')
    );
  });

  const reviewed = customers.filter(c => c.has_google_review);
  const unreviewed = customersWithCompletedJobs.filter(c => !c.has_google_review);

  const reviewRate = customersWithCompletedJobs.length > 0 
    ? Math.round((reviewed.length / customersWithCompletedJobs.length) * 100) 
    : 0;

  const filteredUnreviewed = unreviewed.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aBookings = bookings.filter(bk => bk.customerId === a.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    const bBookings = bookings.filter(bk => bk.customerId === b.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    const aDate = aBookings.length > 0 ? new Date(aBookings[0].date).getTime() : 0;
    const bDate = bBookings.length > 0 ? new Date(bBookings[0].date).getTime() : 0;
    return bDate - aDate;
  });

  const filteredReviewed = reviewed.filter(c => 
    (c.name || '').toLowerCase().includes(vipSearchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(vipSearchTerm.toLowerCase())
  ).sort((a, b) => {
    const aBookings = bookings.filter(bk => bk.customerId === a.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    const bBookings = bookings.filter(bk => bk.customerId === b.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    const aDate = aBookings.length > 0 ? new Date(aBookings[0].date).getTime() : 0;
    const bDate = bBookings.length > 0 ? new Date(bBookings[0].date).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Stats Column */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-4 -right-4 opacity-10">
            <Star className="w-24 h-24 text-amber-500 fill-amber-500" />
          </div>
          <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-1">Review Capture Rate</h3>
          <span className="text-5xl font-black text-amber-400 my-2">{reviewRate}%</span>
          <p className="text-zinc-400 text-xs font-medium px-4">
            Of your customers with completed jobs, {reviewRate}% have left a VIP review.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col items-center">
            <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Total VIPs</span>
            <span className="text-2xl font-black text-zinc-200 mt-1">{reviewed.length}</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col items-center">
            <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Missing</span>
            <span className="text-2xl font-black text-red-400 mt-1">{unreviewed.length}</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
          <strong className="text-white block mb-1">AI Insight:</strong>
          Target the "Missing Reviews" list below. These are customers who have already experienced a completed service but haven't been tagged as VIPs. Sending them a quick email with your Google Review link can drastically improve your local SEO ranking.
        </div>
      </div>

      {/* Action List Column */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Missing Reviews */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col h-[400px]">
            <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                <AlertCircle className="w-4 h-4 text-red-400" /> Action Required: Missing Reviews
                </h3>
                <p className="text-xs text-zinc-500 font-medium">Sorted by most recent completed job.</p>
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                placeholder="Search unreviewed..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-xs"
                />
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {filteredUnreviewed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Star className="w-8 h-8 mb-2 opacity-20" />
                <p className="font-bold text-sm uppercase tracking-widest">No customers pending reviews</p>
                </div>
            ) : (
                filteredUnreviewed.map(customer => {
                const customerBookings = bookings.filter(b => b.customerId === customer.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
                const lastJobDate = customerBookings.length > 0 ? new Date(customerBookings[0].date).toLocaleDateString() : 'Unknown';
                const lastJobTitle = customerBookings.length > 0 ? customerBookings[0].title : 'Service';
                const lastBooking = customerBookings.find(b => b.status === 'done' || b.status === 'completed');

                return (
                    <div key={customer.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors group">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-zinc-200 truncate">{customer.name}</h4>
                        {customer.email ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 h-4 uppercase font-black">Email Available</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0 h-4 uppercase font-black">No Email</Badge>
                        )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {lastJobTitle}</span>
                        <span>&bull;</span>
                        <span>Last Job: {lastJobDate}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        {customer.email && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 sm:flex-none h-8 bg-zinc-900 border-zinc-700 text-blue-400 hover:text-blue-300 hover:bg-zinc-800 text-xs px-3"
                            onClick={async () => {
                            const subject = encodeURIComponent(`Following up on your detail - Prime Auto Detail`);
                            const firstName = (customer.name || 'Customer').split(' ')[0];
                            const body = encodeURIComponent(`Hi ${firstName},\n\nHope you are enjoying your newly detailed vehicle!\n\nAs a small local business, we rely heavily on the experiences our customers share online. If you have a minute, we'd truly appreciate you taking the time to leave us a review on Google. Your feedback helps other customers find us and supports the continued growth of our business.\n\nhttps://g.page/r/CUaXyAfwdcv1EBM/review\n\nThank you for choosing Prime Auto Detail!\n\nRick Berube\nPrime Auto Detail\n(978) 566-1008`);
                            window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(customer.email)}&su=${subject}&body=${body}`, '_blank');
                            
                            try {
                                const { error } = await supabase.from('engagements').insert({
                                customer_id: customer.id,
                                customer_name: customer.name,
                                type: 'correspondence',
                                note: `Google Review Request: Sent Google Review request email to ${customer.email}.`
                                });
                                if (error) console.warn("Supabase insert error:", error);
                            } catch (err) {
                                console.warn("Could not log Google Review Request to engagements:", err);
                            }
                            }}
                        >
                            <Mail className="w-3 h-3 mr-2" /> Request Review
                        </Button>
                        )}
                        {lastBooking && (
                            <Button 
                                size="sm"
                                variant="outline"
                                className="h-8 bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20 text-xs px-3"
                                onClick={() => openReview(lastBooking)}
                            >
                                Log Feedback
                            </Button>
                        )}
                        <Button 
                        size="sm"
                        className="flex-1 sm:flex-none h-8 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs px-3"
                        onClick={() => navigate(`/search-customer?customerId=${customer.id}`)}
                        >
                        Profile
                        </Button>
                    </div>
                    </div>
                );
                })
            )}
            </div>
        </div>

        {/* Logged VIP Reviews */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col h-[400px]">
            <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Logged VIP Reviews
                </h3>
                <p className="text-xs text-zinc-500 font-medium">Manage existing reviews.</p>
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                placeholder="Search VIPs..." 
                value={vipSearchTerm}
                onChange={(e) => setVipSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-xs"
                />
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {filteredReviewed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Star className="w-8 h-8 mb-2 opacity-20" />
                <p className="font-bold text-sm uppercase tracking-widest">No VIP reviews yet</p>
                </div>
            ) : (
                filteredReviewed.map(customer => {
                const customerBookings = bookings.filter(b => b.customerId === customer.id && (b.status === 'done' || b.status === 'completed')).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
                const lastBooking = customerBookings[0];
                const lastJobDate = lastBooking ? new Date(lastBooking.date).toLocaleDateString() : 'Unknown';
                const lastJobTitle = lastBooking ? lastBooking.title : 'Service';
                const review = lastBooking ? bookingReviews[lastBooking.id] : null;

                return (
                    <div key={customer.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors group">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-zinc-200 truncate">{customer.name}</h4>
                        {review ? (
                            <Badge variant="outline" className={cn(
                                "text-[10px] h-5 px-2 font-black tracking-tighter",
                                review.sentiment === 'loved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                review.sentiment === 'satisfied' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                                {review.sentiment.toUpperCase()}
                            </Badge>
                        ) : <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">No Notes</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {lastJobTitle}</span>
                        <span>&bull;</span>
                        <span>Last Job: {lastJobDate}</span>
                        {review?.googleReview && (
                            <>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-amber-500">
                                <Sparkles className="w-3 h-3 fill-current" /> {review.googleStars}/5
                            </span>
                            </>
                        )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        {lastBooking && (
                        <Button 
                            size="sm"
                            variant="outline"
                            className="h-8 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs px-3"
                            onClick={() => openReview(lastBooking)}
                        >
                            {review ? <><Edit className="w-3 h-3 mr-1"/> Edit</> : <><Edit className="w-3 h-3 mr-1"/> Log Notes</>}
                        </Button>
                        )}
                        {lastBooking && (
                        <Button 
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => clearReview(lastBooking)}
                            title="Clear Review"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                    </div>
                    </div>
                );
                })
            )}
            </div>
        </div>

      </div>

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[550px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-emerald-500 to-violet-600" />
            <DialogHeader className="pt-4">
                <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-violet-400" />
                    Post-Service Performance Review
                </DialogTitle>
                <CardDescription className="text-zinc-400">
                    Log internal notes and customer feedback for the job with <strong>{selectedBookingForReview?.customer}</strong>
                </CardDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">How did you do? (Performance Notes)</Label>
                    <Textarea 
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 h-24 placeholder:text-zinc-700 resize-none focus:border-violet-500/50 transition-colors"
                        placeholder="Write specific notes on how the job went, tools used, timing, etc..."
                        value={reviewForm.performance}
                        onChange={e => setReviewForm(prev => ({ ...prev, performance: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-red-400/70">Mistakes or Areas for Improvement</Label>
                    <Textarea 
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 h-20 placeholder:text-zinc-700 resize-none focus:border-red-500/30 transition-colors"
                        placeholder="Any missed spots? Time delays? Communication issues?"
                        value={reviewForm.mistakes}
                        onChange={e => setReviewForm(prev => ({ ...prev, mistakes: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Customer Sentiment</Label>
                        <Select value={reviewForm.sentiment} onValueChange={v => setReviewForm(prev => ({ ...prev, sentiment: v }))}>
                            <SelectTrigger className={cn(
                                "bg-zinc-900 border-zinc-800 text-zinc-100",
                                reviewForm.sentiment === 'loved' && "border-emerald-500/30 text-emerald-400",
                                reviewForm.sentiment === 'disappointed' && "border-red-500/30 text-red-400"
                            )}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="loved" className="text-emerald-400">Loved it! (Stellar)</SelectItem>
                                <SelectItem value="satisfied" className="text-blue-400">Satisfied (Good)</SelectItem>
                                <SelectItem value="disappointed" className="text-red-400">Disappointed (Poor)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google Review?</Label>
                        <div className={cn(
                            "flex items-center gap-4 h-10 rounded-md border px-3 transition-colors",
                            reviewForm.googleReview ? "bg-amber-500/5 border-amber-500/30" : "bg-zinc-900 border-zinc-800"
                        )}>
                            <Switch checked={reviewForm.googleReview} onCheckedChange={v => setReviewForm(prev => ({ ...prev, googleReview: v }))} />
                            <span className={cn("text-xs font-bold", reviewForm.googleReview ? "text-amber-500" : "text-zinc-500")}>
                                {reviewForm.googleReview ? 'Review Received' : 'No Review Yet'}
                            </span>
                        </div>
                    </div>
                </div>

                {reviewForm.googleReview && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google Star Rating</Label>
                        <div className="flex gap-4">
                            {[1,2,3,4,5].map(star => (
                                <Button 
                                    key={star}
                                    variant="ghost" 
                                    size="sm" 
                                    className={cn(
                                        "flex-1 h-10 rounded-lg border transition-all",
                                        reviewForm.googleStars >= star ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-zinc-900 border-zinc-800 text-zinc-700 hover:bg-zinc-800"
                                    )}
                                    onClick={() => setReviewForm(prev => ({ ...prev, googleStars: star }))}
                                >
                                    <Sparkles className={cn("w-4 h-4 mr-1", reviewForm.googleStars >= star ? "fill-current" : "")} />
                                    {star}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 mt-4 border-t border-zinc-800 pt-6">
                <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} className="text-zinc-500 hover:text-white">Cancel</Button>
                <Button onClick={saveReview} className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 shadow-lg shadow-violet-600/20 active:scale-95 transition-transform">
                    Save Operational Review
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
