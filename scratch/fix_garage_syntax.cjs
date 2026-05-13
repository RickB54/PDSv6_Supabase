const fs = require('fs');
const path = 'src/pages/Prospects.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block starts around line 816 and ends around line 858
// We'll use a regex to capture the whole vehicles.map block
const mapRegex = /return vehicles\.map\(\(v: any, vIdx: number\) => \{[\s\S]+?\}\);\s+\}\)\(\)\}/;

const replacement = `return vehicles.map((v: any, vIdx: number) => {
                                  const vy = (v.year && v.year !== '-' && v.year !== '---') ? v.year : '';
                                  return (
                                    <div key={vIdx} className="bg-zinc-950 p-3 rounded border border-zinc-800/50 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                          <Car className="w-3.5 h-3.5 text-purple-400" />
                                        </div>
                                        <div>
                                          <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">{vIdx === 0 ? 'Primary Vehicle' : \`Vehicle #\${vIdx+1}\`}</div>
                                          <div className="text-zinc-200 text-sm font-black tracking-tight">{vy ? \`\${vy} \` : ''}{v.make} {v.model}</div>
                                          <div className="text-[9px] text-zinc-500 font-bold uppercase">{v.type || 'No Type Set'} {v.color ? \` • \${v.color}\` : ''}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {isAdmin && v.id && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500 transition-colors"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (confirm(\`Delete \${vy} \${v.make || ''} \${v.model || ''}?\`)) {
                                                const { deleteSupabaseVehicle } = await import('@/lib/supa-data');
                                                try {
                                                  await deleteSupabaseVehicle(v.id);
                                                  toast({ title: "Vehicle Deleted" });
                                                  refresh();
                                                } catch (err: any) {
                                                  toast({ title: "Error", description: err.message, variant: "destructive" });
                                                }
                                              }
                                            }}
                                            title="Delete Vehicle"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}`;

if (mapRegex.test(content)) {
    content = content.replace(mapRegex, replacement);
    fs.writeFileSync(path, content);
    console.log('Successfully fixed the garage section in Prospects.tsx');
} else {
    console.error('Could not find the target block in Prospects.tsx');
    // Try a more flexible match if the first one fails
    const mapRegexAlt = /return vehicles\.map\(\(v: any, vIdx: number\) => \{[\s\S]+?\}\);\s+\}\)\(\)\}/;
    // ... wait, it's the same. Let's try to match by part.
}
