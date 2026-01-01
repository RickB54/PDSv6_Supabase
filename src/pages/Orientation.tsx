import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckSquare, GraduationCap } from "lucide-react";
import OrientationModal from "@/components/training/OrientationModal";

export default function Orientation() {
    const [open, setOpen] = useState(false);
    const [startExam, setStartExam] = useState(false);

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="New Hire Orientation" />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Welcome to Prime Auto Detail</h1>
                    <p className="text-xl text-zinc-400">Your journey starts here. Complete the orientation steps below.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-purple-500/50 transition-colors">
                        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Employee Handbook</h2>
                        <p className="text-zinc-400 mb-6">Read the full policy manual and operating procedures.</p>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => { setStartExam(false); setOpen(true); }}
                        >
                            View Handbook
                        </Button>
                    </Card>

                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckSquare className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Orientation Exam</h2>
                        <p className="text-zinc-400 mb-6">Test your knowledge after reading the handbook.</p>
                        <Button
                            variant="outline"
                            className="w-full border-zinc-700 hover:bg-zinc-800 text-white"
                            onClick={() => { setStartExam(true); setOpen(true); }}
                        >
                            Start Exam
                        </Button>
                    </Card>

                    <Card className="p-6 bg-zinc-900 border-zinc-800 flex flex-col items-center text-center hover:border-green-500/50 transition-colors md:col-span-2">
                        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <GraduationCap className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">My Orientation Progress</h2>
                        <p className="text-zinc-400 mb-6">Track your onboarding completion status.</p>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                            <div className="bg-green-500 h-full w-[0%]"></div>
                        </div>
                        <p className="text-xs text-zinc-500">0% Completed</p>
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
