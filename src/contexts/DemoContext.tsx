
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { contentService } from "@/lib/content";
import { toast } from "@/components/ui/use-toast";

interface DemoConfig {
  visibleSections: string[];
  isAdminPreviewEnabled: boolean;
}

interface DemoContextType {
  isDemoMode: boolean;
  isReadOnly: boolean;
  isAdminPreview: boolean;
  visibleSections: string[];
  setAdminPreview: (val: boolean) => void;
  setVisibleSections: (sections: string[]) => void;
  saveConfig: () => Promise<void>;
  isLoading: boolean;
  canAccess: (key: string) => boolean;
  mockUser: any;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [isAdminPreview, setIsAdminPreview] = useState<boolean>(() => {
    return localStorage.getItem("admin_demo_preview") === "true";
  });
  const [isLoading, setIsLoading] = useState(true);

  // Derive if we are strictly in the /demo path
  const isDemoPath = location.pathname.startsWith("/demo") || location.pathname === "/demo";

  // Global demo mode active if in path OR admin has toggle on
  const isDemoMode = isDemoPath || isAdminPreview;

  useEffect(() => {
    localStorage.setItem("admin_demo_preview", isAdminPreview.toString());
    // Dispatch event to notify layout/components
    window.dispatchEvent(new Event("demo-mode-changed"));
  }, [isAdminPreview]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const meta = await contentService.getServiceMeta("demo_config");
        if (meta && meta.meta) {
          setConfig(meta.meta);
        } else {
          // Defaults if not set
          setConfig({
            visibleSections: [
              "admin-dashboard", "search-customer", "prospects", "inventory-control", 
              "invoicing", "vehicle-gallery", "reports", "settings", "payroll", 
              "accounting", "company-budget", "estimates", "chemical-cards", 
              "dilution-calc", "dilution-chart-interactive", "dilution-chart-reference", 
              "dilution-chart-modal", "help-admin", "help-employee", "learn-lib", 
              "orientation", "tasks", "service-checklist"
            ],
            isAdminPreviewEnabled: true
          });
        }
      } catch (e) {
        console.error("Failed to load demo config", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const canAccess = (key: string) => {
    if (!isDemoMode) return true; // Full access locally
    
    // STRICT BLACKLIST: ONLY sensitive calendar logic is hidden now.
    // Financial modules are now allowed but guarded by mock data.
    const blacklisted = ['availability-manager'];
    if (blacklisted.includes(key)) return false;

    if (!config) return false;
    return config.visibleSections.includes(key);
  };

  const setAdminPreview = (val: boolean) => {
    setIsAdminPreview(val);
    if (val) {
      toast({ title: "Demo Preview Mode ACTIVE", description: "You are now viewing the app exactly as a public visitor would see it. Data is mock and read-only." });
    } else {
      toast({ title: "Admin Mode Restored", description: "Returning to full administrative view." });
    }
  };

  const setVisibleSections = (sections: string[]) => {
    if (config) setConfig({ ...config, visibleSections: sections });
  };

  const saveConfig = async () => {
    if (!config) return;
    await contentService.upsertServiceMeta({ key: "demo_config", meta: config });
  };

  const mockUser = {
    id: "demo-admin",
    name: "Demo Admin",
    email: "demo@primeautodetail.com",
    role: "admin",
    isDemo: true
  };

  const value: DemoContextType = {
    isDemoMode,
    isReadOnly: isDemoMode,
    isAdminPreview,
    visibleSections: config?.visibleSections || [],
    setAdminPreview,
    setVisibleSections,
    saveConfig,
    isLoading,
    canAccess,
    mockUser
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoProvider");
  }
  return context;
};

/**
 * A global banner displayed when demo mode is active
 */
export const DemoBanner = () => {
  const { isDemoMode } = useDemoMode();
  if (!isDemoMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 h-10 flex items-center justify-center px-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 text-white">
        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/30">
          Demo/Training Mode
        </div>
        <p className="text-xs font-bold whitespace-nowrap">
          Interactive Simulation Active — <span className="hidden sm:inline opacity-90 font-medium">All data is mock and read-only. No persistent changes will occur.</span>
        </p>
      </div>
    </div>
  );
};

/**
 * A wrapper to disable interactive elements in demo mode
 */
export const ReadOnlyGuard: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => {
  const { isReadOnly } = useDemoMode();
  if (!isReadOnly) return <>{children}</>;
  
  return (
    <div className="relative group cursor-not-allowed">
      <div className="pointer-events-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 z-10 hidden group-hover:flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-md transition-all">
        <span className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase px-2 py-1 rounded shadow-xl">
          Demo Mode — Read Only
        </span>
      </div>
    </div>
  );
};
