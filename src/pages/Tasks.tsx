import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { getCurrentUser } from "@/lib/auth";
import { useTasksStore, parseTaskInput, Task, TaskPriority, TaskStatus } from "@/store/tasks";
import api from "@/lib/api";
import { getSupabaseEmployees, getSupabaseCustomers, getTeamMessages, sendTeamMessage, deleteTeamMessage, TeamMessage } from "@/lib/supa-data"; // NEW IMPORT
import { supabase } from "@/lib/supabase";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { CalendarDays, CheckSquare, Trash2, Edit, Clock, User, Paperclip, ListChecks, Filter, GripVertical, ChevronDown, Save, X, MessageSquare, HelpCircle, LayoutTemplate, ArrowUpDown, ChevronsUpDown, Plus } from "lucide-react";
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
  const [customers, setCustomers] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  // Team Communication state
  const [chatMessages, setChatMessages] = useState<TeamMessage[]>([]);
  const [newChatText, setNewChatText] = useState("");
  const [chatRecipient, setChatRecipient] = useState<string>("all"); // 'all' or employee email

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    (async () => {
      try {
        const [empList, custList] = await Promise.all([
          getSupabaseEmployees(),
          getSupabaseCustomers()
        ]);
        setEmployees(Array.isArray(empList) ? empList : []);
        setCustomers(Array.isArray(custList) ? custList : []);
      } catch { setEmployees([]); setCustomers([]); }
    })();
  }, []);
  useEffect(() => {
    // Load team chat history from Supabase
    (async () => {
      const msgs = await getTeamMessages();
      setChatMessages(msgs);
    })();

    // Subscribe to Realtime Updates
    const channel = supabase
      .channel('public:team_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
        const newMsg = payload.new as TeamMessage;
        setChatMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  // Determine unique "Guests" (Unknown emails in chat history)
  const guests = useMemo(() => {
    const knownEmails = new Set([
      ...employees.map(e => (e.email || '').toLowerCase()),
      ...customers.map(c => (c.email || '').toLowerCase()),
      (user?.email || '').toLowerCase()
    ]);
    const guestMap = new Map<string, string>(); // email -> name
    chatMessages.forEach(m => {
      const sEmail = (m.sender_email || '').toLowerCase();
      if (sEmail && !knownEmails.has(sEmail)) {
        if (!guestMap.has(sEmail)) guestMap.set(sEmail, m.sender_name || 'Guest');
      }
    });
    return Array.from(guestMap.entries()).map(([email, name]) => ({ email, name }));
  }, [chatMessages, employees, customers, user]);

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
            // "Assigned to Me" (Tasks I am assigned to, created by anyone)
            const me = [user?.email, user?.name].filter(Boolean).map(s => String(s).toLowerCase());
            const assigned = Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []);
            return !!user && assigned.some((a: any) => me.includes(String(a.email || a.name || '').toLowerCase()));
          }
          case 'personal': {
            // "My Personal" (Tasks I created AND am the ONLY assignee)
            // Or just Tasks I am assigned to? User asked for "My Personal" distinction.
            // Let's define Personal as: Assigned ONLY to me.
            const me = [user?.email, user?.name].filter(Boolean).map(s => String(s).toLowerCase());
            const assigned = Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []);
            if (assigned.length !== 1) return false;
            return me.includes(String(assigned[0].email || assigned[0].name || '').toLowerCase());
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
    // Admin also auto-assigns to self by default so it appears in "My Tasks", but they can reassign.
    const rec = await add({
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

      {/* Tasks Summary Header */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
              <CheckSquare className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Task Overview</h2>
              <p className="text-zinc-400 text-sm">Manage your team's todos and assignments</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 w-full md:w-auto">
            <div className="text-center">
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total</p>
              <p className="text-3xl font-bold text-white mt-1">{items.length}</p>
            </div>
            <div className="text-center border-l border-zinc-700 pl-8">
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Pending</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-3xl font-bold text-amber-400">
                  {items.filter(t => t.status !== 'completed').length}
                </p>
                {items.some(t => {
                  if (!t.dueDate || t.status === 'completed') return false;
                  const due = new Date(t.dueDate + 'T' + (t.dueTime || '23:59') + ':00');
                  return due.getTime() < Date.now();
                }) && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
              </div>
            </div>
            <div className="text-center border-l border-zinc-700 pl-8">
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Done</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{items.filter(t => t.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Main Content */}
        <div className="space-y-4">
          <Card className="p-4 bg-[#0f0f13] border border-zinc-800 rounded-xl">
            {/* Top Row: Add Task */}
            {(isAdmin || isEmployee) && (
              <div className="flex flex-row gap-2 w-full items-center mb-4">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Add a new task (e.g. Wash Car)..."
                    value={quickAdd}
                    onChange={(e) => setQuickAdd(e.target.value)}
                    className="w-full bg-zinc-950/50 min-w-[250px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickAdd();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleQuickAdd}>Add</Button>
              </div>
            )}

            {/* Second Row: Filters & View Options */}
            {/* Second Row: Filters & View Options */}
            <div className="flex flex-row flex-wrap gap-2 items-center">
              <div className="flex gap-2 items-center">
                <Select value={view} onValueChange={(v) => setView(v as any)}>
                  <SelectTrigger className="w-[110px] sm:w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="kanban">Kanban</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                  </SelectContent>
                </Select>
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

              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[120px] sm:w-[200px] sm:flex-none"
              />
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
                        {(isAdmin ? (['all', 'mine', 'personal', 'overdue', 'today', 'upcoming'] as const) : (['mine', 'overdue', 'today', 'upcoming'] as const)).map((f) => (
                          <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'outline'} onClick={() => setFilter(f as any)}>
                            {f === 'all' ? 'All' : f === 'mine' ? 'Assigned to Me' : f === 'personal' ? 'My Personal' : f[0].toUpperCase() + f.slice(1)}
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
                                  <div className="space-y-3">
                                    {/* Existing Assignees List */}
                                    <div className="flex flex-wrap gap-2">
                                      {(Array.isArray((editing as any).assignees) ? (editing as any).assignees : []).length === 0 && (
                                        <span className="text-xs text-muted-foreground italic">No assignees</span>
                                      )}
                                      {(Array.isArray((editing as any).assignees) ? (editing as any).assignees : []).map((a: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1 bg-zinc-800 text-xs px-2 py-1 rounded-full border border-zinc-700">
                                          <User className="w-3 h-3 text-zinc-400" />
                                          <span>{a.name || a.email}</span>
                                          <button
                                            onClick={() => {
                                              const list = (editing as any).assignees.slice();
                                              list.splice(idx, 1);
                                              setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], assignees: list } }));
                                            }}
                                            className="text-zinc-500 hover:text-red-400 ml-1"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Add Assignee Dropdown */}
                                    <div className="flex items-center gap-2">
                                      <Select onValueChange={(val) => {
                                        const emp = employees.find(e => e.email === val || e.id === val);
                                        if (emp) {
                                          const list = Array.isArray((editing as any).assignees) ? (editing as any).assignees.slice() : [];
                                          // Prevent dupes
                                          if (!list.some((existing: any) => existing.email === emp.email)) {
                                            list.push({ email: emp.email, name: emp.name });
                                            setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], assignees: list } }));
                                          }
                                        }
                                      }}>
                                        <SelectTrigger className="h-8 text-xs w-[200px] bg-zinc-900 border-zinc-700">
                                          <SelectValue placeholder="Add Employee..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {employees.map(e => (
                                            <SelectItem key={e.id || e.email} value={e.email || e.id}>{e.name || e.email}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    <Label className="text-xs">Links</Label>

                                    {/* Customer Link Dropdown */}
                                    <Select
                                      value={editing.customerId || ''}
                                      onValueChange={(val) => setEditingMap(prev => ({ ...prev, [t.id]: { ...prev[t.id], customerId: val } }))}
                                    >
                                      <SelectTrigger className="h-9 text-sm w-full bg-zinc-900 border-zinc-700">
                                        <SelectValue placeholder="Select Customer to Link..." />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        <SelectItem value="none">-- No Customer --</SelectItem>
                                        {customers.map(c => (
                                          <SelectItem key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

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
            <div className="font-semibold mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Team Chat
              </div>
              <Select value={chatRecipient} onValueChange={setChatRecipient}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team</SelectItem>
                  <div className="p-1 px-2 text-xs font-semibold text-muted-foreground uppercase opacity-70">Staff</div>
                  {employees.filter(e => e.email !== user?.email).map(e => (
                    <SelectItem key={e.email || e.id} value={e.email || e.id}>{e.name || e.email}</SelectItem>
                  ))}
                  <div className="p-1 px-2 text-xs font-semibold text-muted-foreground uppercase opacity-70 border-t border-zinc-800 mt-1 pt-2">Customers</div>
                  {customers.map(c => (
                    <SelectItem key={c.email || c.id} value={c.email || c.id}>{c.name} {c.email ? `(${c.email})` : ''}</SelectItem>
                  ))}
                  {guests.length > 0 && (
                    <>
                      <div className="p-1 px-2 text-xs font-semibold text-muted-foreground uppercase opacity-70 border-t border-zinc-800 mt-1 pt-2">Guests</div>
                      {guests.map(g => (
                        <SelectItem key={g.email} value={g.email}>{g.name} ({g.email})</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-auto pr-1 mb-3 scrollbar-thin scrollbar-thumb-zinc-700">
              {(() => {
                const myEmail = (user?.email || '').toLowerCase();
                const filteredMsgs = chatMessages.filter(m => {
                  if (chatRecipient === 'all') {
                    // Show Public messages ONLY 
                    return m.recipient_email === null;
                  } else {
                    // Show interaction between Me and Recipient
                    const target = chatRecipient.toLowerCase();
                    const sender = (m.sender_email || '').toLowerCase();
                    const recipient = (m.recipient_email || '').toLowerCase();
                    return (sender === target && recipient === myEmail) || (sender === myEmail && recipient === target);
                  }
                });

                if (filteredMsgs.length === 0) return <div className="text-sm text-muted-foreground text-center py-4">No messages yet.</div>;

                // Group by sender
                const grouped: Record<string, TeamMessage[]> = {};
                filteredMsgs.forEach(m => {
                  const key = m.sender_name || m.sender_email || 'Unknown';
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(m);
                });

                return (
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(grouped).map(([sender, msgs]) => (
                      <AccordionItem key={sender} value={sender} className="border-b-0">
                        <AccordionTrigger className="py-2 px-1 hover:no-underline hover:bg-zinc-800/50 rounded-md data-[state=open]:bg-zinc-800/50">
                          <span className="text-sm font-semibold truncate flex-1 text-left">{sender} <span className="text-xs font-normal text-muted-foreground ml-2">({msgs.length})</span></span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pl-2">
                          {msgs.map(m => (
                            <div key={m.id} className={`bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 mb-2 ${m.recipient_email ? 'border-l-2 border-l-blue-500' : ''} group relative`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-zinc-300">{m.sender_name || m.sender_email}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {(isAdmin || m.sender_email === user?.email) && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this message?')) {
                                          await deleteTeamMessage(m.id);
                                          setChatMessages(prev => prev.filter(msg => msg.id !== m.id));
                                        }
                                      }}
                                      className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-zinc-300 leading-relaxed break-words">{m.content}</div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder={`Message ${chatRecipient === 'all' ? 'Team' : (employees.find(e => (e.email || e.id) === chatRecipient)?.name || customers.find(c => (c.email || c.id) === chatRecipient)?.name || guests.find(g => g.email === chatRecipient)?.name || 'Direct')}...`}
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
                const senderEmail = user?.email || '';
                const senderName = user?.name || senderEmail;
                const recipient = chatRecipient === 'all' ? null : chatRecipient;

                try {
                  await sendTeamMessage(text, senderEmail, senderName, recipient);
                  setNewChatText('');
                  // Optimistic update handled by Realtime subscription, but duplicate prevention might be needed if latency is high?
                  // Supabase Realtime is fast usually.
                } catch (err) {
                  toast({ title: "Failed to send", variant: "destructive" });
                }
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
