const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// Target the start of the entire table section
const invStart = `                    <div className="flex flex-col">\r\n                        <div className="bg-zinc-950/50 overflow-x-auto max-h-[400px] hidden md:block">`;

// Target the end of the mobile section (to remove the old one)
const invEnd = `                        </div>\r\n                        <div className="p-4 bg-zinc-900 flex flex-row flex-wrap lg:flex-nowrap items-center justify-around border-t border-zinc-800 gap-8">`;

// Find the index of the start and end
const startIdx = content.indexOf(invStart);
const endIdx = content.indexOf(invEnd);

if (startIdx !== -1 && endIdx !== -1) {
    const desktopTableContent = content.substring(startIdx + invStart.length, content.indexOf('                        </div>\r\n                        <div className="md:hidden', startIdx));
    
    // We only need the Table markup itself from the desktop side, which starts directly after our start string.
    // However, it's easier to just do a regex replace on the entire block from the start of the table to the end of the old mobile block.

    const newContent = `                    <div className="flex flex-col">
                        {/* Mobile card layout */}
                        <div className="md:hidden divide-y divide-zinc-800/60">
                            {filteredInvoices.length === 0 ? (
                                <div className="text-center text-zinc-500 py-12 italic text-sm">No invoices found for the selected period.</div>
                            ) : (
                                filteredInvoices.map((inv) => {
                                    const isSent = inv.isSent;
                                    const status = (inv.paymentStatus || 'unpaid').toLowerCase();
                                    
                                    let outcomeDisplay = 'Unpaid';
                                    let outcomeClass = "bg-red-500/10 text-red-400 border-red-500/20";
                                    if (status === 'paid' || inv.total === 0 || (inv.paidAmount !== undefined && inv.total !== undefined && inv.paidAmount >= inv.total)) {
                                        outcomeDisplay = 'Paid';
                                        outcomeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                    } else if (status === 'partially-paid' || (inv.paidAmount && inv.paidAmount > 0)) {
                                        outcomeDisplay = 'Partially Paid';
                                        outcomeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                    }

                                    return (
                                        <div 
                                            key={inv.id} 
                                            className="p-3 hover:bg-zinc-900/30 cursor-pointer space-y-1.5"
                                            onClick={() => navigate(\`/invoicing?editId=\${inv.id}\`)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-zinc-100 text-sm block truncate">{inv.customerName}</span>
                                                    <span className="text-zinc-500 text-xs block">{inv.date || (inv.createdAt ? format(parseISO(inv.createdAt), "MMM d, yy") : "N/A")}</span>
                                                </div>
                                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                    <span className="text-emerald-400 font-mono text-sm font-bold block">\${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 py-0 font-bold uppercase", isSent ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                        {isSent ? 'Sent' : 'Not Sent'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end gap-2">
                                                <div className="text-zinc-300 line-clamp-2 text-xs flex-1">
                                                    {inv.vehicle || 'N/A'}
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
                        <div className="bg-zinc-950/50 overflow-x-auto max-h-[400px] hidden md:block" style={{touchAction: 'pan-y'}}>
                            <Table>
                                <TableHeader className="bg-zinc-950/50">
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-center">Delivery</TableHead>
                                        <TableHead className="text-right">Outcome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-zinc-500 py-12 italic">
                                                No invoices found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            const isSent = inv.isSent;
                                            const status = (inv.paymentStatus || 'unpaid').toLowerCase();
                                            
                                            let outcomeDisplay = 'Unpaid';
                                            let outcomeClass = "bg-red-500/10 text-red-400 border-red-500/20";
                                            if (status === 'paid' || inv.total === 0 || (inv.paidAmount !== undefined && inv.total !== undefined && inv.paidAmount >= inv.total)) {
                                                outcomeDisplay = 'Paid';
                                                outcomeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                            } else if (status === 'partially-paid' || (inv.paidAmount && inv.paidAmount > 0)) {
                                                outcomeDisplay = 'Partially Paid';
                                                outcomeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                            }

                                            return (
                                                <TableRow key={inv.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors cursor-pointer" onClick={() => navigate(\`/invoicing?editId=\${inv.id}\`)}>
                                                    <TableCell className="text-zinc-400 text-xs font-mono">
                                                        {inv.date || (inv.createdAt ? format(parseISO(inv.createdAt), "MMM d, yyyy") : "N/A")}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-zinc-200">{inv.customerName}</TableCell>
                                                    <TableCell className="text-zinc-500 text-xs">{inv.vehicle}</TableCell>
                                                    <TableCell className="font-bold text-zinc-300">
                                                        \${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", isSent ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                            {isSent ? 'Sent' : 'Not Sent'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", outcomeClass)}>
                                                            {outcomeDisplay}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="p-4 bg-zinc-900 flex flex-row flex-wrap lg:flex-nowrap items-center justify-around border-t border-zinc-800 gap-8">`;

    // Extract exactly the old chunk based on the markers
    const oldChunk = content.substring(startIdx, endIdx + invEnd.length);
    content = content.replace(oldChunk, newContent);
    
    fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
    console.log('Invoices mobile layout successfully updated!');
} else {
    console.log('Failed to find start or end markers for Invoices table.');
}
