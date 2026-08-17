const fs = require('fs');

let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// Add missing state
if (!content.includes('const [acqFilterOpen')) {
    content = content.replace('const [insFilterOpen, setInsFilterOpen] = useState(false);', 
        'const [insFilterOpen, setInsFilterOpen] = useState(false);\n    const [acqFilterOpen, setAcqFilterOpen] = useState(false);');
}

// Ensure popovers are correctly opened
const popoversToFix = [
    { regex: /<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+>[\s\S]*?quotesDateFilter[\s\S]*?<\/Popover>/s, name: 'quotes' },
    { regex: /<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+>[\s\S]*?qualDateFilter[\s\S]*?<\/Popover>/g, name: 'qual' },
    { regex: /<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+>[\s\S]*?insDateFilter[\s\S]*?<\/Popover>/s, name: 'ins' },
    { regex: /<Popover>\s*<PopoverTrigger asChild>\s*<Button[^>]+>[\s\S]*?acqDateFilter[\s\S]*?<\/Popover>/s, name: 'acq' }
];

// Re-write the buttons and popovers. Let's use simple string replacements for the button and the Custom Range logic.

const filters = [
    { stateVar: 'quotesDateFilter', openVar: 'quotesFilterOpen', setOpenVar: 'setQuotesFilterOpen', filterName: 'Quotes' },
    { stateVar: 'qualDateFilter', openVar: 'qualFilterOpen', setOpenVar: 'setQualFilterOpen', filterName: 'Qual' },
    { stateVar: 'insDateFilter', openVar: 'insFilterOpen', setOpenVar: 'setInsFilterOpen', filterName: 'Ins' },
    { stateVar: 'acqDateFilter', openVar: 'acqFilterOpen', setOpenVar: 'setAcqFilterOpen', filterName: 'Acq' }
];

filters.forEach(f => {
    // 1. Fix Popover open state
    const popoverRegex = new RegExp(`<Popover>(.*?<Button[^>]+>.*?<Filter.*?/>.*?)(Filter|{getFilterLabel.*?})(.*?<Calendar.*?set${f.filterName}DateFilter.*?)`, 'gs');
    
    content = content.replace(popoverRegex, (match, p1, p2, p3) => {
        let replacement = `<Popover open={${f.openVar}} onOpenChange={${f.setOpenVar}}>${p1}{getFilterLabel(${f.stateVar}, "Filter")}${p3}`;
        
        // Also fix the button class to highlight when active
        replacement = replacement.replace(
            /<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900\/50([^"]*)">/,
            `<Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold$1", (${f.stateVar}.start || ${f.stateVar}.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>`
        );
        return replacement;
    });

    // 2. Fix the Custom Range inside the popover
    const rangeRegex = new RegExp(`<div className="space-y-2">\\s*<Label className="text-xs[^>]*>Custom Range</Label>\\s*<div className="rounded-md border border-zinc-800 bg-zinc-950/50 overflow-hidden">\\s*<Calendar\\s*mode="range"\\s*selected={{ from: ${f.stateVar}\\.start, to: ${f.stateVar}\\.end }}\\s*onSelect={\\(range\\) => set${f.filterName}DateFilter\\({ start: range\\?\\.from, end: range\\?\\.to }\\)}\\s*initialFocus\\s*className="bg-transparent"\\s*/>\\s*</div>\\s*</div>`, 'gs');
    
    content = content.replace(rangeRegex, `<div className="space-y-3">
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">CUSTOM RANGE</span>
                                    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: ${f.stateVar}.start, to: ${f.stateVar}.end }}
                                            onSelect={(range) => set${f.filterName}DateFilter({ start: range?.from, end: range?.to })}
                                            className="bg-transparent"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => { set${f.filterName}DateFilter({ start: undefined, end: undefined }); ${f.setOpenVar}(false); }} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">Clear</Button>
                                        <Button size="sm" onClick={() => ${f.setOpenVar}(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Filter</Button>
                                    </div>
                                </div>`);
});

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch complete!');
