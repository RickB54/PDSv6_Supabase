const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const qualStart = `                <CardContent className="p-0 relative">\r\n                    <div className="overflow-x-auto">\r\n                        <Table>`;
const qualStartReplacement = `                <CardContent className="p-0 relative">
                    {/* Mobile card layout */}
                    <div className="md:hidden divide-y divide-zinc-800/60">
                        {qualDoneServices.length === 0 ? (
                            <div className="text-center text-zinc-500 py-10 italic text-sm">No completed jobs available for review yet.</div>
                        ) : (
                            qualDoneServices.slice(0, 15).map((svc) => {
                                const review = bookingReviews[svc.id];
                                return (
                                    <div key={svc.id} className="p-3 hover:bg-zinc-800/20 space-y-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-zinc-100 text-sm block truncate">{svc.customer}</span>
                                                <span className="text-zinc-500 text-xs">{svc.date ? format(parseISO(svc.date), "MMM d, yyyy") : "N/A"}</span>
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                {review ? (
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] px-1.5 py-0 h-4 font-black",
                                                        review.sentiment === 'loved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                        review.sentiment === 'satisfied' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-red-500/10 text-red-400 border-red-500/20"
                                                    )}>{review.sentiment.toUpperCase()}</Badge>
                                                ) : (
                                                    <span className="text-[10px] text-zinc-600 italic">Pending</span>
                                                )}
                                                {review?.googleReview && <span className="text-amber-400 text-xs">{review.googleStars}/5 ★</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-xs font-bold", review ? "text-zinc-400" : "text-violet-400 bg-violet-500/5 border border-violet-500/10")} onClick={() => openReview(svc)}>
                                                {review ? 'Edit Report' : 'Log Feedback'}
                                            </Button>
                                            {review && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500/70 hover:text-red-400" onClick={() => clearReview(svc)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto" style={{touchAction: 'pan-y'}}>
                        <Table>`;

content = content.replace(qualStart, qualStartReplacement);

const qualEnd = `                            </TableBody>\r\n                        </Table>\r\n                    </div>\r\n                </CardContent>\r\n            </Card>\r\n\r\n            {/* Price Fluctuation History Section */}`;
const qualEndReplacement = `                            </TableBody>
                        </Table>
                    </div>
                    </div>{/* end hidden md:block desktop table */}
                </CardContent>
            </Card>

            {/* Price Fluctuation History Section */}`;

content = content.replace(qualEnd, qualEndReplacement);

if (content.includes('end hidden md:block desktop table')) {
    console.log('Quality Review mobile fix applied!');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Done!');
