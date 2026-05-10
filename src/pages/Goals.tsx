
import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    TrendingUp, 
    TrendingDown, 
    Award, 
    Calendar, 
    Settings2, 
    Save, 
    X,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    DollarSign,
    Plus,
    Users
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie
} from 'recharts';
import { Progress } from "@/components/ui/progress";
import localforage from 'localforage';
import { useBookingsStore } from "@/store/bookings";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface GoalSet {
    weeklyRevenue: number;
    monthlyRevenue: number;
    weeklyServices: number;
    monthlyServices: number;
    weeklyAddons: number;
    monthlyAddons: number;
}

const DEFAULT_GOALS: GoalSet = {
    weeklyRevenue: 2500,
    monthlyRevenue: 10000,
    weeklyServices: 10,
    monthlyServices: 40,
    weeklyAddons: 5,
    monthlyAddons: 20
};

export default function Goals() {
    const { items: bookings, refresh } = useBookingsStore();
    const { toast } = useToast();
    const [goals, setGoals] = useState<GoalSet>(DEFAULT_GOALS);
    const [isEditing, setIsEditing] = useState(false);
    const [tempGoals, setTempGoals] = useState<GoalSet>(DEFAULT_GOALS);

    useEffect(() => {
        localforage.getItem<GoalSet>('prime-business-goals').then(val => {
            if (val) {
                setGoals(val);
                setTempGoals(val);
            }
        });
        refresh();
    }, [refresh]);

    const stats = useMemo(() => {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const weekBookings = bookings.filter(b => {
            try {
                const d = b.date ? parseISO(b.date) : null;
                return d && isWithinInterval(d, { start: weekStart, end: weekEnd });
            } catch { return false; }
        });

        const monthBookings = bookings.filter(b => {
            try {
                const d = b.date ? parseISO(b.date) : null;
                return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
            } catch { return false; }
        });

        const getRev = (list: any[]) => list.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
        const getAddons = (list: any[]) => list.reduce((acc, b) => acc + (b.addons?.length || 0), 0);

        return {
            week: {
                revenue: getRev(weekBookings),
                services: weekBookings.length,
                addons: getAddons(weekBookings)
            },
            month: {
                revenue: getRev(monthBookings),
                services: monthBookings.length,
                addons: getAddons(monthBookings)
            }
        };
    }, [bookings]);

    const handleSave = async () => {
        setGoals(tempGoals);
        await localforage.setItem('prime-business-goals', tempGoals);
        setIsEditing(false);
        toast({
            title: "Goals Updated",
            description: "Your business targets have been saved successfully."
        });
    };

    const chartData = useMemo(() => {
        const days = eachDayOfInterval({
            start: startOfWeek(new Date()),
            end: endOfWeek(new Date())
        });

        return days.map(day => {
            const dayBookings = bookings.filter(b => {
                try {
                    const d = b.date ? parseISO(b.date) : null;
                    return d && d.toDateString() === day.toDateString();
                } catch { return false; }
            });

            return {
                name: format(day, 'EEE'),
                revenue: dayBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0),
                services: dayBookings.length
            };
        });
    }, [bookings]);

    const StatCard = ({ title, current, targetValue, unit = "", icon: Icon, color }: any) => {
        const percent = Math.min(100, Math.round((current / targetValue) * 100));
        const isExceeded = current >= targetValue;

        return (
            <Card className="p-5 bg-zinc-900/40 border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-all">
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-${color}-500/5 rounded-full blur-3xl`} />
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`p-2 bg-${color}-500/10 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${color}-500`} />
                    </div>
                    {isExceeded && (
                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                            <Zap className="w-3 h-3 fill-emerald-500" /> Goal Met
                        </div>
                    )}
                </div>
                <div className="space-y-1 mb-4 relative z-10">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{unit}{current.toLocaleString()}</span>
                        <span className="text-zinc-600 text-xs font-medium">/ {unit}{targetValue.toLocaleString()}</span>
                    </div>
                </div>
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">{percent}% COMPLETE</span>
                        <span className={isExceeded ? "text-emerald-500" : "text-zinc-400"}>
                            {isExceeded ? "OVER TARGET" : `${unit}${(targetValue - current).toLocaleString()} REMAINING`}
                        </span>
                    </div>
                    <Progress value={percent} className={`h-1.5 bg-zinc-800`} indicatorClassName={isExceeded ? "bg-emerald-500" : `bg-${color}-500`} />
                </div>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8 border-b border-zinc-900 mb-8">
                    <PageHeader 
                        title="Business Goals" 
                        subtitle="Track your performance against weekly and monthly targets" 
                    />
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white">
                                    <X className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                    <Save className="w-4 h-4 mr-2" /> Save Goals
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                <Settings2 className="w-4 h-4 mr-2" /> Configure Targets
                            </Button>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800 mb-8 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-blue-500" />
                            Goal Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Revenue Targets</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Weekly Revenue ($)</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.weeklyRevenue} 
                                            onChange={e => setTempGoals({...tempGoals, weeklyRevenue: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Monthly Revenue ($)</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.monthlyRevenue} 
                                            onChange={e => setTempGoals({...tempGoals, monthlyRevenue: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Service Counts</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Weekly Services</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.weeklyServices} 
                                            onChange={e => setTempGoals({...tempGoals, weeklyServices: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Monthly Services</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.monthlyServices} 
                                            onChange={e => setTempGoals({...tempGoals, monthlyServices: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Add-on Targets</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Weekly Add-ons</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.weeklyAddons} 
                                            onChange={e => setTempGoals({...tempGoals, weeklyAddons: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Monthly Add-ons</Label>
                                        <Input 
                                            type="number" 
                                            value={tempGoals.monthlyAddons} 
                                            onChange={e => setTempGoals({...tempGoals, monthlyAddons: Number(e.target.value)})}
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-12">
                    {/* Weekly Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-zinc-900" />
                            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Weekly Performance
                            </h2>
                            <div className="h-px flex-1 bg-zinc-900" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard 
                                title="Weekly Revenue" 
                                current={stats.week.revenue} 
                                targetValue={goals.weeklyRevenue} 
                                unit="$" 
                                icon={DollarSign} 
                                color="blue" 
                            />
                            <StatCard 
                                title="Services Performed" 
                                current={stats.week.services} 
                                targetValue={goals.weeklyServices} 
                                icon={TrendingUp} 
                                color="purple" 
                            />
                            <StatCard 
                                title="Add-on Upsells" 
                                current={stats.week.addons} 
                                targetValue={goals.weeklyAddons} 
                                icon={Plus} 
                                color="orange" 
                            />
                        </div>
                    </section>

                    {/* Monthly Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-zinc-900" />
                            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                <Award className="w-4 h-4" /> Monthly Progress
                            </h2>
                            <div className="h-px flex-1 bg-zinc-900" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard 
                                title="Monthly Revenue" 
                                current={stats.month.revenue} 
                                targetValue={goals.monthlyRevenue} 
                                unit="$" 
                                icon={DollarSign} 
                                color="blue" 
                            />
                            <StatCard 
                                title="Services Performed" 
                                current={stats.month.services} 
                                targetValue={goals.monthlyServices} 
                                icon={TrendingUp} 
                                color="purple" 
                            />
                            <StatCard 
                                title="Add-on Upsells" 
                                current={stats.month.addons} 
                                targetValue={goals.monthlyAddons} 
                                icon={Plus} 
                                color="orange" 
                            />
                        </div>
                    </section>

                    {/* Visual Analytics */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="p-6 bg-zinc-900/40 border-zinc-800">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Weekly Revenue Trend</h3>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase">vs Expected Activity</div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#52525b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false} 
                                        />
                                        <YAxis 
                                            stroke="#52525b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#3b82f6" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorRev)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="p-6 bg-zinc-900/40 border-zinc-800">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Daily Service Volume</h3>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase">Active Appointments</div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#52525b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false} 
                                        />
                                        <YAxis 
                                            stroke="#52525b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                        />
                                        <Tooltip 
                                            cursor={{fill: '#27272a', opacity: 0.4}}
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="services" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.services > 1 ? '#a855f7' : '#6366f1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </section>

                    {/* Summary Footer */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Growth Forecast</span>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-bold text-white">+12.4% vs last period</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Efficiency Rating</span>
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-bold text-white">94% Target Success</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Customer Focus</span>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-bold text-white">8 new leads this week</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Avg Ticket Value</span>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-bold text-white">${(stats.month.revenue / (stats.month.services || 1)).toFixed(0)} per service</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
