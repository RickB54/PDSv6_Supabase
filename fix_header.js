
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
let content = fs.readFileSync(filepath, 'utf-8');
const lines = content.split('\n');

const newHeader = `          {/* PREMIUM DARK HEADER (Matching Dilution Ratio Chart style) */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-zinc-900 border-b border-zinc-800 gap-3 shrink-0 uppercase">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-hidden">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                    <DialogTitle className="text-sm sm:text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-0.5 sm:mb-1 truncate">Prime Dilution Chart</DialogTitle>
                </div>
                <div className="hidden sm:block px-2 text-[8px] font-black text-zinc-600 border-l border-zinc-800 ml-2 uppercase tracking-[0.2em] italic">Generated: \${new Date().toLocaleDateString()}</div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end no-print">
                <div className="flex flex-col items-center gap-0.5 shrink-0 opacity-80">
                    <span className="text-[6px] font-black uppercase text-zinc-500 tracking-widest leading-none">Units</span>
                    <div className="bg-zinc-800/80 p-1 rounded-md border border-zinc-700 h-6 flex items-center px-2 text-[8px] font-black text-indigo-400">OZ ONLY</div>
                </div>

                <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-800">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setChartOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                            {chartOrientation === 'landscape' ? <Smartphone className="h-4 w-4" /> : <MonitorSmartphone className="h-4 w-4 rotate-90" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Switch Orientation</TooltipContent>
                      </Tooltip>

                      <div className="w-px h-4 bg-zinc-800 mx-1" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setIsRatiosOnlyModalOpen(true)} className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Show Ratios Only</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { if (typeof printDilutionChart === 'function') printDilutionChart(); }} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Print Chart</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { if (typeof downloadDilutionPDF === 'function') downloadDilutionPDF(); }} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export PDF</TooltipContent>
                      </Tooltip>

                      <div className="w-px h-4 bg-zinc-800 mx-1" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { setIsDilutionModalOpen(false); navigate('/dilution-calculator'); }} className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Calculator</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
                
                <Select value={chartSort} onValueChange={setChartSort}>
                    <SelectTrigger className="w-[110px] sm:w-[140px] h-8 bg-zinc-900 border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] tracking-widest rounded-lg hover:bg-zinc-800 hover:text-white">
                        <div className="flex items-center gap-1.5">
                             <TrendingUp className="h-3 w-3 text-indigo-400" />
                             <span className="truncate uppercase">{chartSort.startsWith('brand:') ? chartSort.split(':')[1] : 'SORT'}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-900 text-white">
                        <SelectItem value="brand" className="text-[10px] font-bold uppercase tracking-widest">Brand</SelectItem>
                        <SelectItem value="name" className="text-[10px] font-bold uppercase tracking-widest">A-Z Name</SelectItem>
                        <SelectItem value="low_stock" className="text-[10px] font-bold uppercase tracking-widest text-red-500">Low Stock</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>`;

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div className="flex flex-wrap items-center')) {
        startIdx = i;
    }
    if (lines[i].includes('Download className="h-4 w-4 mr-2')) {
        for (let j = i + 1; j < i + 15; j++) {
            if (lines[j] && lines[j].includes('</div>') && lines[j + 1] && lines[j + 1].includes('</div>') && lines[j+2] && lines[j+2].includes('</div>')) {
                endIdx = j + 2;
                break;
            }
        }
        if (endIdx !== -1) break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log("Replacing lines " + (startIdx + 1) + " to " + (endIdx + 1));
    lines.splice(startIdx, endIdx - startIdx + 1, newHeader);
    fs.writeFileSync(filepath, lines.join('\n'));
    console.log("Success");
} else {
    // Try a second fallback search
    console.log("Failed primary search, trying fallback...");
     for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<div className="flex flex-wrap items-center')) {
            startIdx = i;
            // Find the NEXT <div className="flex-1
            for(let j = i; j < lines.length; j++){
                if(lines[j].includes('<div className="flex-1')){
                    endIdx = j - 1;
                    break;
                }
            }
            break;
        }
    }
    if (startIdx !== -1 && endIdx !== -1) {
        console.log("Replacing lines " + (startIdx + 1) + " to " + (endIdx + 1));
        lines.splice(startIdx, endIdx - startIdx + 1, newHeader);
        fs.writeFileSync(filepath, lines.join('\n'));
        console.log("Success (Fallback)");
    } else {
        console.log("Failed to find range: start=" + startIdx + ", end=" + endIdx);
    }
}
