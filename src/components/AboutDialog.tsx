import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-primary.png";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Prime Auto Detail" className="h-20 w-auto" />
          </div>
          <DialogTitle className="text-center text-2xl">About Prime Auto Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Welcome to Prime Auto Detail — your trusted partner in premium auto care.
          </p>
          <p className="text-muted-foreground">
            We specialize in high-quality interior and exterior detailing, paint correction,
            ceramic coatings, and mobile-ready services. With transparent pricing and expert
            craftsmanship, we deliver showroom results at our optimized detailing facility or onsite.
          </p>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Email: <a href="mailto:Rick.PrimeAutoDetail@gmail.com?subject=Inquiry from Website" className="text-primary hover:underline">
                Rick.PrimeAutoDetail@gmail.com
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              © Prime Auto Detail. All rights reserved.
            </p>
          </div>
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog >
  );
}

