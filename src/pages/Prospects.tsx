import { useEffect, useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomerModal from "@/components/customers/CustomerModal";
import { Badge } from "@/components/ui/badge";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getSupabaseCustomers, upsertSupabaseCustomer, deleteSupabaseCustomer, deleteSupabaseVehicle, getSupabaseEstimates, Customer, supabase } from "@/lib/supa-data";
import { format } from "date-fns";

import { ActivityLog } from "@/components/customers/ActivityLog";
import api from "@/lib/api";
import { useDemoMode } from "@/contexts/DemoContext";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { auditEmployeeAction } from "@/lib/audit";
import { MOCK_PROSPECTS } from "@/lib/demoMockData";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import { getYouTubeThumbnail } from "@/lib/youtube";
import { exportCustomerHistoryPDF } from '@/lib/pdf-export';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBookingsStore } from "@/store/bookings";
import {
  Search, Pencil, Trash2, Plus, Save, Users, Archive, RotateCcw, RefreshCw,
  Image as ImageIcon, Video, ChevronUp, ChevronDown, ChevronsUp, 
  ChevronsDown, MapPin, CalendarPlus, FileBarChart, ExternalLink, 
  HelpCircle, History, Clock, ShieldCheck, Calendar, CalendarDays, CalendarRange, Car, Activity, FileDown,
  Mail, PhoneIncoming, PhoneOutgoing, MessageSquare, AlertCircle, StickyNote, Eye, X, Wrench, Loader2,
  Zap, Check, Bell, Package, Play, Send, Sun, CalendarCheck, ArrowLeft
} from "lucide-react";
import PDFViewer from "@/components/FileManager/PDFViewer";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { EmailPreviewModal } from "@/components/email/EmailPreviewModal";
import { onSendReminderEmail, onSendProspectEmail, onSendProspectEstimateEmail } from "@/lib/bookingsSync";
import { parseISO } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
interface UnifiedCustomerTimelineProps {
  customer: Customer;
  allBookings: any[];
  handlePreviewEmailForBooking: (booking: any, forcedType?: any, engagement?: any) => void;
  navigate: any;
  toast: any;
}

