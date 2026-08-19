const fs = require('fs');

let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf8');

// 1. Revert confirmAndExecuteVisualReport
const exportRegex = /setIsVisualExportMode\(true\);[\s\S]*?setIsVisualExportMode\(false\);\n\s*\}/;

const newExportLogic = `setIsVisualExportMode(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (config.type === 'print') {
            window.print();
            setIsVisualExportMode(false);
            return;
        }

        const element = document.getElementById('analytics-print-container');
        if (!element) {
            toast.error("Could not find the print container.", { id: "visual-export" });
            setIsVisualExportMode(false);
            return;
        }
        
        try {
            toast.loading("Generating PDF Document...", { id: "visual-export" });
            const html2pdf = (await import('html2pdf.js')).default;
            
            let label = "Analytics";
            if (config.start && config.end) {
                label += \`_\${format(config.start, 'MMM_d')}_to_\${format(config.end, 'MMM_d_yyyy')}\`;
            }

            const opt = {
                margin: [15, 15, 15, 15],
                filename: \`Prime_\${label}.pdf\`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                pagebreak: { mode: 'css', avoid: 'tr, .avoid-break, .page-break-inside-avoid' }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success("Professional PDF Downloaded!", { id: "visual-export" });
        } catch(e) {
            console.error(e);
            toast.error("Failed to generate PDF.", { id: "visual-export" });
        } finally {
            setIsVisualExportMode(false);
        }`;

content = content.replace(exportRegex, newExportLogic);

// 2. Rewrite PrintTemplate to remove ALL graphs and add tables
// I will match from `const PrintTemplate = () => {` to the end of the PrintTemplate function `};` BEFORE the if statement.
const printTemplateRegex = /const PrintTemplate = \(\) => \{[\s\S]*?\n\s*\};\n*(?=\s*if \(isVisualExportMode\))/;

