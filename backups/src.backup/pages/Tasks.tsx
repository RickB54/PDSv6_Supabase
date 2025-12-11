import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { useTasksStore, parseTaskInput, Task, TaskPriority, TaskStatus } from "@/store/tasks";
import api from "@/lib/api";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { CalendarDays, CheckSquare, Trash2, Edit, Clock, User, Paperclip, ListChecks, Filter, GripVertical, Template } from "lucide-react";

export default function Tasks() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const { items, filter, search, selectedIds, refresh, add, update, remove, reorder, setFilter, setSearch, toggleSelect, clearSelection, bulkComplete, bulkDelete } = useTasksStore();
  const [view, setView] = useState<'list'|'kanban'|'calendar'>('list');
  const [quickAdd, setQuickAdd] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
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
    // Mark read receipt when opening a task
    const id = editing?.id;
    if (id) {
      try { useTasksStore.getState().markRead(id); } catch {}
    }
  }, [editing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStr = new Date().toISOString().slice(0,10);
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
          const hasMe = assigned.some((a:any) => me.includes(String(a.email || a.name || '').toLowerCase()));
          if (!hasMe) return false;
        }
        switch (filter) {
          case 'mine': {
            const me = [user?.email, user?.name].filter(Boolean).map(s => String(s).toLowerCase());
            const assigned = Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []);
            return !!user && assigned.some((a:any) => me.includes(String(a.email || a.name || '').toLowerCase()));
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
      .sort((a,b) => (a.order||0)-(b.order||0));
  }, [items, filter, search, user, isEmployee]);

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
      <Button variant="outline" size="sm" onClick={() => add({ title: 'Pre-detail checklist', checklist: ['Gather tools','Prep wash','Inspect damage'].map(t => ({ id: `chk_${Math.random().toString(36).slice(2,6)}`, text: t, done: false })) })}>Pre-detail checklist</Button>
      <Button variant="outline" size="sm" onClick={() => add({ title: 'Post-detail cleanup', checklist: ['Final photos','Cleanup bay','Invoice prep'].map(t => ({ id: `chk_${Math.random().toString(36).slice(2,6)}`, text: t, done: false })) })}>Post-detail cleanup</Button>
    </div>
  );

  return (
    <div className="p-4 overflow-x-hidden">
      <PageHeader title="Tasks" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Main Content */}
        <div className="space-y-3">
          <Card className="p-3 bg-[#0f0f13] border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              {(isAdmin || isEmployee) && (
                <>
                  <Input placeholder="e.g., Follow up with John tomorrow at 3 PM" value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} className="flex-1" />
                  <Button onClick={handleQuickAdd}>Add</Button>
                </>
              )}
              <Select value={view} onValueChange={(v) => setView(v as any)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
            </div>
            {/* Categories moved under Add area in a dropdown accordion */}
            <div className="mt-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="categories">
                  <AccordionTrigger className="text-left">Categories</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {(isAdmin ? (['all','mine','overdue','today','upcoming'] as const) : (['mine','overdue','today','upcoming'] as const)).map((f) => (
                        <Button key={f} variant={filter===f? 'secondary':'ghost'} className="w-full justify-start" onClick={() => setFilter(f)}>
                          <Filter className="w-4 h-4 mr-2" />
                          {f === 'all' ? 'All' : f === 'mine' ? 'My Tasks' : f[0].toUpperCase()+f.slice(1)}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-2">Task Templates</div>
                      <TemplateButtons />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>

          {view === 'list' && (
            <Card className="p-3 bg-[#0f0f13] border border-zinc-800 rounded-xl">
              <div className="space-y-2">
                {filtered.map((t) => (
                  <div key={t.id} className="group px-3 py-2 rounded-lg border border-zinc-800 flex items-center gap-3 hover:bg-zinc-900"
                       draggable onDragStart={() => startDrag(t.id)} onDrop={() => onDrop(t.id)} onDragOver={(e)=>e.preventDefault()}>
                    <GripVertical className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100" />
                    <Checkbox checked={t.status==='completed'} onCheckedChange={(v) => update(t.id, { status: v ? 'completed':'in_progress' })} />
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.dueDate && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-300"><Clock className="w-3 h-3" />{t.dueDate}{t.dueTime?` ${t.dueTime}`:''}</span>
                        )}
                        {(Array.isArray((t as any).assignees) && (t as any).assignees.length > 0) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-300"><User className="w-3 h-3" />{(t as any).assignees.map((a:any)=>a.name||a.email).filter(Boolean).join(', ')}</span>
                        ) : (t.assigneeId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-300"><User className="w-3 h-3" />{t.assigneeId}</span>
                        ) : null)}
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${priorities.find(p=>p.key===t.priority)?.color || ''}`}>{t.priority}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                  </div>
                ))}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => bulkComplete(selectedIds)}>Complete Selected</Button>
                    <Button variant="destructive" onClick={() => bulkDelete(selectedIds)}>Delete Selected</Button>
                    <Button variant="ghost" onClick={() => clearSelection()}>Clear</Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {view === 'kanban' && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['not_started','in_progress','waiting','completed'] as TaskStatus[]).map((col) => (
                <Card key={col} className="p-3 bg-[#0f0f13] border border-zinc-800 rounded-xl">
                  <div className="font-semibold mb-2">{statuses.find(s=>s.key===col)?.label}</div>
                  <div className="space-y-2 min-h-[200px]" onDragOver={(e)=>e.preventDefault()} onDrop={() => {
                    const id = dragIdRef.current; if (!id) return; update(id, { status: col }); dragIdRef.current=null;
                  }}>
                    {filtered.filter(t => t.status === col).map((t) => (
                      <div key={t.id} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900" draggable onDragStart={() => startDrag(t.id)}>
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
                  const d = new Date(); d.setDate(d.getDate()+i);
                  const ds = d.toISOString().slice(0,10);
                  const dayTasks = filtered.filter(t => t.dueDate === ds);
                  return (
                    <Card key={ds} className="p-2 bg-zinc-900 border border-zinc-800">
                      <div className="text-xs text-muted-foreground mb-1">{d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })}</div>
                      <div className="space-y-1">
                        {dayTasks.map(t => (
                          <div key={t.id} className="text-xs bg-zinc-800 rounded px-2 py-1">{t.title}</div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Detail Panel */}
        <Card className="p-4 bg-[#0f0f13] border border-zinc-800 rounded-xl lg:sticky lg:top-4 max-w-full">
          <div className="font-semibold mb-2">Task Details</div>
          {editing ? (
            <div className="space-y-2">
              <Input value={editing.title} onChange={(e)=>setEditing({ ...editing, title: e.target.value })} />
              <Input value={editing.description||''} onChange={(e)=>setEditing({ ...editing, description: e.target.value })} placeholder="Description" />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input type="date" value={editing.dueDate||''} onChange={(e)=>setEditing({ ...editing, dueDate: e.target.value })} />
                <Input type="time" value={editing.dueTime||''} onChange={(e)=>setEditing({ ...editing, dueTime: e.target.value })} />
              </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={editing.priority} onValueChange={(v)=>setEditing({ ...editing, priority: v as TaskPriority })} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => (<SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={editing.status} onValueChange={(v)=>setEditing({ ...editing, status: v as TaskStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Assign to employees</div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {employees.map((e:any) => {
                    const key = String(e.email || e.name || e.id || '').trim();
                    const selected = Array.isArray((editing as any).assignees) ? (editing as any).assignees : (editing?.assigneeId ? [{ name: editing?.assigneeId }] : []);
                    const isChecked = selected.some((a:any) => String(a.email || a.name || '') === key);
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={isChecked} onChange={(ev)=>{
                          const list = Array.isArray((editing as any).assignees) ? (editing as any).assignees.slice() : [];
                          if (ev.target.checked) list.push({ email: e.email, name: e.name }); else {
                            const idx = list.findIndex((a:any) => String(a.email || a.name || '') === key);
                            if (idx >= 0) list.splice(idx,1);
                          }
                          setEditing({ ...editing!, assignees: list });
                        }} />
                        <span>{e.name || e.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              )}
              <Input value={editing.customerId||''} onChange={(e)=>setEditing({ ...editing, customerId: e.target.value })} placeholder="Link customer (id/name)" disabled={!isAdmin} />
              <Input value={editing.vehicleId||''} onChange={(e)=>setEditing({ ...editing, vehicleId: e.target.value })} placeholder="Link vehicle (id)" disabled={!isAdmin} />
              <Input value={editing.workOrderId||''} onChange={(e)=>setEditing({ ...editing, workOrderId: e.target.value })} placeholder="Link work order (id)" disabled={!isAdmin} />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Checklist</div>
                <div className="space-y-1">
                  {editing.checklist.map((c, idx) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={c.done} onChange={(e)=>{
                        const list = editing.checklist.slice(); list[idx] = { ...c, done: e.target.checked }; setEditing({ ...editing, checklist: list });
                      }} />
                      <input className="flex-1 bg-transparent border border-zinc-700 rounded px-2 py-1" value={c.text} onChange={(e)=>{
                        const list = editing.checklist.slice(); list[idx] = { ...c, text: e.target.value }; setEditing({ ...editing, checklist: list });
                      }} />
                    </label>
                  ))}
                  <Button size="sm" variant="outline" onClick={()=>setEditing({ ...editing!, checklist: [...editing!.checklist, { id: `chk_${Math.random().toString(36).slice(2,6)}`, text: '', done: false }] })}>Add Item</Button>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Attachments</div>
                <input type="file" onChange={(e)=>{
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = URL.createObjectURL(f);
                  const att = { id: `att_${Date.now()}`, name: f.name, url, type: f.type, size: f.size };
                  setEditing({ ...editing!, attachments: [...editing!.attachments, att] });
                }} />
                <div className="space-y-1 mt-2">
                  {editing.attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs">
                      <Paperclip className="w-3 h-3" /><a href={a.url} target="_blank" rel="noreferrer" className="text-blue-400 underline">{a.name}</a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={async ()=>{
                  const payload = isAdmin ? editing : ({ status: editing.status } as any);
                  await update(editing.id, payload);
                  toast({ title: 'Saved', description: 'Task updated.' });
                }}>Save</Button>
                <Button variant="ghost" onClick={()=>setEditing(null)}>Close</Button>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Comments</div>
                <div className="space-y-2">
                  {(editing.comments || []).map((c) => (
                    <div key={c.id} className="border border-zinc-800 rounded p-2">
                      <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()} • {c.authorName || c.authorEmail || 'User'}</div>
                      <div className="text-sm">{c.text}</div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input placeholder="Add a comment" value={(editing as any)._newComment || ''} onChange={(e)=>setEditing({ ...editing!, _newComment: e.target.value } as any)} />
                    <Button variant="secondary" onClick={async ()=>{
                      const text = String((editing as any)._newComment || '').trim();
                      if (!text) return;
                      await useTasksStore.getState().addComment(editing!.id, { text });
                      toast({ title: 'Comment added' });
                      // Refresh local editing state
                      const fresh = useTasksStore.getState().items.find(i => i.id === editing!.id);
                      if (fresh) setEditing({ ...fresh, _newComment: '' } as any);
                    }}>Post</Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Read Receipts</div>
                <div className="text-xs text-muted-foreground">
                  {(editing.readReceipts || []).length === 0 ? 'No reads yet.' : (editing.readReceipts || []).map(r => `${r.user} @ ${new Date(r.viewedAt).toLocaleString()}`).join(' • ')}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a task to edit.</div>
          )}
        </Card>
      </div>

      {/* Mobile-friendly quick actions */}
      <Dialog open={false}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quick Actions</DialogTitle></DialogHeader>
        </DialogContent>
      </Dialog>
      {/* Team Communication Panel (global chat for Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 mt-4">
        <div></div>
        <Card className="p-4 bg-[#0f0f13] border border-zinc-800 rounded-xl lg:sticky lg:top-[520px] max-w-full">
          <div className="font-semibold mb-2">Team Communication</div>
          <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-sm text-muted-foreground">No messages yet. Start the conversation.</div>
            ) : chatMessages.map(m => (
              <div key={m.id} className="border border-zinc-800 rounded p-2">
                <div className="text-xs text-muted-foreground">{new Date(m.at).toLocaleString()} • {m.author}</div>
                <div className="text-sm">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Input placeholder="Type a message to the team" value={newChatText} onChange={(e)=>setNewChatText(e.target.value)} />
            <Button variant="secondary" onClick={async ()=>{
              const text = newChatText.trim(); if (!text) return;
              const msg = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, author: String(user?.name || user?.email || 'User'), text, at: new Date().toISOString() };
              const next = [...chatMessages, msg];
              setChatMessages(next);
              setNewChatText('');
              try { await localforage.setItem('task_chat', next); } catch {}
              // Notify admins and assignees broadly
              try { pushAdminAlert('todo_chat' as any, `New team message`, String(user?.email || user?.name || 'user'), { text }); } catch {}
              try {
                (employees || []).forEach(e => {
                  const key = String(e.email || e.name || '').trim();
                  if (key && key !== String(user?.email || user?.name || '')) pushEmployeeNotification(key, `Team Message from ${String(user?.name || 'User')}`, { text });
                });
              } catch {}
            }}>Send</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
