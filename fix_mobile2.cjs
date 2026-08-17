const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// FIX 2: Customer Insights table - wrap the table div in hidden md:block and add mobile cards before it
const insTableStart = `                    <div className="rounded-md border border-zinc-800 overflow-x-auto">`;
const insTableEnd = `                    </div>\r\n                </CardContent>\r\n            </Card>\r\n\r\n            {/* Customer Acquisition`;

const insTableReplace = `                    {/* Mobile card layout */}
                    <div className="md:hidden divide-y divide-zinc-800/60">
                        {customerStats.length === 0 ? (
                            <div className="text-center text-zinc-500 py-10 italic text-sm">No customer data found.</div>
                        ) : (
                            customerStats.map((cust) => (
                                <div key={cust.name} className="p-3 hover:bg-zinc-800/20 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold text-zinc-100 text-sm block truncate">{cust.name}</span>
                                            <span className="text-zinc-500 text-xs">{new Date(cust.lastService).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-emerald-400 font-mono text-sm font-bold block">\${(cust.totalSpent || 0).toLocaleString()}</span>
                                            <span className="text-zinc-500 text-xs">{cust.count} Jobs</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                                        {cust.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cust.email}</span>}
                                        {cust.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cust.phone}</span>}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300 px-2"
                                            onClick={() => navigate(\`/search-customer?customerId=\${cust.id || ''}&search=\${encodeURIComponent(cust.name)}\`)}>
                                            <Edit className="w-3 h-3 mr-1" />Edit
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300 px-2"
                                            onClick={() => { setSelectedCustomerForReminder(cust); setReminderFrequency("3"); const d = new Date(); d.setMonth(d.getMonth() + 3); setReminderDate(d.toISOString().split('T')[0]); setReminderOpen(true); }}>
                                            <Bell className="w-3 h-3 mr-1" />Remind
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block rounded-md border border-zinc-800 overflow-x-auto" style={{touchAction: 'pan-y'}}>`;

content = content.replace(insTableStart, insTableReplace);

// Also need to close the new div after the table's </div>
const insTableCloseOld = `                    </div>\r\n                </CardContent>\r\n            </Card>\r\n\r\n            {/* Customer Acquisition`;
const insTableCloseNew = `                    </div>\r\n                    </div>{/* end hidden md:block desktop table */}\r\n                </CardContent>\r\n            </Card>\r\n\r\n            {/* Customer Acquisition`;
content = content.replace(insTableCloseOld, insTableCloseNew);

if (content.includes('end hidden md:block desktop table')) {
    console.log('Customer Insights table close fix applied!');
} else {
    console.log('WARNING: Could not find Customer Insights close location');
}

// FIX 3: Quality Review table - find and wrap it
const qualTableStart = `                <CardContent className="p-0 relative">
                    <div className="overflow-x-auto">`;
const qualTableReplacement = `                <CardContent className="p-0 relative">
                    {/* Mobile card layout */}
                    <div className="md:hidden divide-y divide-zinc-800/60">
                        {qualDoneServices.length === 0 ? (
                            <div className="text-center text-zinc-500 py-10 italic text-sm">No completed jobs available for review yet.</div>
                        ) : (
                            qualDoneServices.slice(0, 15).map((svc) => {
                                const review = bookingReviews[svc.id];
                                return (
                                    <div key={svc.id} className="p-3 hover:bg-zinc-800/20 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-zinc-100 text-sm block truncate">{svc.customer}</span>
                                                <span className="text-zinc-400 text-xs">{svc.date ? format(parseISO(svc.date), "MMM d, yyyy") : "N/A"}</span>
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                {review?.sentiment && (
                                                    <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border", review.sentiment === "positive" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : review.sentiment === "negative" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
                                                        {review.sentiment}
                                                    </Badge>
                                                )}
                                                {review?.googleStarRating && (
                                                    <span className="text-yellow-400 text-xs">{"★".repeat(review.googleStarRating)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto" style={{touchAction: 'pan-y'}}>`;

if (content.includes(qualTableStart)) {
    content = content.replace(qualTableStart, qualTableReplacement);
    console.log('Quality Review mobile fix applied!');
} else {
    console.log('WARNING: Could not find Quality Review table start');
}

// Close the quality review desktop wrapper div — find where TableBody closes
const qualTableClose = `                    </div>\r\n                </CardContent>\r\n                <CardContent className="p-4 border-t border-zinc-800 bg-zinc-950/30">`;
const qualTableCloseNew = `                    </div>\r\n                    </div>{/* end hidden md:block desktop table */}\r\n                </CardContent>\r\n                <CardContent className="p-4 border-t border-zinc-800 bg-zinc-950/30">`;
if (content.includes(qualTableClose)) {
    content = content.replace(qualTableClose, qualTableCloseNew);
    console.log('Quality Review close div fix applied!');
} else {
    console.log('WARNING: Could not find Quality Review table close location - checking alternate...');
    // Try finding a simpler pattern
    const qualCardContent = `            </Card>\r\n\r\n\r\n\r\n        </div>\r\n    );\r\n}`;
    console.log('Looking for end of file structure...');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Done!');
