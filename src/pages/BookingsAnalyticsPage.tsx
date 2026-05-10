import { useEffect, useState, useCallback } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { useBookingsStore } from "@/store/bookings";
import { getUnifiedCustomers } from "@/lib/customers";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const { toast } = useToast();
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
                <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isRefreshing}
                    onClick={() => fetchData(true)}
                    className="mt-6 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white gap-2"
                >
                    {isRefreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Refresh Data</span>
                </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
                <BookingsAnalytics bookings={items} customers={customers} invoices={invoices} estimates={estimates} />
            </div>
        </div>
    );
}
