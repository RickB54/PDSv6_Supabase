import React, { createContext, useContext, useState, useEffect } from "react";
import { useDemoMode } from "./DemoContext";
import { useLocation } from "react-router-dom";

export type WalkthroughStep = {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector or unique identifier
  position?: "top" | "bottom" | "left" | "right" | "center";
  route?: string; // The route where this step occurs
};

type WalkthroughContextType = {
  isActive: boolean;
  currentStepIndex: number;
  steps: WalkthroughStep[];
  startWalkthrough: () => void;
  stopWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isAvailable: boolean;
};

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoMode } = useDemoMode();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Define steps for the "Interactive Demo"
  const steps: WalkthroughStep[] = [
    {
      id: "welcome",
      title: "Welcome to Prime Central Hub",
      description: "This is your main command center. From here, you can see all key metrics and manage daily operations.",
      position: "center",
      route: "/bookings-analytics"
    },
    {
      id: "bookings",
      title: "Bookings Management",
      description: "Manage all customer appointments here. You can filter by date, status, and view deep details for each booking.",
      target: "#bookings-list",
      position: "top",
      route: "/bookings"
    },
    {
      id: "prospects",
      title: "Lead Management",
      description: "Track potential customers, their vehicle details, and how they found you. Converting leads to bookings is easy!",
      target: "#prospects-overview",
      position: "bottom",
      route: "/prospects"
    },
    {
       id: "inventory",
       title: "Inventory Control",
       description: "Monitor your chemicals, supplies, and equipment. Set low-stock alerts to ensure you never run out of critical detailing materials.",
       target: "#inventory-status",
       position: "left",
       route: "/inventory-control"
    },
    {
      id: "settings",
      title: "Public Demo Settings",
      description: "As an admin, you can toggle this 'Interactive Demo' mode on or off. You can also customize which sections are visible to public visitors.",
      target: "#demo-master-toggle",
      position: "right",
      route: "/settings"
    }
  ];

  const startWalkthrough = () => setIsActive(true);
  const stopWalkthrough = () => {
    setIsActive(false);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopWalkthrough();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Walkthrough is only available when isDemoMode is ON
  const isAvailable = isDemoMode;

  // Cleanup if demo mode is turned off
  useEffect(() => {
    if (!isAvailable) {
      stopWalkthrough();
    }
  }, [isAvailable]);

  return (
    <WalkthroughContext.Provider value={{
      isActive,
      currentStepIndex,
      steps,
      startWalkthrough,
      stopWalkthrough,
      nextStep,
      prevStep,
      isAvailable
    }}>
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error("useWalkthrough must be used within a WalkthroughProvider");
  }
  return context;
};
