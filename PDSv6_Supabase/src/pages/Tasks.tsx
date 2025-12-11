import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { useTasksStore, parseTaskInput, Task, TaskPriority, TaskStatus } from "@/store/tasks";
import api from "@/lib/api";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { CalendarDays, CheckSquare, Trash2, Edit, Clock, User, Paperclip, ListChecks, Filter, GripVertical, ChevronDown, Save, X, MessageSquare, HelpCircle, LayoutTemplate, ArrowUpDown, ChevronsUpDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Tasks() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const { items, filter, search, selectedIds, refresh, add, update, remove, reorder, setFilter, setSearch, toggleSelect, clearSelection, bulkComplete, bulkDelete } = useTasksStore();
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [sortedByPriority, setSortedByPriority] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [editingMap, setEditingMap] = useState<Record<string, Task>>({});
  const [expandAll, setExpandAll] = useState(false);
  const dragIdRef = useRef<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  // Team Communication state
  const [chatMessages, setChatMessages] = useState<{ id: string; author: string; text: string; at: string }[]>([]);
  const [newChatText, setNewChatText] = useState("");

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    (async () => {
      try {
        const list = await api('/api/users/employees', { method: 'GET' });
        setEmployees(Array.isArray(list) ? list : []);
      } catch { setEmployees([]); }
    })();
  }, []);
  useEffect(() => {
    // Load team chat history
    (async () => {
      try {
        const raw = await localforage.getItem('task_chat');
        const arr = Array.isArray(raw) ? raw as any[] : [];
        setChatMessages(arr.map(m => ({ id: m.id, author: m.author, text: m.text, at: m.at })));
      } catch { setChatMessages([]); }
    })();
  }, []);
  useEffect(() => {
    // Mark read receipt when opening tasks
    Object.values(editingMap).forEach(task => {
      const id = task?.id;
      if (id) {
        try { useTasksStore.getState().markRead(id); } catch { }
      }
    });
  }, [editingMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);
    return items
      .filter(t => {
        if (!q) return true;
        const blob = `${t.title} ${t.description} ${t.notes}`.toLowerCase();
        return blob.includes(q);
      })
      .filter(t => {
        // Enforce employee-only visibility to assigned tasks
        if (isEmployee) {
          const me = [user?.email, user?.name].filter(Boolean).map(s => String(s).toLowerCase());
          const assigned = Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []);
          const hasMe = assigned.some((a: any) => me.includes(String(a.email || a.name || '').toLowerCase()));
          if (!hasMe) return false;
        }
        switch (filter) {
          case 'mine': {
            const me = [user?.email, user?.name].filter(Boolean).map(s => String(s).toLowerCase());
            const assigned = Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []);
            return !!user && assigned.some((a: any) => me.includes(String(a.email || a.name || '').toLowerCase()));
          }
          case 'overdue': {
            if (!t.dueDate || t.status === 'completed') return false;
            const due = new Date(t.dueDate + 'T' + (t.dueTime || '23:59') + ':00');
            return due.getTime() < Date.now();
          }
          case 'today': return t.dueDate === todayStr;
          case 'upcoming': {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate + 'T' + (t.dueTime || '00:00') + ':00');
            const today = new Date(todayStr + 'T00:00:00');
            return due.getTime() >= today.getTime();
          }
          default: return true;
        }
      })
      .sort((a, b) => {
        if (sortedByPriority) {
          const pMap: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          const pA = pMap[a.priority || 'low'] || 0;
          const pB = pMap[b.priority || 'low'] || 0;
          if (pA !== pB) return pB - pA;
        }
        return (a.order || 0) - (b.order || 0);
      });
  }, [items, filter, search, user, isEmployee, sortedByPriority]);

  const handleQuickAdd = async () => {
    const parsed = parseTaskInput(quickAdd);
    // Employees can add tasks, but they'll be auto-assigned to themselves.
    const rec = await add(isAdmin ? parsed : {
      ...parsed,
      assignees: [{ email: user?.email, name: user?.name }]
    });
    setQuickAdd("");
    toast({ title: "Task Added", description: rec.title });
  };

  const startDrag = (id: string) => { dragIdRef.current = id; };
  const onDrop = (targetId: string) => {
    const from = dragIdRef.current; if (!from) return;
    const ids = filtered.map(t => t.id);
    const fromIdx = ids.indexOf(from);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, from);
    reorder(ids);
    dragIdRef.current = null;
  };

  const priorities: { key: TaskPriority; label: string; color: string }[] = [
    { key: 'low', label: 'Low', color: 'bg-zinc-700 text-zinc-200' },
    { key: 'medium', label: 'Medium', color: 'bg-blue-700 text-blue-50' },
    { key: 'high', label: 'High', color: 'bg-orange-700 text-orange-50' },
    { key: 'urgent', label: 'Urgent', color: 'bg-red-700 text-red-50' },
  ];
  const statuses: { key: TaskStatus; label: string }[] = [
    { key: 'not_started', label: 'Not Started' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'completed', label: 'Completed' },
    { key: 'acknowledged', label: 'Acknowledged' },
  ];

  const TemplateButtons = () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => add({ title: 'Pre-detail checklist', checklist: ['Gather tools', 'Prep wash', 'Inspect damage'].map(t => ({ id: `chk_${Math.random().toString(36).slice(2, 6)}`, text: t, done: false })) })}>Pre-detail checklist</Button>
      <Button variant="outline" size="sm" onClick={() => add({ title: 'Post-detail cleanup', checklist: ['Final photos', 'Cleanup bay', 'Invoice prep'].map(t => ({ id: `chk_${Math.random().toString(36).slice(2, 6)}`, text: t, done: false })) })}>Post-detail cleanup</Button>
    </div>
  );

  return (
    <div className="p-4 overflow-x-hidden min-h-screen">
      <PageHeader title="Tasks" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Main Content */}
        <div className="space-y-4">
          <Card className="p-4 bg-[#0f0f13] border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              {(isAdmin || isEmployee) && (
                <>
                  <Input placeholder="e.g., Follow up with John tomorrow at 3 PM" value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} className="flex-1" />
                  <Button onClick={handleQuickAdd}>Add</Button>
                </>
              )}
              <Select value={view} onValueChange={(v) => setView(v as any)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
              <Button size="icon" variant={expandAll ? 'secondary' : 'outline'} onClick={() => {
                const next = !expandAll;
                setExpandAll(next);
                if (next) {
                  const map: Record<string, Task> = {};
                  filtered.forEach(t => { map[t.id] = { ...t }; });
                  setEditingMap(map);
                } else {
                  setEditingMap({});
                }
              }} title={expandAll ? "Collapse All" : "Expand All"}>
                <ChevronsUpDown className="w-4 h-4" />
              </Button>
            </div>
            {/* Categories Accordion */}
            <div className="mt-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="categories" className="border-b-0">
                  <AccordionTrigger className="justify-start gap-2 py-2 hover:no-underline">
                    <Filter className="w-4 h-4" />
                    <span>Categories & Templates</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {(isAdmin ? (['all', 'mine', 'overdue', 'today', 'upcoming'] as const) : (['mine', 'overdue', 'today', 'upcoming'] as const)).map((f) => (
                          <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'outline'} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All' : f === 'mine' ? 'My Tasks' : f[0].toUpperCase() + f.slice(1)}
                          </Button>
                        ))}
                        <Button size="sm" variant={sortedByPriority ? 'secondary' : 'outline'} onClick={() => setSortedByPriority(!sortedByPriority)}>
                          <ArrowUpDown className="w-3 h-3 mr-1" /> Sort by Priority
                        </Button>

                      </div>
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-2">Task Templates</div>
                        <TemplateButtons />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>

          {view === 'list' && (
            <div className="space-y-3">
              {filtered.map((t) => {
                const isExpanded = !!editingMap[t.id];
                const editing = editingMap[t.id];
                return (
                  <Card
                    key={t.id}
                    className={`bg-[#0f0f13] border-zinc-800 rounded-xl transition-all ${isExpanded ? 'ring-2 ring-primary border-transparent' : 'border'}`}
                  >
                    {/* Task Header Row */}
                    <div
                      className="p-3 flex items-center gap-3 cursor-pointer group hover:bg-zinc-900/50 rounded-xl"
                      draggable
                      onDragStart={() => startDrag(t.id)}
                      onDrop={() => onDrop(t.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => {
                        setEditingMap(prev => {
                          const next = { ...prev };
                          if (next[t.id]) delete next[t.id];
                          else next[t.id] = { ...t };
                          return next;
                        });
                      }}
                    >
                      <GripVertical className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 cursor-grab" />
                      <Checkbox
                        checked={t.status === 'completed'}
                        onCheckedChange={(v) => update(t.id, { status: v ? 'completed' : 'in_progress' })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-foreground ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-3 mt-1 text-xs">
                          {t.description && <span className="text-muted-foreground truncate max-w-[200px]">{t.description}</span>}
                          {t.dueDate && (
                            <span className={`${new Date(t.dueDate) < new Date() && t.status !== 'completed' ? 'text-red-400' : 'text-blue-300'} flex items-center gap-1`}>
                              <Clock className="w-3 h-3" />
                              {new Date(t.dueDate).toLocaleDateString()} {t.dueTime}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full ${priorities.find(p => p.key === t.priority)?.color}`}>{priorities.find(p => p.key === t.priority)?.label}</span>
                          {(Array.isArray((t as any).assignees) && (t as any).assignees.length > 0) && (
                            <span className="flex items-center gap-1 text-green-300"><User className="w-3 h-3" />{(t as any).assignees.length} assigned</span>
                          )}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Expanded Content with Accordion Structure */}
                    {
                      isExpanded && editing && (
                        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="h-px bg-zinc-800 mb-4" />

                          {/* Section 1: Core Task Details (Always visible) */}
                          <div className="space-y-4 mb-4">
                            <div className="font-semibold text-sm text-foreground">Task Details</div>
                            <div className="space-y-3">
                              <Input
                                value={editing.title}
                                onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], title: e.target.value } }))}
                                className="text-lg font-semibold bg-zinc-950/50"
                              />
                              <Input
                                value={editing.description || ''}
                                onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], description: e.target.value } }))}
                                placeholder="Description"
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex gap-2">
                                  <Input type="date" value={editing.dueDate || ''} onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], dueDate: e.target.value } }))} className="flex-1" />
                                  <Input type="time" value={editing.dueTime || ''} onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], dueTime: e.target.value } }))} className="w-[100px]" />
                                </div>
                                <div className="flex gap-2">
                                  <Select value={editing.priority} onValueChange={(v) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], priority: v as TaskPriority } }))} disabled={!isAdmin}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {priorities.map(p => (<SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={editing.status} onValueChange={(v) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], status: v as TaskStatus } }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {statuses.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Inner Accordion for Sub-sections */}
                          <Accordion type="single" collapsible className="w-full border rounded-lg border-zinc-800 bg-zinc-950/30">
                            {/* Assignees */}
                            {isAdmin && (
                              <AccordionItem value="assignees">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-green-400" />
                                    Assign to employees
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {employees.map((e: any) => {
                                      const key = String(e.email || e.name || e.id || '').trim();
                                      const selected = Array.isArray((editing as any).assignees) ? (editing as any).assignees : (editing?.assigneeId ? [{ name: editing?.assigneeId }] : []);
                                      const isChecked = selected.some((a: any) => String(a.email || a.name || '') === key);
                                      return (
                                        <label key={key} className="flex items-center gap-2 text-sm p-2 hover:bg-zinc-900 rounded cursor-pointer">
                                          <Checkbox checked={isChecked} onCheckedChange={(v) => {
                                            const list = Array.isArray((editing as any).assignees) ? (editing as any).assignees.slice() : [];
                                            if (v) list.push({ email: e.email, name: e.name }); else {
                                              const idx = list.findIndex((a: any) => String(a.email || a.name || '') === key);
                                              if (idx >= 0) list.splice(idx, 1);
                                            }
                                            setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], assignees: list } }));
                                          }} />
                                          <span>{e.name || e.email}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-4 space-y-2">
                                    <Label className="text-xs">Links</Label>
                                    <Input value={editing.customerId || ''} onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], customerId: e.target.value } }))} placeholder="Link customer (id/name)" className="h-8 text-sm" />
                                    <Input value={editing.vehicleId || ''} onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], vehicleId: e.target.value } }))} placeholder="Link vehicle (id)" className="h-8 text-sm" />
                                    <Input value={editing.workOrderId || ''} onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], workOrderId: e.target.value } }))} placeholder="Link work order (id)" className="h-8 text-sm" />
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Checklist */}
                            <AccordionItem value="checklist">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <ListChecks className="w-4 h-4 text-blue-400" />
                                  Checklist ({editing.checklist.filter(c => c.done).length}/{editing.checklist.length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-2">
                                  {editing.checklist.map((c, idx) => (
                                    <div key={c.id} className="flex items-center gap-2">
                                      <Checkbox checked={c.done} onCheckedChange={(v) => {
                                        const list = editing.checklist.slice(); list[idx] = { ...c, done: !!v };
                                        setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], checklist: list } }));
                                      }} />
                                      <Input className="flex-1 h-8 text-sm bg-transparent" value={c.text} onChange={(e) => {
                                        const list = editing.checklist.slice(); list[idx] = { ...c, text: e.target.value };
                                        setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], checklist: list } }));
                                      }} />
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => {
                                        const list = editing.checklist.slice(); list.splice(idx, 1);
                                        setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], checklist: list } }));
                                      }}>
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
                                    setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], checklist: [...prev[t.id].checklist, { id: `chk_${Math.random().toString(36).slice(2, 6)}`, text: '', done: false }] } }));
                                  }}>+ Add Item</Button>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Attachments */}
                            <AccordionItem value="attachments">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <Paperclip className="w-4 h-4 text-amber-400" />
                                  Attachments ({editing.attachments.length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    {editing.attachments.map(a => (
                                      <div key={a.id} className="flex items-center gap-2 text-sm bg-zinc-900 p-2 rounded">
                                        <Paperclip className="w-3 h-3" />
                                        <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex-1 truncate">{a.name}</a>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => {
                                          setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], attachments: prev[t.id].attachments.filter(x => x.id !== a.id) } }));
                                        }}><X className="w-3 h-3" /></Button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                                      Choose File
                                      <input type="file" className="hidden" onChange={(e) => {
                                        const f = e.target.files?.[0]; if (!f) return;
                                        const url = URL.createObjectURL(f);
                                        const att = { id: `att_${Date.now()}`, name: f.name, url, type: f.type, size: f.size };
                                        setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], attachments: [...prev[t.id].attachments, att] } }));
                                      }} />
                                    </label>
                                    <span className="text-xs text-muted-foreground">No file chosen</span>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Comments */}
                            <AccordionItem value="comments" className="border-b-0">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-purple-400" />
                                  Comments ({editing.comments?.length || 0})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                  {(editing.comments || []).map((c) => (
                                    <div key={c.id} className="bg-zinc-900 rounded p-3 text-sm">
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-xs">{c.authorName || c.authorEmail || 'User'}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                                      </div>
                                      <div>{c.text}</div>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 pt-2">
                                    <Input
                                      placeholder="Add a comment..."
                                      value={(editing as any)._newComment || ''}
                                      onChange={(e) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], _newComment: e.target.value } as any }))}
                                      className="h-9"
                                    />
                                    <Button size="sm" onClick={async () => {
                                      const text = String((editing as any)._newComment || '').trim();
                                      if (!text) return;
                                      await useTasksStore.getState().addComment(editing.id, { text });
                                      toast({ title: 'Comment added' });
                                      setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], _newComment: '' } as any }));
                                    }}>Post</Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="ghost" onClick={() => {
                              setEditingMap(prev => {
                                const next = { ...prev };
                                delete next[t.id];
                                return next;
                              });
                            }}>Close</Button>
                            <Button onClick={async () => {
                              const payload = isAdmin ? editing : ({ status: editing.status } as any);
                              await update(editing.id, payload);
                              toast({ title: 'Saved', description: 'Task details updated.' });
                              // Optional: Close on save? User might want to keep it open. Keeping open as per typical accordion ux.
                            }}>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>

                          {/* Read Receipts Footer */}
                          <div className="mt-4 pt-2 border-t border-zinc-900 text-[10px] text-muted-foreground">
                            Read Receipts: {(editing.readReceipts || []).length === 0 ? 'No reads yet.' : (editing.readReceipts || []).map(r => `${r.user} @ ${new Date(r.viewedAt).toLocaleString()}`).join(' • ')}
                          </div>
                        </div>
                      )
                    }
                  </Card>
                );
              })}
              {selectedIds.length > 0 && (
                <div className="sticky bottom-4 bg-[#0f0f13] border border-zinc-800 p-2 rounded-xl flex items-center justify-between shadow-xl animate-in slide-in-from-bottom-2">
                  <span className="text-sm font-medium px-2">{selectedIds.length} selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => bulkComplete(selectedIds)}>Mark Complete</Button>
                    <Button size="sm" variant="destructive" onClick={() => bulkDelete(selectedIds)}>Delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => clearSelection()}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['not_started', 'in_progress', 'waiting', 'completed'] as TaskStatus[]).map((col) => (
                <Card key={col} className="p-3 bg-[#0f0f13] border border-zinc-800 rounded-xl">
                  <div className="font-semibold mb-2">{statuses.find(s => s.key === col)?.label}</div>
                  <div className="space-y-2 min-h-[200px]" onDragOver={(e) => e.preventDefault()} onDrop={() => {
                    const id = dragIdRef.current; if (!id) return; update(id, { status: col }); dragIdRef.current = null;
                  }}>
                    {filtered.filter(t => t.status === col).map((t) => (
                      <div key={t.id} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 cursor-grab active:cursor-grabbing" draggable onDragStart={() => startDrag(t.id)}>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {view === 'calendar' && (
            <Card className="p-3 bg-[#0f0f13] border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-4 h-4" /><div className="font-semibold">This Week</div></div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i);
                  const ds = d.toISOString().slice(0, 10);
                  const dayTasks = filtered.filter(t => t.dueDate === ds);
                  return (
                    <Card key={ds} className="p-2 bg-zinc-900 border border-zinc-800">
                      <div className="text-xs text-muted-foreground mb-1">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      <div className="space-y-1">
                        {dayTasks.map(t => (
                          <div key={t.id} className="text-xs bg-zinc-800 rounded px-2 py-1 truncate">{t.title}</div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Team Communication (Moved from bottom/detail view) */}
        <div className="space-y-4">
          <Card className="p-4 bg-[#0f0f13] border border-zinc-800 rounded-xl lg:sticky lg:top-6 max-w-full">
            <div className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Team Chat
            </div>
            <div className="space-y-3 max-h-[400px] overflow-auto pr-1 mb-3 scrollbar-thin scrollbar-thumb-zinc-700">
              {chatMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No messages yet.</div>
              ) : chatMessages.map(m => (
                <div key={m.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-zinc-300">{m.author}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm text-zinc-300 leading-relaxed break-words">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Message team..."
                value={newChatText}
                onChange={(e) => setNewChatText(e.target.value)}
                className="bg-zinc-950/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const btn = e.currentTarget.parentElement?.querySelector('button');
                    btn?.click();
                  }
                }}
              />
              <Button size="sm" variant="secondary" onClick={async () => {
                const text = newChatText.trim(); if (!text) return;
                const msg = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, author: String(user?.name || user?.email || 'User'), text, at: new Date().toISOString() };
                const next = [...chatMessages, msg];
                setChatMessages(next);
                setNewChatText('');
                try { await localforage.setItem('task_chat', next); } catch { }
                try { pushAdminAlert('todo_chat' as any, `New team message`, String(user?.email || user?.name || 'user'), { text }); } catch { }
                try {
                  (employees || []).forEach(e => {
                    const key = String(e.email || e.name || '').trim();
                    if (key && key !== String(user?.email || user?.name || '')) pushEmployeeNotification(key, `Team Message from ${String(user?.name || 'User')}`, { text });
                  });
                } catch { }
              }}>Send</Button>
            </div>
          </Card>

          {/* Tips or Summary Widget */}
          <Card className="p-4 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 rounded-xl relative">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-indigo-300 text-sm">Productivity Tip</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-indigo-400 hover:text-indigo-300 -mt-1 -mr-1 rounded-full"><HelpCircle className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-[#0f0f13] border-zinc-800">
                  <DialogHeader>
                    <DialogTitle>How to use Tasks</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-indigo-400 flex items-center gap-2"><ChevronDown className="w-4 h-4" /> The Accordion View</h4>
                      <p className="text-sm text-muted-foreground">
                        Tasks are now streamlined! <strong>Click anywhere on a task</strong> to expand it like an accordion. This reveals the full details, including date, time, and sub-sections for assignments, checklists, and more. Click again or click another task to close it.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-400 flex items-center gap-2"><GripVertical className="w-4 h-4" /> Drag & Drop</h4>
                      <p className="text-sm text-muted-foreground">
                        Prioritize easily by dragging tasks up or down in the list. Switch to <strong>Kanban View</strong> to drag tasks between status columns (e.g., from "Not Started" to "In Progress").
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-amber-400 flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Templates</h4>
                      <p className="text-sm text-muted-foreground">
                        Use the quick template buttons to save time:
                        <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                          <li><strong>Pre-detail checklist:</strong> Creates a task with a standard vehicle intake checklist (Gather tools, Prep wash, Inspect damage).</li>
                          <li><strong>Post-detail cleanup:</strong> Creates a task for wrapping up (Final photos, Cleanup bay, Invoice prep).</li>
                        </ul>
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any task to reveal its full details. Use the <strong className="text-indigo-400">?</strong> icon above to learn about Templates and more.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
