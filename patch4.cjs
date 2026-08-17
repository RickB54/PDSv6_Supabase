const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const perf_target = `<Popover open={perfFilterOpen} onOpenChange={setPerfFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>`;
const perf_replacement = `<Popover open={perfFilterOpen} onOpenChange={setPerfFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (perfDateFilter.start || perfDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="h-4 w-4" />
                                {getFilterLabel(perfDateFilter, "Filter")}
                            </Button>`;
content = content.replace(perf_target, perf_replacement);

const inv_target = `<Popover open={invFilterOpen} onOpenChange={setInvFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>`;
const inv_replacement = `<Popover open={invFilterOpen} onOpenChange={setInvFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (invDateFilter.start || invDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="h-4 w-4" />
                                {getFilterLabel(invDateFilter, "Filter")}
                            </Button>`;
content = content.replace(inv_target, inv_replacement);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch 4 complete!');
