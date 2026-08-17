const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const state_addition = `    const [invFilterOpen, setInvFilterOpen] = useState(false);
    const [quotesFilterOpen, setQuotesFilterOpen] = useState(false);
    const [qualFilterOpen, setQualFilterOpen] = useState(false);
    const [insFilterOpen, setInsFilterOpen] = useState(false);`;
content = content.replace('    const [invFilterOpen, setInvFilterOpen] = useState(false);', state_addition);

content = content.replace(/<Popover>/, '<Popover open={quotesFilterOpen} onOpenChange={setQuotesFilterOpen}>'); // First one is Quotes
content = content.replace(/<Popover>/, '<Popover open={qualFilterOpen} onOpenChange={setQualFilterOpen}>'); // Second is Probono Jobs
content = content.replace(/<Popover>/, '<Popover open={qualFilterOpen} onOpenChange={setQualFilterOpen}>'); // Third is Probono Jobs row?? Wait, let's be safer.

// Let's replace button texts
const buttonRegex = /<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900\/50([^"]*)">\s*<Filter className="h-4 w-4[^"]*" \/>\s*Filter\s*<\/Button>/g;

content = content.replace(buttonRegex, (match, p1, offset) => {
    // Determine which filter this is based on the closest stateVar used below it
    let stateVar = 'perfDateFilter';
    let after = content.substring(offset, offset + 1000);
    if (after.includes('invDateFilter')) stateVar = 'invDateFilter';
    if (after.includes('quotesDateFilter')) stateVar = 'quotesDateFilter';
    if (after.includes('qualDateFilter')) stateVar = 'qualDateFilter';
    if (after.includes('insDateFilter')) stateVar = 'insDateFilter';
    
    return `<Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (${stateVar}.start || ${stateVar}.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="h-4 w-4" />
                                {getFilterLabel(${stateVar}, "Filter")}
                            </Button>`;
});

// Now replace Custom Range without clear/save buttons with the ones that have them
const customRangeRegex = /<div className="space-y-2">\s*<Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Custom Range<\/Label>\s*<div className="rounded-md border border-zinc-800 bg-zinc-950\/50 overflow-hidden">\s*<Calendar\s*mode="range"\s*selected=\{\{ from: ([a-zA-Z]+)\.start, to: [a-zA-Z]+\.end \}\}\s*onSelect=\{\(range\) => set([a-zA-Z]+)\(\{ start: range\?\.from, end: range\?\.to \}\)\}\s*initialFocus\s*className="bg-transparent"\s*\/>\s*<\/div>\s*<\/div>/g;

content = content.replace(customRangeRegex, (match, stateVar, setterVar) => {
    const filterName = setterVar.replace('DateFilter', '');
    return `<div className="space-y-3">
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">CUSTOM RANGE</span>
                                    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: ${stateVar}.start, to: ${stateVar}.end }}
                                            onSelect={(range) => set${setterVar}({ start: range?.from, end: range?.to })}
                                            className="bg-transparent"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => { set${setterVar}({ start: undefined, end: undefined }); set${filterName}FilterOpen(false); }} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">Clear</Button>
                                        <Button size="sm" onClick={() => set${filterName}FilterOpen(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Filter</Button>
                                    </div>
                                </div>`;
});

// And manually fix the Popover open states using regex
content = content.replace(/<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+getFilterLabel\(quotesDateFilter/s, '<Popover open={quotesFilterOpen} onOpenChange={setQuotesFilterOpen}>\n                        <PopoverTrigger asChild>\n                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (quotesDateFilter.start || quotesDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(quotesDateFilter, "Filter")}');
content = content.replace(/<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+getFilterLabel\(qualDateFilter/gs, '<Popover open={qualFilterOpen} onOpenChange={setQualFilterOpen}>\n                        <PopoverTrigger asChild>\n                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (qualDateFilter.start || qualDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(qualDateFilter, "Filter")}');
content = content.replace(/<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+getFilterLabel\(insDateFilter/s, '<Popover open={insFilterOpen} onOpenChange={setInsFilterOpen}>\n                        <PopoverTrigger asChild>\n                            <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (insDateFilter.start || insDateFilter.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(insDateFilter, "Filter")}');


fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch complete!');
