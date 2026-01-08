import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { getSupabaseBookings } from "@/lib/supa-data";
import { Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Job {
    jobId: string;
    customer: string;
    vehicle: string;
    service: string;
    status: "active" | "completed";
    finishedAt?: string;
}

const ActiveJobs = () => {
    const [jobs, setJobs] = useState<Job[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userBookings = await getSupabaseBookings(true);
            const jobsMapped: Job[] = userBookings.map(b => ({
                jobId: b.id,
                customer: b.customer_name,
                vehicle: typeof b.vehicle_info === 'string' ? b.vehicle_info : (b.vehicle_info?.type || b.title),
                service: b.title,
                status: b.status === 'completed' ? 'completed' : 'active',
                finishedAt: b.status === 'completed' ? b.date : undefined
            }));
            setJobs(jobsMapped.filter(j => j.status === 'active'));
        } catch (error) {
            console.error('Error loading jobs:', error);
            toast({
                title: "Error loading data",
                description: "Problem loading jobs.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Active Jobs" />
            <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
                <Card className="p-6 border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-amber-500/10">
                                <Clock className="h-6 w-6 text-amber-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Current Active Jobs</h2>
                        </div>
                        {jobs.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center border rounded-md border-dashed">No active jobs at the moment.</p>
                        ) : (
                            <div className="space-y-3">
                                {jobs.map(job => (
                                    <div key={job.jobId} className="p-4 bg-background/50 rounded border border-border">
                                        <h3 className="font-semibold text-foreground text-lg">{job.service}</h3>
                                        <p className="text-sm text-muted-foreground">{job.vehicle}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default ActiveJobs;
