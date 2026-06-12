import { getSupabaseBookings } from './src/lib/supa-data';

(async () => {
    try {
        const bookings = await getSupabaseBookings();
        const testBookings = bookings.filter((b: any) => 
            (b.customer && b.customer.toLowerCase().includes('ann burn')) || 
            (b.customer && b.customer.toLowerCase().includes('rick berube'))
        );
        console.log(JSON.stringify(testBookings, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