const newPrintTemplate = `const PrintTemplate = () => {
        const totalRevenue = filteredPerfBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        const totalOutstanding = filteredInvoices.filter(i => {
            const status = (i.status || '').toLowerCase();
            const isDraft = status === 'draft';
            const isPaid = status === 'paid' || i.total === 0 || (i.paidAmount !== undefined && i.total !== undefined && i.paidAmount >= i.total);
            return !isPaid && !isDraft;
        }).reduce((sum, i) => sum + ((Number(i.total) || 0) - (Number(i.paidAmount) || 0)), 0);
        
        const averageTicket = stats.completed > 0 ? (totalRevenue / stats.completed) : 0;
        const totalJobs = stats.totalBookings;

        return (
            <div id="analytics-print-container" className="w-[1056px] bg-white text-black p-10 mx-auto font-sans" style={{ boxSizing: 'border-box' }}>
                {/* Header Section */}
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-1">Prime Auto Detail</h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[11px]">Comprehensive Analytics Report</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-widest text-black">Date Range</p>
                        <p className="text-sm font-medium text-zinc-800">
                            {perfDateFilter.start ? format(perfDateFilter.start, 'MMM d, yyyy') : 'All Time'} 
                            {' - '} 
                            {perfDateFilter.end ? format(perfDateFilter.end, 'MMM d, yyyy') : 'All Time'}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-2">Generated: {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                </div>

                {/* Executive Summary Grid */}
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Executive Summary</h2>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Total Revenue</p>
                            <p className="text-xl font-black text-black">\${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Total Jobs</p>
                            <p className="text-xl font-black text-black">{totalJobs}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Avg Ticket</p>
                            <p className="text-xl font-black text-black">\${averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Outstanding</p>
                            <p className="text-xl font-black text-black">\${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>

                {/* Health Metrics */}
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Health Metrics & KPIs</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 border-l-4 border-rose-500 bg-zinc-50 rounded-r-xl">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Cancellation / No-Show Rate</p>
                            <p className="text-xl font-black text-black">{businessHealthData.cancellationRate.toFixed(1)}%</p>
                        </div>
                        <div className="p-4 border-l-4 border-emerald-500 bg-zinc-50 rounded-r-xl">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Repeat Customer Rate</p>
                            <p className="text-xl font-black text-black">{businessHealthData.repeatRate.toFixed(1)}%</p>
                        </div>
                        <div className="p-4 border-l-4 border-indigo-500 bg-zinc-50 rounded-r-xl">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Upsell / Attach Rate</p>
                            <p className="text-xl font-black text-black">{businessHealthData.upsellRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Booking Volume Data */}
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Booking Volume & Revenue Trend</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Month</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center">Bookings</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {businessHealthData.volumeTrend.map((v, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-bold">{v.name}</td>
                                    <td className="p-2 text-zinc-800 text-xs text-center font-bold">{v.bookings}</td>
                                    <td className="p-2 text-zinc-800 text-xs text-right font-bold">\${(businessHealthData.revenueTrend.find(r => r.name === v.name)?.revenue || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Service Data Tables */}
                <div className="grid grid-cols-2 gap-8 mb-10 avoid-break page-break-inside-avoid">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Service Breakdown</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 border-b border-zinc-300">
                                <tr>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service Category</th>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Jobs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pieData.map((v, i) => (
                                    <tr key={i} className="border-b border-zinc-100">
                                        <td className="p-2 text-zinc-800 text-xs font-bold">{v.name}</td>
                                        <td className="p-2 text-zinc-800 text-xs text-right font-bold">{v.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Quote Outcomes</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 border-b border-zinc-300">
                                <tr>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Status</th>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Quotes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outcomePieData.map((v, i) => (
                                    <tr key={i} className="border-b border-zinc-100">
                                        <td className="p-2 text-zinc-800 text-xs font-bold">{v.name}</td>
                                        <td className="p-2 text-zinc-800 text-xs text-right font-bold">{v.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-10 avoid-break page-break-inside-avoid">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Location Distribution</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 border-b border-zinc-300">
                                <tr>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Location</th>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Jobs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locationPieData.map((v, i) => (
                                    <tr key={i} className="border-b border-zinc-100">
                                        <td className="p-2 text-zinc-800 text-xs font-bold">{v.name}</td>
                                        <td className="p-2 text-zinc-800 text-xs text-right font-bold">{v.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Acquisition Channels</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 border-b border-zinc-300">
                                <tr>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Source</th>
                                    <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {acquisitionData.howFoundList.map((v, i) => (
                                    <tr key={i} className="border-b border-zinc-100">
                                        <td className="p-2 text-zinc-800 text-xs font-bold">{v.name}</td>
                                        <td className="p-2 text-zinc-800 text-xs text-right font-bold">{v.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Logs */}
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Service Logs (Top 30)</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPerfBookings.slice(0, 30).map((b, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{b.date ? format(parseISO(b.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{b.customer}</td>
                                    <td className="p-2 text-zinc-600 text-xs">{b.title}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold">\${(Number(b.price) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPerfBookings.length > 30 && <p className="text-[10px] font-bold text-zinc-400 mt-4 text-center uppercase tracking-widest">... and {filteredPerfBookings.length - 30} more records omitted for brevity.</p>}
                </div>

                {/* Services To Be Done */}
                {toDoServices.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Services To Be Done</h2>
                    <table className="w-full text-sm text-left table-fixed break-words whitespace-normal">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Est. Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {toDoServices.slice(0, 20).map((b, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{b.date ? format(parseISO(b.date), 'MMM d, yyyy') : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{b.customer}</td>
                                    <td className="p-2 text-zinc-600 text-xs truncate">{b.service}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold">\${(Number(b.revenue) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Outstanding Invoices */}
                {filteredInvoices.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Unpaid & Outstanding Invoices</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Invoice #</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.filter(i => {
                                const status = (i.status || '').toLowerCase();
                                return status !== 'paid' && status !== 'draft' && (Number(i.total) || 0) > (Number(i.paidAmount) || 0);
                            }).slice(0, 20).map((inv, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{inv.date ? format(parseISO(inv.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{inv.customerName}</td>
                                    <td className="p-2 text-zinc-600 text-xs">{inv.number}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold text-red-600">\${((Number(inv.total) || 0) - (Number(inv.paidAmount) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Pipeline Quotes */}
                {filteredQuotes.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Active Pipeline Quotes</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Status</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuotes.filter(q => q.status === 'pending' || q.status === 'accepted').slice(0, 20).map((q, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{q.date ? format(parseISO(q.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{q.customerName}</td>
                                    <td className="p-2 text-zinc-600 text-xs font-bold uppercase">{q.status}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold">\${(Number(q.total) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Probono & Liability Jobs */}
                {probonoJobs.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Pro-Bono & Liability Events</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service/Issue</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Associated Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {probonoJobs.slice(0, 20).map((b, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{b.date ? format(parseISO(b.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{b.customer}</td>
                                    <td className="p-2 text-zinc-600 text-xs">{b.service}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold text-red-500">\${(Number(b.value) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Customer Insights */}
                {customerStats.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Customer Insights & Follow-ups</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Last Service</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service Title</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerStats.slice(0, 20).map((b, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{b.lastService ? format(parseISO(b.lastService), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{b.name}</td>
                                    <td className="p-2 text-zinc-600 text-xs">{b.service}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Quality Review */}
                {qualDoneServices.length > 0 && (
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Operational Quality Review</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Customer</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center">Sentiment</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center">Google Stars</th>
                            </tr>
                        </thead>
                        <tbody>
                            {qualDoneServices.filter(b => (b as any).sentiment || (b as any).googleStars).slice(0, 20).map((b: any, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{b.date ? format(parseISO(b.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{b.customer}</td>
                                    <td className="p-2 text-zinc-600 text-xs text-center uppercase font-bold">{b.sentiment || 'N/A'}</td>
                                    <td className="p-2 text-zinc-600 text-xs text-center font-bold text-amber-500">{b.googleStars ? \`\${b.googleStars} / 5\` : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Profitability & Compensation Summary */}
                <div className="mb-10 avoid-break page-break-inside-avoid">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4 text-black">Profitability & Labor Breakdown</h2>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Labor Revenue Generated</p>
                            <p className="text-xl font-black text-black">\${(profitabilityData.tableData.reduce((sum, item) => sum + ((item as any).revenue || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Total Labor Hours</p>
                            <p className="text-xl font-black text-black">{(profitabilityData.totalHours || 0).toFixed(1)} hrs</p>
                        </div>
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-center">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Gross Labor Profit</p>
                            <p className="text-xl font-black text-black">\${(profitabilityData.tableData.reduce((sum, item) => sum + (((item as any).revenue || 0) - ((item as any).cost || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 border-b border-zinc-300">
                            <tr>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Date</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Employee</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Labor Cost</th>
                                <th className="p-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profitabilityData.tableData.slice(0, 20).map((p: any, i) => (
                                <tr key={i} className="border-b border-zinc-100">
                                    <td className="p-2 text-zinc-800 text-xs font-medium">{p.date ? format(parseISO(p.date), "MMM d, yyyy") : 'N/A'}</td>
                                    <td className="p-2 text-zinc-900 font-bold text-xs">{p.employee}</td>
                                    <td className="p-2 text-zinc-600 text-xs">{p.service}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold text-red-500">\${(Number(p.cost) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="p-2 text-right font-mono text-xs font-bold text-emerald-600">\${(Number(p.revenue) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };\n`;

content = content.replace(printTemplateRegex, newPrintTemplate);

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Successfully updated PrintTemplate and visual export logic.');
