const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const mappingHelper = `
    const mapBookingToServiceDetail = (b: any, customers: any[], invoices: any[]) => {
        const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
        const address = b.address || customer?.address || "N/A";
        const pos = b.placeOfService || "";
        const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
        
        let revenue = Number(b.price || 0);
        let value = Number(b.price || 0);
        
        if (true) {
            const bDate = b.date?.split('T')[0];
            const match = invoices.find(inv => {
                const invDate = inv.serviceDate || inv.date || inv.createdAt?.split('T')[0];
                const isCustMatch = inv.customerId === b.customerId || inv.customerName === b.customer;
                return isCustMatch && (invDate === bDate || (Math.abs(new Date(invDate).getTime() - new Date(bDate).getTime()) < 86400000 * 2));
            });
            if (match) {
                revenue = match.total || 0;
                value = match.services?.reduce((acc: number, s: any) => acc + (Number(s.price) || 0), 0) || revenue;
            }
        }

        return {
            id: b.id,
            date: b.date,
            customer: b.customer,
            address: address,
            locationType: isShop ? "Shop" : "Mobile",
            service: b.title,
            probonoReason: b.probonoReason,
            probonoPrimaryReason: b.probonoPrimaryReason,
            probonoReasons: b.probonoReasons,
            status: (b.status || 'pending').toLowerCase(),
            revenue: revenue,
            value: value > 0 ? value : revenue
        };
    };
`;

// 1. insert helper
content = content.replace(
  'const serviceDetailsData = useMemo(() => {',
  mappingHelper + '\n\n    const serviceDetailsData = useMemo(() => {'
);

// 2. rewrite serviceDetailsData
content = content.replace(
  /const serviceDetailsData = useMemo\(\(\) => \{[\s\S]*?\}\);/m,
  `const serviceDetailsData = useMemo(() => {
        return filteredPerfBookings.map(b => mapBookingToServiceDetail(b, customers, invoices)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredPerfBookings, customers, invoices]);`
);

// 3. add qualServiceDetailsData and rewrite doneServices and probonoJobs
content = content.replace(
  /const doneServices = useMemo\(\(\) => \{[\s\S]*?\}, \[serviceDetailsData, filteredQualBookings\]\);/m,
  `const qualServiceDetailsData = useMemo(() => {
        return filteredQualBookings.map(b => mapBookingToServiceDetail(b, customers, invoices)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredQualBookings, customers, invoices]);

    const doneServices = useMemo(() => {
        return qualServiceDetailsData.filter(s => (s.status === 'done' || s.status === 'completed'));
    }, [qualServiceDetailsData]);`
);

content = content.replace(
  /const probonoJobs = useMemo\(\(\) => \{[\s\S]*?\}, \[doneServices, invoices\]\);/m,
  `const probonoJobs = useMemo(() => {
        return qualServiceDetailsData
            .filter(s => s.revenue === 0)
            .map(s => {
                const sDate = s.date?.split('T')[0];
                const matchedInv = invoices.find(inv => {
                    const invDate = (inv.serviceDate || inv.date || inv.createdAt || '').split('T')[0];
                    const isCustMatch = inv.customerId === s.id || inv.customerName === s.customer;
                    return isCustMatch && (invDate === sDate || Math.abs(new Date(invDate).getTime() - new Date(sDate).getTime()) < 86400000 * 2);
                });
                return { ...s, invoiceId: matchedInv?.id || null };
            });
    }, [qualServiceDetailsData, invoices]);`
);

// Change default defaultLabel to 'All Time'
content = content.replace(
    /const getFilterLabel = \(filter: \{ start: Date \| undefined; end: Date \| undefined \}, defaultLabel: string = "Filter"\) => \{/,
    'const getFilterLabel = (filter: { start: Date | undefined; end: Date | undefined }, defaultLabel: string = "All Time") => {'
);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('done');
