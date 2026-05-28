import { useState, useEffect } from "react";
import { Customer, supabase } from "@/lib/supa-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, MessageSquare, StickyNote, Plus, 
  Clock, Trash2, Calendar, User, History,
  PhoneIncoming, PhoneOutgoing, Mail,
  CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export interface ActivityEntry {
  id: string;
  type: string;
  note: string;
  created_at: string;
}

interface Props {
  customer: Customer;
  onRefresh?: () => void;
  compact?: boolean;
}

export function ActivityLog({ customer, onRefresh, compact = false }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [note, setNote] = useState("");
  const [type, setType] = useState("note");

  useEffect(() => {
    fetchActivities();
  }, [customer.id, customer.email]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .or(`customer_email.eq.${customer.email},customer_name.eq.${customer.name}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (e) {
      console.error("Failed to fetch activities", e);
      // Fallback to local activity_log if provided (demo/legacy)
      const log = (customer as any).activity_log || (customer as any).activityLog || [];
      setActivities(Array.isArray(log) ? [...log].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setIsAdding(true);
    try {
      const payload = {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        note: note.trim(),
        type: type,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('engagements')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success("Activity logged");
      setNote("");
      setIsAdding(false);
      setActivities([data, ...activities]);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error("Failed to log activity", { description: e.message });
      setIsAdding(false);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!confirm("Remove this log entry?")) return;
    try {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setActivities(activities.filter((a: any) => a.id !== id));
      toast.success("Log removed");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call_in': return <PhoneIncoming className="h-3.5 w-3.5 text-emerald-400" />;
      case 'call_out': return <PhoneOutgoing className="h-3.5 w-3.5 text-blue-400" />;
      case 'text': return <MessageSquare className="h-3.5 w-3.5 text-amber-400" />;
      case 'email': return <Mail className="h-3.5 w-3.5 text-indigo-400" />;
      case 'attempt': return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'rescheduled': return <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />;
      default: return <StickyNote className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'call_in': return 'Incoming Call';
      case 'call_out': return 'Outgoing Call';
      case 'text': return 'Text Message';
      case 'email': return 'Email Sent';
      case 'attempt': return 'Contact Attempt';
      case 'initial': return 'System Intro';
      case 'retention': return 'Retention Reminder';
      case 'rescheduled': return 'Rescheduling Event';
      default: return 'General Note';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {activities.slice(0, 2).map((act, idx) => (
          <div key={act.id || idx} className="flex items-start gap-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
            <div className="mt-0.5">{getActivityIcon(act.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-tight text-zinc-400 truncate">
                  {getActivityLabel(act.type)}
                </span>
                <span className="text-[9px] text-zinc-600 font-bold whitespace-nowrap">
                  {format(new Date(act.created_at), 'MMM d')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-tight line-clamp-1 italic">
                "{act.note}"
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-[10px] text-zinc-700 italic py-1">No recent activity recorded.</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-zinc-900/40 p-3 sm:p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Log New Interaction</label>
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 bg-zinc-100 border-zinc-200 text-zinc-950 text-[10px] font-black uppercase rounded-lg w-[140px] hover:bg-white transition-colors">
                <SelectValue placeholder="Type..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-950">
                <SelectItem value="note" className="text-[10px] font-bold hover:bg-zinc-100">General Note</SelectItem>
                <SelectItem value="call_out" className="text-[10px] font-bold hover:bg-zinc-100">Outgoing Call</SelectItem>
                <SelectItem value="call_in" className="text-[10px] font-bold hover:bg-zinc-100">Incoming Call</SelectItem>
                <SelectItem value="text" className="text-[10px] font-bold hover:bg-zinc-100">Text Message</SelectItem>
                <SelectItem value="email" className="text-[10px] font-bold hover:bg-zinc-100">Email</SelectItem>
                <SelectItem value="attempt" className="text-[10px] font-bold hover:bg-zinc-100">Contact Attempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea 
          placeholder="What happened? Enter notes about the interaction..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-zinc-50 border-zinc-200 border-2 min-h-[120px] text-zinc-900 text-sm font-semibold rounded-xl focus:ring-blue-500/20 placeholder:text-zinc-400 resize-none w-full shadow-inner ring-offset-white"
        />

        <Button 
          onClick={handleAddActivity}
          disabled={isAdding || !note.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isAdding ? "Saving..." : "Log Activity"}
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-px bg-zinc-800/50 mx-2" />

      {/* History List */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 px-1 opacity-50">
          <Clock className="h-3 w-3 text-zinc-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Full Interaction History</span>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {loading && (
            <div className="text-[10px] text-zinc-700 italic py-12 border border-dashed border-zinc-800 rounded-2xl text-center animate-pulse">
              Syncing activity log...
            </div>
          )}
          
          {!loading && activities.length === 0 && (
            <div className="text-[10px] text-zinc-500 italic px-4 py-12 border border-dashed border-zinc-800/80 rounded-2xl text-center flex flex-col items-center gap-3">
              <div className="h-10 w-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
                <History className="h-5 w-5" />
              </div>
              No interactions recorded for this profile yet.
            </div>
          )}

          {activities.map((act, idx) => (
            <div key={act.id || idx} className="group relative flex flex-col gap-2 p-3 sm:p-4 bg-zinc-950/40 rounded-2xl border border-white/5 text-[10px] hover:border-blue-500/20 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    {getActivityIcon(act.type)}
                  </div>
                  <div>
                    <div className="text-zinc-200 font-black uppercase tracking-tight leading-none mb-0.5">
                      {getActivityLabel(act.type)}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-bold">
                      {format(new Date(act.created_at), 'MMMM dd, yyyy · p')}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteActivity(act.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-zinc-300 font-medium italic leading-relaxed pl-3 border-l-2 border-blue-500/20 py-1 ml-1">
                "{act.note}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
