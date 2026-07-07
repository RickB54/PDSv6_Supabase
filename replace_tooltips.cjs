const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

const oldTooltip = `<Tooltip \n                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}\n                                        itemStyle={{ color: '#fff' }}\n                                    />`;

const newTooltip = `<Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-[#09090b] border border-zinc-800 p-3 rounded-lg shadow-2xl max-w-[180px]">
                                                        <p className="text-zinc-200 text-xs font-bold leading-tight whitespace-normal">{payload[0].name}</p>
                                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/50">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                                                            <p className="text-zinc-400 text-xs font-mono font-semibold">{payload[0].value} Jobs</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />`;

content = content.replace(oldTooltip, newTooltip);
content = content.replace(oldTooltip, newTooltip);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Fixed tooltips');
