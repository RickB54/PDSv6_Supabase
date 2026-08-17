const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const estStart = `                <CardContent className="p-0">\r\n                    <div className="flex flex-col">\r\n                        <div className="bg-zinc-950/50 overflow-x-auto max-h-[400px]">\r\n                            <Table>`;
const estReplace = `                <CardContent className="p-0">
                    <div className="flex flex-col">
                        {/* Mobile card layout */}
                        <div className="md:hidden divide-y divide-zinc-800/60">
                            {filteredQuotes.length === 0 ? (
                                <div className="text-center text-zinc-500 py-12 italic text-sm">No estimates found for the selected period.</div>
                            ) : (
                                filteredQuotes.map((q) => {
                                    let s = (q.status || '').toLowerCase();
                                    const isSent = q.isSent || s === 'sent' || s === 'accepted' || s === 'declined' || s === 'denied';
                                    
                                    let outcomeDisplay = 'Pending';
                                    let outcomeClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                                    if (s === 'accepted') {
                                        outcomeDisplay = 'Accepted';
                                        outcomeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                    } else if (s === 'denied' || s === 'declined') {
                                        outcomeDisplay = 'Declined';
                                        outcomeClass = "bg-red-500/10 text-red-400 border-red-500/20";
                                    } else if (isSent) {
                                        outcomeDisplay = 'No Answer';
                                        outcomeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                    }

                                    return (
                                        <div 
                                            key={q.id} 
                                            className="p-3 hover:bg-zinc-900/30 cursor-pointer space-y-1.5"
                                            onClick={() => navigate(\`/estimates?editId=\${q.id}\`)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-zinc-100 text-sm block truncate">{q.customerName || q.customer}</span>
                                                    <span className="text-zinc-500 text-xs block">{q.createdAt ? format(parseISO(q.createdAt), "MMM d, yy") : "N/A"}</span>
                                                </div>
                                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                    <span className="text-emerald-400 font-mono text-sm font-bold block">\${(q.total || 0).toFixed(2)}</span>
                                                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 py-0 font-bold uppercase", isSent ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                        {isSent ? 'Sent' : 'Not Received'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end gap-2">
                                                <div className="text-zinc-300 line-clamp-2 text-xs flex-1">
                                                    {Array.isArray(q.services) ? q.services.map((s)=>s.name).join(', ') : (q.service || 'N/A')}
                                                </div>
                                                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase shrink-0", outcomeClass)}>
                                                    {outcomeDisplay}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block bg-zinc-950/50 overflow-x-auto max-h-[400px]" style={{touchAction: 'pan-y'}}>
                            <Table>`;

content = content.replace(estStart, estReplace);
if (content.includes('hidden md:block bg-zinc-950/50 overflow-x-auto max-h-[400px]')) {
    console.log('Estimates mobile fix applied!');
} else {
    console.log('FAILED to find Estimates start');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
