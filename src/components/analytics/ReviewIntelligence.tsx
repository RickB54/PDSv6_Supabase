import React, { useState } from "react";
import { Star, AlertCircle, ExternalLink, Mail, Zap } from "lucide-react";
import { Customer, supabase } from "@/lib/supa-data";
import { Booking } from "@/store/bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReviewIntelligenceProps {
  customers: Customer[];
  bookings: Booking[];
}

export default function ReviewIntelligence({ customers, bookings }: ReviewIntelligenceProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

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
    // Sort by most recent booking
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
      <div className="xl:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col h-[500px]">
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
                    <Button 
                      size="sm"
                      className="flex-1 sm:flex-none h-8 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs px-3"
                      onClick={() => navigate(`/search-customer?customerId=${customer.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
