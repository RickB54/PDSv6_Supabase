import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Users,
    MessageSquare,
    CheckSquare,
    DollarSign,
    LayoutDashboard,
    Clock,
    MoreHorizontal,
    Trash2,
    AlertCircle,
    X
} from "lucide-react";
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    addWeeks,
    parseISO,
    startOfYear,
    endOfYear,
    addYears,
    eachMonthOfInterval,
    differenceInMinutes,
    setHours,
    setMinutes
} from "date-fns";
import localforage from "localforage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseEmployees } from "@/lib/supa-data";
import { useNavigate } from "react-router-dom";

// Types
type ViewMode = 'day' | 'week' | 'month' | 'year';

interface Shift {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    role: string;
    notes?: string;
    color?: string;
    status?: 'scheduled' | 'sick' | 'no-show' | 'late'; // New status field
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export default function StaffSchedule() {
    const { toast } = useToast();
    const navigate = useNavigate();

    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewMode>('week');
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

    // Shift Form
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [formData, setFormData] = useState<Partial<Shift>>({});

    // Side Panel
    const [sidePanel, setSidePanel] = useState<'none' | 'chat' | 'tasks'>('none');

    // Load Data
    useEffect(() => {
        loadShifts();
        loadEmployees();
    }, []);

    const loadShifts = async () => {
        const list = await localforage.getItem<Shift[]>('staff_schedule_shifts') || [];
        setShifts(list);
    };

    const loadEmployees = async () => {
        const list = await getSupabaseEmployees();
        setEmployees(list || []);
    };

    const saveShifts = async (newShifts: Shift[]) => {
        await localforage.setItem('staff_schedule_shifts', newShifts);
        setShifts(newShifts);
    };

    // Actions
    const handleAddShift = (dateStr?: string, timeStr?: string) => {
        setEditingShift(null);
        setFormData({
            date: dateStr || format(new Date(), 'yyyy-MM-dd'),
            startTime: timeStr || '09:00',
            endTime: '17:00',
            role: 'Detailer',
            color: 'blue',
            status: 'scheduled'
        });
        setIsShiftModalOpen(true);
    };

    const handleEditShift = (shift: Shift) => {
        setEditingShift(shift);
        setFormData({ ...shift });
        setIsShiftModalOpen(true);
        setSelectedShiftId(shift.id); // Also select it
    };

    const handleDeleteShift = async (id: string) => {
        const next = shifts.filter(s => s.id !== id);
        await saveShifts(next);
        setIsShiftModalOpen(false);
        setSelectedShiftId(null);
        toast({ title: "Shift Deleted" });
    };

    const handleSaveShift = async () => {
        if (!formData.employeeId || !formData.date || !formData.startTime || !formData.endTime) {
            toast({ title: "Missing Fields", description: "Please fill required fields (Name, Date, Start, End).", variant: "destructive" });
            return;
        }

        const emp = employees.find(e => e.email === formData.employeeId || e.id === formData.employeeId);
        const empName = emp ? (emp.name || emp.email) : 'Unknown';

        const newShift: Shift = {
            id: editingShift ? editingShift.id : `shift_${Date.now()}`,
            employeeId: formData.employeeId,
            employeeName: empName,
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            role: formData.role || 'Detailer',
            notes: formData.notes,
            color: formData.color,
            status: formData.status as any || 'scheduled'
        };

        let next = [...shifts];
        if (editingShift) {
            next = next.map(s => s.id === editingShift.id ? newShift : s);
        } else {
            next.push(newShift);
        }

        await saveShifts(next);
        setIsShiftModalOpen(false);
        setSelectedShiftId(newShift.id);
        toast({ title: "Shift Saved", description: `${empName} scheduled.` });
    };

    // Derived
    const selectedShift = useMemo(() => shifts.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);

    // Helpers for Timeline
    const getTopOffset = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        // Start at 6 AM = 0px
        const startHour = 6;
        const totalMinutes = (h * 60 + m) - (startHour * 60);
        // 60px per hour height
        return (totalMinutes / 60) * 60;
    };

    const getHeight = (start: string, end: string) => {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const mins1 = h1 * 60 + m1;
        const mins2 = h2 * 60 + m2;
        const diff = mins2 - mins1;
        return (diff / 60) * 60;
    };

