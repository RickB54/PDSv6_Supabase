import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2, Lightbulb, Send, Loader2, RefreshCw, ChevronRight, MessageSquare, Newspaper, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogAIAssistantProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onApplySuggestion: (text: string) => void;
    currentTitle?: string;
    currentDescription?: string;
}

export function BlogAIAssistant({ isOpen, onOpenChange, onApplySuggestion, currentTitle, currentDescription }: BlogAIAssistantProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestion, setSuggestion] = useState("");
    const [prompt, setPrompt] = useState("");

    const generateIdeas = async (type: 'title' | 'story' | 'hook') => {
        setIsGenerating(true);
        // Simulate AI intelligence
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let result = "";
        if (type === 'title') {
            result = "Unveiling the Gloss: A Ceramic Coating Masterclass on the 2024 Porsche 911";
        } else if (type === 'story') {
            result = "The client arrived with a heavy heart—their pride and joy had lost its luster. Through a 3-stage correction and professional-grade sealing, we didn't just restore a car; we restored a legacy. Witness the mirror-like reflections that define the Prime standard.";
        } else {
            result = "🚨 TRANSFORM ALERT: You won't believe the 'Before' state of this luxury SUV. Click to see how we saved the paint! 🛡️";
        }
        
        setSuggestion(result);
        setIsGenerating(false);
        toast({ title: "AI Intelligence Ready", description: "Fresh ideas generated for your blog post." });
    };

    const handleApply = () => {
        onApplySuggestion(suggestion);
        onOpenChange(false);
        setSuggestion("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[550px] rounded-[40px] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">AI CONTENT STRATEGIST</DialogTitle>
                            <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Prime Blog Architect v2.5</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

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

