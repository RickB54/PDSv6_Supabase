const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const oldChunk = `        let jobs: any[] = [];
        if (type === 'Service') {
            jobs = filteredPerfBookings.filter(b => (b.title || "Unknown") === title);
        } else if (type === 'Location') {
            jobs = filteredPerfBookings.filter(b => {
                const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
                const address = b.address || customer?.address || "N/A";
                const pos = b.placeOfService || "";
                const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
                return title === 'Shop' ? isShop : !isShop;
            });
        } else if (type === 'Volume') {
            const thisYear = new Date().getFullYear();
            jobs = filteredPerfBookings.filter(b => {
                const d = parseISO(b.date);
                return format(d, "MMM") === title && d.getFullYear() === thisYear;
            });
        }`;

const newChunk = `        let jobs: any[] = [];
        if (type === 'Service') {
            jobs = filteredSnapshotBookings.filter(b => (b.title || "Unknown") === title);
        } else if (type === 'Location') {
            jobs = filteredSnapshotBookings.filter(b => {
                const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
                const address = b.address || customer?.address || "N/A";
                const pos = b.placeOfService || "";
                const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
                return title === 'Shop' ? isShop : !isShop;
            });
        } else if (type === 'Volume') {
            const thisYear = new Date().getFullYear();
            jobs = filteredSnapshotBookings.filter(b => {
                const d = parseISO(b.date);
                return format(d, "MMM") === title && d.getFullYear() === thisYear;
            });
        }`;

content = content.replace(oldChunk, newChunk);
fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Fixed handleChartClick');
