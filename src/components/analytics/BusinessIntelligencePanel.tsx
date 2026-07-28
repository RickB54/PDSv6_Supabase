import React from "react";
import { useNavigate } from "react-router-dom";
import { CustomerIntelligence360Modal } from "../bookings/CustomerIntelligence360Modal";
import MarketPricingAnalysis from "./MarketPricingAnalysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, BarChart3, FileBarChart, Presentation, Activity, Users, DollarSign } from "lucide-react";
import { Booking } from "@/store/bookings";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

interface BusinessIntelligencePanelProps {
    bookings: Booking[];
    customers: any[];
    invoices?: any[];
    estimates?: any[];
}

export function BusinessIntelligencePanel({ bookings, customers, invoices = [], estimates = [] }: BusinessIntelligencePanelProps) {
    const navigate = useNavigate();
    // Generate some high-level dynamic stats for the Executive Dashboard
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const weekBookings = bookings.filter(b => b.date && isWithinInterval(parseISO(b.date), { start: weekStart, end: weekEnd }));
    const monthBookings = bookings.filter(b => b.date && isWithinInterval(parseISO(b.date), { start: monthStart, end: monthEnd }));

    const weekRev = weekBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const monthRev = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0);

    const activeCustomers = customers.length;
    const completedJobs = bookings.filter(b => b.status === 'DONE').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden pt-2">
            {/* Header Section */}
            <div className="flex flex-col gap-2 bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Activity className="w-48 h-48 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center gap-3 tracking-tighter">
                    <Presentation className="w-8 h-8 text-emerald-400" />
                    BUSINESS INTELLIGENCE COMMAND CENTER
                </h1>
                <p className="text-zinc-400 text-sm max-w-2xl">
                    Executive-level overview of revenue velocity, market pricing evolution, and comprehensive 360-degree customer intelligence metrics.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl flex flex-col gap-1 backdrop-blur-md">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-400"/> Weekly Run Rate</span>
                        <span className="text-2xl font-black text-zinc-100">${weekRev.toLocaleString()}</span>
                        <span className="text-xs text-emerald-500 font-bold">+{weekBookings.length} Jobs</span>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl flex flex-col gap-1 backdrop-blur-md">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5"><DollarSign className="w-3 h-3 text-blue-400"/> Monthly Run Rate</span>
                        <span className="text-2xl font-black text-zinc-100">${monthRev.toLocaleString()}</span>
                        <span className="text-xs text-blue-500 font-bold">+{monthBookings.length} Jobs</span>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl flex flex-col gap-1 backdrop-blur-md">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3 h-3 text-purple-400"/> Total Network</span>
                        <span className="text-2xl font-black text-zinc-100">{activeCustomers}</span>
                        <span className="text-xs text-purple-500 font-bold">Profiles</span>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl flex flex-col gap-1 backdrop-blur-md">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3 text-pink-400"/> Completed Jobs</span>
                        <span className="text-2xl font-black text-zinc-100">{completedJobs}</span>
                        <span className="text-xs text-pink-500 font-bold">All Time</span>
                    </div>
                </div>
            </div>

            {/* Customer Intelligence 360 Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Customer Intelligence 360</h2>
                        <p className="text-xs text-zinc-500 font-medium">Deep-dive customer profiles, engagement mix, and garage archives.</p>
                    </div>
                </div>
                
                <div className="bg-[#09090b] rounded-2xl border border-zinc-800 shadow-2xl p-4 min-h-[600px]">
                    <CustomerIntelligence360Modal customers={customers} inline={true} />
                </div>
            </section>

            {/* Market Pricing Analysis Section */}
            <section className="space-y-4 pt-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <FileBarChart className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Market Pricing Evolution</h2>
                            <p className="text-xs text-zinc-500 font-medium">Historical audit of base pricing shifts and market adjustments.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => {
                            navigate('/package-pricing');
                            setTimeout(() => window.dispatchEvent(new Event('open-quick-pricing')), 300);
                        }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs h-9 px-4 rounded-xl border border-blue-500/30 flex items-center gap-2"
                    >
                        <DollarSign className="w-4 h-4" />
                        Pricing Control Center
                    </Button>
                </div>
                
                <div className="bg-[#09090b] rounded-2xl border border-zinc-800 shadow-2xl p-6">
                    <MarketPricingAnalysis />
                </div>
            </section>
        </div>
    );
}
