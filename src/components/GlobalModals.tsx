import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotesStore } from "@/store/notes";
import { useTasksStore } from "@/store/tasks";
import { Sparkles, FileText, CheckSquare } from "lucide-react";
import { toast } from "sonner";

import RicksTipsModal from "@/components/chemicals/RicksTipsModal";

export const GlobalModals: React.FC = () => {
    const [noteOpen, setNoteOpen] = useState(false);
    const [taskOpen, setTaskOpen] = useState(false);
    const [ricksTipsOpen, setRicksTipsOpen] = useState(false);
    const [ricksTipsTab, setRicksTipsTab] = useState<'package' | 'description' | 'prep'>('package');

    // Note State
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [contextPath, setContextPath] = useState('');

    // Task State
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');

    const notesStore = useNotesStore();
    const tasksStore = useTasksStore();

    useEffect(() => {
        const handleNote = (e: any) => {
            setContextPath(e.detail?.path || '');
            setNoteTitle(`Note from ${e.detail?.path || 'Quick Action'}`);
            setNoteOpen(true);
        };
        const handleTask = (e: any) => {
            setContextPath(e.detail?.path || '');
            setTaskTitle(`Follow up: ${e.detail?.path || ''}`);
            setTaskOpen(true);
        };
        const handleRicksTips = (e: any) => {
            if (e.detail?.tab) {
                setRicksTipsTab(e.detail.tab);
            }
            setRicksTipsOpen(true);
        };

        window.addEventListener('open-quick-note', handleNote);
        window.addEventListener('open-quick-task', handleTask);
        window.addEventListener('open-ricks-tips', handleRicksTips);

        return () => {
            window.removeEventListener('open-quick-note', handleNote);
            window.removeEventListener('open-quick-task', handleTask);
            window.removeEventListener('open-ricks-tips', handleRicksTips);
        };
    }, []);

    const saveNote = async () => {
        if (!noteContent.trim()) return;
        try {
            const fullContent = `Context: ${contextPath}\n\n${noteContent}`;
            await notesStore.createNote(null, noteTitle, fullContent);
            toast.success("Note saved to Personal Notes");
            setNoteOpen(false);
            setNoteContent('');
            setNoteTitle('');
        } catch (error) {
            toast.error("Failed to save note");
        }
    };

    const saveTask = async () => {
        if (!taskTitle.trim()) return;
        try {
            await tasksStore.add({
                title: taskTitle,
                description: `${taskDesc}\n\n[Origin: ${contextPath}]`,
                priority: 'medium',
                status: 'not_started'
            });
            toast.success("Task added to your list");
            setTaskOpen(false);
            setTaskTitle('');
            setTaskDesc('');
        } catch (error) {
            toast.error("Failed to create task");
        }
    };

    return (
        <>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <DialogTitle>Quick Note</DialogTitle>
                        </div>
                        <DialogDescription className="text-zinc-500">
                            Capture an idea or observation. This will be saved to your Quick Notes section.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Title / Topic</label>
                            <Input
                                placeholder="What is this about?"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Content</label>
                            <Textarea
                                placeholder="Jot down your thoughts..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                className="min-h-[150px] bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500/20 resize-none"
                            />
                        </div>
                        {contextPath && (
                            <div className="px-3 py-2 bg-zinc-900/50 rounded-md border border-zinc-800/50 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-mono">Captured from: {contextPath}</span>
                                <Sparkles className="w-3 h-3 text-zinc-700" />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setNoteOpen(false)} className="text-zinc-400 hover:text-white">Discard</Button>
                        <Button onClick={saveNote} className="bg-blue-600 hover:bg-blue-700 text-white px-8">Save Note</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <CheckSquare className="w-5 h-5 text-emerald-500" />
                            </div>
                            <DialogTitle>Quick Task</DialogTitle>
                        </div>
                        <DialogDescription className="text-zinc-500">
                            Set a reminder or action item for yourself or the team.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Task Title</label>
                            <Input
                                placeholder="What needs to be done?"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Details (Optional)</label>
                            <Textarea
                                placeholder="Additional context..."
                                value={taskDesc}
                                onChange={(e) => setTaskDesc(e.target.value)}
                                className="min-h-[100px] bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500/20 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTaskOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
                        <Button onClick={saveTask} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">Create Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RicksTipsModal 
                open={ricksTipsOpen} 
                onOpenChange={setRicksTipsOpen} 
                initialTab={ricksTipsTab}
            />
        </>
    );
};
