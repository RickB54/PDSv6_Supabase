import { useEffect, useState, useCallback } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { EmployeeAnalyticsPanel } from "@/components/analytics/EmployeeAnalyticsPanel";
import { useBookingsStore } from "@/store/bookings";
import { getUnifiedCustomers } from "@/lib/customers";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { HelpCircle, RotateCcw, Loader2, Target, Users, FileBarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [estimates, setEstimates] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'crm' | 'employees'>(() =>
        new URLSearchParams(window.location.search).get('tab') === 'employees' ? 'employees' : 'crm'
    );

    const fetchData = useCallback(async (showToast = false) => {
        setIsRefreshing(true);
        try {
            // Refresh store first
            await refresh();
            
            const [custs, invs, ests] = await Promise.all([
                getUnifiedCustomers(),
                import("@/lib/supa-data").then(m => m.getSupabaseInvoices()),
                import("@/lib/supa-data").then(m => m.getSupabaseEstimates())
            ]);
            
            setCustomers(custs);
            setInvoices(invs);
            setEstimates(ests);
            
            if (showToast) {
                toast({
                    title: "Analytics Updated",
                    description: "All data has been successfully refreshed from Supabase."
                });
            }
        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
            toast({
                title: "Refresh Failed",
                description: "Could not sync data from the cloud.",
                variant: "destructive"
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [refresh, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw]">
            <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
            
            <div className="sticky top-[var(--header-total-height,64px)] z-40 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-col transition-all">
                <div className="flex flex-wrap items-center justify-end pr-4 sm:pr-8 gap-3 pt-3 pb-2">
                    <div className="hidden md:flex items-center gap-2 mr-2">
                        <Badge variant="outline" className="text-zinc-400 border-zinc-700 bg-zinc-900/50 font-normal py-1 px-3 hover:bg-zinc-800 cursor-help transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'intake-workflows', role: 'admin' } }));
                            }}
                        >
                            Workflow
                        </Badge>
                        <HelpCircle 
                            className="w-5 h-5 text-emerald-400/80 hover:text-emerald-400 transition-colors cursor-help drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" 
                            title="View Intake Workflows"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'intake-workflows', role: 'admin' } }));
                            }}
                        />
                    </div>
                    <div className="hidden md:flex items-center gap-2 mr-2 border-l border-zinc-800 pl-4">
                        <Badge variant="outline" className="text-zinc-400 border-zinc-700 bg-zinc-900/50 font-normal py-1 px-3 hover:bg-zinc-800 cursor-help transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'analytics', role: 'admin' } }));
                            }}
                        >
                            Business Analytics
                        </Badge>
                        <HelpCircle 
                            className="w-5 h-5 text-emerald-400/80 hover:text-emerald-400 transition-colors cursor-help drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" 
                            title="View Analytics Help"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'analytics', role: 'admin' } }));
                            }}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/reports")}
                        className="border-amber-800/40 bg-amber-900/10 hover:bg-amber-900/30 text-amber-400 hover:text-white gap-2 font-bold"
                    >
                        <FileBarChart className="h-3.5 w-3.5" />
                        <span>Reports</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/goals")}
                        className="border-blue-800/40 bg-blue-900/10 hover:bg-blue-900/30 text-blue-400 hover:text-white gap-2 font-bold"
                    >
                        <Target className="h-3.5 w-3.5" />
                        <span>Business Goals</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isRefreshing}
                        onClick={() => fetchData(true)}
                        className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white gap-2"
                    >
                        {isRefreshing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Refresh Data</span>
                    </Button>
                </div>
                
                {/* Tab Switcher */}
                <div className="px-4 sm:px-6 flex gap-2 border-t border-zinc-800/50 pt-2">
                    <button
                    onClick={() => setActiveTab('crm')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'crm'
                            ? 'border-indigo-500 text-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    CRM &amp; Analytics
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'employees'
                            ? 'border-indigo-500 text-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Users className="h-3.5 w-3.5" /> Employees
                </button>
                </div>
                
                {/* PORTAL TARGET FOR BUSINESS INTELLIGENCE STICKY HEADER */}
                <div id="crm-sticky-header-portal"></div>
                <div className="border-b border-zinc-800 w-full" />
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {activeTab === 'crm' && (
                    <BookingsAnalytics bookings={items} customers={customers} invoices={invoices} estimates={estimates} />
                )}
                {activeTab === 'employees' && (
                    <EmployeeAnalyticsPanel />
                )}
            </div>
        </div>
    );
}
