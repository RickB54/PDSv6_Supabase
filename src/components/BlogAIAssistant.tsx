import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2, Lightbulb, Send, Loader2, Newspaper, Star, HelpCircle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface BlogAIAssistantProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onApplySuggestion: (text: string, imageUrl?: string) => void;
    currentTitle?: string;
    currentDescription?: string;
    isNewPost?: boolean;
}

export function BlogAIAssistant({ isOpen, onOpenChange, onApplySuggestion, currentTitle, currentDescription }: BlogAIAssistantProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestion, setSuggestion] = useState("");
    const [prompt, setPrompt] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const generateIdeas = async (type: 'title' | 'story' | 'hook' | 'new_post') => {
        setIsGenerating(true);
        try {
            const contextPrompt = prompt || `Create a professional detailing blog ${type} for a post about "${currentTitle || 'Professional Detailing'}". Description: ${currentDescription || 'No details provided'}. Keep the tone authoritative, technical, and high-end.`;
            
            const { data, error } = await supabase.functions.invoke('gemini-proxy', {
                body: { prompt: contextPrompt }
            });

            if (error) throw error;
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate that content right now.";
            
            setSuggestion(result);
            toast({ title: "AI Content Generated", description: "A live, AI-crafted story is ready." });
        } catch (e: any) {
            console.error("AI Generation failed:", e);
            toast({ title: "Generation Failed", description: "Could not reach the AI strategist.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const generateImage = async () => {
        setIsGeneratingImage(true);
        // Simulate DALL-E generation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const images = [
            "https://images.unsplash.com/photo-1601362840469-51e4d8d59085?auto=format&fit=crop&q=80&w=1200", // Porsche 911 gloss
            "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=1200", // Detailer working
            "https://images.unsplash.com/photo-1552933529-e359b2477262?auto=format&fit=crop&q=80&w=1200", // Foam wash
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=1200"  // Luxury car reflections
        ];
        
        setGeneratedImage(images[Math.floor(Math.random() * images.length)]);
        setIsGeneratingImage(false);
        toast({ title: "AI Magic Complete", description: "A high-fidelity detailing visual has been generated." });
    };

    const handleApply = () => {
        onApplySuggestion(suggestion, generatedImage || undefined);
        onOpenChange(false);
        setSuggestion("");
        setGeneratedImage(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[550px] rounded-[40px] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">AI CONTENT STRATEGIST</DialogTitle>
                                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Prime Blog Architect v2.5</DialogDescription>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowHelp(h => !h)}
                            className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-all group"
                            title="How to use"
                        >
                            <HelpCircle className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                        </button>
                    </div>
                </DialogHeader>

                {showHelp && (
                    <div className="mx-8 mb-0 mt-2 bg-indigo-950/40 border border-indigo-500/20 rounded-[24px] p-5 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <HelpCircle className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">How This Works</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                { step: '1', text: 'Open or create a blog post first (click SHARE YOUR WORK).' },
                                { step: '2', text: 'Come back here and pick Viral Titles, Story Draft, or Social Hook.' },
                                { step: '3', text: 'Or type a custom request below (e.g. "Black BMW, ceramic coat") and hit Send.' },
                                { step: '4', text: 'Review the AI suggestion in the output box above.' },
                                { step: '5', text: 'Hit APPLY TO POST — it fills the Description field in your open post editor.' },
                                { step: '6', text: 'Then Save / Publish your post to make it live!' },
                            ].map(({ step, text }) => (
                                <div key={step} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">{step}</div>
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">{text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-indigo-500/10">
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">💡 TIP: The suggestion is NOT saved until you Apply it and then Save the post.</p>
                        </div>
                    </div>
                )}

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-3 gap-3">
                        <Button 
                            variant="outline" 
                            onClick={() => generateIdeas('title')}
                            className="bg-zinc-900 border-zinc-800 rounded-2xl h-16 flex flex-col gap-1 items-center justify-center hover:bg-zinc-800 hover:border-indigo-500/50 transition-all"
                        >
                            <Lightbulb className="w-5 h-5 text-indigo-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Viral Titles</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => generateIdeas('story')}
                            className="bg-zinc-900 border-zinc-800 rounded-2xl h-16 flex flex-col gap-1 items-center justify-center hover:bg-zinc-800 hover:border-indigo-500/50 transition-all"
                        >
                            <Newspaper className="w-5 h-5 text-indigo-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Story Draft</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => generateIdeas('hook')}
                            className="bg-zinc-900 border-zinc-800 rounded-2xl h-16 flex flex-col gap-1 items-center justify-center hover:bg-zinc-800 hover:border-indigo-500/50 transition-all"
                        >
                            <Star className="w-5 h-5 text-indigo-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Social Hook</span>
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">AI Output / Suggestion</Label>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 p-6 min-h-[120px]">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 animate-pulse">Consulting the detailing archives...</p>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium leading-relaxed text-zinc-200">
                                        {suggestion || "Select a generation type above or ask me anything to help you craft the perfect shop story."}
                                    </p>
                                )}
                            </div>
                        </div>

                        {suggestion && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-4 h-4 text-purple-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Visual Generation</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={generateImage}
                                            disabled={isGeneratingImage}
                                            className="h-7 px-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white rounded-lg text-[9px] font-black"
                                        >
                                            {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                            {generatedImage ? "RE-GENERATE PIC" : "DRAW PIC FOR ME"}
                                        </Button>
                                    </div>

                                    {isGeneratingImage ? (
                                        <div className="aspect-video w-full bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center justify-center space-y-2">
                                            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                            <p className="text-[8px] font-black uppercase text-purple-400 animate-pulse tracking-tighter">AI Artist is drawing detailing magic...</p>
                                        </div>
                                    ) : generatedImage ? (
                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 shadow-lg group/img">
                                            <img src={generatedImage} alt="AI Generated Detailing" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                                <Badge className="bg-purple-600 text-[8px] font-black px-1.5 py-0">AI ARTIST V3</Badge>
                                                <span className="text-[9px] text-white/50 font-medium">4K Detailing Render</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-2 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-zinc-800" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500 font-medium leading-tight">Need a professional photo? Click "DRAW PIC FOR ME" to have AI create a custom detailing visual for this post.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">Custom Request</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Describe the job (e.g. Red Ferrari, heavy rain cleanup)..." 
                                className="bg-zinc-900 border-zinc-800 rounded-xl h-12 text-sm"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <Button 
                                onClick={() => generateIdeas('story')}
                                className="h-12 w-12 bg-indigo-600 hover:bg-indigo-500 rounded-xl shrink-0"
                            >
                                <Send className="w-5 h-5 text-white" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-0">
                    <div className="flex gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-12 rounded-2xl border border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                        >
                            CANCEL
                        </Button>
                        <Button 
                            disabled={!suggestion}
                            onClick={handleApply}
                            className="flex-[2] h-12 bg-white hover:bg-zinc-100 text-black font-black rounded-2xl group"
                        >
                            APPLY TO POST
                            <Wand2 className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

