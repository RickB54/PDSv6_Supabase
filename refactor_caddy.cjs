const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/components/chemicals/StaticCaddyWorksheetModal.tsx");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
`import { Save, Printer, Download, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';`,
`import { Save, Printer, Download, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';`
);

content = content.replace(
`const getInitialData = (): CaddyData => {
    const saved = localStorage.getItem('static-caddy-worksheet-data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.interior.length === 8) {
                parsed.interior.push(
                    { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                    { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                );
            }
            if (parsed.exterior.length === 8) {
                parsed.exterior.push(
                    { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                    { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                );
            }
            return parsed;
        } catch (e) {
            console.error("Failed to parse saved caddy worksheet data:", e);
            return DEFAULT_DATA;
        }
    }
    return DEFAULT_DATA;
};

export function StaticCaddyWorksheetModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [data, setData] = useState<CaddyData>(getInitialData);
    const [isSaving, setIsSaving] = useState(false);
    const [showExtraSlots, setShowExtraSlots] = useState(() => {
        return localStorage.getItem('static-caddy-show-extra') === 'true';
    });

    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(data));
            localStorage.setItem('static-caddy-show-extra', showExtraSlots.toString());
            toast({
                title: "Worksheet Saved",
                description: "Your caddy worksheet has been saved successfully.",
                className: "bg-green-600 text-white"
            });
        } catch (e) {
            console.error("Failed to save:", e);
            toast({
                title: "Save Failed",
                description: "Failed to save the worksheet data.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset to the default seed data? All custom edits will be lost.")) {
            setData(DEFAULT_DATA);
            setShowExtraSlots(false);
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(DEFAULT_DATA));
            localStorage.setItem('static-caddy-show-extra', 'false');
            toast({
                title: "Reset Complete",
                description: "Worksheet has been restored to default values.",
            });
        }
    };`,
`export function StaticCaddyWorksheetModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [data, setData] = useState<CaddyData>(DEFAULT_DATA);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showExtraSlots, setShowExtraSlots] = useState(false);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data: dbData, error } = await supabase
                .from('static_caddy_worksheet')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (error) throw error;

            if (dbData) {
                const parsed = {
                    interior: dbData.interior || DEFAULT_INTERIOR,
                    exterior: dbData.exterior || DEFAULT_EXTERIOR
                };
                
                // Legacy migration
                if (parsed.interior.length === 8) {
                    parsed.interior.push(
                        { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                        { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                    );
                }
                if (parsed.exterior.length === 8) {
                    parsed.exterior.push(
                        { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                        { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                    );
                }
                
                setData(parsed);
                setShowExtraSlots(dbData.show_extra_slots || false);
            } else {
                setData(DEFAULT_DATA);
                setShowExtraSlots(false);
            }
        } catch (e) {
            console.error("Failed to fetch caddy worksheet data:", e);
            setData(DEFAULT_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('static_caddy_worksheet')
                .upsert({
                    id: 1,
                    interior: data.interior,
                    exterior: data.exterior,
                    show_extra_slots: showExtraSlots,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast({
                title: "Worksheet Saved",
                description: "Your caddy worksheet has been securely saved to the database.",
                className: "bg-green-600 text-white"
            });
        } catch (e) {
            console.error("Failed to save:", e);
            toast({
                title: "Save Failed",
                description: "Failed to save the worksheet data to the database.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (window.confirm("Are you sure you want to reset to the default seed data? All custom edits will be lost and overwritten in the database.")) {
            setIsLoading(true);
            try {
                const { error } = await supabase
                    .from('static_caddy_worksheet')
                    .upsert({
                        id: 1,
                        interior: DEFAULT_INTERIOR,
                        exterior: DEFAULT_EXTERIOR,
                        show_extra_slots: false,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;

                setData(DEFAULT_DATA);
                setShowExtraSlots(false);
                toast({
                    title: "Reset Complete",
                    description: "Worksheet has been restored to default values.",
                });
            } catch (e) {
                console.error("Failed to reset:", e);
                toast({
                    title: "Reset Failed",
                    description: "Could not reset data in the database.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        }
    };`
);

content = content.replace(
`            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Static Caddy Worksheet
                        </DialogTitle>
                        <p className="text-sm text-zinc-400 mt-1">
                            A quick-reference sheet for your setup. Offline-capable.
                        </p>
                    </div>`,
`            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Static Caddy Worksheet
                        </DialogTitle>
                        <p className="text-sm text-zinc-400 mt-1">
                            A quick-reference sheet for your setup.
                        </p>
                    </div>`
);

content = content.replace(
`                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="showExtra" 
                                checked={showExtraSlots}
                                onChange={(e) => setShowExtraSlots(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-950"
                            />
                            <label htmlFor="showExtra" className="text-sm font-medium text-zinc-300">
                                Show Extra Slots
                            </label>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">`,
`                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="showExtra" 
                                checked={showExtraSlots}
                                onChange={(e) => setShowExtraSlots(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-950"
                                disabled={isLoading}
                            />
                            <label htmlFor="showExtra" className="text-sm font-medium text-zinc-300">
                                Show Extra Slots
                            </label>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12 text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="ml-3">Loading caddy configuration...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">`
);

content = content.replace(
`                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-zinc-800">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="text-zinc-300 border-zinc-700 hover:bg-zinc-800">
                        Cancel
                    </Button>`,
`                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-zinc-800">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="text-zinc-300 border-zinc-700 hover:bg-zinc-800" disabled={isSaving || isLoading}>
                        Cancel
                    </Button>`
);

content = content.replace(
`                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Worksheet'}
                    </Button>
                </div>`,
`                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Worksheet'}
                    </Button>
                </div>`
);

content = content.replace(
`                    <Button variant="outline" onClick={handleReset} className="text-red-500 border-red-900/50 hover:bg-red-900/20">`,
`                    <Button variant="outline" onClick={handleReset} className="text-red-500 border-red-900/50 hover:bg-red-900/20" disabled={isLoading}>`
);

content = content.replace(
`                    <Button onClick={handleGeneratePdf} className="bg-sky-600 hover:bg-sky-500 text-white">`,
`                    <Button onClick={handleGeneratePdf} className="bg-sky-600 hover:bg-sky-500 text-white" disabled={isLoading}>`
);

content = content.replace(
`                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSaving}>`,
`                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSaving || isLoading}>`
);


fs.writeFileSync(filePath, content, "utf8");
console.log("Done");
