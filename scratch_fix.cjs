const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/components/chemicals/StaticCaddyWorksheetModal.tsx");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
`export function StaticCaddyWorksheetModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [data, setData] = useState<CaddyData>(DEFAULT_DATA);
    const [isSaving, setIsSaving] = useState(false);
    const [showExtraSlots, setShowExtraSlots] = useState(false);

    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem('static-caddy-worksheet-data');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Legacy migration: if they have 8 slots, add the 2 extra blanks
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
                } catch (e) {
                    console.error("Failed to parse saved caddy worksheet data:", e);
                    setData(DEFAULT_DATA);
                }
            } else {
                setData(DEFAULT_DATA);
            }
        }
    }, [open]);`,
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
    });`
);

content = content.replace(
`    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(data));`,
`    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(data));
            localStorage.setItem('static-caddy-show-extra', showExtraSlots.toString());`
);

content = content.replace(
`    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset to the default seed data? All custom edits will be lost.")) {
            setData(DEFAULT_DATA);
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(DEFAULT_DATA));`,
`    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset to the default seed data? All custom edits will be lost.")) {
            setData(DEFAULT_DATA);
            setShowExtraSlots(false);
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(DEFAULT_DATA));
            localStorage.setItem('static-caddy-show-extra', 'false');`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Done");
