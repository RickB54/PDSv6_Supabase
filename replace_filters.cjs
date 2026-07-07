const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const reps = [
  [/<Filter className="h-3\.5 w-3\.5" \/>\s*Filter Data/g, '<Filter className="h-3.5 w-3.5" />\n                                {getFilterLabel(perfDateFilter, "Filter Data")}'],
  
  // Operational Snapshot
  [/<Filter className="w-3\.5 h-3\.5" \/>\s*Filter/g, '<Filter className="w-3.5 h-3.5" />\n                                {getFilterLabel(snapshotDateFilter)}'],
  
  // Performance Graphs
  [/<Filter className="h-3\.5 w-3\.5" \/>\s*Filter Graphs/g, '<Filter className="h-3.5 w-3.5" />\n                            {getFilterLabel(perfDateFilter, "Filter Graphs")}'],
];

reps.forEach(r => {
  content = content.replace(r[0], r[1]);
});

// Now we deal with the h-4 w-4 filters by mapping each line number.
// In earlier grep search we found them on specific lines, but let's just use string replace with context.

const replaceContext = (searchContext, replacement) => {
  content = content.replace(searchContext, replacement);
}

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                Filter\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={perfShowArchived}`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(perfDateFilter)}\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={perfShowArchived}`
);

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                Filter\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={invShowArchived}`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(invDateFilter)}\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={invShowArchived}`
);

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                Filter\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={quotesShowArchived}`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(quotesDateFilter)}\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={quotesShowArchived}`
);

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                Filter\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={insShowArchived}`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                <Filter className="h-4 w-4" />\n                                {getFilterLabel(insDateFilter)}\n                            </Button>\n                        </PopoverTrigger>\n                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                            <div className="space-y-4">\n                                <div className="flex items-center justify-between">\n                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                    <Switch checked={insShowArchived}`
);

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                    <Filter className="h-4 w-4" />\n                                    Filter\n                                </Button>\n                            </PopoverTrigger>\n                            <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                                <div className="space-y-4">\n                                    <div className="flex items-center justify-between">\n                                        <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                        <Switch checked={qualShowArchived}`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                    <Filter className="h-4 w-4" />\n                                    {getFilterLabel(qualDateFilter)}\n                                </Button>\n                            </PopoverTrigger>\n                            <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                                <div className="space-y-4">\n                                    <div className="flex items-center justify-between">\n                                        <span className="text-sm font-medium text-zinc-200">Show Archived</span>\n                                        <Switch checked={qualShowArchived}`
);

replaceContext(
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                    <Filter className="h-4 w-4" />\n                                    Filter\n                                </Button>\n                            </PopoverTrigger>\n                            <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                                <div className="space-y-4">\n                                    <div className="space-y-2">\n                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>\n                                        <div className="grid grid-cols-2 gap-2">\n                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"\n                                                onClick={() => setQualDateFilter`,
  `<Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">\n                                    <Filter className="h-4 w-4" />\n                                    {getFilterLabel(qualDateFilter)}\n                                </Button>\n                            </PopoverTrigger>\n                            <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">\n                                <div className="space-y-4">\n                                    <div className="space-y-2">\n                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>\n                                        <div className="grid grid-cols-2 gap-2">\n                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"\n                                                onClick={() => setQualDateFilter`
);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Filters replaced!');
