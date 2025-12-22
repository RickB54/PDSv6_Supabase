import { useParams, Link } from "react-router-dom";
import { getMenuGroups } from "@/components/menu-config";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SectionLanding() {
    const { sectionId } = useParams();

    // We don't have access to the dynamic counts here easily without context or prop drilling, 
    // but for the landing page static links are usually fine. 
    // If badges are critical we'd need a global store or context.
    const groups = getMenuGroups({ todoCount: 0, payrollDueCount: 0, inventoryCount: 0, fileCount: 0 });

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

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title={group.title} />
            <main className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.items.map((item, index) => {
                        const colorClass = colors[index % colors.length];
                        const iconColorClass = iconColors[index % iconColors.length];

                        return (
                            <Link key={item.url} to={item.url} className="block group">
                                <Card className={`h-full bg-zinc-900 transition-all hover:scale-[1.02] hover:shadow-lg ${colorClass}`}>
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center transition-colors">
                                            {item.icon && <item.icon className={`w-6 h-6 transition-colors ${iconColorClass}`} />}
                                        </div>
                                        <CardTitle className={`text-xl text-white transition-colors ${iconColorClass}`}>
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-zinc-500 group-hover:text-zinc-400 text-sm">
                                            Click to access {item.title}.
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
