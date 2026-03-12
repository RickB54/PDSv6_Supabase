import React from 'react';
import { 
    Calculator, 
    ArrowLeft, 
    Droplets, 
    GlassWater, 
    Percent, 
    RefreshCcw, 
    Repeat, 
    Info, 
    Zap,
    FlaskConical,
    Target,
    HelpCircle,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const DilutionCalculatorHelp = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-600">
            {/* Hero Header */}
            <div className="relative h-64 bg-zinc-950 border-b border-zinc-900 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
                <div className="relative z-10 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Mastering the Math
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Prime Dilution <span className="text-blue-500">Masterclass</span>
                    </h1>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest leading-none">
                        Professional Detailing Chemistry & Calculations
                    </p>
                </div>
            </div>

            {/* Back Button */}
            <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
                <Button 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-full px-6 h-12 shadow-2xl group transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    Back to Calculator
                </Button>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-20 pb-32">
                
                {/* Section 1: Core Philosophy */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                            <FlaskConical className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Detox Detailing Math</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <p className="text-zinc-400 leading-relaxed">
                                Detailing is as much about chemistry as it is about elbow grease. Using too much product wastes money and can damage surfaces. Using too little results in poor cleaning performance.
                            </p>
                            <p className="text-zinc-500 text-sm italic">
                                "Our calculator removes the guesswork, ensuring laboratory-grade precision in every bottle you mix."
                            </p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-zinc-800 pb-2">The Golden Rule</h4>
                            <p className="text-blue-400 font-bold italic leading-tight">
                                Always add water first, then your chemical. This prevents excessive foaming and ensuring accurate volume measurement.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: Ratio Mode */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-600/20 rounded-2xl border border-purple-500/20">
                            <Target className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Ratio Mode (X:1)</h2>
                    </div>
                    <Card className="bg-zinc-950 border-zinc-800 rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 space-y-6">
                            <p className="text-zinc-400">
                                This is the standard detailing method. A ratio like <span className="text-white font-bold">4:1</span> means **4 parts water** to **1 part product**.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-center">
                                    <div className="text-2xl font-black text-white">4</div>
                                    <div className="text-[10px] font-black text-zinc-500 uppercase">Parts Water</div>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-center flex items-center justify-center">
                                    <span className="text-2xl font-black text-zinc-700 text-zinc-400">+</span>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-center">
                                    <div className="text-2xl font-black text-white">1</div>
                                    <div className="text-[10px] font-black text-zinc-500 uppercase">Part Product</div>
                                </div>
                            </div>
                            <div className="space-y-3 bg-black/40 p-6 rounded-2xl border border-zinc-900">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">How to use it:</h4>
                                <ul className="space-y-2">
                                    {[
                                        "Select 'Ounces' or 'Milliliters'.",
                                        "Enter your total container size (e.g., 32oz).",
                                        "Enter the desired ratio (e.g., 10 for 10:1).",
                                        "The calculator reveals the exact amount of each ingredient required."
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i+1}</div>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Section 3: Percentage Mode */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-600/20 rounded-2xl border border-cyan-500/20">
                            <Percent className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Percentage Mode (%)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            <p className="text-zinc-400">
                                Some manufacturers provide dilution instructions in percentages. For example, a "20% solution".
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-4 p-4 bg-black/30 rounded-2xl border border-zinc-900">
                                    <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
                                    <p className="text-sm text-zinc-400 italic">"Our tool automatically converts that 20% into the equivalent technical ratio of 4:1 so you don't have to."</p>
                                </li>
                            </ul>
                        </div>
                        <div className="relative aspect-square bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                           <div className="p-12 text-center space-y-2">
                                <div className="text-6xl font-black text-white">20%</div>
                                <div className="text-xs font-black text-cyan-500 uppercase tracking-widest">Efficiency</div>
                           </div>
                        </div>
                    </div>
                </section>

                {/* Section 4: Advanced Tools */}
                <section className="space-y-12">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-600/20 rounded-2xl border border-amber-500/20">
                            <Repeat className="w-6 h-6 text-amber-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Power User Tools</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-zinc-950 border-zinc-800 rounded-3xl p-8 space-y-4 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <RefreshCcw className="w-6 h-6 text-zinc-300" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">The Swap Trick</h3>
                            </div>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Ever had just a little bit of product left? Hit the Swap icon. Instead of Container Size, you enter the <span className="text-white font-bold">Product Amount</span> you have, and the tool tells you how much water is needed to finish the mix.
                            </p>
                        </Card>

                        <Card className="bg-zinc-950 border-zinc-800 rounded-3xl p-8 space-y-4 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <Repeat className="w-6 h-6 text-zinc-300" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Reverse Mixing</h3>
                            </div>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Need to check a pre-mixed bottle? The Reverse icon flips the ratio logic instantly, allowing you to audit your inventory or verify unusual manufacturer specs.
                            </p>
                        </Card>
                    </div>
                </section>

                {/* Section 5: Common Ratios FAQ */}
                <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-10 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                         <Calculator className="w-64 h-64 text-white" />
                    </div>
                    
                    <div className="space-y-4 relative z-10 text-center max-w-xl mx-auto">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Standard Reference</h2>
                        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest leading-none">Typical Automotive Ratios</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                        {[
                            { label: "APC (Heavy Duty)", ratio: "4:1", use: "Engine bays & wells" },
                            { label: "APC (Medium)", ratio: "10:1", use: "Interior & Carpets" },
                            { label: "Glass Cleaner", ratio: "5:1", use: "Windows & Tint" },
                            { label: "Drying Aid", ratio: "20:1", use: "Paint Slickness" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-6 bg-black/40 rounded-2xl border border-zinc-900 group hover:border-blue-500/30 transition-all">
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-[0.05em]">{item.label}</h4>
                                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{item.use}</p>
                                </div>
                                <div className="text-2xl font-black text-blue-500 italic tracking-tighter group-hover:scale-110 transition-transform">{item.ratio}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Footer */}
                <section className="text-center pt-10">
                    <Button 
                        size="lg" 
                        onClick={() => navigate('/dilution-calculator')}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest px-12 py-8 rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                        Return to Calculator
                        <ChevronRight className="ml-3 w-5 h-5" />
                    </Button>
                    <p className="mt-8 text-[10px] text-zinc-700 font-black uppercase tracking-[0.4em]">Designed for Detailing Excellence</p>
                </section>

            </main>
        </div>
    );
};

export default DilutionCalculatorHelp;
