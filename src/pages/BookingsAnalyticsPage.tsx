import { useEffect, useState, useCallback } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { EmployeeAnalyticsPanel } from "@/components/analytics/EmployeeAnalyticsPanel";
import { BusinessIntelligencePanel } from "@/components/analytics/BusinessIntelligencePanel";
import { useBookingsStore } from "@/store/bookings";
import { getUnifiedCustomers } from "@/lib/customers";
import ReviewIntelligence from "@/components/analytics/ReviewIntelligence";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { HelpCircle, RotateCcw, Loader2, Target, Users, FileBarChart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "@/contexts/DemoContext";

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [estimates, setEstimates] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'crm' | 'bi' | 'employees' | 'reviews'>(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab === 'employees') return 'employees';
        if (tab === 'bi' && localStorage.getItem("demo_mode_active") !== "true") return 'bi';
        if (tab === 'reviews') return 'reviews';
        return 'crm';
    });
    
    const { isDemoMode } = useDemoMode();

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
        const handleRefresh = () => fetchData(true);
        window.addEventListener('refresh-analytics', handleRefresh);
        return () => window.removeEventListener('refresh-analytics', handleRefresh);
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw]">
            <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
            
            <div className="sticky top-[var(--header-total-height,64px)] z-40 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-col transition-all">
                {/* Tab Switcher */}
                <div className="px-2 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setActiveTab('crm')}
                        className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                            activeTab === 'crm'
                                ? 'border-indigo-500 text-white font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <span className="hidden sm:inline">CRM &amp; Analytics</span>
                        <span className="sm:hidden">CRM &amp; Analytics</span>
                    </button>
                    {!isDemoMode && (
                        <button
                            onClick={() => setActiveTab('bi')}
                            className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                activeTab === 'bi'
                                    ? 'border-emerald-500 text-emerald-400 font-bold'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Target className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Business Intelligence</span>
                            <span className="sm:hidden">BI</span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            activeTab === 'reviews'
                                ? 'border-amber-500 text-amber-400 font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Star className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Review Intelligence</span>
                        <span className="sm:hidden">Reviews</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            activeTab === 'employees'
                                ? 'border-indigo-500 text-white font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span>Employees</span>
                    </button>
                </div>
                
                {/* PORTAL TARGET FOR BUSINESS INTELLIGENCE STICKY HEADER */}
                <div id="crm-sticky-header-portal"></div>
                <div className="border-b border-zinc-800 w-full" />
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {activeTab === 'crm' && (
                    <BookingsAnalytics bookings={items} customers={customers} invoices={invoices} estimates={estimates} onRefresh={() => fetchData(true)} isRefreshing={isRefreshing} />
                )}
                {activeTab === 'bi' && !isDemoMode && (
                    <BusinessIntelligencePanel bookings={items} customers={customers} invoices={invoices} estimates={estimates} />
                )}
                {activeTab === 'reviews' && (
                    <ReviewIntelligence customers={customers} bookings={items} />
                )}
                {activeTab === 'employees' && (
                    <EmployeeAnalyticsPanel />
                )}
            </div>
        </div>
    );
}
