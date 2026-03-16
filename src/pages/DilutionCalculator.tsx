import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
    Info, 
    RotateCcw, 
    ChevronRight, 
    Calculator, 
    ChevronLeft,
    Percent as PercentIcon,
    ArrowLeftRight,
    ArrowRight,
    HelpCircle,
    BookOpen
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import HelpModal from '@/components/help/HelpModal';

const DilutionCalculator = ({ isModal = false, onBack, onHelp }: { isModal?: boolean, onBack?: () => void, onHelp?: () => void }) => {
    const navigate = useNavigate();
    const [showHelp, setShowHelp] = useState(false);
    const [containerSize, setContainerSize] = useState<number>(32);
    const [ratio, setRatio] = useState<number>(4);
    const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
    const [mode, setMode] = useState<'ratio' | 'percent'>('ratio');
    const [calcType, setCalcType] = useState<'total' | 'product'>('total');
    
    const [result, setResult] = useState({ product: 0, water: 0 });

    const calculate = () => {
        if (!containerSize || isNaN(containerSize)) {
            setResult({ product: 0, water: 0 });
            return;
        }

        let effectiveRatio = ratio;
        if (mode === 'percent') {
            effectiveRatio = (100 / ratio) - 1;
        }

        const totalParts = effectiveRatio + 1;

        if (calcType === 'total') {
            const product = containerSize / totalParts;
            const water = containerSize - product;
            setResult({ product: Math.round(product * 10) / 10, water: Math.round(water * 10) / 10 });
        } else {
            const water = containerSize * effectiveRatio;
            setResult({ product: containerSize, water: Math.round(water * 10) / 10 });
        }
    };

    useEffect(() => {
        calculate();
    }, [containerSize, ratio, unit, mode, calcType]);

    const handleUnitChange = (newUnit: 'oz' | 'ml') => {
        if (newUnit === unit) return;
        if (newUnit === 'ml') {
            setContainerSize(prev => Math.round(prev * 29.5735));
        } else {
            setContainerSize(prev => Math.round((prev / 29.5735) * 10) / 10);
        }
        setUnit(newUnit);
    };

    const handleReset = () => {
        setContainerSize(unit === 'oz' ? 32 : 1000);
        setRatio(4);
        setMode('ratio');
        setCalcType('total');
    };

    const formatNumber = (num: number) => {
        if (num === 0) return '0';
        return num % 1 === 0 ? num.toString() : num.toFixed(1);
    };

    return (
        <div className={`flex flex-col items-center min-h-screen bg-[#05050a] text-white ${isModal ? '' : 'pt-20'}`}>
            {!isModal && <PageHeader title="Dilution Calculator" />}
            <div className={`flex flex-col items-center w-full px-6 md:px-12 ${isModal ? 'bg-zinc-950 p-4 h-full overflow-y-auto' : ''}`}>
            {/* Header Area */}
            <div className="w-full max-w-md relative flex flex-col items-center mb-10 shrink-0">
                {(isModal || window.innerWidth < 768) && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-0 top-1 text-zinc-600 hover:text-white hover:bg-zinc-900 z-10"
                        onClick={() => onBack ? onBack() : navigate(-1)}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}

                <div className="flex flex-col items-center group transition-all relative w-full">
                    <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 w-full justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                            <Calculator className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col items-center leading-none">
                            <h1 className="text-5xl sm:text-7xl font-black bg-gradient-to-r from-[#00d2ff] via-[#9d50bb] to-[#ff00c1] bg-clip-text text-transparent italic tracking-tighter leading-none">
                                Prime
                            </h1>
                            <div className="mt-2 text-center">
                                <span className="text-[10px] sm:text-[14px] font-black text-white uppercase tracking-[0.2em] bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30 whitespace-nowrap block shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                    PRIME DILUTION CALCULATOR
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 relative z-10 bg-zinc-950/40 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/5 shadow-xl">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-emerald-500 hover:text-white hover:bg-emerald-600/20 active:scale-90 transition-transform" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowHelp(true);
                            }}
                            title="Quick Help"
                        >
                            <Info className="w-6 h-6" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-400 hover:text-white hover:bg-blue-600/20 active:scale-90 transition-transform" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onHelp ? onHelp() : navigate('/dilution-calculator/help');
                            }}
                            title="Masterclass"
                        >
                            <HelpCircle className="w-6 h-6" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-600 hover:text-white hover:bg-zinc-800 active:scale-90 transition-transform" 
                            onClick={handleReset}
                            title="Reset"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Input Dashboard */}
            <div className="w-full max-w-md space-y-3 shrink-0">
                {/* Container Size Input */}
                <div className="group relative">
                    <div className="absolute -inset-0.5 bg-blue-500/10 blur opacity-0 group-focus-within:opacity-100 transition duration-500 rounded-3xl"></div>
                    <div className="relative grid grid-cols-[1fr_2fr_1fr] bg-[#0d0d14] border border-zinc-800 rounded-3xl overflow-hidden h-32 shadow-2xl">
                        {/* Label Box */}
                        <div className="border-r border-zinc-800 h-full flex flex-col items-center justify-center bg-black/40 text-center px-2">
                            <span className="text-[10px] font-black text-zinc-500 uppercase leading-none tracking-tighter">
                                {calcType === 'total' ? 'Container' : 'Product'}
                            </span>
                            <span className="text-[10px] font-black text-zinc-500 uppercase leading-none mt-1 tracking-tighter">
                                {calcType === 'total' ? 'Size' : 'Amount'}
                            </span>
                        </div>
                        
                        {/* Number Box */}
                        <div className="h-full flex flex-col items-center justify-center relative bg-[#09090e]">
                            <input 
                                type="number"
                                value={containerSize || ''}
                                onChange={(e) => setContainerSize(parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent border-none text-center text-6xl font-black text-white focus:ring-0 outline-none placeholder:text-zinc-900 p-0"
                                placeholder="32"
                            />
                            <div className="w-2/3 h-[3px] bg-zinc-800 mt-2 rounded-full" />
                        </div>

                        {/* Unit Box */}
                        <div className="border-l border-zinc-800 h-full flex items-center justify-center bg-black/40">
                            <span className="text-5xl font-black text-white italic tracking-tighter">
                                {unit === 'oz' ? 'Oz' : 'Ml'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dilution Ratio Input */}
                <div className="group relative">
                    <div className="absolute -inset-0.5 bg-purple-500/10 blur opacity-0 group-focus-within:opacity-100 transition duration-500 rounded-3xl"></div>
                    <div className="relative grid grid-cols-[1fr_2fr_1fr] bg-[#0d0d14] border border-zinc-800 rounded-3xl overflow-hidden h-32 shadow-2xl">
                        {/* Label Box */}
                        <div className="border-r border-zinc-800 h-full flex flex-col items-center justify-center bg-black/40 text-center px-2">
                            <span className="text-[10px] font-black text-zinc-500 uppercase leading-none tracking-tighter">
                                {mode === 'ratio' ? 'Dilution' : 'Dilution'}
                            </span>
                            <span className="text-[10px] font-black text-zinc-500 uppercase leading-none mt-1 tracking-tighter">
                                {mode === 'ratio' ? 'Ratio' : 'Percent'}
                            </span>
                        </div>
                        
                        {/* Number Box */}
                        <div className="h-full flex flex-col items-center justify-center relative bg-[#09090e]">
                            <input 
                                type="number"
                                value={ratio || ''}
                                onChange={(e) => setRatio(parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent border-none text-center text-6xl font-black text-white focus:ring-0 outline-none placeholder:text-zinc-900 p-0"
                                placeholder="4"
                            />
                            <div className="w-2/3 h-[3px] bg-zinc-800 mt-2 rounded-full" />
                        </div>

                        {/* Unit Box */}
                        <div className="border-l border-zinc-800 h-full flex items-center justify-center bg-black/40">
                            <span className="text-5xl font-black text-white italic tracking-tighter">
                                {mode === 'ratio' ? ':1' : '%'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Arrow Visual Separator */}
                <div className="flex justify-center py-4">
                    <Button 
                        onClick={calculate}
                        className="w-20 h-10 rounded-full border border-zinc-800/50 flex items-center justify-center bg-black shadow-lg hover:border-zinc-600 transition-all group"
                    >
                        <ChevronRight className="w-6 h-6 text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </Button>
                </div>

                {/* Output Cards */}
                <div className="grid grid-cols-2 gap-4 pb-4">
                    <Card className="bg-[#0b0b0f] border border-zinc-800/50 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl group transition-all h-48 flex flex-col items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest text-center">Total Product</p>
                        <div className="text-6xl font-black text-white leading-none text-center">
                            {formatNumber(result.product)}
                        </div>
                        <div className="absolute bottom-6 right-8">
                            <span className="text-sm font-black text-zinc-500 uppercase italic">{unit === 'oz' ? 'Oz' : 'Ml'}</span>
                        </div>
                    </Card>

                    <Card className="bg-[#0b0b0f] border border-zinc-800/50 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl group transition-all h-48 flex flex-col items-center justify-center">
                        <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest text-center">Total Water</p>
                        <div className="text-6xl font-black text-white leading-none text-center">
                            {formatNumber(result.water)}
                        </div>
                        <div className="absolute bottom-6 right-8">
                            <span className="text-sm font-black text-zinc-500 uppercase italic">{unit === 'oz' ? 'Oz' : 'Ml'}</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Menu Navigation */}
            <div className={`w-full max-w-md mt-auto pb-4 transition-all duration-300 ${isModal ? '' : 'mb-3'}`}>
                <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#0d0d12]/90 border border-zinc-800/50 rounded-3xl shadow-2xl backdrop-blur-xl">
                    <Button 
                        variant="ghost" 
                        onClick={() => handleUnitChange('oz')}
                        className={`flex flex-col gap-1 h-14 rounded-2xl transition-all ${unit === 'oz' ? 'bg-zinc-800 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-zinc-600 hover:text-white hover:bg-zinc-900 opacity-60'}`}
                    >
                        <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center font-black text-[10px] transition-colors ${unit === 'oz' ? 'border-blue-400' : 'border-zinc-800'}`}>O</div>
                        <span className="text-[8px] uppercase font-black tracking-tighter">Ounces</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => handleUnitChange('ml')}
                        className={`flex flex-col gap-1 h-14 rounded-2xl transition-all ${unit === 'ml' ? 'bg-zinc-800 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-zinc-600 hover:text-white hover:bg-zinc-900 opacity-60'}`}
                    >
                        <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center font-black text-[10px] transition-colors ${unit === 'ml' ? 'border-blue-400' : 'border-zinc-800'}`}>M</div>
                        <span className="text-[8px] uppercase font-black tracking-tighter">Milliliters</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => setMode(mode === 'ratio' ? 'percent' : 'ratio')}
                        className={`flex flex-col gap-1 h-14 rounded-2xl transition-all ${mode === 'percent' ? 'bg-zinc-800 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'text-zinc-600 hover:text-white hover:bg-zinc-900 opacity-60'}`}
                    >
                        <PercentIcon className="w-5 h-5" />
                        <span className="text-[8px] uppercase font-black tracking-tighter">Percent</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => setCalcType(calcType === 'total' ? 'product' : 'total')}
                        className={`flex flex-col gap-1 h-14 rounded-2xl transition-all ${calcType === 'product' ? 'bg-zinc-800 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-zinc-600 hover:text-white hover:bg-zinc-900 opacity-60'}`}
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        <span className="text-[8px] uppercase font-black tracking-tighter">Swap</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => setRatio(prev => prev > 1 ? Math.round(1/prev * 100) / 100 : Math.round(1/prev * 10) / 10)}
                        className="flex flex-col gap-1 h-14 rounded-2xl text-zinc-600 hover:text-white hover:bg-zinc-900 opacity-60 transition-all"
                    >
                        <div className="w-6 h-6 border-2 border-zinc-800 rounded-full flex items-center justify-center font-black text-[10px] group-hover:border-zinc-600">R</div>
                        <span className="text-[8px] uppercase font-black tracking-tighter">Reverse</span>
                    </Button>
                </div>
            </div>
            
            {!isModal && (
                <div className="mt-6 text-[9px] uppercase tracking-[0.4em] font-black text-zinc-800 pb-8 shrink-0">
                    Prime Detailing Pro System
                </div>
            )}
            <HelpModal 
                open={showHelp} 
                onOpenChange={setShowHelp} 
                role="admin"
                initialTopicId="prime-dilution-masterclass"
            />
            </div>
        </div>
    );
};

export default DilutionCalculator;
export { DilutionCalculator };

