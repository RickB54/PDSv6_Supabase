import { useState, useEffect } from "react";
import { Customer, supabase } from "@/lib/supa-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Phone, MessageSquare, StickyNote, Plus, 
  Clock, Trash2, Pencil, Calendar, User, History,
  PhoneIncoming, PhoneOutgoing, Mail,
  CheckCircle2, AlertCircle, RefreshCw, Save
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

const formatForDatetimeLocal = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) {
    return "";
  }
};

export function ActivityLog({ customer, onRefresh, compact = false }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [note, setNote] = useState("");
  const [type, setType] = useState("note");
  
  // Custom Interaction Timestamp (defaults to current local time, but editable)
  const [customDate, setCustomDate] = useState<string>(() => formatForDatetimeLocal(new Date().toISOString()));

  // Edit Modal State
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editType, setEditType] = useState("note");
  const [editDate, setEditDate] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      const interactionTime = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

      const payload: any = {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        note: note.trim(),
        type: type,
        created_at: interactionTime
      };

      let newRecord: any = null;

      if (localStorage.getItem("demo_mode_active") === "true") {
        newRecord = { id: 'demo-' + Date.now(), ...payload };
      } else {
        const { data, error } = await supabase
          .from('engagements')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        newRecord = data;
      }

      toast.success("Activity logged");
      setNote("");
      setCustomDate(formatForDatetimeLocal(new Date().toISOString()));
      setIsAdding(false);
      if (newRecord) {
        setActivities(prev => [newRecord, ...prev].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()));
      }
      if (onRefresh) onRefresh();
    } catch (e: any) {
      console.error("Failed to log activity to Supabase", e);
      const interactionTime = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
      const localEntry = {
        id: 'local-' + Date.now(),
        type: type,
        note: note.trim(),
        created_at: interactionTime,
        date: interactionTime
      };
      
      const currentLog = (customer as any).activity_log || (customer as any).activityLog || [];
      (customer as any).activity_log = [localEntry, ...currentLog];
      
      setActivities(prev => [localEntry, ...prev].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()));
      toast.success("Activity logged");
      setNote("");
      setCustomDate(formatForDatetimeLocal(new Date().toISOString()));
      setIsAdding(false);
      if (onRefresh) onRefresh();
    }
  };

  const handleStartEdit = (act: any) => {
    setEditingActivity(act);
    setEditNote(act.note || "");
    setEditType(act.type || "note");
    const timeStr = act.created_at || act.timestamp || act.date || new Date().toISOString();
    setEditDate(formatForDatetimeLocal(timeStr));
  };

  const handleSaveEdit = async () => {
    if (!editingActivity) return;
    setIsSavingEdit(true);
    try {
      const newTimestamp = editDate ? new Date(editDate).toISOString() : new Date().toISOString();
      const updatedFields = {
        note: editNote.trim(),
        type: editType,
        created_at: newTimestamp
      };

      if (editingActivity.id && !editingActivity.id.startsWith("demo-") && !editingActivity.id.startsWith("local-")) {
        const { error } = await supabase
          .from('engagements')
          .update(updatedFields)
          .eq('id', editingActivity.id);
        if (error) throw error;
      }

      setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...updatedFields } : a).sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()));
      
      if ((customer as any).activity_log) {
        (customer as any).activity_log = (customer as any).activity_log.map((a: any) => a.id === editingActivity.id ? { ...a, ...updatedFields } : a);
      }

      toast.success("Interaction entry updated");
      setEditingActivity(null);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      console.error("Failed to update activity:", e);
      toast.error("Failed to update activity", { description: e.message });
    } finally {
      setIsSavingEdit(false);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Log New Interaction</label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 shadow-inner" title="Selected Interaction Date & Time">
              <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tight whitespace-nowrap">Time:</span>
              <input 
                type="datetime-local" 
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-zinc-900 text-zinc-100 text-xs font-bold border border-zinc-700/80 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 [color-scheme:dark] cursor-pointer"
              />
            </div>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 bg-zinc-100 border-zinc-200 text-zinc-950 text-[10px] font-black uppercase rounded-lg w-[140px] hover:bg-white transition-colors">
                <SelectValue placeholder="Type..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-950 z-[250]">
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

          {activities.map((act, idx) => {
            const displayTime = act.created_at || act.timestamp || act.date || new Date().toISOString();

            return (
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
                      <div className="text-[9px] text-zinc-400 font-bold flex flex-wrap items-center gap-x-2">
                        <span>{format(new Date(displayTime), 'MMMM dd, yyyy · p')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      onClick={() => handleStartEdit(act)}
                      title="Edit Entry & Timestamp"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      onClick={() => deleteActivity(act.id)}
                      title="Remove Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-zinc-300 font-medium italic leading-relaxed pl-3 border-l-2 border-blue-500/20 py-1 ml-1 whitespace-pre-wrap">
                  "{act.note}"
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md p-6 rounded-2xl shadow-2xl z-[300]">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit Interaction Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-zinc-400">Interaction Type</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-white text-xs font-bold rounded-xl">
                    <SelectValue placeholder="Type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white z-[350]">
                    <SelectItem value="note" className="text-xs font-semibold">General Note</SelectItem>
                    <SelectItem value="call_out" className="text-xs font-semibold">Outgoing Call</SelectItem>
                    <SelectItem value="call_in" className="text-xs font-semibold">Incoming Call</SelectItem>
                    <SelectItem value="text" className="text-xs font-semibold">Text Message</SelectItem>
                    <SelectItem value="email" className="text-xs font-semibold">Email</SelectItem>
                    <SelectItem value="attempt" className="text-xs font-semibold">Contact Attempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-400" /> Date & Time
                </Label>
                <input 
                  type="datetime-local" 
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full h-9 bg-zinc-900 text-zinc-100 text-xs font-bold border border-zinc-700 rounded-xl px-2 focus:outline-none focus:border-blue-500 [color-scheme:dark] cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Interaction Note</Label>
              <Textarea 
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white text-xs font-medium rounded-xl min-h-[100px] resize-none focus:ring-blue-500/20"
                placeholder="Enter notes..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setEditingActivity(null)}
              className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white h-9 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editNote.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5"
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
              <Save className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
