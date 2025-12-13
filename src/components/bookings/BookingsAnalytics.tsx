import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Booking, useBookingsStore } from "@/store/bookings";
import { format, parseISO, subMonths, isSameMonth, isWithinInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Phone, Mail, Clock, Bell, ChevronDown, Repeat, Filter, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useTasksStore } from "@/store/tasks";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BookingsAnalyticsProps {
    bookings: Booking[];
    customers: any[];
    defaultOpenAccordion?: string;
}

export function BookingsAnalytics({ bookings, customers, defaultOpenAccordion }: BookingsAnalyticsProps) {
    const { add } = useTasksStore();
    const { update } = useBookingsStore();
    const user = getCurrentUser();
    const [reminderOpen, setReminderOpen] = useState(false);
    const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState<any>(null);
    const [reminderDate, setReminderDate] = useState("");
    const [reminderNote, setReminderNote] = useState("");
    const [reminderFrequency, setReminderFrequency] = useState<string>("3"); // Default 3 months
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

    // Filter State
    const [showArchived, setShowArchived] = useState(false);
    const [dateFilter, setDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>({ start: undefined, end: undefined });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleArchiveToggle = (bookingId: string, currentStatus: boolean) => {
        update(bookingId, { isArchived: !currentStatus });
        toast.message(currentStatus ? "Booking restored" : "Booking archived");
    };

    // --- Stats Calculation ---
    const stats = useMemo(() => {
        const totalBookings = bookings.length;
        const completed = bookings.filter(b => b.status === "done" || b.status === "completed").length;
        const pending = bookings.filter(b => b.status === "pending" || b.status === "confirmed").length;
        return { totalBookings, completed, pending };
    }, [bookings]);

    // --- Charts Data ---
    const barData = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(new Date(), i);
            months.push(d);
        }
        return months.map(date => {
            const name = format(date, "MMM");
            const count = bookings.filter(b => isSameMonth(parseISO(b.date), date)).length;
            return { name, bookings: count };
        });
    }, [bookings]);

    const pieData = useMemo(() => {
        const counts: Record<string, number> = {};
        bookings.forEach(b => {
            const svc = b.title || "Unknown";
            counts[svc] = (counts[svc] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [bookings]);

    // --- Reminder Frequency Data ---
    const frequencyData = useMemo(() => {
        const counts: Record<string, number> = { '1 Month': 0, '3 Months': 0, '4 Months': 0, '6 Months': 0, 'Custom': 0 };
        bookings.filter(b => b.hasReminder).forEach(b => {
            if (b.reminderFrequency === 1) counts['1 Month']++;
            else if (b.reminderFrequency === 3) counts['3 Months']++;
            else if (b.reminderFrequency === 4) counts['4 Months']++;
            else if (b.reminderFrequency === 6) counts['6 Months']++;
            else counts['Custom']++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [bookings]);

    const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

    // --- CRM / Customer List ---
    const customerStats = useMemo(() => {
        const map = new Map<string, { name: string, email: string, phone: string, count: number, lastService: string, service: string, lastBookingId: string }>();

        // Filter bookings first
        let relevantBookings = bookings;
        if (!showArchived) {
            relevantBookings = relevantBookings.filter(b => !b.isArchived);
        }
        if (dateFilter.start && dateFilter.end) {
            relevantBookings = relevantBookings.filter(b => {
                const d = parseISO(b.date);
                return isWithinInterval(d, { start: startOfDay(dateFilter.start!), end: endOfDay(dateFilter.end!) });
            });
        } else if (dateFilter.start) {
            relevantBookings = relevantBookings.filter(b => isSameDay(parseISO(b.date), dateFilter.start!));
        }

        relevantBookings.forEach(b => {
            if (!b.customer) return;
            const existing = map.get(b.customer) || {
                name: b.customer,
                email: customers.find(c => c.name === b.customer)?.email || "",
                phone: customers.find(c => c.name === b.customer)?.phone || "",
                count: 0,
                lastService: "",
                service: "",
                lastBookingId: ""
            };

            existing.count += 1;
            if (!existing.lastService || new Date(b.date) > new Date(existing.lastService)) {
                existing.lastService = b.date;
                existing.service = b.title;
                existing.lastBookingId = b.id;
            }
            map.set(b.customer, existing);
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.lastService).getTime() - new Date(a.lastService).getTime());
    }, [bookings, customers]);

    const handleCreateReminder = async () => {
        if (!selectedCustomerForReminder || !reminderDate) return;

        // 1. Create Task (Always create a new task for the new reminder date)
        await add({
            title: `Call ${selectedCustomerForReminder.name} - ${selectedCustomerForReminder.service} Follow-up`,
            description: `Follow up with customer regarding their ${selectedCustomerForReminder.service} on ${new Date(selectedCustomerForReminder.lastService).toLocaleDateString()}.\nNotes: ${reminderNote}`,
            dueDate: reminderDate,
            priority: 'medium',
            status: 'not_started',
            assignees: user ? [{ email: user.email, name: user.name }] : []
        });

        // 2. Update Booking with Reminder Status
        const bookingId = editingBookingId || selectedCustomerForReminder.lastBookingId;
        if (bookingId) {
            update(bookingId, {
                hasReminder: true,
                reminderFrequency: parseInt(reminderFrequency) || 0
            });
        }

        toast.success(editingBookingId ? "Reminder updated!" : "Reminder set & task created!");
        setReminderOpen(false);
        setReminderDate("");
        setReminderNote("");
        setReminderFrequency("3");
        setSelectedCustomerForReminder(null);
        setEditingBookingId(null);
    };

    const handleEditReminder = (booking: Booking) => {
        const cust = customers.find(c => c.name === booking.customer) || {
            name: booking.customer,
            lastService: booking.date,
            service: booking.title,
            email: '', phone: ''
        };

        setSelectedCustomerForReminder({ ...cust, lastBookingId: booking.id });
        setEditingBookingId(booking.id);

        // Populate form
        setReminderFrequency(booking.reminderFrequency?.toString() || "3");
        // Calculate date if standard frequency, otherwise generic future date
        if (booking.reminderFrequency) {
            const d = new Date(); d.setMonth(d.getMonth() + booking.reminderFrequency);
            setReminderDate(d.toISOString().split('T')[0]);
        } else {
            setReminderDate("");
        }
        setReminderNote(""); // Reset notes or fetch from somewhere if reserved
        setReminderOpen(true);
    };

    const activeReminders = bookings.filter(b => b.hasReminder);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-x-hidden">
            {/* KPI Cards - Mobile Optimized (Single Line) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</div>
                    <div className="text-xl sm:text-2xl font-bold">{stats.totalBookings}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Done</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-500">{stats.completed}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-500">{stats.pending}</div>
                </Card>
            </div>

            {/* Reminders Section (Accordion) */}
            <Card className="bg-zinc-900 border-zinc-800">
                <Accordion type="single" collapsible className="w-full" defaultValue={defaultOpenAccordion}>
                    <AccordionItem value="reminders" className="border-b-0">
                        <AccordionTrigger className="px-6 hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-yellow-500" />
                                <span>Active Reminders</span>
                                <Badge variant="secondary" className="ml-2 text-yellow-500 bg-yellow-500/10 border-yellow-500/20">{activeReminders.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Frequency Chart */}
                                <div className="h-[250px] w-full border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">Reminder Intervals</h4>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={frequencyData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {frequencyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Reminder List */}
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                    {activeReminders.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No reminders set.</div>}
                                    {activeReminders.map(b => (
                                        <div
                                            key={b.id}
                                            className="flex justify-between items-center p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 cursor-pointer transition-colors"
                                            onClick={() => handleEditReminder(b)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{b.customer}</div>
                                                <div className="text-xs text-muted-foreground">{b.title} • {new Date(b.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs gap-1">
                                                    <Repeat className="w-3 h-3" /> {b.reminderFrequency ? `${b.reminderFrequency} mo` : 'Custom'}
                                                </Badge>
                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden">
                    <CardHeader>
                        <CardTitle>Booking Volume</CardTitle>
                        <CardDescription>Monthly bookings for the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden">
                    <CardHeader>
                        <CardTitle>Service Distribution</CardTitle>
                        <CardDescription>Most popular packages</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* CRM Customer List */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Customer Insights & Follow-up</CardTitle>
                        <CardDescription>Track recent customers and set reminders for repeat business</CardDescription>
                    </div>
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                {(showArchived || dateFilter.start) && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 ml-1 h-5 px-1.5">
                                        !
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Show Archived</span>
                                    <Switch checked={showArchived} onCheckedChange={setShowArchived} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Date Range</span>
                                    <div className="grid gap-2">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: dateFilter.start, to: dateFilter.end }}
                                            onSelect={(range) => setDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900"
                                        />
                                    </div>
                                    {(dateFilter.start || dateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-muted-foreground hover:text-white"
                                            onClick={() => setDateFilter({ start: undefined, end: undefined })}
                                        >
                                            Clear Dates
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950">
                                <TableRow>
                                    <TableHead className="w-[150px]">Customer</TableHead>
                                    <TableHead className="min-w-[150px]">Contact</TableHead>
                                    <TableHead className="min-w-[100px]">Last Service</TableHead>
                                    <TableHead className="min-w-[120px]">Service Type</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerStats.map((cust) => (
                                    <TableRow key={cust.name} className="hover:bg-zinc-900/50">
                                        <TableCell className="font-medium">{cust.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs text-muted-foreground gap-1">
                                                {cust.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {cust.email}</span>}
                                                {cust.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {cust.phone}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(cust.lastService).toLocaleDateString()}</TableCell>
                                        <TableCell>{cust.service}</TableCell>
                                        <TableCell className="text-right">
                                            {bookings.find(b => b.id === cust.lastBookingId)?.hasReminder ? (
                                                <div className="flex justify-end">
                                                    <Badge variant="secondary" className="text-yellow-500 bg-yellow-500/10 border-yellow-500/20 gap-1">
                                                        <Bell className="w-3 h-3" /> Set
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                    onClick={() => {
                                                        setSelectedCustomerForReminder(cust);
                                                        // Default 3 months
                                                        setReminderFrequency("3");
                                                        const d = new Date(); d.setMonth(d.getMonth() + 3);
                                                        setReminderDate(d.toISOString().split('T')[0]);
                                                        setReminderOpen(true);
                                                    }}
                                                >
                                                    <Bell className="w-4 h-4 mr-2" />
                                                    Remind
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const lastBooking = bookings.find(b => b.id === cust.lastBookingId);
                                                if (!lastBooking) return null;
                                                return (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className={lastBooking.isArchived ? "text-yellow-500 hover:text-yellow-400" : "text-zinc-500 hover:text-zinc-300"}
                                                        onClick={() => handleArchiveToggle(cust.lastBookingId, !!lastBooking.isArchived)}
                                                        title={lastBooking.isArchived ? "Restore" : "Archive"}
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                );
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Reminder Dialog */}
            <Dialog open={reminderOpen} onOpenChange={(open) => { setReminderOpen(open); if (!open) setEditingBookingId(null); }}>
                <DialogContent className="bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>{editingBookingId ? 'Edit Reminder Coverage' : 'Set Follow-up Reminder'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Customer</Label>
                            <Input value={selectedCustomerForReminder?.name || ''} disabled className="col-span-3 bg-zinc-900 border-zinc-800" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Frequency</Label>
                            <Select value={reminderFrequency} onValueChange={(val) => {
                                setReminderFrequency(val);
                                if (val !== 'custom') {
                                    const months = parseInt(val);
                                    if (!isNaN(months)) {
                                        const d = new Date(); d.setMonth(d.getMonth() + months);
                                        setReminderDate(d.toISOString().split('T')[0]);
                                    }
                                }
                            }}>
                                <SelectTrigger className="col-span-3 bg-zinc-900 border-zinc-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Month</SelectItem>
                                    <SelectItem value="3">3 Months (Standard)</SelectItem>
                                    <SelectItem value="4">4 Months</SelectItem>
                                    <SelectItem value="6">6 Months</SelectItem>
                                    <SelectItem value="custom">Custom Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Due Date</Label>
                            <Input
                                type="date"
                                value={reminderDate}
                                onChange={(e) => { setReminderDate(e.target.value); setReminderFrequency('custom'); }}
                                className="col-span-3 bg-zinc-900 border-zinc-800"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Notes</Label>
                            <Input
                                value={reminderNote}
                                onChange={(e) => setReminderNote(e.target.value)}
                                placeholder="e.g. Call to schedule maintenance wash"
                                className="col-span-3 bg-zinc-900 border-zinc-800"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setReminderOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateReminder} className="bg-primary hover:bg-primary/90">
                            {editingBookingId ? 'Update Reminder' : 'Set Reminder'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
