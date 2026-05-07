
import { useEffect, useState } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { useBookingsStore } from "@/store/bookings";
import { getUnifiedCustomers } from "@/lib/customers";
import { PageHeader } from "@/components/PageHeader";

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const [customers, setCustomers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [estimates, setEstimates] = useState<any[]>([]);

    useEffect(() => {
        refresh();
        const fetchData = async () => {
            try {
                const [custs, invs, ests] = await Promise.all([
                    getUnifiedCustomers(),
                    import("@/lib/supa-data").then(m => m.getSupabaseInvoices()),
                    import("@/lib/supa-data").then(m => m.getSupabaseEstimates())
                ]);
                setCustomers(custs);
                setInvoices(invs);
                setEstimates(ests);
            } catch (err) {
                console.error('Failed to fetch analytics data:', err);
            }
        };
        fetchData();
    }, [refresh]);

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
            <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
            <div className="p-4 sm:p-6 space-y-6">

                <BookingsAnalytics bookings={items} customers={customers} invoices={invoices} estimates={estimates} />
            </div>
        </div>
    );
}
