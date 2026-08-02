const fs = require('fs');
const content = fs.readFileSync('src/pages/StaffSchedule.tsx', 'utf-8');
const lines = content.split('\n');

const newContent = \                    {/* Shift Detail Popup */}
                    <Dialog open={!!selectedShift} onOpenChange={(open) => { if (!open) setSelectedShiftId(null); }}>
                        <DialogContent className="max-w-4xl bg-[#0f0f13] border-zinc-800 text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
                            {selectedShift && (
                                <div className="flex flex-1 p-6 sm:p-8 gap-4 sm:gap-6 relative min-h-[250px] max-h-[85vh] overflow-y-auto">
                                    <div className="w-[4px] bg-blue-500 rounded-full self-stretch shrink-0" style={{ backgroundColor: selectedShift.status === 'sick' ? '#ef4444' : selectedShift.color === 'blue' ? '#3b82f6' : selectedShift.color }} />

                                    {/* Content Wrapper */}
                                    <div className="flex flex-1 flex-col lg:flex-row gap-8 min-w-0">
                                        {/* Info Column */}
                                        <div className="space-y-1 min-w-[200px]">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">Employee Assignment</div>
                                            <div className="text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                                                {selectedShift.employeeName}
                                                {selectedShift.status === 'sick' && <Badge variant="destructive" className="text-[9px] font-black h-5 px-1.5 uppercase tracking-widest">SICK</Badge>}
                                                {selectedShift.status === 'no-show' && <Badge variant="secondary" className="text-[9px] font-black h-5 px-1.5 uppercase tracking-widest">NO SHOW</Badge>}
                                            </div>
                                            <div className="text-sm font-bold text-zinc-500 uppercase tracking-tight mt-1">{selectedShift.role}</div>
                                        </div>

                                        {/* Time Column */}
                                        <div className="space-y-1 min-w-[220px] border-t lg:border-t-0 pt-4 lg:pt-0 lg:border-l border-zinc-800 lg:pl-6">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">Shift Schedule</div>
                                            <div className="text-xl text-zinc-200 font-black flex items-center gap-2 mb-1">
                                                <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                                                {formatTime12(selectedShift.startTime)} - {formatTime12(selectedShift.endTime)}
                                            </div>
                                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{format(parseISO(selectedShift.date), 'EEEE, MMMM do')}</div>
                                        </div>

                                        {/* Notes Column */}
                                        <div className="flex-1 border-t lg:border-t-0 pt-4 lg:pt-0 lg:border-l border-zinc-800 lg:pl-6 bg-transparent lg:bg-zinc-900/30 rounded-r-xl lg:p-4">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">Shift Notes & Intel</div>
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium">
                                                {selectedShift.notes || <span className="text-zinc-600 italic">No operational notes provided for this shift.</span>}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center pt-4 lg:pt-0 lg:ml-4 min-w-full lg:min-w-[180px]">
                                            {isAdmin && (
                                                <Button variant="ghost" size="sm" className="h-12 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 w-full font-black uppercase tracking-widest text-xs" onClick={() => {
                                                    navigate(\/payroll?tab=checks&employee=\\\);
                                                }}>
                                                    <DollarSign className="w-4 h-4 mr-2" /> Payroll Sync
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-12 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 w-full font-black uppercase tracking-widest text-xs" onClick={() => {
                                                if (selectedShift.isBooking && selectedShift.bookingData) {
                                                    const b = selectedShift.bookingData;
                                                    const params = new URLSearchParams();
                                                    if (b.customer_id) params.set('customerId', b.customer_id);
                                                    if (b.customer_name || b.customer) params.set('customerName', b.customer_name || b.customer);
                                                    params.set('id', b.id);
                                                    
                                                    const allServices = [...servicePackages, ...getCustomPackages()];
                                                    const svcName = b.service_package || b.title;
                                                    const svc = allServices.find(s => s.name === svcName);
                                                    if (svc) params.set('package', svc.id);

                                                    if (b.vehicle) params.set('vehicleType', b.vehicle);
                                                    if (b.vehicle_year) params.set('vehicleYear', b.vehicle_year);
                                                    if (b.vehicle_make) params.set('vehicleMake', b.vehicle_make);
                                                    if (b.vehicle_model) params.set('vehicleModel', b.vehicle_model);
                                                    if (b.vehicle_color) params.set('vehicleColor', b.vehicle_color);
                                                    
                                                    const bAddons = typeof b.addons === 'string' ? JSON.parse(b.addons || '[]') : (b.addons || []);
                                                    if (Array.isArray(bAddons) && bAddons.length > 0) {
                                                        const allAddons = [...addOns, ...getCustomAddOns()];
                                                        const aids = bAddons.map((name: string) => allAddons.find(a => a.name === name)?.id).filter(Boolean);
                                                        if (aids.length > 0) params.set('addons', aids.join(','));
                                                    }

                                                    params.set('employeeId', selectedShift.employeeId);
                                                    params.set('employee', selectedShift.employeeName);

                                                    navigate(\/service-checklist?\\\);
                                                } else {
                                                    navigate(\/service-checklist?employee=\\\&employeeId=\\\);
                                                }
                                            }}>
                                                <CheckSquare className="w-4 h-4 mr-2" /> Launch Job
                                            </Button>
                                            {selectedShift.isBooking && selectedShift.bookingData && (
                                                <Button variant="ghost" size="sm" className="h-12 bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 w-full font-black uppercase tracking-widest text-xs" onClick={() => {
                                                    navigate(\/bookings?id=\\\);
                                                }}>
                                                    <LayoutDashboard className="w-4 h-4 mr-2" /> View Booking
                                                </Button>
                                            )}
                                            <div className="flex gap-2 w-full mt-2">
                                                {isAdmin && !selectedShift.isBooking && (
                                                    <>
                                                        <Button variant="destructive" size="sm" className="h-12 px-4 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20" onClick={() => handleDeleteShift(selectedShift.id)} title="Delete Shift"><Trash2 className="w-4 h-4" /></Button>
                                                        <Button variant="outline" size="sm" className="h-12 flex-1 font-black uppercase tracking-widest text-xs border-zinc-800 hover:bg-white hover:text-black" onClick={() => handleEditShift(selectedShift)}>Edit Shift</Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>\;

lines.splice(558, 114, newContent);
fs.writeFileSync('src/pages/StaffSchedule.tsx', lines.join('\n'));
