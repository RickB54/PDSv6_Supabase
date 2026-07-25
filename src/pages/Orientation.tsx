import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckSquare, GraduationCap, Video, ShieldCheck, Lock } from "lucide-react";
import OrientationModal from "@/components/training/OrientationModal";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ADMIN_TRAINING_PHASES } from "@/lib/training-data";
import { Link } from "react-router-dom";

export default function Orientation() {
    const [open, setOpen] = useState(false);
    const [startExam, setStartExam] = useState(false);
    const [progress, setProgress] = useState(0);
    const [examUnlocked, setExamUnlocked] = useState(false);

    useEffect(() => {
        const loadUserStats = async () => {
            const user = getCurrentUser();
            if (!user?.id) return;

            // 1. Get exam_unlocked status
            const { data: uData } = await supabase.from('app_users').select('exam_unlocked').eq('id', user.id).maybeSingle();
            if (uData) setExamUnlocked(uData.exam_unlocked || false);

            // 2. Get checklist progress
            const { data: clData } = await supabase.from('employee_training_progress_checklist')
                .select('completed').eq('employee_id', user.id);
            if (clData) {
                const completedCount = clData.filter((c:any) => c.completed).length;
                const total = ADMIN_TRAINING_PHASES.reduce((acc, p) => acc + p.items.length, 0);
                const pct = Math.round((completedCount / total) * 100) || 0;
                setProgress(pct);
            }
        };

        loadUserStats();
    }, [open]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="New Hire Orientation" />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Welcome to Prime Auto Detail</h1>
                    <p className="text-xl text-zinc-400">Your journey starts here. Follow the onboarding roadmap below.</p>
                </div>

                {/* Onboarding Roadmap */}
                <div className="mb-12 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Onboarding Roadmap</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2 z-0"></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-400 mb-3 font-bold border border-purple-500/30">1</div>
                            <h3 className="font-bold text-sm text-white mb-1">Employee Handbook</h3>
                            <p className="text-xs text-zinc-400">Read policies & rules</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 mb-3 font-bold border border-blue-500/30">2</div>
                            <h3 className="font-bold text-sm text-white mb-1">Learning Library</h3>
                            <p className="text-xs text-zinc-400">Watch training videos</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 mb-3 font-bold border border-green-500/30">3</div>
                            <h3 className="font-bold text-sm text-white mb-1">Hands-on Training</h3>
                            <p className="text-xs text-zinc-400">Complete checklist with manager</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-orange-900/50 flex items-center justify-center text-orange-400 mb-3 font-bold border border-orange-500/30">4</div>
                            <h3 className="font-bold text-sm text-white mb-1">Orientation Exam</h3>
                            <p className="text-xs text-zinc-400">Pass exam to get certified</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-purple-500/50 transition-colors">
                        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Employee Handbook</h2>
                        <p className="text-zinc-400 mb-6 flex-1">Read the full policy manual and operating procedures.</p>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 font-bold"
                            onClick={() => { setStartExam(false); setOpen(true); }}
                        >
                            View Handbook
                        </Button>
                    </Card>

                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                            <Video className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Learning Library</h2>
                        <p className="text-zinc-400 mb-6 flex-1">Browse and watch training videos for each phase.</p>
                        <Link to="/learning-library" className="w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                                Go to Library
                            </Button>
                        </Link>
                    </Card>

                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-green-500/50 transition-colors">
                        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <GraduationCap className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">My Training Progress</h2>
                        <p className="text-zinc-400 mb-6 flex-1">Track your hands-on training checklist completion status.</p>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-zinc-500 font-bold mb-4">{progress}% Completed</p>
                        <Link to="/training-manual?tab=checklist" className="w-full mt-auto">
                            <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 text-white font-bold">
                                View My Checklist
                            </Button>
                        </Link>
                    </Card>

                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-orange-500/50 transition-colors">
                        <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckSquare className="w-8 h-8 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Orientation Exam</h2>
                        <p className="text-zinc-400 mb-6 flex-1">Test your knowledge after completing the roadmap.</p>
                        
                        {examUnlocked ? (
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                onClick={() => { setStartExam(true); setOpen(true); }}
                            >
                                Start Exam
                            </Button>
                        ) : (
                            <div className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-500 flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4" />
                                Your manager will unlock this when you're ready
                            </div>
                        )}
                    </Card>
                </div>
            </main>

            <OrientationModal
                open={open}
                onOpenChange={setOpen}
                startExamOnOpen={startExam}
            />
        </div>
    );
}
