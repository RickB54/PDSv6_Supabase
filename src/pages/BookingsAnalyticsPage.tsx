import { useEffect, useState, useCallback } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { useBookingsStore } from "@/store/bookings";
import { getUnifiedCustomers } from "@/lib/customers";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { HelpCircle, RotateCcw, Loader2, Target } from "lucide-react";
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
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
            <div className="flex items-center justify-between pr-4 sm:pr-8">
                <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
                <div className="flex items-center gap-3 mt-6">
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
            </div>
            <div className="p-4 sm:p-6 space-y-6">
                <BookingsAnalytics bookings={items} customers={customers} invoices={invoices} estimates={estimates} />
            </div>
        </div>
    );
}
