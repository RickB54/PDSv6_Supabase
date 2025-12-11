import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
    title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
    return (
        <div className="min-h-screen bg-background">
            <PageHeader title={title} />
            <main className="container mx-auto px-4 py-6 max-w-4xl">
                <Card className="p-12 flex flex-col items-center justify-center text-center border-border bg-card/50 backdrop-blur-sm">
                    <div className="bg-primary/10 p-4 rounded-full mb-6">
                        <Construction className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Under Construction</h2>
                    <p className="text-muted-foreground text-lg max-w-md">
                        This module is under construction — ready for future expansion.
                    </p>
                </Card>
            </main>
        </div>
    );
}
