const fs = require('fs');

let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

function updateFilters(content) {
    const filters = [
        { stateVar: 'perfDateFilter', filterName: 'Perf' },
        { stateVar: 'invDateFilter', filterName: 'Inv' },
        { stateVar: 'quotesDateFilter', filterName: 'Quotes' },
        { stateVar: 'qualDateFilter', filterName: 'Qual' }, // Probono Jobs
        { stateVar: 'insDateFilter', filterName: 'Ins' },
        { stateVar: 'acqDateFilter', filterName: 'Acq' },
        { stateVar: 'qualDateFilter', filterName: 'Qual' } // Quality Review
    ];

    let offset = 0;
    
    // We need to find each Popover block manually to avoid regex greediness
    // BookingsAnalytics has exactly 7 main filter popovers we want to modify.
    // We'll search for <Popover... and then search inside it for `Filter` button.
    
    for (let f of filters) {
        let popoverStart = content.indexOf('<Popover', offset);
        if (popoverStart === -1) break;
        
        let popoverEnd = content.indexOf('</Popover>', popoverStart);
        if (popoverEnd === -1) break;
        
        // Ensure this Popover contains our target state setter.
        let popoverBlock = content.substring(popoverStart, popoverEnd + '</Popover>'.length);
        
        // Not all Popovers are the filters!
        if (popoverBlock.includes(`set${f.filterName}DateFilter`)) {
            // It's a match!
            let newBlock = popoverBlock.replace(
                /<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900\/50([^"]*)">[\s\S]*?<Filter className="([^"]*)" \/>[\s\S]*?Filter[\s\S]*?<\/Button>/,
                `<Button variant="outline" size="sm" className={cn("gap-2 border-zinc-800 bg-zinc-900/50 font-bold$1", (${f.stateVar}.start || ${f.stateVar}.end) && "bg-zinc-800 text-white hover:bg-zinc-700")}>
                                <Filter className="$2" />
                                {getFilterLabel(${f.stateVar}, "Filter")}
                            </Button>`
            );
            
            // Wrap in div and add Reset button
            newBlock = `<div className="flex items-center gap-1">
                        ${newBlock}
                        {(${f.stateVar}.start || ${f.stateVar}.end) && (
                            <Button variant="ghost" size="icon" onClick={() => set${f.filterName}DateFilter({ start: undefined, end: undefined })} className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all" title="Reset Filter">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>`;
            
            content = content.substring(0, popoverStart) + newBlock + content.substring(popoverEnd + '</Popover>'.length);
            
            // Advance offset past the newly inserted block to not re-process it
            offset = popoverStart + newBlock.length;
        } else {
            // Advance offset past this non-filter popover
            offset = popoverEnd + '</Popover>'.length;
            // Since we didn't match the current filter, we need to retry the current filter on the next popover
            filters.push(f); 
        }
    }
    return content;
}

content = updateFilters(content);

if (!content.includes(', X } from "lucide-react"')) {
    content = content.replace('} from "lucide-react"', ', X } from "lucide-react"');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Patch 8 complete!');
