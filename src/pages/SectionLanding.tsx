import { useParams, Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import { getMenuGroups } from "@/components/menu-config";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default function SectionLanding() {
    const { sectionId } = useParams();
    const { isDemoMode } = useDemoMode();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin' || isDemoMode;
    const isEmployee = user?.role === 'employee' || isAdmin;

    // We don't have access to the dynamic counts here easily without context or prop drilling, 
    // but for the landing page static links are usually fine. 
    // If badges are critical we'd need a global store or context.
    const groups = getMenuGroups({ 
        todoCount: 0, 
        payrollDueCount: 0, 
        inventoryCount: 0, 
        fileCount: 0,
        bookingsBadgeColor: 'blue',
        tentativeBookingsCount: 0
    });

    const group = groups.find(g =>
        g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === sectionId
    );

    if (!group) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-500">Section Not Found</h1>
                <p>The requested menu section does not exist.</p>
                <Button asChild className="mt-4">
                    <Link to="/">Go Home</Link>
                </Button>
            </div>
        );
    }

    const colors = [
        "border-zinc-800 hover:border-red-500 hover:shadow-red-500/10 group-hover:bg-red-900/10",
        "border-zinc-800 hover:border-blue-500 hover:shadow-blue-500/10 group-hover:bg-blue-900/10",
        "border-zinc-800 hover:border-green-500 hover:shadow-green-500/10 group-hover:bg-green-900/10",
        "border-zinc-800 hover:border-purple-500 hover:shadow-purple-500/10 group-hover:bg-purple-900/10",
        "border-zinc-800 hover:border-amber-500 hover:shadow-amber-500/10 group-hover:bg-amber-900/10",
        "border-zinc-800 hover:border-pink-500 hover:shadow-pink-500/10 group-hover:bg-pink-900/10",
    ];

    const iconColors = [
        "text-zinc-400 group-hover:text-red-400",
        "text-zinc-400 group-hover:text-blue-400",
        "text-zinc-400 group-hover:text-green-400",
        "text-zinc-400 group-hover:text-purple-400",
        "text-zinc-400 group-hover:text-amber-400",
        "text-zinc-400 group-hover:text-pink-400",
    ];

    const validItems = group.items.filter(item => {
        if (item.role === 'admin' && !isAdmin) return false;
        if (item.role === 'employee' && !isEmployee && !isAdmin) return false;
        // Basic check for hidden items
        try {
            const raw = localStorage.getItem('hiddenMenuItems');
            const hidden = JSON.parse(raw || '[]');
            if (item.key && hidden.includes(item.key)) return false;
        } catch { }
        return true;
    });

    if (validItems.length === 0) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <PageHeader title={group.title} />
                <div className="p-8 text-center text-zinc-500 italic">
                    No items in this section for your access level.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title={group.title} />
            <main className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(validItems || []).map((item, index) => {
                        const colorClass = colors[index % colors.length];
                        const iconColorClass = iconColors[index % iconColors.length];

                        const isHashLink = item.url.startsWith('#');
                        const content = (
                            <Card className={`h-full bg-zinc-900 transition-all hover:scale-[1.02] hover:shadow-lg ${colorClass}`}>
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center transition-colors">
                                        {item.icon && <item.icon className={`w-6 h-6 transition-colors ${iconColorClass}`} />}
                                    </div>
                                    <CardTitle className={`text-xl text-white transition-colors ${iconColorClass} flex items-center gap-2`}>
                                        {item.title}
                                        {item.helpTopicId && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    window.dispatchEvent(new CustomEvent('open-help', { 
                                                        detail: { 
                                                            topicId: item.helpTopicId,
                                                            role: isAdmin ? 'admin' : (isEmployee ? 'employee' : 'customer')
                                                        } 
                                                    }));
                                                }}
                                                className="hover:text-blue-400 transition-colors inline-flex items-center justify-center p-1 rounded-full hover:bg-zinc-800"
                                            >
                                                <HelpCircle className="w-4 h-4 cursor-pointer" />
                                            </button>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-zinc-500 group-hover:text-zinc-400 text-sm">
                                        Click to access {item.title}.
                                    </p>
                                </CardContent>
                            </Card>
                        );

                        if (isHashLink) {
                            return (
                                <button
                                    key={item.url}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (item.url === '#call-assistant') window.dispatchEvent(new Event('open-call-assistant'));
                                        if (item.url === '#help' || item.url === '#help-admin') {
                                            window.dispatchEvent(new CustomEvent('open-help', { detail: { role: item.url === '#help-admin' ? 'admin' : (isAdmin ? 'admin' : (isEmployee ? 'employee' : 'customer')) } }));
                                        }
                                        if (item.url === '#help-employee') {
                                            window.dispatchEvent(new CustomEvent('open-help', { detail: { role: 'employee' } }));
                                        }
                                    }}
                                    className="block group text-left w-full h-full"
                                >
                                    {content}
                                </button>
                            );
                        }

                        return (
                            <Link key={item.url} to={item.url} className="block group">
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
