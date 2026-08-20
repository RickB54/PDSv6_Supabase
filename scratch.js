const fs = require('fs');
let content = fs.readFileSync('src/components/inventory/InventoryAuditModal.tsx', 'utf8');

const startStr = <Button \n                      variant="ghost" \n                      size="sm";
const endStr = <ArrowDownUp className="h-4 w-4" />\n                    </Button>;

const start = content.indexOf(startStr);
const end = content.indexOf(endStr, start);

if (start !== -1 && end !== -1) {
  const replacement = \<DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2" 
                          title="Expand/Collapse"
                        >
                          <ArrowDownUp className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300 max-h-[60vh] overflow-y-auto" align="end">
                        <div className="px-2 py-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Expand / Collapse</div>
                        <DropdownMenuItem
                          className="flex items-center justify-between hover:bg-zinc-800 cursor-pointer text-xs font-semibold text-blue-400 focus:bg-zinc-800 focus:text-blue-300"
                          onClick={() => {
                            let hasExpandedInCurrentTab = false;
                            if (activeTab === 'chemicals') hasExpandedInCurrentTab = filteredChemicals.some(c => expandedItems[c.id]);
                            else if (activeTab === 'supplies') hasExpandedInCurrentTab = filteredSupplies.some(s => expandedItems[s.id]);
                            else hasExpandedInCurrentTab = filteredEquip.some(e => expandedItems[e.id]);

                            setExpandedItems(prev => {
                              const next = { ...prev };
                              if (hasExpandedInCurrentTab) {
                                if (activeTab === 'chemicals') filteredChemicals.forEach(c => delete next[c.id]);
                                else if (activeTab === 'supplies') filteredSupplies.forEach(s => delete next[s.id]);
                                else filteredEquip.forEach(e => delete next[e.id]);
                              } else {
                                if (activeTab === 'chemicals') filteredChemicals.forEach(c => next[c.id] = true);
                                else if (activeTab === 'supplies') filteredSupplies.forEach(s => next[s.id] = true);
                                else filteredEquip.forEach(e => next[e.id] = true);
                              }
                              return next;
                            });
                          }}
                        >
                          <span>
                            {activeTab === 'chemicals' 
                              ? filteredChemicals.some(c => expandedItems[c.id]) ? 'Collapse All Items' : 'Expand All Items'
                              : activeTab === 'supplies'
                                ? filteredSupplies.some(s => expandedItems[s.id]) ? 'Collapse All Items' : 'Expand All Items'
                                : filteredEquip.some(e => expandedItems[e.id]) ? 'Collapse All Items' : 'Expand All Items'}
                          </span>
                        </DropdownMenuItem>
                        <div className="h-px bg-zinc-800 my-1" />
                        {(activeTab === 'chemicals' ? groupedChemicals : activeTab === 'supplies' ? groupedSupplies : groupedEquip).map(([groupName, groupItems]) => {
                          const isSomeExpanded = groupItems.some((item: any) => expandedItems[item.id]);
                          
                          return (
                            <DropdownMenuItem 
                              key={groupName}
                              className="flex items-center justify-between hover:bg-zinc-800 cursor-pointer text-xs focus:bg-zinc-800 focus:text-white"
                              onClick={(e) => {
                                 e.preventDefault();
                                 setExpandedItems(prev => {
                                    const next = { ...prev };
                                    if (isSomeExpanded) {
                                      groupItems.forEach((item: any) => delete next[item.id]);
                                    } else {
                                      groupItems.forEach((item: any) => next[item.id] = true);
                                    }
                                    return next;
                                 });
                              }}
                            >
                              <span className="truncate pr-2">\</span>
                              <span className="text-zinc-500 text-[10px] whitespace-nowrap">(\)</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>\;
  content = content.substring(0, start) + replacement + content.substring(end + endStr.length);
  fs.writeFileSync('src/components/inventory/InventoryAuditModal.tsx', content);
  console.log('Replaced successfully!');
} else {
  console.log('Could not find start/end', start, end);
}
