import React from "react";
import { useWalkthrough } from "@/contexts/WalkthroughContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WalkthroughOverlay: React.FC = () => {
  const { isActive, currentStepIndex, steps, stopWalkthrough, nextStep, prevStep } = useWalkthrough();
  const navigate = useNavigate();

  if (!isActive) return null;

  const currentStep = steps[currentStepIndex];

  // Navigate to the correct route for this step if necessary
  const handleNext = () => {
    const nextStepInfo = steps[currentStepIndex + 1];
    if (nextStepInfo && nextStepInfo.route && window.location.pathname !== nextStepInfo.route) {
        navigate(nextStepInfo.route);
    }
    nextStep();
  };

  const handlePrev = () => {
    const prevStepInfo = steps[currentStepIndex - 1];
    if (prevStepInfo && prevStepInfo.route && window.location.pathname !== prevStepInfo.route) {
        navigate(prevStepInfo.route);
    }
    prevStep();
  };

  const positionClasses = {
      center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      top: "top-20 left-1/2 -translate-x-1/2",
      bottom: "bottom-20 left-1/2 -translate-x-1/2",
      left: "top-1/2 left-20 -translate-y-1/2",
      right: "top-1/2 right-20 -translate-y-1/2"
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed backdrop - only for center position or initial step */}
      {currentStep.position === 'center' && (
          <div className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm" onClick={stopWalkthrough} />
      )}

      {/* Floating Card */}
      <div className={`absolute pointer-events-auto w-full max-w-sm transition-all duration-500 animate-in fade-in zoom-in-95 ${positionClasses[currentStep.position || 'center']}`}>
        <Card className="border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-purple-600/10 border-b border-purple-500/20 py-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                    <Lightbulb className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Tutorial Step {currentStepIndex + 1} of {steps.length}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={stopWalkthrough}>
                    <X className="w-4 h-4" />
                </Button>
             </div>
          </CardHeader>
          <CardContent className="pt-6 pb-2">
            <CardTitle className="text-xl mb-3 text-white">{currentStep.title}</CardTitle>
            <p className="text-zinc-400 leading-relaxed text-sm">{currentStep.description}</p>
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-zinc-950/50 py-3 border-t border-zinc-800">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-zinc-500 hover:text-white disabled:opacity-30" 
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
            >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-1.5 px-2">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-4 bg-purple-500' : 'w-1.5 bg-zinc-700'}`} />
                ))}
            </div>
            <Button 
                variant="default" 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
                onClick={handleNext}
            >
                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
