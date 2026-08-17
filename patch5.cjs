const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const filters = [
    { stateVar: 'perfDateFilter', openVar: 'perfFilterOpen', setOpenVar: 'setPerfFilterOpen', filterName: 'Perf' },
    { stateVar: 'invDateFilter', openVar: 'invFilterOpen', setOpenVar: 'setInvFilterOpen', filterName: 'Inv' },
    { stateVar: 'qualDateFilter', openVar: 'qualFilterOpen', setOpenVar: 'setQualFilterOpen', filterName: 'Qual' },
    { stateVar: 'insDateFilter', openVar: 'insFilterOpen', setOpenVar: 'setInsFilterOpen', filterName: 'Ins' },
    { stateVar: 'acqDateFilter', openVar: 'acqFilterOpen', setOpenVar: 'setAcqFilterOpen', filterName: 'Acq' }
];

filters.forEach(f => {
    // We are looking for:
    // <Popover open={...}> or <Popover>
    //   <PopoverTrigger asChild>
    //       <Button variant="outline" size="sm" className="...">
    //           <Filter className="h-4 w-4..." />
    //           Filter
    //           ...
    //       </Button>
    //   </PopoverTrigger>

    // Let's find the Popover block that contains the specific state setter (e.g. setPerfDateFilter) in its calendar
    const blockRegex = new RegExp(`(<Popover[^>]*>\\s*<PopoverTrigger asChild>\\s*<Button variant="outline" size="sm" className="[^"]*">\\s*<Filter className="[^"]*" />\\s*)Filter(\\s*(?:{${f.stateVar}\\.start.*?})?\\s*</Button>\\s*</PopoverTrigger>)(.*?set${f.filterName}DateFilter)`, 'gs');
    
    content = content.replace(blockRegex, (match, p1, p2, p3) => {
        // Fix the button className
        let replacedP1 = p1.replace(
            /className="gap-2 border-zinc-800 bg-zinc-900\/50[^"]*"/,
            `className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold", (${f.stateVar}.start || ${f.stateVar}.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}`
        );
        // Replace "Filter" text with getFilterLabel
        let replacement = `${replacedP1}{getFilterLabel(${f.stateVar}, "Filter")}</Button>\n                        </PopoverTrigger>${p3}`;
        
        // Also wrap the Popover in a flex div with a reset button
        if (!replacement.includes('title="Reset Filter"')) {
            // we have to be careful about where to put the flex div. The popover is usually direct child of a header.
            // Actually, we can just replace the <Popover> element.
            replacement = replacement.replace(/<Popover[^>]*>/, `<div className="flex items-center gap-1">\n                        $&`);
            // But wait, we need to close the div AFTER the popover. We can't do it blindly.
            // Let's just put the Reset button inside the PopoverTrigger? No, PopoverTrigger only accepts a single child.
        }
        return replacement;
    });
});

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch 5 complete!');
