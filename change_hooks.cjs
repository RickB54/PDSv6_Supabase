const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// 1. Add filteredSnapshotBookings
content = content.replace(
  /const filteredPerfBookings = useMemo\(\(\) => getFiltered\(bookings, perfShowArchived, perfDateFilter\), \[bookings, perfShowArchived, perfDateFilter\]\);/,
  'const filteredPerfBookings = useMemo(() => getFiltered(bookings, perfShowArchived, perfDateFilter), [bookings, perfShowArchived, perfDateFilter]);\n    const filteredSnapshotBookings = useMemo(() => getFiltered(bookings, snapshotShowArchived, snapshotDateFilter), [bookings, snapshotShowArchived, snapshotDateFilter]);'
);

// 2. Change barData
content = content.replace(
  /const barData = useMemo\(\(\) => \{[\s\S]*?return months\.map\(date => \{[\s\S]*?const count = filteredPerfBookings\.filter\(b => isSameMonth\(parseISO\(b\.date\), date\)\)\.length;[\s\S]*?return \{ name, bookings: count \};[\s\S]*?\}\);[\s\S]*?\}, \[filteredPerfBookings\]\);/,
  `const barData = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(new Date(), i);
            months.push(d);
        }
        return months.map(date => {
            const name = format(date, "MMM");
            const count = filteredSnapshotBookings.filter(b => isSameMonth(parseISO(b.date), date)).length;
            return { name, bookings: count };
        });
    }, [filteredSnapshotBookings]);`
);

// 3. Change pieData
content = content.replace(
  /const pieData = useMemo\(\(\) => \{[\s\S]*?const counts: Record<string, number> = \{\};[\s\S]*?filteredPerfBookings\.forEach\(b => \{[\s\S]*?const svc = b\.title \|\| "Unknown";[\s\S]*?counts\[svc\] = \(counts\[svc\] \|\| 0\) \+ 1;[\s\S]*?\}\);[\s\S]*?return Object\.entries\(counts\)[\s\S]*?\.map\(\(\[name, value\]\) => \(\{ name, value \}\)\)[\s\S]*?\.sort\(\(a, b\) => b\.value - a\.value\);[\s\S]*?\}, \[filteredPerfBookings\]\);/,
  `const pieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredSnapshotBookings.forEach(b => {
            const svc = b.title || "Unknown";
            counts[svc] = (counts[svc] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredSnapshotBookings]);`
);

// 4. Change locationPieData
content = content.replace(
  /const locationPieData = useMemo\(\(\) => \{[\s\S]*?let mobile = 0;[\s\S]*?let onsite = 0;[\s\S]*?filteredPerfBookings\.forEach\(b => \{[\s\S]*?if \(isShop\) \{[\s\S]*?onsite\+\+;[\s\S]*?\} else \{[\s\S]*?mobile\+\+;[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?return \[[\s\S]*?\{ name: "Mobile", value: mobile \},[\s\S]*?\{ name: "Shop", value: onsite \}[\s\S]*?\]\.filter\(d => d\.value > 0\);[\s\S]*?\}, \[filteredPerfBookings, customers\]\);/,
  `const locationPieData = useMemo(() => {
        let mobile = 0;
        let onsite = 0;

        filteredSnapshotBookings.forEach(b => {
            const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
            const address = b.address || customer?.address || "N/A";
            const pos = b.placeOfService || "";
            const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));

            if (isShop) {
                onsite++;
            } else {
                mobile++;
            }
        });

        return [
            { name: "Mobile", value: mobile },
            { name: "Shop", value: onsite }
        ].filter(d => d.value > 0);
    }, [filteredSnapshotBookings, customers]);`
);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Fixed memo hooks');