const UnifiedCustomerTimeline = ({ customer, allBookings, handlePreviewEmailForBooking, navigate, toast }: UnifiedCustomerTimelineProps) => {
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
    if (newNote === null || newNote === eng.note) return;
    try {
      const { error } = await supabase.from('engagements').update({ note: newNote }).eq('id', eng.id);
      if (error) throw error;
      toast({ title: "Updated", description: "Engagement note updated." });
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
              {t === "all" ? "ALL DATA" : t + "s"}
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
                            if (detailedHistory) await exportCustomerHistoryPDF(detailedHistory, true); 
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

const parseAttachedPhotos = (notes?: string) => {
  if (!notes) return [];
  const lines = notes.split('\n');
  const photos: string[] = [];
  let isPhotoSection = false;
  for (const line of lines) {
    if (line.includes('Attached Photos:')) {
      isPhotoSection = true;
      continue;
    }
    if (isPhotoSection && line.trim().startsWith('http')) {
      photos.push(line.trim());
    }
  }
  return photos;
};

export default function Prospects() {
  const navigate = useNavigate();
  const { items: allBookings } = useBookingsStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEngagements = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
      if (!error && data) setEngagements(data);
    } catch (e) {
      console.error("Failed to fetch engagements", e);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      fetchEngagements(); // Refresh engagements
      const [data, ests] = await Promise.all([
        getSupabaseCustomers(),
        getSupabaseEstimates()
      ]);
      setCustomers(data);
      setEstimates(ests);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchEngagements]);

  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [showArchived, setShowArchived] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedThisMount, setHasLoadedThisMount] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("profile");
  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [openMaps, setOpenMaps] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; label?: string; type?: "image" | "video"; description?: string; }[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [galleryMetadata, setGalleryMetadata] = useState<any[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<{ index?: number; metadata?: any; customer: Customer } | null>(null);
  
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewType, setEmailPreviewType] = useState<'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success' | 'prospect'>('confirmation');
  const [emailFormData, setEmailFormData] = useState<any>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const { isDemoMode } = useDemoMode();
  const isAdmin = getCurrentUser()?.role === 'admin' || isDemoMode;

  const customerToDelete = useMemo(() => 
    customers.find(c => c.id === deleteCustomerId), 
    [customers, deleteCustomerId]
  );
  
  const impactCounts = useMemo(() => {
    if (!customerToDelete) return { vehicles: 0, bookings: 0 };
    return {
      vehicles: customerToDelete.vehicles?.length || 0,
      bookings: allBookings.filter(b => b.customerId === customerToDelete.id).length
    };
  }, [customerToDelete, allBookings]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) {
      setSearchTerm(decodeURIComponent(q));
    }
  }, [location.search]);

  useEffect(() => {
    // Always load fresh data on mount to ensure we see new prospects
    // But only once per mount to avoid duplicate calls
    if (!hasLoadedThisMount || isDemoMode) {
      refresh();
      setHasLoadedThisMount(true);
    }
  }, [isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    const pid = params.get('id');

    if (q) {
      setSearchTerm(decodeURIComponent(q));
    }

    if (pid && customers.length > 0) {
      setTimeout(() => {
        setExpandedCustomers([pid]);
        const el = document.getElementById(`customer-${pid}`);
        if (el) {
          // Robust multi-step scroll for mobile
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            window.scrollTo({ top: rect.top + scrollTop - 100, behavior: 'smooth' });
          }, 300);
        }
      }, 600);
    }
  }, [location.search, customers]);

  const handlePreviewEmailForBooking = (booking: any, forcedType?: any, engagement?: any) => {
    if (!booking) return;
    setEmailFormData({
      customer: booking.customer || booking.customer_name || '',
      email: booking.customerEmail || booking.email || booking.customer_email || '',
      phone: booking.customerPhone || booking.phone || '',
      address: booking.address || '',
      service: booking.service || booking.title || booking.note || '',
      vehicle: booking.vehicle || booking.vehicle_type || '',
      vehicleYear: booking.vehicleYear || booking.year || '',
      vehicleMake: booking.vehicleMake || booking.make || '',
      vehicleModel: booking.vehicleModel || booking.model || '',
      notes: booking.notes || '',
      addons: Array.isArray(booking.addons) ? booking.addons : 
              (typeof booking.addons === 'string' ? JSON.parse(booking.addons) : []),
      time: booking.date ? format(parseISO(booking.date), 'HH:mm') : '09:00',
      status: (booking.status || 'pending').toLowerCase() as any,
      sent_at: engagement?.created_at || booking.last_email_sent_at,
      last_email_sent_at: engagement?.created_at || booking.last_email_sent_at
    });
    
    let type: any = forcedType;
    if (!type) {
      const stat = (booking.status || 'pending').toLowerCase();
      if (stat === 'confirmed') type = 'confirmation';
      else if (stat === 'cancelled') type = 'cancelled';
      else if (stat === 'done') type = 'payment-success';
      else if (engagement?.type === 'retention') type = 'reminder';
      else if (engagement?.type === 'initial') type = 'prospect';
      else type = 'request';
    }
    
    setEmailPreviewType(type);
    setShowEmailPreview(true);
  };

  const handlePreviewPdf = async (customerId: string) => {
    toast({ title: "Generating Report", description: "Preparing 360 Intelligence Report..." });
    try {
      const { getCustomerDetailedHistory } = await import('@/lib/supa-data');
      const detailedHistory = await getCustomerDetailedHistory(customerId);
      if (detailedHistory) {
        const { exportCustomerHistoryPDF } = await import('@/lib/pdf-export');
        // Open the preview directly in a new tab, just like in SearchCustomer.tsx!
        await exportCustomerHistoryPDF(detailedHistory, true);
        toast({ title: "Report Opened", description: "360 Intelligence Report loaded in new tab." });
      }
    } catch (err) {
      toast({ title: "Report Failed", description: "Generation encountered an error.", variant: "destructive" });
    }
  };

  const handleDeleteVehicle = async (customerId: string, vehicleIndex: number) => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: "Vehicle deletion is simulated in demo mode." });
      return;
    }
    
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer || !customer.vehicles) return;

      const vehicleToDelete = customer.vehicles[vehicleIndex];
      
      // 1. If it has a DB ID, delete from Supabase
      if (vehicleToDelete.id) {
        await deleteSupabaseVehicle(vehicleToDelete.id);
      }

      // 2. Update local state
      const updatedVehicles = [...customer.vehicles];
      updatedVehicles.splice(vehicleIndex, 1);
      
      const updatedCustomer = { ...customer, vehicles: updatedVehicles };
      await upsertSupabaseCustomer(updatedCustomer);
      
      toast({ title: "Vehicle Removed", description: "The garage has been updated." });
      refresh();
    } catch (err: any) {
      toast({ 
        title: "Deletion Failed", 
        description: err.message || "Could not remove vehicle. It may be linked to active bookings.",
        variant: "destructive"
      });
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      if (isDemoMode) {
        setCustomers(MOCK_PROSPECTS as any);
        return;
      }

      // PERMANENT FIX: Use the same data source as Users & Roles page
      // This ensures Jen and all other prospects are always visible
      const [list, ests] = await Promise.all([
        getSupabaseCustomers(),
        getSupabaseEstimates()
      ]);
      console.log('🔍 All Supabase customers:', list);
      setEstimates(ests);

      // Filter for prospects only (same logic as Users & Roles)
      const prospects = list.filter(c => {
        const customerType = (c.type || '').toLowerCase();
        return customerType === 'prospect';
      });

      // CHECK FOR REDIRECT: If we have an ID param but it's not in the prospects list,
      // it might be a full customer now. Check the full list.
      const params = new URLSearchParams(location.search);
      const pid = params.get('id');
      if (pid && !prospects.find(p => p.id === pid)) {
        const fullCust = list.find(c => c.id === pid);
        if (fullCust && fullCust.type !== 'prospect') {
          console.log(`[Prospects] ID ${pid} is a ${fullCust.type}, redirecting to SearchCustomer...`);
          navigate(`/search-customer?customerId=${pid}`);
          return;
        }
      }

      setCustomers(prospects);
    } catch (err: any) {
      console.error('Refresh prospects failed:', err);
      try {
        const fallback = await getCustomers();
        const prospects = (fallback as Customer[]).filter(c => c.type === 'prospect');
        setCustomers(prospects);
      } catch (err2) {
        setCustomers([]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const openAdd = () => { setEditing(null); setActiveModalTab("profile"); setModalOpen(true); };
  const openEdit = (c: Customer, tab: string = "profile") => { setEditing(c); setActiveModalTab(tab); setModalOpen(true); };

  const onSaveModal = async (data: any) => {
    if (isDemoMode) {
      toast({ 
        title: "Simulation Mode", 
        description: "Prospect saved locally for this session. No data was sent to the server.",
        variant: "default"
      });
      const saved = await upsertCustomer(data as any);
      await refresh();
      setModalOpen(false);
      return;
    }

    if (!data.type) data.type = 'prospect';
    try {
      // Ensure we don't send a local/timestamp ID to Supabase UUID column
      const safeId = data.id && data.id.length > 20 && !data.id.includes('_') ? data.id : undefined;

      await upsertSupabaseCustomer({
        id: safeId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        type: data.type || 'prospect',
        is_archived: (data as any).is_archived || false,
        vehicles: data.vehicles, // Pass the multiple vehicles array
        generalPhotos: data.generalPhotos,
        beforePhotos: data.beforePhotos,
        afterPhotos: data.afterPhotos,
        videoUrl: data.videoUrl,
        learningCenterUrl: data.learningCenterUrl,
        videoNote: data.videoNote,
        howFound: data.howFound,
        howFoundOther: data.howFoundOther,
        date_of_contact: data.date_of_contact
      });
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) }).catch(() => { });
      await refresh();
      setModalOpen(false);
      toast({ title: "Saved", description: "Prospect updated." });

      // AUDIT for Employee
      const user = getCurrentUser();
      if (user?.role === 'employee') {
        await auditEmployeeAction(data.id ? 'update' : 'create', 'Prospect', data);
      }
    } catch (err: any) {
      console.error('❌ Supabase upsertSupabaseCustomer failed:', err);
      const saved = await upsertCustomer(data as any);
      await refresh();
      setModalOpen(false);
      toast({
        title: "Saved locally",
        description: `Backend unavailable: ${err?.message || 'Connection error'}`,
        variant: 'default'
      });
    }
  };

  const handleArchiveId = async (c: Customer) => {
    if (isDemoMode) {
      toast({ title: "Simulation Mode", description: "Status updated locally." });
      await upsertCustomer({ ...c, is_archived: !c.is_archived } as any);
      await refresh();
      return;
    }
    const newVal = !c.is_archived;
    try {
      await upsertSupabaseCustomer({ ...c, is_archived: newVal });
      await refresh();
      toast({ title: newVal ? "Archived" : "Restored", description: `${c.name} has been ${newVal ? 'archived' : 'restored'}.` });
    } catch (e) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const filterByDate = (customer: Customer) => {
    const now = new Date();
    const baseDateStr = (customer as any).created_at || (customer as any).updated_at || customer.lastService;
    if (!baseDateStr) return dateFilter === "all";
    const d = new Date(baseDateStr);

    if (dateFilter === "today") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }
    if (dateFilter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (dateFilter === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (dateFilter === "year") {
      return d.getFullYear() === now.getFullYear();
    }
    // "all"
    return true;
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(customer => {
    // Archive Filter - Strict Toggle (Show ONLY archived if true, otherwise show ONLY active)
    if (showArchived) {
      if (!customer.is_archived) return false;
    } else {
      if (customer.is_archived) return false;
    }

    const matchesSearch = (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').includes(searchTerm) ||
      (customer.vehicle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.year || '').includes(searchTerm);
    return matchesSearch && filterByDate(customer);
  });

  const handleDelete = async () => {
    if (!deleteCustomerId) return;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(deleteCustomerId)) {
        await deleteSupabaseCustomer(deleteCustomerId);
      }
      await removeCustomer(deleteCustomerId).catch(() => { });
      await refresh();
      toast({ title: "Deleted", description: "Prospect permanently removed." });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error?.message || "Could not delete prospect.", variant: "destructive" });
    }
    setDeleteCustomerId(null);
  };

  const generatePDF = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`Prospects List (${showArchived ? 'Archived' : 'Active'})`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y);
    y += 15;

    filteredCustomers.forEach((c) => {
      // Check page break with more buffer for larger items
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFillColor(168, 85, 247); // Purple header
      doc.rect(14, y, pageWidth - 28, 10, 'F');

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || "Unknown Prospect", 18, y + 7);
      y += 15;

      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      // Column 1
      doc.text(`Phone: ${c.phone || "N/A"}`, 18, y);
      doc.text(`Email: ${c.email || "N/A"}`, 18, y + 5);
      doc.text(`Address: ${c.address || "N/A"}`, 18, y + 10);
      doc.text(`Acquisition: ${c.howFound || 'N/A'}${c.howFoundOther ? ` (${c.howFoundOther})` : ''}`, 18, y + 15);

      // Column 2 - Vehicle
      const vehInfo = `${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`;
      doc.text(`Vehicle: ${vehInfo}`, 110, y);
      doc.text(`Type: ${c.vehicleType || 'N/A'}`, 110, y + 5);
      doc.text(`Color: ${c.color || 'N/A'}`, 110, y + 10);
      doc.text(`Mileage: ${c.mileage || 'N/A'}`, 110, y + 15);

      // Condition
      y += 25;
      doc.setFont("helvetica", "bold");
      doc.text("Condition / Notes:", 18, y);
      doc.setFont("helvetica", "normal");

      const conditionText = `Inside: ${c.conditionInside || 'N/A'}  |  Outside: ${c.conditionOutside || 'N/A'}`;
      doc.text(conditionText, 18, y + 5);

      // Notes wrapping
      if (c.notes) {
        const splitNotes = doc.splitTextToSize(c.notes, pageWidth - 40);
        doc.text(splitNotes, 18, y + 10);
        y += (splitNotes.length * 5) + 5;
      } else {
        doc.text("No additional notes.", 18, y + 10);
        y += 10;
      }

      y += 10;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;
    });

    if (download) {
      const fileName = `prospects_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      try {
        const dataUrl = doc.output('datauristring');
        savePDFToArchive('Prospects', 'Prospects', `prospects-${Date.now()}`, dataUrl, { fileName, silent: true });
        toast({ title: 'Archived', description: 'Saved to File Manager' });
      } catch (e) { }
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const openGallery = (customer: Customer, startIndex = 0) => {
    const photos: { url: string; label?: string; type?: "image" | "video"; description?: string; }[] = [];
    const meta: any[] = [];
    const seenUrls = new Set<string>();

    const addPhoto = (url: string, label: string, m: any) => {
      if (!url) return;

      let finalUrl = url;
      let description = undefined;
      const isVideo = m.field === 'videoUrls' || m.field === 'videoUrl';

      if (isVideo) {
        const parts = url.split(':::');
        finalUrl = parts[0];
        description = parts[1];
      }

      if (seenUrls.has(finalUrl)) return;
      seenUrls.add(finalUrl);

      photos.push({ 
        url: finalUrl, 
        label, 
        type: isVideo ? 'video' : 'image',
        description 
      });
      meta.push(m);
    };
    
    customer.generalPhotos?.forEach((url, idx) => {
      addPhoto(url, "General", { type: 'customer', field: 'generalPhotos', arrayIndex: idx, customerId: customer.id });
    });
    customer.beforePhotos?.forEach((url, idx) => {
      addPhoto(url, "Before", { type: 'customer', field: 'beforePhotos', arrayIndex: idx, customerId: customer.id });
    });
    customer.afterPhotos?.forEach((url, idx) => {
      addPhoto(url, "After", { type: 'customer', field: 'afterPhotos', arrayIndex: idx, customerId: customer.id });
    });
    if (customer.videoUrl) {
      addPhoto(customer.videoUrl, "Customer Video", { type: 'customer', field: 'videoUrl', arrayIndex: 0, customerId: customer.id });
    }
    
    (customer.vehicles || []).forEach((v, vIdx) => {
      const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
      v.generalPhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · General`, { type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.beforePhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · Before`, { type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.afterPhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · After`, { type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.videoUrls?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · Video`, { type: 'vehicle', field: 'videoUrls', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
    });
    
    setGalleryPhotos(photos);
    setGalleryMetadata(meta);
    setGalleryInitialIndex(Math.min(startIndex, Math.max(0, photos.length - 1)));
    setGalleryOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const { index, metadata, customer } = photoToDelete;
    const m = metadata || (index !== undefined ? galleryMetadata[index] : null);
    if (!m) return;

    try {
      const updatedCustomer = { ...customer };
      if (m.type === 'customer') {
        const arr = [...(updatedCustomer[m.field as keyof Customer] as string[])];
        arr.splice(m.arrayIndex, 1);
        (updatedCustomer as any)[m.field] = arr;
      } else if (m.type === 'vehicle') {
        const vehicles = [...(updatedCustomer.vehicles || [])];
        const v = { ...vehicles[m.vehicleIndex] };
        const arr = [...(v[m.field as keyof typeof v] as string[])];
        arr.splice(m.arrayIndex, 1);
        (v as any)[m.field] = arr;
        vehicles[m.vehicleIndex] = v;
        updatedCustomer.vehicles = vehicles;
      }

      await upsertSupabaseCustomer(updatedCustomer);
      toast({ title: "Deleted", description: "Photo removed from archive." });
      setGalleryOpen(false);
      refresh();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
    } finally {
      setPhotoToDelete(null);
    }
  };

  const toggleMap = (id: string) => { setOpenMaps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleCustomer = (id: string) => { 
    const isExpanding = !expandedCustomers.includes(id);
    setExpandedCustomers(prev => (prev.includes(id) ? [] : [id])); 
    setAllExpanded(false); 
    
    if (isExpanding) {
      // Immediately scroll to top so the filtered single-card is visible
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      // Then fine-tune to the element position after React re-renders
      setTimeout(() => {
        const el = document.getElementById(`customer-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          window.scrollTo({
            top: rect.top + scrollTop - 100,
            behavior: "smooth"
          });
        }
      }, 250);
    }
  };
  const toggleAll = () => {
    if (allExpanded) setExpandedCustomers([]);
    else setExpandedCustomers(filteredCustomers.map(c => c.id!));
    setAllExpanded(!allExpanded);
  };

  const totalProspects = filteredCustomers.length;
  const newThisMonth = filteredCustomers.filter(c => {
    const dStr = (c as any).created_at || (c as any).createdAt;
    const d = dStr ? new Date(dStr) : new Date();
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Prospects" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">Prospects Overview</h2>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'prospects' } }))}
                    className="p-1 text-zinc-500 hover:text-purple-400 transition-colors"
                    title="Prospects Help"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-zinc-400 text-sm">Track potential clients and leads</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{showArchived ? 'Archived' : 'Active'}</p>
                <p className="text-3xl font-bold text-white mt-1">{totalProspects}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">New This Month</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{newThisMonth}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search prospects..." 
              className="pl-10 pr-10 bg-zinc-950 border-zinc-800" 
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Quick date-filter pills */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
              {([
                { key: "today", label: "Today",  Icon: Sun },
                { key: "week",  label: "Week",   Icon: CalendarDays },
                { key: "month", label: "Month",  Icon: Calendar },
                { key: "year",  label: "Year",   Icon: CalendarRange },
                { key: "all",   label: "All",    Icon: CalendarCheck },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  title={key === "today" ? "Today" : key === "week" ? "This Week" : key === "month" ? "This Month" : key === "year" ? "This Year" : "All Time"}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                    dateFilter === key
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              {/* Clear / reset to default (all) */}
              {dateFilter !== "all" && (
                <button
                  onClick={() => setDateFilter("all")}
                  title="Reset to All Time"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ml-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              className="gap-2 text-zinc-400 hover:text-white"
            >
              <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant={showArchived ? "secondary" : "ghost"}
              onClick={() => setShowArchived(!showArchived)}
              className={cn("text-zinc-400 hover:text-white", showArchived && "bg-amber-600/20 text-amber-500 border-amber-600/30")}
            >
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button variant="outline" onClick={() => generatePDF(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-200">
              <Save className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
            {filteredCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-zinc-400">
                {allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {expandedCustomers.length > 0 && (
          <div className="mb-6 flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setExpandedCustomers([])}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-4 py-2 flex items-center gap-2 transition-all text-xs tracking-wider shadow-lg shadow-purple-500/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Prospects
              </Button>
              <span className="text-zinc-500 text-xs font-semibold">|</span>
              <span className="text-zinc-300 text-xs font-black uppercase tracking-wider">
                Viewing Selected Prospect Profile
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800/50">
              Single-Prospect Mode
            </div>
          </div>
        )}

        {/* Accordion Cards View — unified for all screen sizes */}
        <div className="space-y-4">
          {[...filteredCustomers]
            .sort((a, b) => { const da = (a as any).updated_at || ""; const db = (b as any).updated_at || ""; return (db ? new Date(db).getTime() : 0) - (da ? new Date(da).getTime() : 0); })
            .filter((customer) => {
              if (expandedCustomers.length > 0) {
                return expandedCustomers.includes(customer.id!);
              }
              return true;
            })
            .map((customer) => {
              const isExpanded = expandedCustomers.includes(customer.id!);

              return (
                <div key={customer.id} id={`customer-${customer.id}`} className="border border-purple-500/20 rounded-xl overflow-hidden bg-zinc-900/50 transition-all hover:border-purple-500/40">
                  <div className="p-3 sm:p-4 bg-purple-500/5 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-purple-500/10 transition-colors gap-3 sm:gap-4" onClick={() => toggleCustomer(customer.id!)}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`h-2 w-2 rounded-full ${isExpanded ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'}`} />

                      {(() => {
                        const allPhotos: string[] = Array.from(new Set([
                          ...(customer.generalPhotos || []),
                          ...(customer.beforePhotos || []),
                          ...(customer.afterPhotos || []),
                          ...((customer.vehicles || []).flatMap(v => [
                            ...(v.generalPhotos || []),
                            ...(v.beforePhotos || []),
                            ...(v.afterPhotos || [])
                          ]))
                        ])).filter(Boolean);

                        if (allPhotos.length > 0) {
                          return (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <div
                                className="h-12 w-12 rounded-lg border-2 border-zinc-700 overflow-hidden cursor-pointer hover:border-purple-400 transition-all hover:scale-105"
                                onClick={() => openGallery(customer, 0)}
                              >
                                <img src={allPhotos[0]} alt={customer.name} className="h-full w-full object-cover" />
                              </div>
                              {allPhotos.length > 1 && (
                                <button
                                  onClick={() => openGallery(customer, 0)}
                                  className="h-12 w-12 rounded-lg border-2 border-purple-500/50 bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all hover:scale-105"
                                >
                                  +{allPhotos.length - 1}
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-purple-400 flex items-center justify-center text-zinc-400 font-bold"
                            onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                          >
                            <span>{(customer.name || 'U').charAt(0).toUpperCase()}</span>
                          </div>
                        );
                      })()}

                      <div>
                        <h3 className="font-bold text-zinc-200 text-lg flex items-center gap-2">
                          {customer.name}
                          {customer.is_archived && (
                            <Badge variant="outline" className="h-5 bg-zinc-500/20 text-zinc-500 border-zinc-500/30 gap-1 px-1.5 ml-1">
                              <Archive className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-tight">ARCHIVED</span>
                            </Badge>
                          )}
                        </h3>
                        <div className="flex gap-3 text-sm text-zinc-400">
                          <span>{customer.phone || 'No phone'}</span>
                          {(customer.vehicle || customer.model) && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline">
                                {`${customer.year || ''} ${customer.vehicle || ''} ${customer.model || ''}`.trim()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <div className="flex gap-1 mr-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleArchiveId(customer); }} 
                          className={cn("h-8 px-2 text-xs gap-1 transition-all", customer.is_archived ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-zinc-400 hover:text-amber-400")} 
                          title={customer.is_archived ? "Restore" : "Archive"}
                        >
                          {customer.is_archived ? <><RotateCcw className="h-4 w-4" /> Restore</> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            handlePreviewPdf(customer.id!);
                          }} 
                          className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300"
                          title="Preview Prospect Report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(customer); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteCustomerId(customer.id!); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 sm:p-6 border-t border-purple-500/10 bg-zinc-900/30 animate-in slide-in-from-top-2">
                      <div className="flex flex-wrap justify-end mb-4 sm:mb-6 gap-2 border-b border-zinc-800 pb-3 sm:pb-4">
                        {!customer.is_archived && (
                          <>
                            <Button variant="outline" size="sm" className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" asChild>
                              <Link to={`/estimates?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name || '')}`}>
                                <FileBarChart className="h-4 w-4 mr-2" /> Estimates
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-9 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300">
                              <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&email=${encodeURIComponent(customer.email || '')}&phone=${encodeURIComponent(customer.phone || '')}&address=${encodeURIComponent(customer.address || '')}&vehicleYear=${encodeURIComponent(customer.year || '')}&vehicleMake=${encodeURIComponent(customer.vehicle || '')}&vehicleModel=${encodeURIComponent(customer.model || '')}&vehicleType=${encodeURIComponent(customer.vehicleType || '')}&vehicleColor=${encodeURIComponent(customer.color || '')}&notes=${encodeURIComponent(customer.notes || '')}`}><CalendarPlus className="h-4 w-4 mr-2" /> Book Appointment</Link>
                            </Button>
                          </>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 border-zinc-700 hover:bg-zinc-800"><Link to={`/service-checklist?customerId=${customer.id}`}><FileBarChart className="h-4 w-4 mr-2" /> Start Service</Link></Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: IDENTIFICATION & GARAGE */}
                        <div className="space-y-6">
                           <section>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Garage ({customer.vehicles?.length || 0})</h4>
                                <button 
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'vehicle-management' } }))}
                                  className="text-zinc-600 hover:text-blue-400 transition-colors"
                                  title="Vehicle Help"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-purple-400 hover:text-purple-300 gap-1"
                                onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD VEHICLE
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {(() => {
                                const vehicles = customer.vehicles || [];
                                if (vehicles.length === 0) {
                                  const v_year = (customer.year && customer.year !== '-' && customer.year !== '---') ? customer.year : '';
                                  const v_make = customer.vehicle || '-';
                                  const v_model = customer.model || '';
                                  return (
                                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800/50 flex items-center justify-between">
                                      <div>
                                        <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Primary Vehicle</div>
                                        <div className="text-zinc-200 text-sm font-black tracking-tight">{v_year ? `${v_year} ` : ''}{v_make} {v_model}</div>
                                        <div className="text-[9px] text-zinc-500 font-bold uppercase">Legacy Profile {customer.color ? `• ${customer.color}` : ''}</div>
                                      </div>
                                      <Badge variant="outline" className="text-[8px] text-zinc-600 border-zinc-800">LEGACY DATA</Badge>
                                    </div>
                                  );
                                }

                                return vehicles.map((v: any, vIdx: number) => {
                                  const vy = (v.year && v.year !== '-' && v.year !== '---') ? v.year : '';
                                  return (
                                    <div key={vIdx} className="bg-zinc-950 p-3 rounded border border-zinc-800/50 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                          <Car className="w-3.5 h-3.5 text-purple-400" />
                                        </div>
                                        <div>
                                          <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">{vIdx === 0 ? 'Primary Vehicle' : `Vehicle #${vIdx+1}`}</div>
                                          <div className="text-zinc-200 text-sm font-black tracking-tight">{vy ? `${vy} ` : ''}{v.make} {v.model}</div>
                                          <div className="text-[9px] text-zinc-500 font-bold uppercase">{v.type || 'No Type Set'} {v.color ? ` • ${v.color}` : ''}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            openEdit(customer, "profile");
                                          }}
                                          title="Edit Vehicle"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {isAdmin && v.id && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (confirm(`Delete ${vy} ${v.make || ''} ${v.model || ''}?`)) {
                                                try {
                                                  await deleteSupabaseVehicle(v.id);
                                                  toast({ title: "Vehicle Deleted" });
                                                  refresh();
                                                } catch (err: any) {
                                                  toast({ title: "Error", description: err.message, variant: "destructive" });
                                                }
                                              }
                                            }}
                                            title="Delete Vehicle"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </section>

                          {/* NEW: Attached Estimates Section */}
                          <section className="mt-6 pt-6 border-t border-zinc-800/60">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <FileBarChart className="h-3.5 w-3.5 text-emerald-400" /> Attached Estimates ({(estimates || []).filter(e => e.customerId === customer.id).length})
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-purple-400 hover:text-purple-300 gap-1"
                                asChild
                              >
                                <Link to={`/estimates?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name || '')}`}>
                                  <Plus className="w-2.5 h-2.5" /> ADD ESTIMATE
                                </Link>
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {(() => {
                                const customerEsts = (estimates || []).filter(e => e.customerId === customer.id);
                                if (customerEsts.length === 0) {
                                  return (
                                    <div className="py-6 text-center border border-dashed border-zinc-800 rounded-2xl opacity-40">
                                      <div className="text-[10px] font-black uppercase tracking-widest">No attached estimates.</div>
                                    </div>
                                  );
                                }

                                return customerEsts.map((est: any) => (
                                  <div key={est.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-emerald-500/30 transition-all flex flex-col gap-2 relative overflow-hidden group">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ESTIMATE #${est.estimateNumber || est.id.slice(-6).toUpperCase()}</span>
                                        <div className="text-zinc-300 text-xs font-bold mt-0.5">{est.date || new Date(est.createdAt).toLocaleDateString()}</div>
                                      </div>
                                      <Badge variant="outline" className={cn(
                                        "text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md",
                                        est.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        est.status === 'open' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                        "bg-zinc-800 text-zinc-400 border-zinc-700"
                                      )}>
                                        {est.status}
                                      </Badge>
                                    </div>
                                    
                                    <div className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                                      {est.services?.map((s: any) => s.name).join(', ') || 'No services added'}
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-900">
                                      <div className="text-sm font-black text-emerald-500">${(est.total || 0).toFixed(2)}</div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[10px] font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!customer.email) {
                                              toast({
                                                title: "No Email Provided",
                                                description: "This prospect does not have an email address on file.",
                                                variant: "destructive"
                                              });
                                              return;
                                            }
                                            toast({ title: "Sending Estimate", description: `Outreach to ${customer.email} in progress...` });
                                            try {
                                              await onSendProspectEstimateEmail(customer, est);
                                              toast({
                                                title: "Estimate Sent",
                                                description: `Successfully emailed Estimate #${est.estimateNumber} to ${customer.name}.`,
                                              });
                                              refresh();
                                            } catch (err: any) {
                                              toast({
                                                title: "Send Failed",
                                                description: err.message || "An error occurred while sending.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <Send className="w-3 h-3" /> SEND
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[10px] text-zinc-400 hover:text-white"
                                          asChild
                                        >
                                          <Link to={`/estimates?id=${est.id}`}>
                                            INSPECT
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </section>

                          <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Admin Directives & Notes
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-purple-400 hover:text-purple-300 gap-1"
                                onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD NOTE
                              </Button>
                            </div>
                            
                            {customer.notes ? (
                              <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-sm text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
                                "{customer.notes}"
                              </div>
                            ) : (
                              <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl opacity-40">
                                <div className="text-[10px] font-black uppercase tracking-widest">No internal directives set.</div>
                              </div>
                            )}
                            
                            {(() => {
                              const photos = parseAttachedPhotos(customer.notes);
                              if (photos.length === 0) return null;
                              return (
                                <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-3">
                                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
                                    <ImageIcon className="h-4 w-4" />
                                    Customer Uploaded Photos ({photos.length})
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {photos.map((url, i) => (
                                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group">
                                        <img 
                                          src={url} 
                                          alt={`Attached ${i + 1}`} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(url, '_blank');
                                          }}
                                        />
                                        <a 
                                          href={url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="absolute bottom-1.5 right-1.5 p-1 bg-black/85 rounded-md text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <ExternalLink className="h-3 w-3" /> View Full
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </section>
                        </div>

                        {/* RIGHT COLUMN: CONTACT & NOTES */}
                        <div className="space-y-6">
                           <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Communication Overview</h4>
                                <button 
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'retention-hub' } }))}
                                  className="text-zinc-600 hover:text-purple-400 transition-colors"
                                  title="Engagement Hub Help"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="outline" 
                                  className="w-full bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl group px-2"
                                  onClick={() => navigate(`/follow-up-center?search=${encodeURIComponent(customer.name)}`)}
                                >
                                  <Zap className="w-4 h-4 text-amber-500 group-hover:animate-pulse shrink-0" />
                                  <span className="truncate">Engagement Hub</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full bg-purple-900/20 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-900/40 gap-2 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl group px-2"
                                  onClick={() => {
                                    const vehicleStr = customer.vehicle 
                                      ? `${customer.year && customer.year !== '-' ? customer.year : ''} ${customer.vehicle || ''} ${customer.model || ''}`.trim()
                                      : '';
                                    const bodyStr = vehicleStr ? `\n\nVehicle Information:\n${vehicleStr}` : '';
                                    const url = `/letter-maker?customerId=${customer.id || ''}&body=${encodeURIComponent(bodyStr)}`;
                                    window.open(url, '_blank');
                                  }}
                                >
                                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                                  <span className="truncate">Write Letter</span>
                                </Button>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Email</div><div className="text-zinc-300 text-sm font-semibold truncate">{customer.email || '—'}</div></div>
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Address</div><div className="text-zinc-300 text-sm flex items-center gap-2">{customer.address || '—'} {customer.address && (<Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-purple-400" onClick={(e) => { e.stopPropagation(); toggleMap(customer.id!); }}><MapPin className="h-3 w-3 mr-1" />{openMaps.includes(customer.id!) ? "Hide Map" : "Map"}</Button>)}</div></div>
                                 <div className="pt-4 border-t border-zinc-800/50">
                                   <div className="flex items-center justify-between mb-2">
                                     <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest block">Relationship Metadata</span>
                                     <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300 text-[10px]">{customer.howFound === 'other' ? customer.howFoundOther : customer.howFound || 'Manual Entry'}</Badge>
                                   </div>
                                   <div className="pt-2 pb-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-9 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewEmailForBooking({
                                            customer: customer.name,
                                            customerEmail: customer.email,
                                            customerPhone: customer.phone,
                                            address: customer.address,
                                            vehicle: customer.vehicle,
                                            vehicleYear: customer.year,
                                            vehicleMake: customer.vehicle,
                                            vehicleModel: customer.model,
                                            service: 'Premium Detailing Service'
                                          }, 'prospect');
                                        }}
                                      >
                                        <Mail className="h-3.5 w-3.5" /> Preview Welcome Email
                                      </Button>
                                    </div>
                                   <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Profile Created:</span>
                                        <span className="text-[9px] text-zinc-400 font-black uppercase">{(customer as any).created_at ? new Date((customer as any).created_at).toLocaleString() : '—'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Last Email Sent:</span>
                                        <span className="text-[9px] text-zinc-500 font-black uppercase">{(customer as any).last_email_sent_at ? new Date((customer as any).last_email_sent_at).toLocaleString() : 'NONE SENT'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Last Contact:</span>
                                        <span className="text-[9px] text-purple-400 font-black uppercase">{customer.date_of_contact ? new Date(customer.date_of_contact).toLocaleDateString() : '—'}</span>
                                      </div>
                                   </div>
                                 </div>
                              </div>
                           </section>
                           
                            <div className="hidden" style={{display: 'none'}}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                  <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Admin Directives & Notes
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[9px] font-black text-purple-400 hover:text-purple-300 gap-1"
                                  onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                                >
                                  <Plus className="w-2.5 h-2.5" /> ADD NOTE
                                </Button>
                              </div>
                              
                              {customer.notes ? (
                                <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-sm text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
                                  "{customer.notes}"
                                </div>
                              ) : (
                                <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl opacity-40">
                                  <div className="text-[10px] font-black uppercase tracking-widest">No internal directives set.</div>
                                </div>
                              )}
                                                          {(() => {
                                 const photos = parseAttachedPhotos(customer.notes);
                                 if (photos.length === 0) return null;
                                 return (
                                   <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-3">
                                     <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
                                       <ImageIcon className="h-4 w-4" />
                                       Customer Uploaded Photos ({photos.length})
                                     </div>
                                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                       {photos.map((url, i) => (
                                         <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group">
                                           <img 
                                             src={url} 
                                             alt={`Attached ${i + 1}`} 
                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               window.open(url, '_blank');
                                             }}
                                           />
                                           <a 
                                             href={url} 
                                             target="_blank" 
                                             rel="noopener noreferrer" 
                                             className="absolute bottom-1.5 right-1.5 p-1 bg-black/85 rounded-md text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                                             onClick={e => e.stopPropagation()}
                                           >
                                             <ExternalLink className="h-3 w-3" /> View Full
                                           </a>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 );
                               })()}
                            </div>
                           {openMaps.includes(customer.id!) && customer.address && (<div className="mt-2 w-full h-48 rounded-lg overflow-hidden border border-zinc-800 shadow-2xl"><iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Map" /></div>)}
                        </div>
                      </div>

                      {/* FULL WIDTH ROW: COMBINED TIMELINE & HISTORY */}
                      <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           {/* RENAMED: Booking Lifecycle Section */}
                           <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                 <History className="h-3.5 w-3.5" /> Combined Session & Interaction Timeline
                                 <button 
                                   onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-flow' } }))}
                                   className="text-zinc-600 hover:text-purple-400 transition-colors"
                                   title="Booking Help"
                                 >
                                   <HelpCircle className="h-3 w-3" />
                                 </button>
                               </h4>
                               <div className="flex items-center gap-2">
                                    <Button
                                   variant="outline"
                                   size="sm"
                                   className="h-8 text-[10px] font-black text-emerald-400 hover:text-white border-emerald-500/20 hover:bg-emerald-500 px-4 rounded-lg transition-all gap-1.5"
                                   onClick={async (e) => { 
                                     e.stopPropagation(); 
                                     handlePreviewPdf(customer.id!);
                                   }}
                                 >
                                   <FileDown className="w-3 h-3" /> EXPORT REPORT
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-8 text-[10px] font-black text-purple-400 hover:text-white bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500 px-4 rounded-lg transition-all gap-1.5"
                                   onClick={(e) => { e.stopPropagation(); openEdit(customer, "crm"); }}
                                 >
                                   <Plus className="w-3 h-3" /> LOG ACTIVITY
                                 </Button>
                               </div>
                             </div>
                             
                             <UnifiedCustomerTimeline customer={customer} allBookings={allBookings} handlePreviewEmailForBooking={handlePreviewEmailForBooking} navigate={navigate} toast={toast} />
                           </section>
                        </div>

                      {/* MEDIA GALLERY - dynamic */}
                      {(() => {
                        const allMedia: {url: string; label: string; type: 'before'|'after'|'general'|'video'; metadata: any; isVideo?: boolean}[] = [];
                        const seenUrls = new Set<string>();

                        const addMedia = (url: string, label: string, type: 'before'|'after'|'general'|'video', m: any, isVideo = false) => {
                          if (!url || seenUrls.has(url)) return;
                          seenUrls.add(url);
                          allMedia.push({ url, label, type, metadata: m, isVideo });
                        };

                        customer.generalPhotos?.forEach((url, idx) => addMedia(url, 'General', 'general', { type: 'customer', field: 'generalPhotos', arrayIndex: idx, customerId: customer.id }));
                        customer.beforePhotos?.forEach((url, idx) => addMedia(url, 'Before', 'before', { type: 'customer', field: 'beforePhotos', arrayIndex: idx, customerId: customer.id }));
                        customer.afterPhotos?.forEach((url, idx) => addMedia(url, 'After', 'after', { type: 'customer', field: 'afterPhotos', arrayIndex: idx, customerId: customer.id }));
                        if (customer.videoUrl) {
                          addMedia(customer.videoUrl, 'Video', 'video', { type: 'customer', field: 'videoUrl', arrayIndex: 0, customerId: customer.id }, true);
                        }
                        
                        (customer.vehicles || []).forEach((v, vIdx) => {
                          const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
                          v.generalPhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - General', 'general', { type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.beforePhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - Before', 'before', { type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.afterPhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - After', 'after', { type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.videoUrls?.forEach((url, idx) => addMedia(url, vLabel + ' - Video', 'video', { type: 'vehicle', field: 'videoUrls', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }, true));
                        });
                        
                        if (allMedia.length === 0) return null;

                        const displayMedia = allMedia.slice(0, 12);

                        return (
                          <div className="mt-12 pt-8 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <ImageIcon className="h-3 w-3" /> Media Archive ({allMedia.length} items)
                              </h4>
                               <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-black border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                                  onClick={() => openEdit(customer, "media")}
                                >
                                  <Plus className="w-3 h-3" /> ADD MEDIA
                                </Button>
                                {allMedia.length > 0 && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1.5"
                                    onClick={() => navigate(`/vehicle-gallery?search=${encodeURIComponent(customer.name)}&from=prospects`)}
                                  >
                                    VIEW ALL <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {displayMedia.map((m, i) => {
                                const ytThumb = m.isVideo ? getYouTubeThumbnail(m.url) : null;
                                return (
                                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-purple-400 transition-all hover:scale-[1.03] shadow-xl" onClick={() => openGallery(customer, i)}>
                                    {m.isVideo ? (
                                      <div className="w-full h-full relative">
                                        {ytThumb ? (
                                          <img src={ytThumb} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <Video className="w-8 h-8 text-zinc-700" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={m.url} alt={m.label} className="w-full h-full object-cover" />
                                    )}
                                    <div className={cn(
                                      "absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded text-white font-black uppercase",
                                      m.type === 'before' ? 'bg-orange-600/80' : 
                                      m.type === 'after' ? 'bg-emerald-600/80' : 
                                      m.type === 'video' ? 'bg-pink-600/80' :
                                      'bg-zinc-600/80'
                                    )}>{m.type}</div>
                                    
                                    {isAdmin && (
                                      <button 
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-lg z-10"
                                        onClick={(e) => { e.stopPropagation(); setPhotoToDelete({ metadata: m.metadata, customer }); }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
        </div>


      </main>

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete <strong>{customerToDelete?.name || 'this prospect'}</strong>, 
              all <strong>{impactCounts.vehicles} related vehicle(s)</strong>, 
              and detach <strong>{impactCounts.bookings} booking(s)</strong> from this profile. 
              <br /><br />
              Booking history will be preserved as a snapshot, but the link to this prospect record will be removed. 
              <strong> This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                const user = getCurrentUser();
                if (user?.role !== 'admin') {
                  toast({
                    title: "Access Denied",
                    description: "You do not have permission to delete prospects. This attempt has been logged.",
                    variant: "destructive"
                  });
                  setDeleteCustomerId(null);
                  return;
                }
                await handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PhotoGalleryLightbox
        photos={galleryPhotos}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        isAdmin={isAdmin}
        onDelete={(idx) => {
          const m = galleryMetadata[idx];
          if (!m) return;
          const customer = customers.find(c => c.id === m.customerId);
          if (customer) {
            setPhotoToDelete({ index: idx, customer });
          }
        }}
      />

      <AlertDialog open={photoToDelete !== null} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this photo from the archive? This will also remove it from the vehicle gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        initial={editing} 
        initialTab={activeModalTab}
        defaultType="prospect"
        onSave={onSaveModal} 
      />

      <EmailPreviewModal 
        open={showEmailPreview} 
        onOpenChange={setShowEmailPreview}
        type={emailPreviewType}
        data={emailFormData}
      />
    </div>
  );
}
