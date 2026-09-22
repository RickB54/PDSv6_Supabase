import { useEffect, useState, useCallback, useRef } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { EmployeeAnalyticsPanel } from "@/components/analytics/EmployeeAnalyticsPanel";
import { BusinessIntelligencePanel } from "@/components/analytics/BusinessIntelligencePanel";
import { useBookingsStore } from "@/store/bookings";
import { getSupabaseCustomersLight } from "@/lib/supa-data";
import ReviewIntelligence from "@/components/analytics/ReviewIntelligence";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { HelpCircle, RotateCcw, Loader2, Target, Users, FileBarChart, Star, TrendingUp, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "@/contexts/DemoContext";

export type AnalyticsTab = 'crm' | 'bi' | 'reviews' | 'employees' | 'profitability' | 'compensation';

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [estimates, setEstimates] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<AnalyticsTab>(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab === 'employees') return 'employees';
        if (tab === 'bi' && localStorage.getItem("demo_mode_active") !== "true") return 'bi';
        if (tab === 'reviews') return 'reviews';
        if (tab === 'profitability') return 'profitability';
        if (tab === 'compensation' || tab === 'employee-analytics') return 'compensation';
        return 'crm';
    });
    
    const { isDemoMode } = useDemoMode();
    const loadedTabsRef = useRef<Set<string>>(new Set());

    const loadTabData = useCallback(async (tab: AnalyticsTab, force = false) => {
        if (!force && loadedTabsRef.current.has(tab)) return;
        setIsRefreshing(true);
        try {
            if (tab === 'employees') {
                // Employees panel manages its own app_users query; nothing extra needed
                loadedTabsRef.current.add(tab);
                return;
            }

            // Always ensure bookings and light customers are loaded for non-employee tabs
            const promises: Promise<any>[] = [];
            promises.push(refresh());
            if (customers.length === 0 || force) {
                promises.push(getSupabaseCustomersLight().then(c => setCustomers(c || [])));
            }

            if (tab === 'crm' || tab === 'bi' || tab === 'profitability') {
                if (invoices.length === 0 || force) {
                    promises.push(import("@/lib/supa-data").then(m => m.getSupabaseInvoices()).then(invs => setInvoices(invs || [])));
                }
                if (estimates.length === 0 || force) {
                    promises.push(import("@/lib/supa-data").then(m => m.getSupabaseEstimates()).then(ests => setEstimates(ests || [])));
                }
            }

            await Promise.all(promises);
            loadedTabsRef.current.add(tab);
        } catch (err) {
            console.error(`Failed to load data for tab ${tab}:`, err);
            toast({
                title: "Data Sync Warning",
                description: "Could not sync full analytics data from the cloud.",
                variant: "destructive"
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [refresh, customers.length, invoices.length, estimates.length, toast]);

    // Fetch tab-specific data on tab switch
    useEffect(() => {
        loadTabData(activeTab);
    }, [activeTab, loadTabData]);

    // Handle explicit refresh
    const handleFullRefresh = useCallback(async () => {
        loadedTabsRef.current.clear();
        await loadTabData(activeTab, true);
        toast({
            title: "Analytics Updated",
            description: "Analytics data has been refreshed from Supabase."
        });
    }, [activeTab, loadTabData, toast]);

    useEffect(() => {
        const handleRefresh = () => handleFullRefresh();
        const handleCacheInvalidated = (e: any) => {
            const domain = e?.detail?.domain;
            if (!domain || domain === 'financials' || domain.startsWith('financial')) {
                loadedTabsRef.current.clear();
                loadTabData(activeTab, true);
            }
        };
        window.addEventListener('refresh-analytics', handleRefresh);
        window.addEventListener('app-cache-invalidated', handleCacheInvalidated);
        return () => {
            window.removeEventListener('refresh-analytics', handleRefresh);
            window.removeEventListener('app-cache-invalidated', handleCacheInvalidated);
        };
    }, [activeTab, handleFullRefresh, loadTabData]);

    const handleTabChange = (tab: AnalyticsTab) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        if (tab === 'crm') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', tab);
        }
        window.history.replaceState({}, '', url.toString());
    };

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw]">
            <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
            
            <div className="sticky top-[var(--header-total-height,64px)] z-40 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-col transition-all">
                {/* Tab Switcher */}
                <div className="px-2 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x">
                    <button
                        onClick={() => handleTabChange('crm')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                            activeTab === 'crm'
                                ? 'border-indigo-500 text-white font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <span className="hidden sm:inline">CRM &amp; Analytics</span>
                        <span className="sm:hidden">CRM</span>
                    </button>
                    {!isDemoMode && (
                        <button
                            onClick={() => handleTabChange('bi')}
                            className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                activeTab === 'bi'
                                    ? 'border-emerald-500 text-emerald-400 font-bold'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Target className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Business Intelligence</span>
                            <span className="lg:hidden">BI</span>
                        </button>
                    )}
                    <button
                        onClick={() => handleTabChange('reviews')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            activeTab === 'reviews'
                                ? 'border-amber-500 text-amber-400 font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Star className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Review Intelligence</span>
                        <span className="lg:hidden">Reviews</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('employees')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            activeTab === 'employees'
                                ? 'border-indigo-500 text-white font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span>Employees</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('profitability')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            activeTab === 'profitability'
                                ? 'border-emerald-500 text-emerald-400 font-bold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Profitability</span>
                        <span className="sm:hidden">Profits</span>
                    </button>
                    {!isDemoMode && (
                        <button
                            onClick={() => handleTabChange('compensation')}
                            className={`px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                activeTab === 'compensation'
                                    ? 'border-purple-500 text-purple-400 font-bold'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Calculator className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Compensation Calculator</span>
                            <span className="lg:hidden sm:inline hidden">Compensation</span>
                            <span className="sm:hidden">Comp</span>
                        </button>
                    )}
                </div>
                
                {/* PORTAL TARGET FOR BUSINESS INTELLIGENCE STICKY HEADER */}
                <div id="crm-sticky-header-portal"></div>
                <div className="border-b border-zinc-800 w-full" />
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {activeTab === 'crm' && (
                    <BookingsAnalytics 
                        bookings={items} 
                        customers={customers} 
                        invoices={invoices} 
                        estimates={estimates} 
                        onRefresh={handleFullRefresh} 
                        isRefreshing={isRefreshing}
                        view="crm"
                    />
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
                {activeTab === 'profitability' && (
                    <BookingsAnalytics 
                        bookings={items} 
                        customers={customers} 
                        invoices={invoices} 
                        estimates={estimates} 
                        onRefresh={handleFullRefresh} 
                        isRefreshing={isRefreshing}
                        view="profitability"
                    />
                )}
                {activeTab === 'compensation' && !isDemoMode && (
                    <BookingsAnalytics 
                        bookings={items} 
                        customers={customers} 
                        invoices={invoices} 
                        estimates={estimates} 
                        onRefresh={handleFullRefresh} 
                        isRefreshing={isRefreshing}
                        view="compensation"
                    />
                )}
            </div>
        </div>
    );
}
