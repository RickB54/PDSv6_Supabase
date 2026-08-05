import { PageHeader } from "@/components/PageHeader";
import RicksTipsModal from "@/components/chemicals/RicksTipsModal";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import localforage from "localforage";
import { getCurrentUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Lightbulb, Video, MonitorPlay, Pencil, CheckCircle2, ShieldCheck, XCircle, Lock, PlayCircle, Eye, FileText, AlertTriangle, RefreshCw, HelpCircle, BookOpen, Layers, Settings, Beaker, Download } from "lucide-react";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    getTrainingModules, upsertTrainingModule, deleteTrainingModule,
    getTrainingProgress, upsertTrainingProgress, getTrainingBadges,
    type TrainingModule, type TrainingProgress, type TrainingBadge
} from "@/lib/supa-data";
import { supabase } from "@/lib/supabase";
import { ADMIN_TRAINING_PHASES, EMPLOYEE_TRAINING_PHASES } from "@/lib/training-data";
import proceduresData from "@/pages/ProceduresBooklet";

interface QuizQuestion { question: string; options: string[]; correctIndex: number; }

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

const YoutubePlayer = ({ url, title, initialTime = 0, onProgress, onEnded }: {
    url: string, title: string, initialTime?: number,
    onProgress?: (time: number) => void, onEnded?: () => void
}) => {
    const getId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getId(url);
    const playerRef = useRef<any>(null);

    // Initialize YouTube API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            if (!videoId) return;
            playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
                videoId: videoId,
                playerVars: {
                    start: Math.floor(initialTime),
                    modestbranding: 1,
                    rel: 0
                },
                events: {
                    'onStateChange': (event: any) => {
                        if (event.data === 0) onEnded?.(); // Ended
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        // Interval to track progress
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime();
                if (time > 0) onProgress?.(time);
            }
        }, 5000); // Update every 5s

        return () => clearInterval(interval);
        return () => clearInterval(interval);
    }, [videoId]);

    // Handle late-arriving initialTime (Resume Fix)
    useEffect(() => {
        if (playerRef.current && playerRef.current.seekTo && initialTime > 0) {
            const current = playerRef.current.getCurrentTime();
            // Only seek if we are at the beginning (haven't watched yet)
            if (current < 5) {
                playerRef.current.seekTo(initialTime);
            }
        }
    }, [initialTime]);

    if (!videoId) return <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border-zinc-800 text-zinc-500">Invalid URL</div>;

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
            <div id={`yt-player-${videoId}`} className="w-full h-full" />
        </div>
    );
};

interface TrainingManualProps {
    mode?: "default" | "library";
}

