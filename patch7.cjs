const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const filters = [
    { stateVar: 'perfDateFilter', openVar: 'perfFilterOpen', setOpenVar: 'setPerfFilterOpen', filterName: 'Perf' },
    { stateVar: 'invDateFilter', openVar: 'invFilterOpen', setOpenVar: 'setInvFilterOpen', filterName: 'Inv' },
    { stateVar: 'qualDateFilter', openVar: 'qualFilterOpen', setOpenVar: 'setQualFilterOpen', filterName: 'Qual' },
    { stateVar: 'insDateFilter', openVar: 'insFilterOpen', setOpenVar: 'setInsFilterOpen', filterName: 'Ins' },
    { stateVar: 'acqDateFilter', openVar: 'acqFilterOpen', setOpenVar: 'setAcqFilterOpen', filterName: 'Acq' },
    { stateVar: 'quotesDateFilter', openVar: 'quotesFilterOpen', setOpenVar: 'setQuotesFilterOpen', filterName: 'Quotes'}
];

filters.forEach(f => {
    // We are looking for:
    // <Popover open={...} ...>
    //   <PopoverTrigger asChild>
    //       <Button variant="outline" size="sm" className="...">
    //           <Filter className="..." />
    //           Filter
    //           ...
    //       </Button>
    //   </PopoverTrigger>

    // Since we want to replace the `Filter` text and wrap the `Popover` with a `div` and the reset button,
    // let's do this in two steps.
    
    // Step 1: Replace the button text and add active class
    // We match the PopoverTrigger block inside the specific filter's calendar context.
    const buttonRegex = new RegExp(`(<Popover[^>]*>\\s*<PopoverTrigger asChild>\\s*<Button variant="outline" size="sm" className=")([^"]*)(">[\\s\\S]*?<Filter className="[^"]*" />\\s*)Filter(\\s*(?:{${f.stateVar}\\.start.*?})?\\s*</Button>\\s*</PopoverTrigger>)([\\s\\S]*?set${f.filterName}DateFilter)`, 'g');
    
    content = content.replace(buttonRegex, (match, p1, p2, p3, p4, p5) => {
        // p2 is the current className
        let newClass = p2.replace("gap-2 border-zinc-800 bg-zinc-900/50", `gap-2 border-zinc-800 bg-zinc-900/50 font-bold" + ((${f.stateVar}.start || ${f.stateVar}.end) ? " bg-zinc-800 text-white hover:bg-zinc-700" : "") + "`);
        return `${p1}${newClass}${p3}{getFilterLabel(${f.stateVar}, "Filter")}${p4}${p5}`;
    });
    
    // Actually wait, let's just use `cn` since it's cleaner
    const buttonRegexCn = new RegExp(`(<Popover[^>]*>\\s*<PopoverTrigger asChild>\\s*<Button variant="outline" size="sm" className=")(gap-2 border-zinc-800 bg-zinc-900/50)([^"]*)(">[\\s\\S]*?<Filter className="[^"]*" />\\s*)Filter(\\s*(?:{${f.stateVar}\\.start.*?})?\\s*</Button>\\s*</PopoverTrigger>)([\\s\\S]*?set${f.filterName}DateFilter)`, 'g');
    
    content = content.replace(buttonRegexCn, (match, p1, p2, p3, p4, p5, p6) => {
        let newClassAttr = `className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold${p3}", (${f.stateVar}.start || ${f.stateVar}.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}`;
        return `<Popover open={${f.openVar}} onOpenChange={${f.setOpenVar}}>\n                        <PopoverTrigger asChild>\n                            <Button variant="outline" size="sm" ${newClassAttr}>\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(${f.stateVar}, "Filter")}\n                            </Button>\n                        </PopoverTrigger>${p6}`;
    });
    
    // Step 2: Add the Reset button right AFTER the Popover component.
    // To do this reliably, we can just find the closing </Popover> tag that belongs to this filter.
    // We match the Popover start to </Popover> by looking ahead for the setFilterNameDateFilter.
    const popoverBlockRegex = new RegExp(`(<Popover open={${f.openVar}} onOpenChange={${f.setOpenVar}}>[\\s\\S]*?set${f.filterName}DateFilter[\\s\\S]*?</Popover>)`, 'g');
    
    content = content.replace(popoverBlockRegex, (match) => {
        // Avoid double wrapping if already wrapped
        if (match.includes('title="Reset Filter"')) return match;
        
        return `<div className="flex items-center gap-1">
                        ${match}
                        {(${f.stateVar}.start || ${f.stateVar}.end) && (
                            <Button variant="ghost" size="icon" onClick={() => ${f.setOpenVar}setDateFilter({ start: undefined, end: undefined })} className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all" title="Reset Filter">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>`;
    });
    
});

// Add X to lucide-react imports
if (!content.includes(', X } from "lucide-react"')) {
    content = content.replace('} from "lucide-react"', ', X } from "lucide-react"');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch 7 complete!');
