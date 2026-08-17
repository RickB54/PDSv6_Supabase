const fs = require('fs');

let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// 1. Probono Jobs (qualDateFilter)
const qual1_target = `<Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                </Button>`;
const qual1_replacement = `<Popover open={qualFilterOpen} onOpenChange={setQualFilterOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (qualDateFilter.start || qualDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                    <Filter className="h-4 w-4" />
                                    {getFilterLabel(qualDateFilter, "Filter")}
                                </Button>`;
content = content.replace(qual1_target, qual1_replacement);

const qual1_customRange_target = `<div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                        <Calendar
                                            mode="range"
                                            selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                            onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                        {(qualDateFilter.start || qualDateFilter.end) && (
                                            <Button variant="ghost" size="sm" onClick={() => setQualDateFilter({ start: undefined, end: undefined })} className="w-full text-zinc-400 hover:text-white mt-2">Clear Range</Button>
                                        )}
                                    </div>`;
const qual1_customRange_replacement = `<div className="space-y-3">
                                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">CUSTOM RANGE</span>
                                        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
                                            <Calendar
                                                mode="range"
                                                selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                                onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                                className="bg-transparent"
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <Button variant="outline" size="sm" onClick={() => { setQualDateFilter({ start: undefined, end: undefined }); setQualFilterOpen(false); }} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">Clear</Button>
                                            <Button size="sm" onClick={() => setQualFilterOpen(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Filter</Button>
                                        </div>
                                    </div>`;
content = content.replace(qual1_customRange_target, qual1_customRange_replacement);

// 2. Customer Insights (insDateFilter)
const ins_target = `<Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                
                            </Button>`;
const ins_replacement = `<Popover open={insFilterOpen} onOpenChange={setInsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (insDateFilter.start || insDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="h-4 w-4" />
                                {getFilterLabel(insDateFilter, "Filter")}
                            </Button>`;
content = content.replace(ins_target, ins_replacement);

const ins_customRange_target = `<div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                    <div className="grid gap-2 text-zinc-200">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: insDateFilter.start, to: insDateFilter.end }}
                                            onSelect={(range) => setInsDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                    </div>
                                    {(insDateFilter.start || insDateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setInsDateFilter({ start: undefined, end: undefined })}
                                            className="w-full text-zinc-400 hover:text-white mt-2"
                                        >
                                            Clear Range
                                        </Button>
                                    )}
                                </div>`;
const ins_customRange_replacement = `<div className="space-y-3">
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">CUSTOM RANGE</span>
                                    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: insDateFilter.start, to: insDateFilter.end }}
                                            onSelect={(range) => setInsDateFilter({ start: range?.from, end: range?.to })}
                                            className="bg-transparent"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => { setInsDateFilter({ start: undefined, end: undefined }); setInsFilterOpen(false); }} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">Clear</Button>
                                        <Button size="sm" onClick={() => setInsFilterOpen(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Filter</Button>
                                    </div>
                                </div>`;
content = content.replace(ins_customRange_target, ins_customRange_replacement);

// 3. Lead Channel Tracking (acqDateFilter)
const acq_target = `<Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 text-xs">
                                <Filter className="h-4 w-4 text-cyan-400" />
                                Filter
                                {acqDateFilter.start && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                            </Button>`;
const acq_replacement = `<Popover open={acqFilterOpen} onOpenChange={setAcqFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (acqDateFilter.start || acqDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="h-4 w-4 text-cyan-400" />
                                {getFilterLabel(acqDateFilter, "Filter")}
                            </Button>`;
content = content.replace(acq_target, acq_replacement);

// 4. Quality Review (qualDateFilter)
const qual2_target = `<Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                    
                                </Button>`;
const qual2_replacement = `<Popover open={qualFilterOpen} onOpenChange={setQualFilterOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (qualDateFilter.start || qualDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                    <Filter className="h-4 w-4" />
                                    {getFilterLabel(qualDateFilter, "Filter")}
                                </Button>`;
content = content.replace(qual2_target, qual2_replacement);

const qual2_customRange_target = `<div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                        <div className="grid gap-2 text-zinc-200">
                                            <Calendar
                                                mode="range"
                                                selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                                onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                                initialFocus
                                                className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                            />
                                        </div>
                                        {(qualDateFilter.start || qualDateFilter.end) && (
                                            <Button variant="ghost" size="sm" onClick={() => setQualDateFilter({ start: undefined, end: undefined })} className="w-full text-zinc-400 hover:text-white mt-2">Clear Range</Button>
                                        )}
                                    </div>`;
const qual2_customRange_replacement = `<div className="space-y-3">
                                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">CUSTOM RANGE</span>
                                        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
                                            <Calendar
                                                mode="range"
                                                selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                                onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                                className="bg-transparent"
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <Button variant="outline" size="sm" onClick={() => { setQualDateFilter({ start: undefined, end: undefined }); setQualFilterOpen(false); }} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">Clear</Button>
                                            <Button size="sm" onClick={() => setQualFilterOpen(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Filter</Button>
                                        </div>
                                    </div>`;
content = content.replace(qual2_customRange_target, qual2_customRange_replacement);


fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch complete!');
