import React, { useEffect, useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Customer } from "@/lib/supa-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  RotateCcw, Loader2, Clock, RefreshCw, Mail, Pencil, Trash2,
  PhoneIncoming, PhoneOutgoing, MessageSquare, AlertCircle, StickyNote,
  Calendar, Check, X, Bell, Package, Eye, ExternalLink
} from "lucide-react";

export interface UnifiedCustomerTimelineProps {
  customer: Customer;
  allBookings: any[];
  handlePreviewEmailForBooking: (booking: any, forcedType?: any, engagement?: any) => void;
  navigate: any;
  toast: any;
}

export const UnifiedCustomerTimeline = ({ customer, allBookings, handlePreviewEmailForBooking, navigate, toast }: UnifiedCustomerTimelineProps) => {
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "booking" | "notes" | "correspondence" | "activity">("all");

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      const items: any[] = [];

      // 1. Bookings
      allBookings
        .filter(b => 
          (b.customerId === customer.id) || 
          (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
          (b.customer?.toLowerCase() === customer.name?.toLowerCase())
        )
        .forEach(b => items.push({
          ...b,
          timelineType: 'booking',
          sortDate: new Date(b.date || b.created_at)
        }));

      // 2. Activity Logs
      const activityLog = (customer as any).activity_log || [];
      activityLog.forEach((a: any) => items.push({
        ...a,
        timelineType: 'activity',
        sortDate: new Date(a.created_at || a.date)
      }));

      // 3. Profile Internal Note
      if (customer.notes) {
        items.push({
          id: 'profile-note',
          note: customer.notes,
          type: 'general',
          created_at: customer.created_at || new Date().toISOString(),
          timelineType: 'profile-note',
          sortDate: new Date(customer.created_at || Date.now())
        });
      }

      // 4. Fetch Engagements from database
      const { data: engData } = await supabase
        .from('engagements')
        .select('*')
        .eq('customer_id', customer.id);

      if (engData && engData.length > 0) {
        engData.forEach(eng => {
          items.push({
            ...eng,
            timelineType: 'engagement',
            sortDate: new Date(eng.created_at)
          });
        });
      } else {
        // Fallback by email match if customer ID query returns nothing and email exists
        if (customer.email) {
          const { data: engFallback } = await supabase
            .from('engagements')
            .select('*')
            .eq('customer_email', customer.email);
            
          if (engFallback && engFallback.length > 0) {
            engFallback.forEach(eng => {
              items.push({
                ...eng,
                timelineType: 'engagement',
                sortDate: new Date(eng.created_at)
              });
            });
          }
        }
      }

      // Sort chronological descending
      items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
      setTimelineItems(items);
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEngagement = async (id: string) => {
    if (!id) {
      toast({ title: "Error", description: "Missing engagement ID.", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this engagement record?")) return;
    try {
      const { error } = await supabase.from('engagements').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Engagement record removed." });
      loadTimeline();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete engagement.", variant: "destructive" });
    }
  };

  const handleEditEngagement = async (eng: any) => {
    const newNote = prompt("Edit engagement note:", eng.note);
    if (newNote === null) return;

    const currentDateStr = eng.created_at ? new Date(eng.created_at).toLocaleString() : "";
    const newDateInput = prompt("Edit engagement timestamp (Date & Time, e.g. '08/07/2026 11:45 AM'):", currentDateStr);

    try {
      let updatedCreatedAt = eng.created_at;
      if (newDateInput && newDateInput !== currentDateStr) {
        const parsedDate = new Date(newDateInput);
        if (!isNaN(parsedDate.getTime())) {
          updatedCreatedAt = parsedDate.toISOString();
        }
      }

      const { error } = await supabase
        .from('engagements')
        .update({ 
          note: newNote,
          created_at: updatedCreatedAt
        })
        .eq('id', eng.id);

      if (error) throw error;
      toast({ title: "Updated", description: "Engagement updated successfully." });
      loadTimeline();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not update engagement.", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [customer.id, customer.notes]);

  const filteredItems = useMemo(() => {
    if (filterType === "all") return timelineItems;
    if (filterType === "booking") return timelineItems.filter(i => i.timelineType === 'booking');
    if (filterType === "notes") return timelineItems.filter(i => i.timelineType === 'profile-note');
    if (filterType === "correspondence") return timelineItems.filter(i => i.timelineType === 'engagement');
    if (filterType === "activity") return timelineItems.filter(i => i.timelineType === 'activity');
    return timelineItems;
  }, [timelineItems, filterType]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call_in': return <PhoneIncoming className="h-4 w-4 text-emerald-400" />;
      case 'call_out': return <PhoneOutgoing className="h-4 w-4 text-blue-400" />;
      case 'text': return <MessageSquare className="h-4 w-4 text-amber-400" />;
      case 'email': return <Mail className="h-4 w-4 text-indigo-400" />;
      case 'attempt': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return <StickyNote className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'call_in': return 'Incoming Call';
      case 'call_out': return 'Outgoing Call';
      case 'text': return 'Text Message';
      case 'email': return 'Email Sent';
      case 'attempt': return 'Contact Attempt';
      default: return 'General Note';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search / Filter bar inside Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/30 p-3 rounded-2xl border border-zinc-800/40">
        <div className="flex flex-wrap gap-1">
          {(["all", "booking", "notes", "correspondence", "activity"] as const).map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => setFilterType(t)}
              className={cn(
                "h-7 text-[9px] font-black uppercase tracking-wider px-3 rounded-lg transition-all",
                filterType === t 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-xl" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {t === "all" ? "ALL DATA" : t === "notes" ? "NOTES" : t === "activity" ? "ACTIVITIES" : t + "s"}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTimeline}
          disabled={isLoading}
          className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
          title="Refresh Timeline"
        >
          <RotateCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-blue-400")} />
        </Button>
      </div>

      <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
            <div className="text-[10px] font-black uppercase tracking-widest">Aggregating Counterparts...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-700 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-3xl">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <div className="text-xs font-black uppercase tracking-widest opacity-40">Zero prior history found.</div>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            if (item.timelineType === 'engagement') {
              const eng = item;
              const date = new Date(eng.created_at);
              const isRescheduled = eng.type === 'rescheduled';
              return (
                <div key={`eng-${eng.id}-${idx}`} className={cn(
                  "p-5 bg-zinc-950 rounded-2xl border border-zinc-800 transition-all group shadow-xl relative overflow-hidden",
                  isRescheduled ? "hover:border-cyan-500/40" : "hover:border-indigo-500/40"
                )}>
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                    isRescheduled ? "bg-cyan-500/5" : "bg-indigo-500/5"
                  )} />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl border",
                        isRescheduled ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      )}>
                        {isRescheduled ? <RefreshCw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                            isRescheduled ? "text-cyan-400 bg-cyan-950/40 border-cyan-900/40" : "text-indigo-400 bg-indigo-950/40 border-indigo-900/40"
                          )}>
                            {isRescheduled ? 'Reschedule' : 'Engagement'}
                          </span>
                          <span className="text-zinc-600 text-xs">•</span>
                          <span className="text-zinc-500 text-xs font-bold">{format(date, 'MMM d, yyyy · h:mm a')}</span>
                        </div>
                        <div className="text-sm font-black uppercase text-zinc-100 mt-2 tracking-tight">
                          {isRescheduled ? `Rescheduled Date Event` : `Sent Correspondence: ${eng.subject || 'Direct Message'}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-white bg-zinc-500/5 border border-zinc-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditEngagement(eng); }}
                        title="Edit Engagement"
                      >
                        <Pencil className="h-4 w-4" />
                    </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-white bg-zinc-500/5 border border-zinc-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 rounded-lg transition-all"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteEngagement(eng.id); }}
                        title="Delete Engagement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {!isRescheduled && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] font-black text-indigo-400 hover:text-white bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500 px-3 rounded-lg transition-all"
                          onClick={() => handlePreviewEmailForBooking(eng, 'correspondence', eng)}
                        >
                          Preview Email
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl text-xs text-zinc-400 italic">
                    "{eng.note?.length > 150 ? eng.note.slice(0, 150).replace(/\n/g, ' ') + '...' : eng.note?.replace(/\n/g, ' ') || eng.body?.slice(0, 100) + '...'}"
                  </div>
                </div>
              );
            }

            if (item.timelineType === 'profile-note') {
              return (
                <div key={`profile-note-${idx}`} className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-amber-500/40 transition-all group shadow-xl relative overflow-hidden animate-in fade-in">
                  <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 mb-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <StickyNote className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">Profile Note</span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-zinc-500 text-xs font-bold">{format(item.sortDate, 'MMM d, yyyy · h:mm a')}</span>
                      </div>
                      <div className="text-sm font-black uppercase text-zinc-100 mt-1.5 tracking-tight">Internal Admin Directives</div>
                    </div>
                  </div>
                  <div className="p-3.5 bg-amber-950/5 border border-amber-900/10 rounded-xl text-xs text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
                    "{item.note}"
                  </div>
                </div>
              );
            }

            if (item.timelineType === 'booking') {
              const booking = item;
              const bookingDate = new Date(booking.date);
              const dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={`booking-${booking.id}-${idx}`} className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-blue-500/40 transition-all group/booking shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blue-500" />
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">Appointment</span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-zinc-200 text-xs font-black uppercase tracking-tight">{dateStr}</span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-zinc-400 text-xs font-bold">{timeStr}</span>
                      </div>
                      <div className="text-lg text-white font-black uppercase tracking-tighter group-hover/booking:text-blue-400 transition-colors leading-none mb-3">{booking.title || 'Premium Service'}</div>
                      
                      {(() => {
                        const rawAddons = booking.addons || booking.add_ons || [];
                        const addonsArray = Array.isArray(rawAddons) ? rawAddons : 
                                            (typeof rawAddons === 'string' ? JSON.parse(rawAddons) : []);
                        
                        if (addonsArray.length === 0) return null;

                        return (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {addonsArray.map((a: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-black uppercase px-2 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Vehicle Managed</div>
                          <span className="font-bold text-zinc-300">{(booking.vehicleYear && booking.vehicleYear !== '-' && booking.vehicleYear !== '---') ? `${booking.vehicleYear} ` : ''}{booking.vehicleMake || '-'} {booking.vehicleModel || '-'}{booking.vehicleColor ? ` • ${booking.vehicleColor}` : ''}</span>
                        </div>
                        <div className="bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Monetary Value</div>
                          <span className="text-emerald-500 font-black tracking-tight">${booking.price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-2xl transition-all",
                      booking.status === 'done' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      booking.status === 'confirmed' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-zinc-800 text-zinc-500 border-zinc-700"
                    )}>
                      {booking.status}
                    </Badge>
                  </div>

                  {booking.notes && (
                    <div className="mt-2 p-3 bg-blue-900/10 rounded-xl border border-blue-500/10 text-[11px] text-zinc-400 italic leading-relaxed">
                      "{booking.notes}"
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-zinc-800/40 flex items-center justify-between">
                    <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Session #{booking.id.slice(-6).toUpperCase()}</div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-zinc-500 hover:text-blue-400"
                            title="Preview Emails"
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 w-56">
                          <DropdownMenuLabel className="text-[10px] uppercase font-bold text-zinc-500">Preview Sent Emails</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'confirmation'); }}>
                            <Check className="mr-2 h-4 w-4 text-emerald-500" /> Booking Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'request'); }}>
                            <Clock className="mr-2 h-4 w-4 text-amber-500" /> Request Received
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'cancelled'); }}>
                            <X className="mr-2 h-4 w-4 text-red-500" /> Job Cancelled
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'reminder'); }}>
                            <Bell className="mr-2 h-4 w-4 text-blue-500" /> 6-Month Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'payment-success'); }}>
                            <Package className="mr-2 h-4 w-4 text-green-500" /> Payment Success
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePreviewEmailForBooking(booking, 'prospect'); }}>
                            <Mail className="mr-2 h-4 w-4 text-purple-400" /> Prospect Welcome
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 p-0 gap-1.5"
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          const { getCustomerDetailedHistory } = await import('@/lib/supa-data');
                          toast({ title: "Processing", description: "Aggregating history..." });
                          try {
                            const detailedHistory = await getCustomerDetailedHistory(customer.id!);
                            if (detailedHistory) {
                              const { exportCustomerHistoryPDF } = await import('@/lib/pdf-export');
                              await exportCustomerHistoryPDF(detailedHistory, true); 
                            }
                          } catch (err) {}
                        }}
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[9px] font-black text-zinc-500 hover:text-white p-0 gap-1.5"
                        onClick={async (e) => { e.stopPropagation(); navigate('/bookings?id=' + booking.id); }}
                      >
                        Inspect <ExternalLink className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            // Otherwise, render general activity notes
            const act = item;
            return (
              <div key={`act-${act.id || idx}`} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all shadow-lg flex gap-4">
                <div className="h-10 w-10 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center shrink-0">
                  {getActivityIcon(act.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-800/40">Activity Log</span>
                      <span className="text-zinc-600 text-xs">•</span>
                      <div className="text-zinc-200 font-black uppercase tracking-tight text-xs">{getActivityLabel(act.type)}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">{format(new Date(act.created_at || act.date), 'MMM dd, yyyy · p')}</div>
                  </div>
                  <p className="text-xs text-zinc-300 italic leading-relaxed font-medium">"{act.note}"</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
