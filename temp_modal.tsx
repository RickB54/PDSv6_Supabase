      <Dialog open={isDilutionModalOpen} onOpenChange={(val) => {
        setIsDilutionModalOpen(val);
        if (!val) {
          const params = new URLSearchParams(window.location.search);
          if (params.has("chart")) {
            // Check if we can go back specifically to where we came from
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/chemical-training");
            }
          }
        }
      }}>
        <DialogContent className="max-w-[98vw] 2xl:max-w-[1700px] w-full h-[98vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none shadow-2xl rounded-2xl">
          {/* PREMIUM DARK HEADER (Matching Dilution Ratio Chart style) */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-zinc-900 border-b border-zinc-800 gap-3 shrink-0 uppercase">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-hidden">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                    <DialogTitle className="text-sm sm:text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-0.5 sm:mb-1 truncate">Prime Dilution Chart</DialogTitle>
                </div>
                <div className="hidden sm:block px-2 text-[8px] font-black text-zinc-600 border-l border-zinc-800 ml-2 uppercase tracking-[0.2em] italic">Generated: ${new Date().toLocaleDateString()}</div>
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
          </div>
          <div className="flex-1 p-1 sm:p-2 bg-zinc-50/50 flex flex-col min-h-0 overflow-hidden">
            <div className={`${chartOrientation === 'landscape' ? 'max-w-full' : 'max-w-4xl'} mx-auto w-full bg-white shadow-sm border border-zinc-200 rounded-xl overflow-hidden p-1 flex flex-col min-h-0`}>
              {/* TOP SYNC SCROLLBAR */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div 
                  className={`overflow-x-auto h-4 bg-zinc-100 border border-zinc-200 rounded-sm shrink-0 chart-top-scroll-container flex-1`} 
                  onScroll={(e) => {
                    const bottom = e.currentTarget.parentElement?.nextElementSibling?.querySelector('.chart-bottom-scroll-container');
                    if (bottom) bottom.scrollLeft = e.currentTarget.scrollLeft;
                  }}
                >
                  <div style={{ width: chartOrientation === 'landscape' ? '1100px' : '700px', height: '1px' }} />
                </div>
                {hiddenChemicalIds.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setHiddenChemicalIds([])}
                    className="ml-2 h-6 px-2 text-[8px] font-black text-indigo-400 hover:text-indigo-600 bg-indigo-50/50 uppercase"
                  >
                    Show {hiddenChemicalIds.length} Hidden
                  </Button>
                )}
              </div>
              
              <div 
                className="flex-1 overflow-auto border border-zinc-300 rounded-lg chart-bottom-scroll-container pb-4"
                onScroll={(e) => {
                  const top = e.currentTarget.parentElement?.querySelector('.chart-top-scroll-container');
                  if (top) top.scrollLeft = e.currentTarget.scrollLeft;
                }}
              >
                <table className={`w-full border-collapse border border-zinc-300 ${chartOrientation === 'landscape' ? 'text-[9px] min-w-[1100px]' : 'text-[10px] min-w-[390px]'}`}>
                  <thead className="sticky top-0 z-30 bg-white shadow-sm ring-1 ring-zinc-300">
                    <tr className="bg-zinc-100 font-bold uppercase border-b-2 border-zinc-300">
                      <th rowSpan={2} className={`p-1 border border-zinc-300 text-left sticky left-0 z-40 bg-zinc-100 ${chartOrientation === 'landscape' ? 'w-[12%]' : 'w-[80px]'}`}>Product</th>
                      <th colSpan={5} className="p-1 border-l-4 border-r border-zinc-300 text-center bg-zinc-100/50 text-zinc-700">Standard</th>
                      <th colSpan={5} className="p-1 border-x-4 border-zinc-400 text-center bg-zinc-100/50 text-zinc-700">Heavy Duty</th>
                      <th colSpan={5} className="p-1 border-l-4 border-r border-zinc-300 text-center bg-zinc-100/50 text-zinc-700">Maintenance</th>
                    </tr>
                    <tr className="bg-zinc-50 text-[10px] text-center font-bold">
                      <th className={`p-1 border border-zinc-300 ${chartOrientation === 'landscape' ? 'w-auto' : 'w-[45px]'}`}>Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10 min-w-[50px] sm:min-w-[60px]">
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="flex items-center no-print">
                            <input 
                              type="number"
                              disabled={!isAdmin}
                              step="0.1"
                              value={gallonSize / 128}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                   const next = val * 128;
                                   setGallonSize(next);
                                   localforage.setItem("pds_custom_gallon_v1", next);
                                }
                              }}
                              className="w-8 sm:w-10 bg-transparent border-none text-[9px] sm:text-[11px] font-black text-amber-900 p-0 text-center focus:ring-0"
                            />
                            <span className="text-[7px] font-bold text-amber-800/60 no-print">GAL</span>
                          </div>
                          <span className="text-[6px] font-black text-amber-700 leading-none pb-0.5">CUSTOM</span>
                        </div>
                      </th>
                      <th className="p-1 border-l-4 border-zinc-300/80 border-r border-zinc-300">Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10">
                        <span className="text-[9px] font-black text-amber-900 leading-none">{gallonSize/128}G</span>
                      </th>
                      <th className="p-1 border-l-4 border-zinc-300/80 border-r border-zinc-300">Ratio</th>
                      <th className="p-1 border border-zinc-300 text-emerald-600">16oz</th>
                      <th className="p-1 border border-zinc-300 text-blue-600">24oz</th>
                      <th className="p-1 border border-zinc-300 text-purple-600">32oz</th>
                      <th className="p-0 border border-zinc-300 bg-amber-500/10">
                        <span className="text-[9px] font-black text-amber-900 leading-none">{gallonSize/128}G</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(chemicals || [])]
                      .filter(c => {
                        if (!c) return false;
                        const baseFilter = !hiddenChemicalIds.includes(c.id);
                        if (!baseFilter) return false;
                        if (chartSort.startsWith('brand:')) {
                           const target = chartSort.split(':')[1];
                           if (target === 'Other') return !c.brand;
                           return c.brand === target;
                        }
                        return true;
                      })
                      .sort((a,b) => {
                        if (chartSort === 'brand' || chartSort.startsWith('brand:')) {
                           const bA = (a.brand || '').toLowerCase();
                           const bB = (b.brand || '').toLowerCase();
                           if (bA !== bB) return bA.localeCompare(bB);
                        }
                        if (chartSort === 'low_stock') {
                           const sA = a.currentStock / (a.threshold || 1);
                           const sB = b.currentStock / (b.threshold || 1);
                           if (sA !== sB) return sA - sB;
                        }
                        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
                      })
                      .map((c, i) => {
                       const ratios = getMasterRatios(c);
                       const sorted = [...(ratios || [])].sort((a,b) => {
                          if (!a?.ratio || !b?.ratio) return 0;
                          const pA = (a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((a.ratio.match(/(\d+)[:\/]1/) || a.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                          const pB = (b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))?.[1] ? parseInt((b.ratio.match(/(\d+)[:\/]1/) || b.ratio.match(/1[:\/](\d+)/))![1]) : 0;
                          return pA - pB;
                       });
                       const standard = sorted.find(r => (r.soil_level || '').toLowerCase().includes('standard')) || (sorted.length > 0 ? sorted[0] : null);
                       const heavy = sorted.find(r => (r.soil_level || '').toLowerCase().includes('heavy duty') || (r.soil_level || '').toLowerCase().includes('heavy')) || (sorted.length > 1 ? sorted[sorted.length-1] : (sorted.length > 0 ? sorted[0] : null));
                       const light = sorted.find(r => (r.soil_level || '').toLowerCase().includes('maintenance') || (r.soil_level || '').toLowerCase().includes('light')) || (sorted.length > 2 ? sorted[1] : (sorted.length > 0 ? sorted[0] : null));

                       const renderEditableCell = (r: any, soilLevel: string, field: 'ratio' | 'chem' | 'water', ozSize?: number, extraClass: string = '') => {
                          const amts = r ? calculateAmounts(r.ratio, ozSize || 0) : null;
                          const isCustom = r?.custom === true;
                          const displayVal = field === 'ratio' ? transformRatio(r?.ratio || '-') : (field === 'chem' ? amts?.chem : amts?.water);
                          
                          return (
                            <td className={`p-0 border border-zinc-300 text-center align-middle group ${extraClass}`}>
                               {r ? (
                                 <input 
                                   defaultValue={displayVal}
                                   disabled={!isAdmin}
                                   onBlur={(e) => {
                                       if (e.target.value !== displayVal) {
                                         if (window.confirm("Are you sure you want to change this value? This will update the system's dilution ratio for this chemical.")) {
                                            handleChartCellEdit(c.id, soilLevel, field, e.target.value, ozSize);
                                         } else {
                                            e.target.value = displayVal;
                                         }
                                       }
                                     }}
                                   className={`w-full h-full bg-transparent border-none text-center font-bold px-1 outline-none focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 transition-all ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')} ${field === 'ratio' ? 'text-[11px]' : 'text-[10px]'}`}
                                 />
                               ) : '-'}
                            </td>
                          );
                       };

                       const renderOzCompoundCell = (r: any, ozSize: number, soilLevel: string, extraClass: string = '') => {
                          const amts = r ? calculateAmounts(r.ratio, ozSize) : null;
                          const isCustom = (r as any)?.custom === true;

                          return (
                            <td className={`p-0 border border-zinc-300 text-center align-bottom ${extraClass}`}>
                               {r ? (
                                 <>
                                   <div className="h-[16px] flex items-center justify-center border-b border-zinc-100 bg-white group relative">
                                       <input 
                                          key={`${c.id}-${soilLevel}-${ozSize}-chem`}
                                          defaultValue={amts?.chem || ''}
                                          disabled={!isAdmin}
                                          onBlur={(e) => {
                                              if (e.target.value !== (amts?.chem || '')) {
                                                if (window.confirm("Are you sure you want to change this value?")) {
                                                   handleChartCellEdit(c.id, soilLevel, 'chem', e.target.value, ozSize);
                                                } else {
                                                   e.target.value = amts?.chem || '';
                                                }
                                              }
                                           }}
                                          className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[11px] focus:bg-indigo-50 ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')}`}
                                        />
                                       <span className="absolute right-0.5 text-[7px] text-zinc-300 font-normal pointer-events-none">oz</span>
                                   </div>
                                   <div className="h-[16px] flex items-center justify-center bg-white group relative">
                                       <input 
                                          key={`${c.id}-${soilLevel}-${ozSize}-water`}
                                          defaultValue={amts?.water || ''}
                                          disabled={!isAdmin}
                                          onBlur={(e) => {
                                              if (e.target.value !== (amts?.water || '')) {
                                                if (window.confirm("Are you sure you want to change this value?")) {
                                                   handleChartCellEdit(c.id, soilLevel, 'water', e.target.value, ozSize);
                                                } else {
                                                   e.target.value = amts?.water || '';
                                                }
                                              }
                                           }}
                                          className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[11px] focus:bg-indigo-50 ${isCustom ? 'text-indigo-600' : (ozSize === 16 ? 'text-emerald-600' : ozSize === 24 ? 'text-blue-600' : ozSize === 32 ? 'text-purple-600' : 'text-zinc-900')}`}
                                        />
                                       <span className="absolute right-0.5 text-[7px] text-zinc-300 font-normal pointer-events-none">oz</span>
                                   </div>
                                 </>
                               ) : '-'}
                            </td>
                          );
                       };
                       return (
                          <tr 
                            key={i} 
                            className={`${i % 2 === 0 ? 'bg-white font-sans' : 'bg-zinc-50 font-sans'} ${hiddenChemicalIds.includes(c.id) ? 'hidden' : ''}`}
                          >
                            <td 
                              className={`p-1 border border-zinc-300 align-bottom bg-white cursor-pointer hover:bg-red-50 group/prod transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${chartOrientation === 'landscape' ? 'min-w-[120px]' : 'w-[80px]'}`}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to hide "${c.name}" from the chart and printout?`)) {
                                  setHiddenChemicalIds(prev => [...prev, c.id]);
                                }
                              }}
                            >
                               <div className="flex items-center justify-between">
                                 <div className="font-bold text-zinc-900 leading-tight text-[12px] sm:text-[13px] mb-1">{c.name}</div>
                                 <div className="opacity-0 group-hover/prod:opacity-100 text-red-500 transition-opacity">
                                   <EyeOff className="w-3 h-3" />
                                 </div>
                               </div>
                               <div className="text-[9px] text-zinc-400 font-bold uppercase mb-3 tracking-wider">{c.brand || ''}</div>
                              <div className="flex flex-col gap-0 text-[8px] font-bold text-zinc-500 border-t border-zinc-100 pt-2 opacity-80 overflow-hidden">
                                 <div className="h-[14px] flex items-center justify-between whitespace-nowrap">
                                    <span className="scale-[0.85] origin-left">CHEM AMOUNT:</span>
                                 </div>
                                 <div className="h-[14px] flex items-center justify-between whitespace-nowrap">
                                    <span className="scale-[0.85] origin-left">WATER AMOUNT:</span>
                                 </div>
                              </div>
                           </td>
                           <td className="p-0 border-l-4 border-r border-zinc-300 group align-middle">
                              <input 
                                 defaultValue={standard ? transformRatio(standard.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'standard', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(standard as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(standard, 16, 'standard', 'bg-green-50/10')}
                           {renderOzCompoundCell(standard, 24, 'standard', 'bg-blue-50/10')}
                           {renderOzCompoundCell(standard, 32, 'standard', 'bg-purple-50/10')}
                           {renderOzCompoundCell(standard, gallonSize, 'standard', 'bg-amber-500/10 border-r-2 border-r-zinc-400')}

                           <td className="p-0 border-l-4 border-zinc-300 group align-middle bg-zinc-50/5">
                              <input 
                                 defaultValue={heavy ? transformRatio(heavy.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'heavy', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(heavy as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(heavy, 16, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, 24, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, 32, 'heavy', 'bg-orange-50/10')}
                           {renderOzCompoundCell(heavy, gallonSize, 'heavy', 'bg-amber-500/10 border-r-2 border-r-zinc-300')}

                           <td className="p-0 border-l-4 border-zinc-300 group align-middle bg-zinc-50/5">
                              <input 
                                 defaultValue={light ? transformRatio(light.ratio) : '-'}
                                 disabled={!isAdmin}
                                 onBlur={(e) => handleChartCellEdit(c.id, 'maintenance', 'ratio', e.target.value)}
                                 className={`w-full h-full bg-transparent border-none text-center font-bold outline-none text-[12px] py-4 focus:bg-indigo-50 ${(light as any)?.custom ? 'text-indigo-600' : 'text-zinc-700'}`}
                              />
                           </td>
                           {renderOzCompoundCell(light, 16, 'maintenance', 'bg-green-50/10')}
                           {renderOzCompoundCell(light, 24, 'maintenance', 'bg-blue-50/10')}
                           {renderOzCompoundCell(light, 32, 'maintenance', 'bg-purple-50/10')}
                           {renderOzCompoundCell(light, gallonSize, 'maintenance', 'bg-amber-500/10')}
                         </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100 pt-4">
                 <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest no-print">
                   <div className="flex items-center gap-2 text-emerald-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" /> 
                     16oz
                   </div>
                   <div className="flex items-center gap-2 text-blue-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" /> 
                     24oz
                   </div>
                   <div className="flex items-center gap-2 text-purple-600">
                     <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.3)]" /> 
                     32oz
                   </div>
                    <div className="flex items-center gap-2 text-amber-600">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> ${(gallonSize/128).toFixed(2)} GAL
                    </div>
                 </div>
                 <div className="flex items-center gap-2 text-[8px] font-bold text-indigo-400 bg-indigo-500/5 px-3 py-1.5 rounded-full border border-indigo-500/10 uppercase tracking-tighter no-print">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Editable Grid: Changes in Indigo are custom overrides
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
