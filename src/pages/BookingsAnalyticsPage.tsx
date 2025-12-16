
import { useEffect, useState } from "react";
import { BookingsAnalytics } from "@/components/bookings/BookingsAnalytics";
import { useBookingsStore } from "@/store/bookings";
import localforage from "localforage";
import { PageHeader } from "@/components/PageHeader";

export default function BookingsAnalyticsPage() {
    const { items, refresh } = useBookingsStore();
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        refresh();
        const fetchCustomers = async () => {
            try {
                const custs = (await localforage.getItem<any[]>('customers')) || [];
                setCustomers(custs);
            } catch (err) {
                console.error('Failed to fetch customers:', err);
            }
        };
        fetchCustomers();
    }, [refresh]);

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
            <PageHeader title="Analytics & CRM" subtitle="Booking insights and customer follow-up tracking" />
            <div className="p-4 sm:p-6 space-y-6">

                <BookingsAnalytics bookings={items} customers={customers} />
            </div>
        </div>
    );
}
