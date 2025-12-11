import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-3inch.png";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Prime Detail Solutions" className="w-40" />
          </div>
          <DialogTitle className="text-center text-2xl">About Prime Detail Solutions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Welcome to Prime Detail Solutions — your trusted partner in premium auto care.
          </p>
          <p className="text-muted-foreground">
            We specialize in high-quality interior and exterior detailing, paint correction,
            ceramic coatings, and mobile-ready services. With transparent pricing and expert
            craftsmanship, we deliver showroom results at our optimized detailing facility.
          </p>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Website: <a href="https://prime-detail-solutions.netlify.app/" className="text-primary hover:underline">
                prime-detail-solutions.netlify.app
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              © Prime Detail Solutions. All rights reserved.
            </p>
          </div>
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

