import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Truck } from "lucide-react";

const MobileSetup = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mobile Setup" />
      <main className="container mx-auto px-4 py-6">
        <Card className="p-8 bg-gradient-card border-border text-center animate-fade-in">
          <Truck className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Mobile Detailing Setup</h2>
          <p className="text-muted-foreground">
            Comprehensive equipment list for your F150 bed configuration
          </p>
          <p className="text-sm text-muted-foreground mt-4">
Refer to the Quick Detailing Manual → Mobile Setup tab for complete details
          </p>
        </Card>
      </main>
    </div>
  );
};

export default MobileSetup;