    const formatTime12 = (timeStr: string) => {
        if (!timeStr) return '';
        // If it's just "HH", pad it
        if (!timeStr.includes(':')) timeStr += ':00';
        const [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    // --- RENDERERS ---

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-zinc-950/80 p-4 border-b border-zinc-800 sticky top-0 z-20 backdrop-blur-md">
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/employee')} className="h-8 text-xs">
                    <LayoutDashboard className="w-3 h-3 mr-2" /> Dash
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/payroll')} className="h-8 text-xs">
                    <DollarSign className="w-3 h-3 mr-2" /> Payroll
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/user-management')} className="h-8 text-xs">
                    <Users className="w-3 h-3 mr-2" /> Users
                </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDate('prev')}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="h-7 text-xs px-2">Today</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDate('next')}><ChevronRight className="w-4 h-4" /></Button>
                <span className="font-bold text-sm px-3 min-w-[140px] text-center text-white">
                    {view === 'day' && format(currentDate, 'MMM do, yyyy')}
                    {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM do')}`}
                    {view === 'month' && format(currentDate, 'MMMM yyyy')}
                    {view === 'year' && format(currentDate, 'yyyy')}
                </span>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => setView(m)}
                        className={`px-3 py-1 text-[10px] font-medium rounded transition-all uppercase tracking-wide ${view === m ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderTimeline = (days: Date[]) => (
        <div className="flex flex-1 overflow-hidden h-[600px] border border-zinc-800 rounded-lg bg-zinc-950 relative">
            {/* Time Labels Column */}
            <div className="w-12 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 z-10">
                <div className="h-8 border-b border-zinc-800" /> {/* Header spacer */}
                {HOURS.map(h => (
                    <div key={h} className="h-[60px] border-b border-zinc-800/30 text-[10px] text-zinc-500 text-right pr-2 pt-1 relative">
                        {formatTime12(`${h}:00`)}
                    </div>
                ))}
            </div>

            {/* Grid Columns */}
            <div className="flex-1 flex overflow-x-auto relative min-w-0">
                {/* Background Hour Lines (Absolute to span full width) */}
                <div className="absolute inset-0 z-0 pointer-events-none flex flex-col mt-8">
                    {HOURS.map(h => (
                        <div key={h} className="h-[60px] border-b border-zinc-800/20 w-full" />
                    ))}
                </div>

                {days.map(day => {
                    const dayShifts = shifts.filter(s => s.date === format(day, 'yyyy-MM-dd'));
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={day.toISOString()} className="flex-1 min-w-[120px] border-r border-zinc-800/50 relative group">
                            {/* Column Header */}
                            <div className={`h-8 border-b border-zinc-800 flex items-center justify-center text-xs font-semibold sticky top-0 z-10 bg-zinc-950 ${isToday ? 'text-blue-400 bg-blue-900/10' : 'text-zinc-400'}`}>
                                {format(day, 'EEE d')}
                            </div>

                            {/* Click-to-add slots - 1 per hour */}
                            <div className="absolute inset-0 top-8 z-0 flex flex-col">
                                {HOURS.map(h => (
                                    <div
                                        key={h}
                                        className="h-[60px] border-b border-zinc-800/10 hover:bg-white/5 cursor-pointer transition-colors"
                                        title={`Add shift at ${h}:00`}
                                        onClick={() => handleAddShift(format(day, 'yyyy-MM-dd'), `${String(h).padStart(2, '0')}:00`)}
                                    />
                                ))}
                            </div>

                            {/* Shifts */}
                            {dayShifts.map(s => {
                                const top = getTopOffset(s.startTime) + 32; // +32 for header
                                const height = getHeight(s.startTime, s.endTime);
                                const isSelected = selectedShiftId === s.id;

                                // Status styling
                                let statusColor = s.color || 'blue';
                                if (s.status === 'sick') statusColor = 'red';
                                if (s.status === 'no-show') statusColor = 'gray';

                                return (
                                    <div
                                        key={s.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedShiftId(s.id); }}
                                        className={`absolute left-1 right-1 rounded border-l-4 text-xs p-1 cursor-pointer overflow-hidden transition-all hover:brightness-110 hover:z-20 shadow-sm
                                        ${isSelected ? 'ring-2 ring-white z-20' : 'z-10'}
                                      `}
                                        style={{
                                            top: `${top}px`,
                                            height: `${Math.max(height, 24)}px`, // Min height for visibility
                                            backgroundColor: s.status === 'sick' ? '#3f1111' : '#18181b', // Darker background
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            borderLeftColor: s.status === 'sick' ? '#ef4444' : (s.color === 'blue' ? '#3b82f6' : s.color === 'green' ? '#22c55e' : s.color === 'purple' ? '#a855f7' : '#f97316')
                                        }}
                                    >
                                        <div className="font-bold text-white truncate text-[11px] leading-tight">
                                            {s.status === 'sick' && <AlertCircle className="w-3 h-3 inline mr-1 text-red-500" />}
                                            {s.employeeName}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate opacity-80">{formatTime12(s.startTime)} - {formatTime12(s.endTime)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderMonthGrid = () => {
        const monthStart = startOfMonth(currentDate);
        const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
        return (
            <div className="grid grid-cols-7 gap-px bg-zinc-800 border-zinc-800 rounded-lg overflow-hidden flex-1 min-h-[500px]">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="bg-zinc-950 p-2 text-center text-zinc-500 text-xs font-bold">{d}</div>)}
                {days.map(d => {
                    const dayShifts = shifts.filter(s => s.date === format(d, 'yyyy-MM-dd'));
                    const isDiff = !isSameMonth(d, monthStart);
                    return (
                        <div key={d.toISOString()} className={`bg-zinc-950 p-1 min-h-[80px] hover:bg-zinc-900 cursor-pointer ${isDiff ? 'opacity-30' : ''}`} onClick={() => handleAddShift(format(d, 'yyyy-MM-dd'))}>
                            <div className="text-right text-[10px] text-zinc-500 mb-1">{format(d, 'd')}</div>
                            {dayShifts.slice(0, 3).map(s => (
                                <div key={s.id} className="text-[9px] bg-zinc-900 border-l border-blue-500 px-1 rounded-sm mb-0.5 truncate text-zinc-300">
                                    {s.startTime} {s.employeeName}
                                </div>
                            ))}
                            {dayShifts.length > 3 && <div className="text-[9px] text-zinc-600 pl-1">+{dayShifts.length - 3} more</div>}
                        </div>
                    )
                })}
            </div>
        );
    };

    const navigateDate = (dir: 'prev' | 'next') => {
        const amt = dir === 'prev' ? -1 : 1;
        if (view === 'day') setCurrentDate(addDays(currentDate, amt));
        if (view === 'week') setCurrentDate(addWeeks(currentDate, amt));
        if (view === 'month') setCurrentDate(addMonths(currentDate, amt));
        if (view === 'year') setCurrentDate(addYears(currentDate, amt));
    };

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <div className="shrink-0"><PageHeader title="Staff Schedule" /></div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Calendar Area */}
                <main className="flex-1 flex flex-col p-4 relative min-w-0">
                    {renderHeader()}

                    <div className="flex-1 overflow-y-auto min-h-0 bg-black/20 rounded-xl relative">
                        {view === 'week' && renderTimeline(eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }))}
                        {view === 'day' && renderTimeline([currentDate])}
                        {view === 'month' && renderMonthGrid()}
                        {view === 'year' && <div className="p-10 text-center text-zinc-500">Year view coming soon (use Month for details)</div>}
                    </div>

                    {/* Bottom Detail Panel */}
                    <div className="mt-2 h-[140px] shrink-0 bg-[#0f0f13] border border-zinc-800 rounded-xl flex shadow-2xl relative overflow-hidden transition-all">
                        {!selectedShift ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm italic">
                                Select a shift to view details, notes, and status.
                            </div>
                        ) : (
                            <div className="flex flex-1 p-4 gap-6 animate-in slide-in-from-bottom-5">
                                <div className="w-[4px] bg-blue-500 rounded-full h-full shrink-0" style={{ backgroundColor: selectedShift.status === 'sick' ? '#ef4444' : selectedShift.color === 'blue' ? '#3b82f6' : selectedShift.color }} />

                                {/* Info Column */}
                                <div className="space-y-1 min-w-[150px]">
                                    <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Employee</div>
                                    <div className="text-xl font-bold text-white flex items-center gap-2">
                                        {selectedShift.employeeName}
                                        {selectedShift.status === 'sick' && <Badge variant="destructive" className="text-[10px] h-5">SICK</Badge>}
                                        {selectedShift.status === 'no-show' && <Badge variant="secondary" className="text-[10px] h-5">NO SHOW</Badge>}
                                    </div>
                                    <div className="text-sm text-zinc-400">{selectedShift.role}</div>
                                </div>

                                {/* Time Column */}
                                <div className="space-y-1 min-w-[150px] border-l border-zinc-800 pl-6">
                                    <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Time</div>
                                    <div className="text-lg text-zinc-200 font-mono flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        {formatTime12(selectedShift.startTime)} - {formatTime12(selectedShift.endTime)}
                                    </div>
                                    <div className="text-xs text-zinc-500">{format(parseISO(selectedShift.date), 'EEEE, MMMM do')}</div>
                                </div>

                                {/* Notes Column */}
                                <div className="flex-1 border-l border-zinc-800 pl-6 bg-zinc-900/30 rounded-r-lg p-2">
                                    <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">Shift Notes</div>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedShift.notes || <span className="text-zinc-600 italic">No notes added.</span>}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 justify-center ml-4 min-w-[140px]">
                                    <Button variant="ghost" size="sm" className="bg-green-900/20 text-green-400 hover:bg-green-900/40 hover:text-green-300 w-full" onClick={() => {
                                        navigate(`/payroll?tab=checks&employee=${encodeURIComponent(selectedShift.employeeName)}`);
                                    }}>
                                        <DollarSign className="w-4 h-4 mr-2" /> Pay
                                    </Button>
                                    <Button variant="ghost" size="sm" className="bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-300 w-full" onClick={() => {
                                        navigate(`/service-checklist?employee=${encodeURIComponent(selectedShift.employeeName)}&employeeId=${encodeURIComponent(selectedShift.employeeId)}`);
                                    }}>
                                        <CheckSquare className="w-4 h-4 mr-2" /> Start Job
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditShift(selectedShift)}>Edit</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedShiftId(null)}><X className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Integration Sidebar - Collapsed state logic same as before, simplifying for length */}
                <div className="w-12 border-l border-zinc-800 bg-zinc-950 flex flex-col items-center py-4 gap-4 z-30">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/team-chat')} title="Team Chat"><MessageSquare className="w-5 h-5 text-emerald-500" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')} title="Tasks"><CheckSquare className="w-5 h-5 text-blue-500" /></Button>
                </div>
            </div>

            {/* Shift Modal */}
            <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>{editingShift ? 'Edit Shift' : 'New Shift'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employee</Label>
                                <Select value={formData.employeeId} onValueChange={(val) => {
                                    const e = employees.find(x => x.id === val || x.email === val);
                                    setFormData({ ...formData, employeeId: val, role: e?.role || formData.role })
                                }}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(e => <SelectItem key={e.id} value={e.id || e.email}>{e.name || e.email}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status || 'scheduled'} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="sick" className="text-red-400">Called Out (Sick)</SelectItem>
                                        <SelectItem value="no-show" className="text-zinc-500">No Show</SelectItem>
                                        <SelectItem value="late" className="text-orange-400">Late</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="bg-zinc-950 border-zinc-700" /></div>
                            <div className="space-y-2"><Label>Start</Label><Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="bg-zinc-950 border-zinc-700" /></div>
                            <div className="space-y-2"><Label>End</Label><Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="bg-zinc-950 border-zinc-700" /></div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Reason for sickness, work details, etc.)</Label>
                            <Textarea className="bg-zinc-950 border-zinc-700 min-h-[100px]" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between w-full">
                        {editingShift ? (
                            (new Date(`${editingShift.date}T${editingShift.endTime}`) > new Date()) ? (
                                <Button variant="destructive" onClick={() => handleDeleteShift(editingShift.id!)}>Delete</Button>
                            ) : (
                                <span className="text-xs text-zinc-500 italic flex items-center">Past shift cannot be deleted</span>
                            )
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveShift} className="bg-blue-600 hover:bg-blue-700">Save Shift</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