export const TrainingManual = ({ mode = "default" }: TrainingManualProps) => {
    const { toast } = useToast();
    // Use state for user to allow updates
    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const user = currentUser; // Alias for existing code
    const isAdmin = user?.role === 'admin';
    const userId = user?.id || 'guest';

    // Force refresh user on mount to ensure we have the latest session
    useEffect(() => {
        const checkUser = () => {
            const u = getCurrentUser();
            console.log("TrainingManual checkUser:", u);
            if (u && u.id !== currentUser?.id) {
                setCurrentUser(u);
            }
        };
        checkUser();
        // Add listener for storage events (if login happens in another tab/window)
        window.addEventListener('storage', checkUser);

        // Also a small timeout to catch race conditions on initial load
        const t = setTimeout(checkUser, 1000);
        return () => {
            window.removeEventListener('storage', checkUser);
            clearTimeout(t);
        };
    }, []);

    // Data State
    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [progress, setProgress] = useState<TrainingProgress[]>([]);
    const [badges, setBadges] = useState<TrainingBadge[]>([]);
    const [checklist, setChecklist] = useState<any[]>([]);

    // UI State
    const [searchParams, setSearchParams] = useSearchParams();
    // If mode is library, force "library" tab. Otherwise use URL param or default to "videos"
    const activeTab = mode === "library" ? "library" : (searchParams.get("tab") || "videos");
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    // Editor State
    const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
    const [modForm, setModForm] = useState<{
        title: string; url: string; desc: string; cat: string;
        sop: string; isSafety: boolean; isOptional: boolean; badgeId: string; prereqs: string[];
        quiz: QuizQuestion[];
    }>({ title: "", url: "", desc: "", cat: "Exterior", sop: "", isSafety: false, isOptional: false, badgeId: "none", prereqs: [], quiz: [] });

    // Quiz Editor Temporary State
    const [newQuizQ, setNewQuizQ] = useState("");
    const [newQuizOpts, setNewQuizOpts] = useState(["", "", "", ""]);
    const [newQuizCorrect, setNewQuizCorrect] = useState(0);

    // Runner State
    const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
    const [quizRunOpen, setQuizRunOpen] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<{ passed: boolean, score: number } | null>(null);

    // Safety Acknowledge State
    const [safetyOpen, setSafetyOpen] = useState(false);
    const [safetyAck, setSafetyAck] = useState(false);
    const [pendingSafetyModule, setPendingSafetyModule] = useState<TrainingModule | null>(null);

    // Tips State
    const [tipsOpen, setTipsOpen] = useState(false);

    useEffect(() => { loadData(); }, [userId]);

    const loadData = async () => {
        const [mods, uBadges] = await Promise.all([getTrainingModules(), getTrainingBadges()]);
        setModules(mods);
        setBadges(uBadges);

        if (userId !== 'guest') {
            const prog = await getTrainingProgress(userId);
            setProgress(prog);

            const { data } = await supabase.from('employee_training_progress_checklist').select('*').eq('employee_id', userId);
            setChecklist(data || []);
        }

        // Rick's Tips loaded globally, no local load needed here
    };

    // --- LOGIC: LOCKING & PROGRESS ---
    const isLocked = (m: TrainingModule) => {
        if (!m.prerequisite_ids || m.prerequisite_ids.length === 0) return false;
        // Check if ALL prereqs are completed
        return !m.prerequisite_ids.every(pid => {
            const p = progress.find(prog => prog.module_id === pid);
            return p?.status === 'completed';
        });
    };

    const saveProgress = async (mId: string, Position: number) => {
        if (userId === 'guest') return;
        await upsertTrainingProgress({
            user_id: userId, module_id: mId, video_position: Position, status: 'started'
        });
    };

    // --- EDITOR ACTIONS ---
    const openEditor = (m?: TrainingModule) => {
        if (m) {
            setEditingModule(m);
            setModForm({
                title: m.title, url: m.video_url, desc: m.description, cat: m.category,
                sop: m.sop_link || "", isSafety: m.is_safety || false,
                isOptional: (m as any).is_optional || false,
                badgeId: m.badge_reward_id || "none",
                prereqs: m.prerequisite_ids || [],
                quiz: (m.quiz_data as QuizQuestion[]) || []
            });
        } else {
            setEditingModule(null);
            setModForm({ title: "", url: "", desc: "", cat: "Exterior", sop: "", isSafety: false, isOptional: false, badgeId: "none", prereqs: [], quiz: [] });
        }
        setVideoModalOpen(true);
    };

    const saveMod = async () => {
        // Basic Validation
        if (!modForm.title.trim()) {
            toast({ title: "Error", description: "Title is required.", variant: "destructive" });
            return;
        }
        if (!modForm.url.trim()) {
            toast({ title: "Error", description: "Video URL is required.", variant: "destructive" });
            return;
        }

        const payload: Partial<TrainingModule> & { is_optional?: boolean } = {
            id: editingModule?.id,
            title: modForm.title, category: modForm.cat, video_url: modForm.url, description: modForm.desc,
            sop_link: modForm.sop, is_safety: modForm.isSafety,
            badge_reward_id: (!modForm.badgeId || modForm.badgeId === "none") ? undefined : modForm.badgeId,
            prerequisite_ids: modForm.prereqs,
            quiz_data: modForm.quiz,
            is_optional: modForm.isOptional
        };

        try {
            const { error } = await upsertTrainingModule(payload);
            if (error) throw error;
            setVideoModalOpen(false);
            loadData();
            toast({ title: "Saved", description: "Module updated successfully." });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Error Saving Module",
                description: "Details: " + (e.message || JSON.stringify(e) || "Unknown Error"),
                variant: "destructive",
                duration: 10000
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete module?")) {
            await deleteTrainingModule(id);
            loadData();
        }
    };

    // --- SOP PDF EXPORT ---
    const handleSaveSOPsPDF = () => {
        toast({ title: "Generating SOPs PDF", description: "Preparing your professional detailing SOPs document..." });

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxY = pageHeight - 20;
        let currentY = 20;

        const drawHeader = (title: string, subtitle: string) => {
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text(title, 14, 16);
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "normal");
            doc.text(`${subtitle} | Date: ${new Date().toLocaleDateString()}`, 14, 23);
            return 36;
        };

        const checkPageBreak = (neededHeight: number) => {
            if (currentY + neededHeight > maxY) {
                doc.addPage();
                currentY = 20;
            }
        };

        currentY = drawHeader("PRIME AUTO DETAILING", "Standard Operating Procedures (SOPs)");

        // Section 1 Header
        checkPageBreak(15);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("SECTION 1 — EXTERIOR DETAIL PROCESS (8-STEP STANDARD PROCEDURE)", 14, currentY);
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 10;

        const exteriorSteps = [
            { title: "Step 1 — Wheels & Tires First", content: "Chemical: Dark Fury 4:1 (light) or 7:1 (heavy contamination). Agitate with wheel brush — barrel brush for inner barrel, detail brush for lug nuts. Rinse immediately after agitation — do not allow Dark Fury to dwell on bare metal or chrome. If Engine Bay Cleaning addon is included, perform that first before wheels. Use Dirt Buster or Muscle Magic at appropriate dilution, cover sensitive electronics before applying any water or chemical, rinse thoroughly and allow to dry before proceeding to wheels. Complete both wheels driver's side front and rear, then passenger side front and rear." },
            { title: "Step 2 — Pre-Rinse Whole Vehicle", content: "Rinse top to bottom always — roof first, lower panels last. Open doors slightly while rinsing to allow water to flow through jambs without flooding interior. Skip this step if vehicle is a clean maintenance detail that does not require heavy rinsing." },
            { title: "Step 3 — Pre-Treat Bugs / Heavy Grime", content: "Apply to dry surface before any rinse or foam. Road Warrior 4:1 — especially effective on front grill, hood, and front bumper. Dwell 3-5 minutes MAX — do not exceed or allow to dry on paint. Rinse thoroughly before applying foam. SP alternatives: Muscle Magic diluted for heavy grime on lower panels, Dirt Buster on concentrated areas. Pay extra attention to lower front panels, grille openings, and hood leading edge where bug accumulation is heaviest." },
            { title: "Step 4 — Foam Bath", content: "Chemical: Meguiar's Gold Class 5:1 or Cherry Foam 5:1 in foam cannon. Apply thick even layer top to bottom. Dwell 3-5 minutes — do not exceed 5 minutes in direct sun or on hot paint. If foam starts drying before dwell time is complete, mist with water to reactivate — dried foam causes water spots. Work in shade whenever possible." },
            { title: "Step 5 — Hand Wash (Top to Bottom)", content: "Use multiple clean microfiber towels or wash mitts. Use one side of the towel at a time then flip to the clean side before moving to the next panel. Work top to bottom — roof first, lower rocker panels and bumpers last. Driver's side front to back, passenger side back to front. Straight overlapping strokes only — never circular. Never use a towel or mitt that has touched wheels or lower panels on upper paint surfaces." },
            { title: "Step 6 — Final Rinse", content: "Rinse top to bottom thoroughly. If Clay Bar Decon addon is included, proceed directly to clay bar step while paint is still wet — do not dry first. Use APC as lubricant, work panel by panel, fold clay frequently when contamination is picked up. Clay is complete when paint feels glass smooth to the touch." },
            { title: "Step 7 — Drying", content: "Chemical: Formula 4 at 20:1 — spray onto wet paint during drying. Acts as drying aid AND adds light protection simultaneously (2-5 weeks). Open all door jambs, trunk, and hood during drying to prevent water dripping after job is complete. Dry jambs as part of this step. Use large dedicated drying towels only." },
            { title: "Step 8 — Paint Protection", content: "Formula 4 at 20:1 is already applied during the drying step and serves dual purpose — drying aid plus protection. This step confirms protection has been applied. No additional product needed for Essential packages unless a separate wax or sealant addon is specifically included for this job." }
        ];

        exteriorSteps.forEach((step, idx) => {
            const splitText = doc.splitTextToSize(step.content, pageWidth - 28);
            const estimatedHeight = 8 + (splitText.length * 5) + 6;
            checkPageBreak(estimatedHeight);

            doc.setFontSize(10.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(`${idx + 1}. ${step.title}`, 14, currentY);
            currentY += 6;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
            
            splitText.forEach((line: string) => {
                checkPageBreak(6);
                doc.text(line, 14, currentY);
                currentY += 5;
            });
            currentY += 5;
        });

        currentY += 5;

        // Section 2 Header
        checkPageBreak(20);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(147, 51, 234);
        doc.text("SECTION 2 — INTERIOR DETAIL PROCESS (10-STEP STANDARD PROCEDURE)", 14, currentY);
        doc.setDrawColor(147, 51, 234);
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 10;

        const interiorSteps = [
            { title: "Step 1 — Remove Personal Items & Trash", content: "Remove all personal items, trash, and loose belongings from the vehicle before starting any interior work. Set aside safely and visibly for the customer." },
            { title: "Step 2 — Thorough Vacuum (Top to Bottom)", content: "Blow out interior with compressed air first — vents, seat tracks, under seats, around pedals, rear to front — so vacuum picks up loosened debris rather than it resettling. Use crevice tool for seat tracks and tight areas. Remove floor mats before vacuuming. Work rear to front within each section." },
            { title: "Step 3 — Clean Floor Mats & Area Rugs", content: "Use drill brush set — select appropriate brush size and pressure based on mat type and dirtiness. Primary chemicals: Carpet Bomber 7:1 standard / 5:1 heavy + Terminator duo. Backup: Zap It at appropriate dilution. For organic stains including urine, blood, food spills, and pet soiling: SP Does It All Enzyme Cleaner — apply, dwell 3-5 minutes, agitate, wipe. Rubber mats: rinse thoroughly after agitation. Carpet mats: blot dry, set aside to dry completely before reinstalling." },
            { title: "Step 4 — Clean Dashboard, Steering Wheel & Console", content: "Chemical: Does It All Enzyme Cleaner or Pink Perfection 10:1 for general wipe-down. Use detail brush for all vent slats, button gaps, and seam areas. Steering wheel gets extra attention — oils and grime from hands build up quickly. Work driver's side front to back, passenger side back to front." },
            { title: "Step 5 — Clean All Interior Plastics / Vinyl / Trim", content: "Chemical: Pink Perfection 10:1 for general cleaning. Does It All Enzyme Cleaner for organic stains on vinyl and trim. Green All at appropriate dilution for general plastics. Use soft brush for crevices. Wipe with clean microfiber." },
            { title: "Step 6 — Clean Fabric / Carpet / Seats", content: "Chemical: Carpet Bomber 7:1 standard / 5:1 heavy soiling. For organic stains: SP Does It All Enzyme Cleaner — apply, dwell 3-5 minutes, agitate, blot. Agitate with stiff carpet brush or drill brush in straight strokes only — never circular. Blot with clean microfiber to pull out loosened soil. Pet hair removal tools (Lilly Brush or 5-pack set) must be used before any chemical application if pet hair is present. Deep Interior Detail or Stain Treatment addon: use extractor at this step." },
            { title: "Step 7 — Interior Protectant / Plastics Finisher", content: "Chemical: P&S Xpress 3:1 or SP Cover All 4:1. Apply to all interior plastics, vinyl, and trim as final protectant coat. Use clean microfiber applicator. Work driver's side front to back, passenger side back to front. Complete before cleaning windows so any overspray is caught in the glass step. If done as the very last step instead — use extra care not to get any product on windshield, screens, or electronics." },
            { title: "Step 8 — Windows & Glass (streak-free)", content: "Chemical: Invisible Glass — spray on dedicated glass towel only, never directly on glass to avoid overspray on trim and seats. Two-pass method: first pass removes product and loosens film, second pass clears any remaining streaks. Interior windshield is most difficult — film builds from off-gassing plastics and HVAC. Wipe in overlapping straight strokes. Check from multiple angles in light to confirm no haze remains." },
            { title: "Step 9 — Clean Door Jambs & Trunk Jambs", content: "Chemical: Dirt Buster or APC at appropriate dilution. Use detail brush for hinge areas and tight corners. Wipe dry thoroughly — water sitting in jambs drips out later and leaves marks on exterior paint below. Driver's side front to back, passenger side back to front. Include hood jamb and trunk jamb. Avoid saturating weather stripping — clean and wipe immediately." },
            { title: "Step 10 — Final Interior Inspection", content: "Sit in driver's seat and check windshield for haze from multiple angles. Open each door and confirm jambs are clean and dry. Confirm floor mats reinstalled correctly and retention clips engaged if applicable. Interior should smell clean — not chemical. If Deep Interior Detail addon was performed, confirm carpet and seats are dry or nearly dry before returning vehicle to customer." }
        ];

        interiorSteps.forEach((step, idx) => {
            const splitText = doc.splitTextToSize(step.content, pageWidth - 28);
            const estimatedHeight = 8 + (splitText.length * 5) + 6;
            checkPageBreak(estimatedHeight);

            doc.setFontSize(10.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(`${idx + 1}. ${step.title}`, 14, currentY);
            currentY += 6;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
            
            splitText.forEach((line: string) => {
                checkPageBreak(6);
                doc.text(line, 14, currentY);
                currentY += 5;
            });
            currentY += 5;
        });

        // Section 3: Chemical Dilution & Application Index
        currentY += 5;
        checkPageBreak(25);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129); // Emerald Green
        doc.text("SECTION 3 — CHEMICAL DILUTION & APPLICATION INDEX", 14, currentY);
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 10;

        const renderChemicalTable = (subHeading: string, colorRGB: [number, number, number], items: { name: string; dilution: string; usage: string }[]) => {
            checkPageBreak(15);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...colorRGB);
            doc.text(subHeading, 14, currentY);
            currentY += 6;

            // Table Header Row
            checkPageBreak(8);
            doc.setFillColor(241, 245, 249); // Slate-100 background
            doc.rect(14, currentY, pageWidth - 28, 7, 'F');
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("Chemical Name", 16, currentY + 5);
            doc.text("Dilution Ratio", 70, currentY + 5);
            doc.text("Application & Key Usage Notes", 115, currentY + 5);
            currentY += 8;

            // Rows
            items.forEach((item, index) => {
                const splitUsage = doc.splitTextToSize(item.usage, pageWidth - 130);
                const rowHeight = Math.max(7, splitUsage.length * 4.5 + 3);
                checkPageBreak(rowHeight + 2);

                if (index % 2 === 1) {
                    doc.setFillColor(248, 250, 252); // Alternating light row background
                    doc.rect(14, currentY, pageWidth - 28, rowHeight, 'F');
                }

                doc.setFontSize(8.5);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(item.name, 16, currentY + 4.5);

                doc.setFont("helvetica", "normal");
                doc.setTextColor(37, 99, 235); // Blue for dilution ratio
                doc.text(item.dilution, 70, currentY + 4.5);

                doc.setTextColor(51, 65, 85);
                splitUsage.forEach((uLine: string, uIdx: number) => {
                    doc.text(uLine, 115, currentY + 4.5 + (uIdx * 4.5));
                });

                // Row border bottom
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.2);
                doc.line(14, currentY + rowHeight, pageWidth - 14, currentY + rowHeight);

                currentY += rowHeight + 1;
            });
            currentY += 6;
        };

        const exteriorChemicals = [
            { name: "Dark Fury", dilution: "4:1 (light) / 7:1 (heavy)", usage: "Wheels & tires. Agitate with barrel/detail brush & rinse immediately. Do not dwell on bare metal." },
            { name: "Dirt Buster / Muscle Magic", dilution: "Diluted per label", usage: "Pre-treat lower rocker panels & engine bay heavy contamination. Cover electronics before rinsing." },
            { name: "Road Warrior", dilution: "4:1 ratio", usage: "Bug pre-treatment on front grill, hood & bumper. Apply dry, dwell 3-5 min MAX before rinsing." },
            { name: "Meguiar's Gold Class / Cherry Foam", dilution: "5:1 in foam cannon", usage: "Exterior foam cannon bath. Dwell 3-5 min top to bottom. Mist with water if foam begins drying." },
            { name: "Formula 4", dilution: "20:1 ratio", usage: "Spray on wet paint during drying. Serves dual purpose: drying aid + protection (2-5 weeks)." }
        ];

        const interiorChemicals = [
            { name: "Carpet Bomber", dilution: "7:1 (std) / 5:1 (heavy)", usage: "Carpets, fabric seats & floor mats. Agitate in straight strokes with stiff carpet/drill brush." },
            { name: "Terminator duo / Zap It", dilution: "Diluted per label", usage: "Spot treatment & carpet backup cleaner for stubborn stains." },
            { name: "SP Does It All Enzyme Cleaner", dilution: "Ready to use", usage: "Organic stains (urine, food, blood, pet soiling), dashboard wipe-down, vinyl & trim." },
            { name: "Pink Perfection", dilution: "10:1 ratio", usage: "Dashboard, steering wheel, console, interior plastics, vinyl & trim general cleaning." },
            { name: "Green All", dilution: "Diluted per label", usage: "General interior plastics cleaning with soft brush." },
            { name: "P&S Xpress / SP Cover All", dilution: "3:1 (Xpress) / 4:1 (Cover All)", usage: "Interior protectant & plastics finisher coat. Apply with clean microfiber applicator." },
            { name: "Invisible Glass", dilution: "Ready to use", usage: "Windows & glass. Spray on dedicated glass towel ONLY — two-pass streak-free method." }
        ];

        renderChemicalTable("A. Exterior Detail Chemical Reference", [37, 99, 235], exteriorChemicals);
        renderChemicalTable("B. Interior Detail Chemical Reference", [147, 51, 234], interiorChemicals);

        doc.save(`Prime_Detailing_SOPs_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // --- QUIZ EDITOR ---
    const addQuestion = () => {
        if (!newQuizQ || newQuizOpts.some(o => !o)) return alert("Fill all fields");
        setModForm(prev => ({ ...prev, quiz: [...prev.quiz, { question: newQuizQ, options: [...newQuizOpts], correctIndex: newQuizCorrect }] }));
        setNewQuizQ(""); setNewQuizOpts(["", "", "", ""]);
    };

    // --- QUIZ RUNNER ---
    const handleTakeQuiz = (m: TrainingModule) => {
        if (isLocked(m)) return;

        // Safety Check
        if (m.is_safety) {
            const p = progress.find(pr => pr.module_id === m.id);
            if (!p?.acknowledged_at) {
                setPendingSafetyModule(m);
                setSafetyOpen(true);
                setSafetyAck(false);
                return;
            }
        }

        // Open Quiz
        setActiveModule(m);
        setQuizAnswers(new Array(m.quiz_data?.length || 0).fill(-1));
        setQuizResult(null);
        setQuizRunOpen(true);
    };

    const confirmSafety = async () => {
        if (!pendingSafetyModule || !safetyAck) return;
        if (userId === 'guest') {
            toast({ title: "Login Required", description: "You must be logged in to save progress.", variant: "destructive" });
            return;
        }

        try {
            // Save acknowledgement
            await upsertTrainingProgress({
                user_id: userId,
                module_id: pendingSafetyModule.id,
                acknowledged_at: new Date().toISOString(),
                status: 'started' // Ensure status exists
            });

            // Refresh progress local
            const p = await getTrainingProgress(userId);
            setProgress(p);

            setSafetyOpen(false);

            // Short timeout to ensure state settles before opening quiz
            setTimeout(() => {
                handleTakeQuiz(pendingSafetyModule);
            }, 100);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Safety Save Failed",
                description: "Error: " + (e.message || JSON.stringify(e)),
                variant: "destructive",
                duration: 5000
            });
        }
    };

    const submitQuiz = async () => {
        if (!activeModule) return;
        const questions = activeModule.quiz_data as QuizQuestion[];
        if (!questions || questions.length === 0) {
            completeModule(activeModule, 100);
            return;
        }

        let correct = 0;
        questions.forEach((q, i) => { if (quizAnswers[i] === q.correctIndex) correct++; });
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= 80;

        setQuizResult({ passed, score });
        if (passed) completeModule(activeModule, score);
    };

    const completeModule = async (m: TrainingModule, score: number) => {
        await upsertTrainingProgress({
            user_id: userId, module_id: m.id, status: 'completed', score: score, completed_at: new Date().toISOString()
        });
        loadData();
        if (!activeModule?.quiz_data?.length) toast({ title: "Completed", description: "Module marked as done." });
    };

    const certModules = modules.filter(m => !(m as any).is_optional);
    const learningModules = modules.filter(m => (m as any).is_optional);

    const currentList = activeCategory === "All" ? certModules : certModules.filter(m => m.category === activeCategory);
    const learningList = activeCategory === "All" ? learningModules : learningModules.filter(m => m.category === activeCategory);

    // Combine logic for display
    const VideoGrid = ({ list, isLearning = false }: { list: TrainingModule[], isLearning?: boolean }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.length === 0 && <p className="col-span-full text-zinc-500 text-center py-8">No modules found in this category.</p>}
            {list.map(m => {
                const prog = progress.find(p => p.module_id === m.id);
                const isCompleted = prog?.status === 'completed';
                const locked = isLearning ? false : isLocked(m); // Never lock optional modules

                return (
                    <Card key={m.id} className={`bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col transition-all ${isCompleted ? 'border-green-500/30' : locked ? 'opacity-70 blur-[1px] hover:blur-0' : ''}`}>
                        <div className="relative group aspect-video bg-black">
                            {locked ? (
                                <div
                                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 ${isAdmin ? 'cursor-pointer hover:bg-black/70' : ''}`}
                                    onClick={() => {
                                        if (isAdmin) {
                                            toast({ title: "Admin Bypass", description: "Opening locked module..." });
                                            setActiveModule(m);
                                            setVideoModalOpen(true);
                                        }
                                    }}
                                >
                                    {isAdmin ? <Lock className="w-8 h-8 mb-2 text-yellow-500" /> : <Lock className="w-8 h-8 mb-2 text-zinc-500" />}
                                    <span className={`text-xs uppercase font-bold tracking-wider ${isAdmin ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                        {isAdmin ? "Admin Access" : "Locked"}
                                    </span>
                                    {!isAdmin && m.prerequisite_ids && m.prerequisite_ids.length > 0 && (
                                        <div className="mt-2 px-4 text-center">
                                            <p className="text-[10px] text-zinc-600 uppercase font-bold">Requires:</p>
                                            <p className="text-xs text-zinc-500">
                                                {m.prerequisite_ids.map(pid => modules.find(mod => mod.id === pid)?.title).filter(Boolean).join(", ")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <YoutubePlayer
                                    url={m.video_url} title={m.title}
                                    initialTime={prog?.video_position}
                                    onProgress={(t) => saveProgress(m.id, t)}
                                />
                            )}
                            {isCompleted && <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg pointer-events-none z-20"><CheckCircle2 className="w-3 h-3 mr-1" /> PASSED</div>}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">{m.category}</Badge>
                                {isAdmin && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500" onClick={() => openEditor(m)}><Pencil className="w-3 h-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-lg text-white mb-2">{m.title}</h3>
                            {!isLearning && m.badge && (
                                <div className={`mb-2 flex items-center text-xs ${isCompleted ? 'text-green-500' : 'text-yellow-500'}`}>
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    {isCompleted ? "Earned: " : "Reward: "}{m.badge.title}
                                </div>
                            )}
                            <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">{m.description}</p>

                            <div className="flex gap-2">
                                {m.sop_link && (
                                    <Button variant="outline" size="sm" className="flex-1 border-zinc-700" onClick={() => window.open(m.sop_link, '_blank')}>
                                        <FileText className="w-3 h-3 mr-2" /> SOP
                                    </Button>
                                )}
                                {locked && isAdmin ? (
                                    <div className="flex gap-1 flex-1">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                                            onClick={() => {
                                                toast({ title: "Admin Bypass", description: "Opening video..." });
                                                setActiveModule(m);
                                                setVideoModalOpen(true);
                                            }}
                                        >
                                            <Lock className="w-3 h-3 mr-1" /> Bypass
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => handleTakeQuiz(m)}
                                        >
                                            Test Quiz
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            if (locked && isAdmin) {
                                                // Fallback (redundant due to above, but safe)
                                                setActiveModule(m);
                                                setVideoModalOpen(true);
                                            } else {
                                                handleTakeQuiz(m);
                                            }
                                        }}
                                        disabled={locked && !isAdmin}
                                        className={`flex-1 ${isCompleted ? 'bg-zinc-800 text-green-400' : isLearning ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                    >
                                        {isCompleted ? "Retake" : (locked && !isAdmin) ? "Locked" : isLearning ? "Mark Complete" : "Start Quiz"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Prime Training Center" />

            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Prime Training Center</h1>
                            <p className="text-zinc-400">Employee Certification & SOP Library</p>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" title="Master Guide"><HelpCircle className="w-5 h-5" /></Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6 text-purple-500" />
                                        Prime Training Center Master Guide
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Everything you need to know about certification and system management.
                                    </DialogDescription>
                                </DialogHeader>

                                <Tabs defaultValue="employee" className="mt-4">
                                    <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start">
                                        <TabsTrigger value="employee" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                            User / Employee Guide
                                        </TabsTrigger>
                                        {isAdmin && (
                                            <TabsTrigger value="admin" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                                                Admin Master Class
                                            </TabsTrigger>
                                        )}
                                    </TabsList>

                                    <TabsContent value="employee" className="space-y-6 mt-6">
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 mb-3">
                                                    <PlayCircle className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">1. Watch & Learn</h3>
                                                <p className="text-sm text-zinc-400">Browse the Learning Library for videos relevant to what you're training on. Your manager will point you to specific videos for each phase. Watch completely and take notes before moving on.</p>
                                                <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 w-full" onClick={() => window.location.href = '/learning-library'}>
                                                    Go to Learning Library
                                                </Button>
                                            </div>
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 mb-3">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">2. Take the Quiz</h3>
                                                <p className="text-sm text-zinc-400">After the video, click "Start Quiz". You need a passing score (usually 100%) to complete the module.</p>
                                            </div>
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 mb-3">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">3. Get Certified</h3>
                                                <p className="text-sm text-zinc-400">Completing modules earns you tracking progress. Completing specific Exam modules awards **Badges**.</p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
                                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-yellow-500" /> Why is a module locked?</h3>
                                            <p className="text-zinc-400 text-sm mb-2">The system enforces a strict learning path:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
                                                <li><span className="text-white font-semibold">Sequential Order:</span> You cannot skip ahead. You must complete "Basic Wash" before "Advanced Paint Correction".</li>
                                                <li><span className="text-white font-semibold">Prerequisites:</span> Some modules require a specific Badge (e.g., "Chemicals Expert") before they unlock.</li>
                                            </ul>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="admin" className="space-y-8 mt-6">
                                        <section>
                                            <h3 className="text-xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">Admin Superpowers</h3>
                                            <div className="grid gap-4">
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-red-900/20 rounded text-red-400"><Lock className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Bypass Locks</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            As an Admin, you can see all modules. If a module is locked for normal users, you see a <span className="text-yellow-500 font-mono">Bypass</span> button.
                                                            Clicking it forces the video to open for preview. You also see a <span className="text-purple-500 font-mono">Test Quiz</span> button to dry-run the exam.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-blue-900/20 rounded text-blue-400"><Plus className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Creating & Editing Content</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            Click <span className="text-white font-mono">New Module</span> or the <span className="text-white font-mono">Edit (Pencil)</span> icon on any card.
                                                            This opens the **Module Editor** where you can set the Title, Description, YouTube URL, and attached Badge.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-purple-900/20 rounded text-purple-400"><HelpCircle className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Quiz Builder</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            Inside the Module Editor, use the **Quiz Builder** tab.
                                                            <br />1. Click "Add Question".
                                                            <br />2. Type the Question and 4 options.
                                                            <br />3. <span className="text-red-400 font-bold underline">CRITICAL:</span> You MUST select the Correct Answer using the radio button next to the option.
                                                            <br />4. Click "Save Quiz" to lock it in.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                            <h3 className="font-bold text-zinc-300 mb-2">Rick's Tips for Admins</h3>
                                            <ul className="space-y-2 text-xs text-zinc-400">
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Use <strong>YouTube Unlisted</strong> videos so public users can't find your training content.</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Keep quizzes short (3-5 questions) to keep engagement high.</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Use the <strong>"Users & Roles"</strong> page to see who has earned which badges.</li>
                                            </ul>
                                        </section>
                                    </TabsContent>
                                </Tabs>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && <Button onClick={() => openEditor()} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" /> New Module</Button>}
                        <Button onClick={() => setTipsOpen(true)} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"><Lightbulb className="w-4 h-4 mr-2 text-yellow-500" /> Rick's Tips</Button>
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-3">
                            Welcome, {currentUser?.name || "Guest"}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs border-zinc-700 bg-zinc-800 text-zinc-400"
                                onClick={async () => {
                                    toast({ title: "Refreshing Session...", description: "Connecting to Supabase..." });
                                    try {
                                        // Dynamic import to avoid circular dependencies if any, or just import at top if safe.
                                        // Using global 'supabase' from window if checking raw, but better to use auth lib.
                                        // We'll just trigger the same checkUser logic but harder:
                                        const { data } = await import("@/lib/supabase").then(m => m.default.auth.getSession());
                                        if (data.session?.user) {
                                            const { finalizeSupabaseSession } = await import("@/lib/auth");
                                            const u = await finalizeSupabaseSession(data.session.user);
                                            setCurrentUser(u);
                                            // Explicitly reload badges/progress too
                                            loadData();
                                            toast({ title: "Session Refreshed", description: `Logged in as: ${u?.name} (${u?.role})` });
                                        } else {
                                            toast({ title: "No Active Session", description: "Supabase says you are logged out.", variant: "destructive" });
                                        }
                                    } catch (e: any) {
                                        toast({ title: "Refresh Error", description: e.message, variant: "destructive" });
                                    }
                                }}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Fix Login
                            </Button>
                        </h1>
                        <p className="text-zinc-400 text-sm">
                            {currentUser ? "Continue your certification journey." : "Please log in to track your progress and earn badges."}
                        </p>
                    </div>
                </div>

                {/* User Badges Display */}
                {userId !== 'guest' && (
                    <div className="mb-8">
                        <h3 className="text-sm uppercase text-zinc-500 font-bold mb-3 tracking-wider">Your Certifications</h3>
                        <div className="flex flex-wrap gap-3">
                            {modules.filter(m => {
                                const p = progress.find(pr => pr.module_id === m.id);
                                return p?.status === 'completed' && m.badge_reward_id;
                            }).map(m => {
                                const badge = m.badge; // joined
                                if (!badge) return null;
                                return (
                                    <div key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-full border bg-${badge.color}-500/10 border-${badge.color}-500/30 text-${badge.color}-400`}>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-sm font-bold">{badge.title}</span>
                                    </div>
                                );
                            })}
                            {/* Fallback for no badges */}
                            {!modules.some(m => progress.some(p => p.module_id === m.id && p.status === 'completed') && m.badge_reward_id) &&
                                <p className="text-zinc-600 text-sm italic">Complete training modules to earn badges.</p>
                            }
                        </div>
                    </div>
                )}

                {mode === "library" ? (
                    <div className="space-y-6">
                        <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl mb-4">
                            <h3 className="text-blue-400 font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Learning Library</h3>
                            <p className="text-zinc-400 text-sm">Optional resources for ongoing learning.</p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {["All", "Exterior", "Interior", "Paint", "Business", "Hardware", "Chemicals", "Materials"].map(cat => (
                                <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} onClick={() => setActiveCategory(cat)} className={`rounded-full ${activeCategory === cat ? 'bg-white text-black' : 'border-zinc-700 text-zinc-400'}`} size="sm">{cat}</Button>
                            ))}
                        </div>
                        <VideoGrid list={learningList} isLearning={true} />
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full space-y-6">
                        <TabsList className="flex flex-wrap h-auto w-full bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                            <TabsTrigger value="videos" className="flex-1 min-w-[120px] data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Video className="w-4 h-4 mr-2" />Certification</TabsTrigger>
                            <TabsTrigger value="checklist" className="flex-1 min-w-[120px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white"><CheckCircle2 className="w-4 h-4 mr-2" />My Progress</TabsTrigger>
                            {/* Library Tab removed from main view as requested, accessible via separate page */}
                            {/* <TabsTrigger value="library" className="flex-1 min-w-[120px] data-[state=active]:bg-blue-600 data-[state=active]:text-white"><PlayCircle className="w-4 h-4 mr-2" />Learning Lib</TabsTrigger> */}
                            <TabsTrigger value="process" className="flex-1 min-w-[120px]">SOPs</TabsTrigger>
                            <TabsTrigger value="hardware" className="flex-1 min-w-[120px]">Hardware</TabsTrigger>
                            <TabsTrigger value="chemicals" className="flex-1 min-w-[120px]">Chemicals</TabsTrigger>
                            <TabsTrigger value="materials" className="flex-1 min-w-[120px]">Materials</TabsTrigger>
                        </TabsList>

                        <TabsContent value="checklist" className="space-y-6">
                            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                                <h2 className="text-xl font-bold mb-4">Training Checklist Progress</h2>
                                <p className="text-zinc-400 mb-6">This is a read-only view of your training checklist. Your manager will check these off during your evaluations.</p>
                                <div className="space-y-4">
                                    {ADMIN_TRAINING_PHASES.map(phase => {
                                      const phaseTotal = phase.items.length;
                                      const phaseCompleted = phase.items.filter(item => checklist.find(c => c.phase_number === phase.phase_number && c.item_key === item)?.completed).length;
                                      const pct = Math.round((phaseCompleted / phaseTotal) * 100);
                                      
                                      return (
                                        <Card key={phase.phase_number} className="bg-zinc-950/50 border-zinc-800 overflow-hidden">
                                          <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${pct === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                {phase.phase_number}
                                              </div>
                                              <div>
                                                <h3 className="font-semibold text-sm text-zinc-200">{phase.title}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                  </div>
                                                  <span className="text-[10px] text-zinc-500">{pct}% Complete</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="p-4 space-y-3">
                                            {phase.items.map((item, i) => {
                                              const isDone = checklist.find(c => c.phase_number === phase.phase_number && c.item_key === item)?.completed;
                                              return (
                                                <div key={i} className="flex items-start gap-3 opacity-90">
                                                  <div className={`mt-1 w-4 h-4 rounded flex items-center justify-center ${isDone ? 'bg-indigo-500 text-white' : 'border border-zinc-700 bg-zinc-900'}`}>
                                                    {isDone && <CheckCircle2 className="w-3 h-3" />}
                                                  </div>
                                                  <span className={`text-xs leading-relaxed transition-colors ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                                                    {item}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </Card>
                                      );
                                    })}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="videos" className="space-y-6">
                            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-center">
                                <h2 className="text-2xl font-bold mb-4 text-purple-400">Employee Certification Process</h2>
                                <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
                                    Your certification is earned through a combination of studying the employee handbook, completing the hands-on training checklist with your manager, and passing the final 50-question Orientation Exam.
                                </p>
                                <div className="grid md:grid-cols-3 gap-6 mb-8 text-left">
                                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                        <div className="w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold mb-3">1</div>
                                        <h3 className="font-bold mb-2">Read Handbook & Watch Videos</h3>
                                        <p className="text-xs text-zinc-500">Review all policies in the employee handbook and browse the Learning Library for procedures.</p>
                                    </div>
                                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                        <div className="w-8 h-8 rounded-full bg-green-900/30 text-green-400 flex items-center justify-center font-bold mb-3">2</div>
                                        <h3 className="font-bold mb-2">Complete Training Phases</h3>
                                        <p className="text-xs text-zinc-500">Your manager will check off your progress through the 6 phases of hands-on training.</p>
                                    </div>
                                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                        <div className="w-8 h-8 rounded-full bg-orange-900/30 text-orange-400 flex items-center justify-center font-bold mb-3">3</div>
                                        <h3 className="font-bold mb-2">Take Final Exam</h3>
                                        <p className="text-xs text-zinc-500">Once your training is complete, your manager will unlock the 50-question exam for you to take.</p>
                                    </div>
                                </div>
                                <Button className="bg-purple-600 hover:bg-purple-700 font-bold px-8" onClick={() => window.location.href = '/orientation'}>
                                    Go to Orientation Roadmap
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="process" className="space-y-6">
                            <div className="bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-800 space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                            <FileText className="w-6 h-6 text-indigo-400"/> Standard Operating Procedures (SOPs)
                                        </h2>
                                        <p className="text-zinc-400 text-sm mt-1">
                                            Tap any step to view complete chemical, dilution, and execution instructions.
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={handleSaveSOPsPDF}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shrink-0 w-full sm:w-auto"
                                    >
                                        <Download className="w-4 h-4" /> Save SOPs PDF
                                    </Button>
                                </div>

                                {/* Section 1: Exterior Detail Process */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                                        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                                            Section 1 — Exterior Detail Process
                                        </h3>
                                        <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-950/40 self-start sm:self-auto">
                                            8-Step Standard Procedure
                                        </Badge>
                                    </div>

                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                        <AccordionItem value="ext-1" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">1</span>
                                                    Step 1 — Wheels & Tires First
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Dark Fury 4:1 (light) or 7:1 (heavy contamination). Agitate with wheel brush — barrel brush for inner barrel, detail brush for lug nuts. Rinse immediately after agitation — do not allow Dark Fury to dwell on bare metal or chrome. If Engine Bay Cleaning addon is included, perform that first before wheels. Use Dirt Buster or Muscle Magic at appropriate dilution, cover sensitive electronics before applying any water or chemical, rinse thoroughly and allow to dry before proceeding to wheels. Complete both wheels driver's side front and rear, then passenger side front and rear.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-2" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">2</span>
                                                    Step 2 — Pre-Rinse Whole Vehicle
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Rinse top to bottom always — roof first, lower panels last. Open doors slightly while rinsing to allow water to flow through jambs without flooding interior. Skip this step if vehicle is a clean maintenance detail that does not require heavy rinsing.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-3" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">3</span>
                                                    Step 3 — Pre-Treat Bugs / Heavy Grime
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Apply to dry surface before any rinse or foam. Road Warrior 4:1 — especially effective on front grill, hood, and front bumper. Dwell 3-5 minutes MAX — do not exceed or allow to dry on paint. Rinse thoroughly before applying foam. SP alternatives: Muscle Magic diluted for heavy grime on lower panels, Dirt Buster on concentrated areas. Pay extra attention to lower front panels, grille openings, and hood leading edge where bug accumulation is heaviest.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-4" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">4</span>
                                                    Step 4 — Foam Bath
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Meguiar's Gold Class 5:1 or Cherry Foam 5:1 in foam cannon. Apply thick even layer top to bottom. Dwell 3-5 minutes — do not exceed 5 minutes in direct sun or on hot paint. If foam starts drying before dwell time is complete, mist with water to reactivate — dried foam causes water spots. Work in shade whenever possible.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-5" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">5</span>
                                                    Step 5 — Hand Wash (Top to Bottom)
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Use multiple clean microfiber towels or wash mitts. Use one side of the towel at a time then flip to the clean side before moving to the next panel. Work top to bottom — roof first, lower rocker panels and bumpers last. Driver's side front to back, passenger side back to front. Straight overlapping strokes only — never circular. Never use a towel or mitt that has touched wheels or lower panels on upper paint surfaces.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-6" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">6</span>
                                                    Step 6 — Final Rinse
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Rinse top to bottom thoroughly. If Clay Bar Decon addon is included, proceed directly to clay bar step while paint is still wet — do not dry first. Use APC as lubricant, work panel by panel, fold clay frequently when contamination is picked up. Clay is complete when paint feels glass smooth to the touch.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-7" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">7</span>
                                                    Step 7 — Drying
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Formula 4 at 20:1 — spray onto wet paint during drying. Acts as drying aid AND adds light protection simultaneously (2-5 weeks). Open all door jambs, trunk, and hood during drying to prevent water dripping after job is complete. Dry jambs as part of this step. Use large dedicated drying towels only.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="ext-8" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold shrink-0">8</span>
                                                    Step 8 — Paint Protection
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Formula 4 at 20:1 is already applied during the drying step and serves dual purpose — drying aid plus protection. This step confirms protection has been applied. No additional product needed for Essential packages unless a separate wax or sealant addon is specifically included for this job.
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>

                                {/* Section Divider */}
                                <div className="my-8 border-t border-zinc-800" />

                                {/* Section 2: Interior Detail Process */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                                        <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                            Section 2 — Interior Detail Process
                                        </h3>
                                        <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-950/40 self-start sm:self-auto">
                                            10-Step Standard Procedure
                                        </Badge>
                                    </div>

                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                        <AccordionItem value="int-1" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">1</span>
                                                    Step 1 — Remove Personal Items & Trash
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Remove all personal items, trash, and loose belongings from the vehicle before starting any interior work. Set aside safely and visibly for the customer.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-2" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">2</span>
                                                    Step 2 — Thorough Vacuum (Top to Bottom)
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Blow out interior with compressed air first — vents, seat tracks, under seats, around pedals, rear to front — so vacuum picks up loosened debris rather than it resettling. Use crevice tool for seat tracks and tight areas. Remove floor mats before vacuuming. Work rear to front within each section.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-3" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">3</span>
                                                    Step 3 — Clean Floor Mats & Area Rugs
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Use drill brush set — select appropriate brush size and pressure based on mat type and dirtiness. Primary chemicals: Carpet Bomber 7:1 standard / 5:1 heavy + Terminator duo. Backup: Zap It at appropriate dilution. For organic stains including urine, blood, food spills, and pet soiling: SP Does It All Enzyme Cleaner — apply, dwell 3-5 minutes, agitate, wipe. Rubber mats: rinse thoroughly after agitation. Carpet mats: blot dry, set aside to dry completely before reinstalling.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-4" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">4</span>
                                                    Step 4 — Clean Dashboard, Steering Wheel & Console
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Does It All Enzyme Cleaner or Pink Perfection 10:1 for general wipe-down. Use detail brush for all vent slats, button gaps, and seam areas. Steering wheel gets extra attention — oils and grime from hands build up quickly. Work driver's side front to back, passenger side back to front.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-5" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">5</span>
                                                    Step 5 — Clean All Interior Plastics / Vinyl / Trim
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Pink Perfection 10:1 for general cleaning. Does It All Enzyme Cleaner for organic stains on vinyl and trim. Green All at appropriate dilution for general plastics. Use soft brush for crevices. Wipe with clean microfiber.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-6" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">6</span>
                                                    Step 6 — Clean Fabric / Carpet / Seats
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Carpet Bomber 7:1 standard / 5:1 heavy soiling. For organic stains: SP Does It All Enzyme Cleaner — apply, dwell 3-5 minutes, agitate, blot. Agitate with stiff carpet brush or drill brush in straight strokes only — never circular. Blot with clean microfiber to pull out loosened soil. Pet hair removal tools (Lilly Brush or 5-pack set) must be used before any chemical application if pet hair is present. Deep Interior Detail or Stain Treatment addon: use extractor at this step.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-7" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">7</span>
                                                    Step 7 — Interior Protectant / Plastics Finisher
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: P&S Xpress 3:1 or SP Cover All 4:1. Apply to all interior plastics, vinyl, and trim as final protectant coat. Use clean microfiber applicator. Work driver's side front to back, passenger side back to front. Complete before cleaning windows so any overspray is caught in the glass step. If done as the very last step instead — use extra care not to get any product on windshield, screens, or electronics.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-8" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">8</span>
                                                    Step 8 — Windows & Glass (streak-free)
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Invisible Glass — spray on dedicated glass towel only, never directly on glass to avoid overspray on trim and seats. Two-pass method: first pass removes product and loosens film, second pass clears any remaining streaks. Interior windshield is most difficult — film builds from off-gassing plastics and HVAC. Wipe in overlapping straight strokes. Check from multiple angles in light to confirm no haze remains.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-9" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">9</span>
                                                    Step 9 — Clean Door Jambs & Trunk Jambs
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Chemical: Dirt Buster or APC at appropriate dilution. Use detail brush for hinge areas and tight corners. Wipe dry thoroughly — water sitting in jambs drips out later and leaves marks on exterior paint below. Driver's side front to back, passenger side back to front. Include hood jamb and trunk jamb. Avoid saturating weather stripping — clean and wipe immediately.
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="int-10" className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3 text-left">
                                                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold shrink-0">10</span>
                                                    Step 10 — Final Interior Inspection
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="text-zinc-300 text-sm pb-4 leading-relaxed border-t border-zinc-900 pt-3">
                                                Sit in driver's seat and check windshield for haze from multiple angles. Open each door and confirm jambs are clean and dry. Confirm floor mats reinstalled correctly and retention clips engaged if applicable. Interior should smell clean — not chemical. If Deep Interior Detail addon was performed, confirm carpet and seats are dry or nearly dry before returning vehicle to customer.
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>

                            {/* ADMIN ONLY SECONDARY SOP SECTION */}
                            {isAdmin && (
                                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4 mt-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-indigo-400" /> Secondary SOP: App Operations Manual (v6.0)
                                        </h3>
                                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-950/40 self-start sm:self-auto">
                                            Admin Reference
                                        </Badge>
                                    </div>
                                    <p className="text-zinc-400 text-sm">
                                        Access the complete, interactive administrative software procedures manual including system architecture, admin workflows, and system setting checklists.
                                    </p>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto font-semibold" onClick={() => window.location.href = '/app-manual'}>
                                        <BookOpen className="w-4 h-4 mr-2" /> Open Full App Procedures Manual
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="materials" className="space-y-6">
                            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-pink-400"/> Materials & Consumables</h2>
                                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/learning-library?search=materials'}>
                                        <Video className="w-4 h-4 mr-2"/> Watch Material Videos
                                    </Button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800 space-y-3">
                                        <h3 className="font-bold text-lg text-white">Microfiber Towel System</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed">Towels are color-coded by task to prevent cross-contamination. Never use a wheel towel on paint, or an interior towel on glass.</p>
                                        <ul className="text-sm text-zinc-500 space-y-2 list-disc pl-4 mt-2">
                                            <li><strong className="text-zinc-300">Drying Towels:</strong> Large, ultra-plush for exterior drying only.</li>
                                            <li><strong className="text-zinc-300">Glass Towels:</strong> Waffle-weave or low-pile to prevent lint.</li>
                                            <li><strong className="text-zinc-300">Interior Towels:</strong> Used for plastics, leather, and upholstery.</li>
                                            <li><strong className="text-zinc-300">Wheel/Engine Towels:</strong> Dedicated utility towels. Do NOT mix these in the laundry with paint towels.</li>
                                        </ul>
                                    </div>
                                    <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800 space-y-3">
                                        <h3 className="font-bold text-lg text-white">Decontamination Tools</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed">Used to remove embedded contaminants from the clear coat before polishing or sealing.</p>
                                        <ul className="text-sm text-zinc-500 space-y-2 list-disc pl-4 mt-2">
                                            <li><strong className="text-zinc-300">Clay Bars:</strong> Traditional clay must be kneaded. If dropped on the floor, throw it away immediately.</li>
                                            <li><strong className="text-zinc-300">Synthetic Clay Mitts:</strong> Can be rinsed if dropped. Faster for large vehicles.</li>
                                            <li><strong className="text-zinc-300">Lubrication:</strong> Always use dedicated clay lube (e.g., EZ Shine) or soapy water. Never use on dry paint.</li>
                                        </ul>
                                    </div>
                                    <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800 space-y-3 md:col-span-2">
                                        <h3 className="font-bold text-lg text-white">Polishing Pads</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed">Pads dictate the level of cut and finish. Keep them clean during use by blowing them out with compressed air or using a pad conditioning brush.</p>
                                        <ul className="text-sm text-zinc-500 space-y-2 list-disc pl-4 mt-2 grid md:grid-cols-3 gap-2">
                                            <li><strong className="text-zinc-300 block">Foam Cutting Pads</strong> Firm dense foam for heavy defect removal.</li>
                                            <li><strong className="text-zinc-300 block">Foam Polishing Pads</strong> Medium density for finishing and light defects.</li>
                                            <li><strong className="text-zinc-300 block">Microfiber Pads</strong> Maximum cut for hard clear coats. Requires frequent blowing out.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="hardware" className="space-y-6">
                            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-amber-400"/> Equipment & Hardware</h2>
                                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/learning-library?search=equipment'}>
                                        <Video className="w-4 h-4 mr-2"/> Watch Hardware Videos
                                    </Button>
                                </div>
                                <p className="text-zinc-400 mb-6">Reference list from Phase 3 of your training checklist.</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {EMPLOYEE_TRAINING_PHASES.find(p => p.phase_number === 3)?.items.map((item, idx) => {
                                        const [category, desc] = item.split(': ');
                                        return (
                                            <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex flex-col justify-center">
                                                <h3 className="text-sm font-bold text-white mb-1">{desc ? category : "Hardware Item"}</h3>
                                                <p className="text-sm text-zinc-400">{desc || item}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="chemicals" className="space-y-6">
                            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2"><Beaker className="w-6 h-6 text-cyan-400"/> Chemical Training</h2>
                                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/learning-library?search=chemical'}>
                                        <Video className="w-4 h-4 mr-2"/> Watch Chemical Videos
                                    </Button>
                                </div>
                                <p className="text-zinc-400 mb-6">Reference list from Phase 2 of your training checklist. Always wear PPE (gloves/glasses) before handling chemicals.</p>
                                <div className="space-y-3">
                                    {EMPLOYEE_TRAINING_PHASES.find(p => p.phase_number === 2)?.items.map((item, idx) => (
                                        <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex gap-4 items-start">
                                            <div className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">{idx + 1}</div>
                                            <p className="text-sm text-zinc-300 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex justify-center">
                                    <Button onClick={() => window.location.href = '/chemicals'} className="bg-cyan-600 hover:bg-cyan-700">
                                        Open Chemical Knowledge Base
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </main>

            {/* ADMIN EDITOR */}
            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent
                    className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] h-[80vh] flex flex-col"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader><DialogTitle>{editingModule ? "Edit Module" : "New Training Module"}</DialogTitle></DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4 py-4">
                            <Input value={modForm.title} onChange={e => setModForm({ ...modForm, title: e.target.value })} placeholder="Title" className="bg-zinc-900 border-zinc-700" />
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={modForm.cat} onValueChange={v => setModForm({ ...modForm, cat: v })}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">{["Exterior", "Interior", "Paint", "Business", "Hardware", "Chemicals", "Materials"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input value={modForm.url} onChange={e => setModForm({ ...modForm, url: e.target.value })} placeholder="YouTube URL" className="bg-zinc-900 border-zinc-700 font-mono text-xs" />
                            </div>
                            <Textarea value={modForm.desc} onChange={e => setModForm({ ...modForm, desc: e.target.value })} placeholder="Description" className="bg-zinc-900 border-zinc-700" />

                            <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded border border-zinc-800">
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400">Badge Reward</label>
                                    <Select value={modForm.badgeId} onValueChange={v => setModForm({ ...modForm, badgeId: v })}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs"><SelectValue placeholder="No Badge" /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800">
                                            <SelectItem value="none">No Badge</SelectItem>
                                            {badges.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400">Attributes</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox checked={modForm.isSafety} onCheckedChange={(c: any) => setModForm({ ...modForm, isSafety: !!c })} className="border-zinc-600" />
                                            <span className="text-sm">Safety Module (Requires Ack)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox checked={modForm.isOptional} onCheckedChange={(c: any) => setModForm({ ...modForm, isOptional: !!c })} className="border-zinc-600" />
                                            <span className="text-sm">Optional (Learning Library)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-zinc-400">SOP Link (Optional)</label>
                                    <Input value={modForm.sop} onChange={e => setModForm({ ...modForm, sop: e.target.value })} placeholder="https://docs.google.com/..." className="bg-zinc-900 border-zinc-700 h-8 text-xs font-mono" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-zinc-400">Prerequisites (Module IDs)</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {modules.map(m => (
                                            <div key={m.id}
                                                onClick={() => {
                                                    const has = modForm.prereqs.includes(m.id);
                                                    const newP = has ? modForm.prereqs.filter(id => id !== m.id) : [...modForm.prereqs, m.id];
                                                    setModForm({ ...modForm, prereqs: newP });
                                                }}
                                                className={`text-xs px-2 py-1 rounded cursor-pointer border ${modForm.prereqs.includes(m.id) ? 'bg-purple-600 border-purple-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                                            >
                                                {m.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Builder Simplified */}
                            <div className="border-t border-zinc-800 pt-4">
                                <h3 className="font-bold mb-2">Quiz Questions ({modForm.quiz.length})</h3>

                                {/* EXISTING QUESTIONS LIST */}
                                {modForm.quiz.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {modForm.quiz.map((q: any, i: number) => (
                                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 rounded flex justify-between items-start gap-2">
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-zinc-200 mb-1"><span className="text-purple-400">Q{i + 1}:</span> {q.question}</div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {q.options.map((o: string, oi: number) => (
                                                            <div key={oi} className={`text-xs ${oi === q.correctIndex ? 'text-green-400 font-bold' : 'text-zinc-500'}`}>
                                                                {String.fromCharCode(65 + oi)}. {o} {oi === q.correctIndex && '(Correct)'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white"
                                                        onClick={() => {
                                                            // Load into editor
                                                            setNewQuizQ(q.question);
                                                            setNewQuizOpts(q.options);
                                                            setNewQuizCorrect(q.correctIndex);
                                                            // Remove from list (effectively "moving" to editor)
                                                            setModForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== i) }));
                                                        }}
                                                        title="Edit Question"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-900 hover:text-red-500 hover:bg-red-900/20"
                                                        onClick={() => {
                                                            if (confirm("Delete this question?")) {
                                                                setModForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== i) }));
                                                            }
                                                        }}
                                                        title="Delete Question"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-zinc-900 p-4 rounded gap-3 grid border border-zinc-800">
                                    <div className="space-y-2">
                                        <label className="text-xs text-zinc-400 font-bold">Question Text</label>
                                        <Input value={newQuizQ} onChange={e => setNewQuizQ(e.target.value)} placeholder="e.g. What is the first step?" className="bg-black border-zinc-700" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {newQuizOpts.map((opt, i) => (
                                            <div key={i}
                                                className={`space-y-1 p-2 rounded border transition-colors ${newQuizCorrect === i ? 'bg-green-900/20 border-green-500/50' : 'bg-transparent border-transparent'}`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className={`text-[10px] uppercase font-bold ${newQuizCorrect === i ? 'text-green-400' : 'text-zinc-500'}`}>
                                                        Option {String.fromCharCode(65 + i)} {newQuizCorrect === i && "(Correct)"}
                                                    </label>
                                                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => setNewQuizCorrect(i)}>
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${newQuizCorrect === i ? 'border-green-500' : 'border-zinc-600'}`}>
                                                            {newQuizCorrect === i && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                                        </div>
                                                        <span className={`text-[10px] ${newQuizCorrect === i ? 'text-green-400' : 'text-zinc-600'}`}>Correct?</span>
                                                    </div>
                                                </div>

                                                <Input
                                                    value={opt}
                                                    onChange={e => {
                                                        const n = [...newQuizOpts];
                                                        n[i] = e.target.value;
                                                        setNewQuizOpts(n);
                                                    }}
                                                    placeholder={`Answer ${String.fromCharCode(65 + i)}`}
                                                    className={`bg-zinc-950 h-9 text-xs border-zinc-700 focus-visible:ring-1 ${newQuizCorrect === i ? 'border-green-500 ring-green-500' : ''}`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <Button onClick={addQuestion} size="sm" className="bg-zinc-800 hover:bg-zinc-700 w-full mt-2 border border-zinc-700 text-zinc-300">
                                        <Plus className="w-4 h-4 mr-2" /> Add Question to Quiz
                                    </Button>
                                    <p className="text-[10px] text-zinc-500 text-center mt-1">Make sure to fill all fields and select the correct answer.</p>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        {editingModule && <Button variant="ghost" className="text-red-500 mr-auto" onClick={() => handleDelete(editingModule.id)}>Delete</Button>}
                        <Button variant="ghost" onClick={() => setVideoModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveMod} className="bg-purple-600">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SAFETY ACK MODAL */}
            <Dialog open={safetyOpen} onOpenChange={setSafetyOpen}>
                <DialogContent className="bg-red-950 border-red-900 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-6 h-6" /> Safety Acknowledgment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {userId === 'guest' && (
                            <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded flex items-center gap-2 text-red-200">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <div className="text-sm font-bold">You are currently logged out (Guest).</div>
                            </div>
                        )}
                        <p className="mb-4">This module contains critical safety information. By continuing, you acknowledge that you have watched the video entirely and understand the risks linked to this task.</p>
                        <div className="flex items-center gap-3 bg-black/30 p-4 rounded border border-red-900/50">
                            <Checkbox id="safe-ack" checked={safetyAck} onCheckedChange={(c: any) => setSafetyAck(!!c)} className="border-red-500 data-[state=checked]:bg-red-600" />
                            <label htmlFor="safe-ack" className="text-sm font-bold cursor-pointer select-none">I HAVE WATCHED AND UNDERSTOOD THE SAFETY PROTOCOLS.</label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSafetyOpen(false)}>Cancel</Button>
                        <Button onClick={confirmSafety} disabled={!safetyAck || userId === 'guest'} className="bg-red-600 hover:bg-red-700">
                            {userId === 'guest' ? "Login Required" : "Confirm & Start Quiz"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUIZ RUNNER */}
            <Dialog open={quizRunOpen} onOpenChange={setQuizRunOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px]">
                    <DialogHeader><DialogTitle>Quiz: {activeModule?.title}</DialogTitle></DialogHeader>
                    {!quizResult ? (
                        <div className="space-y-6 py-4">
                            {(activeModule?.quiz_data as QuizQuestion[])?.length > 0 ? (
                                (activeModule?.quiz_data as QuizQuestion[] || []).map((q, i) => (
                                    <div key={i} className="space-y-2">
                                        <p className="font-semibold">{i + 1}. {q.question}</p>
                                        <div className="grid gap-2">
                                            {q.options.map((o, oi) => (
                                                <Button key={oi} variant="outline"
                                                    onClick={() => { const A = [...quizAnswers]; A[i] = oi; setQuizAnswers(A); }}
                                                    className={`justify-start ${quizAnswers[i] === oi ? 'bg-purple-600 border-purple-500' : 'bg-transparent border-zinc-700'}`}
                                                >
                                                    {o}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-zinc-400">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No questions for this module.</p>
                                    <p className="text-sm">Click Submit below to mark it as complete.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {quizResult.passed ? <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /> : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
                            <h3 className="text-2xl font-bold">{quizResult.passed ? "Passed!" : "Try Again"}</h3>
                            <p className="text-zinc-400">Score: {quizResult.score}%</p>
                        </div>
                    )}
                    <DialogFooter>
                        {!quizResult ? (
                            <Button onClick={submitQuiz} className="w-full bg-purple-600">Submit</Button>
                        ) : (
                            <Button onClick={() => setQuizRunOpen(false)} variant="outline" className="w-full">Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rick's Tips Modal */}
            <RicksTipsModal open={tipsOpen} onOpenChange={setTipsOpen} />
        </div>
    );
};

export default TrainingManual;
