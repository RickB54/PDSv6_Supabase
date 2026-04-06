
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { contentService } from "@/lib/content";
import { toast } from "@/components/ui/use-toast";

interface DemoConfig {
  visibleSections: string[];
  isAdminPreviewEnabled: boolean;
  publicDemoEnabled?: boolean;
  disabledReason?: string;
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
  isPublicDemoDisabled: boolean;
  setPublicDemoDisabled: (val: boolean) => void;
  disabledReason: string;
  setDisabledReason: (val: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultSections = [
    "admin-dashboard", "search-customer", "prospects", "inventory-control", 
    "invoicing", "vehicle-gallery", "reports", "settings", "payroll", 
    "accounting", "company-budget", "estimates", "chemical-cards", 
    "dilution-calc", "dilution-chart-interactive", "dilution-chart-reference", 
    "dilution-chart-modal", "help-admin", "help-employee", "learn-lib", 
    "orientation", "tasks", "service-checklist", "website-admin",
    "phone-assistant", "availability-manager", "package-selection",
    "vehicle-classification", "client-evaluation", "addon-upsell-script",
    "employee-schedule", "bookings", "user-mgmt", "mileage", "taxes",
    "package-pricing", "reports-customers", "reports-invoices",
    "reports-inventory", "reports-employee", "reports-estimates",
    "reports-accounting", "reports-tax", "chem-train", "cert-prog",
    "interactive-demo", "staff-schedule", "company-employees",
    "team-chat", "follow-up-center", "discount-coupons", "blog",
    "blog-reorder", "user-settings", "vehicle-types", "mobile-setup",
    "detailing-vendors", "active-jobs", "job-history", "payments-cart",
    "my-invoices", "personal-notes", "bookings-analytics", "file-manager"
  ];

  const [config, setConfig] = useState<DemoConfig>({
    visibleSections: defaultSections,
    isAdminPreviewEnabled: true
  });
  const [isAdminPreview, setIsAdminPreview] = useState<boolean>(() => {
    return localStorage.getItem("admin_demo_preview") === "true";
  });
  const [isPublicDemoDisabled, setPublicDemoDisabled] = useState<boolean>(true);
  const [disabledReason, setDisabledReason] = useState<string>("System Maintenance");
  const [isLoading, setIsLoading] = useState(true);

  // 1) Path-based or admin toggle
  const isDemoPath = location.pathname.startsWith("/demo") || location.pathname === "/demo";
  const isHome = location.pathname === "/" || location.pathname === "/index.html";
  
  // 2) Persistence flag (so clicking /dashboard doesn't kick you out)
  const [stayInDemo, setStayInDemo] = useState(() => localStorage.getItem("demo_mode_active") === "true");

  useEffect(() => {
    if (isLoading) return; // IMPORTANT: Wait for DB config to load before redirecting anyone

    if (isDemoPath && !isPublicDemoDisabled) {
      localStorage.setItem("demo_mode_active", "true");
      setStayInDemo(true);
    } else if (isDemoPath && isPublicDemoDisabled && !isAdminPreview) {
      // If they land on /demo but it's disabled, KICK THEM TO HOME
      localStorage.removeItem("demo_mode_active");
      setStayInDemo(false);
      toast({ 
        title: "Demo Temporarily Disabled", 
        description: `Access to the public simulation has been suspended. Reason: ${disabledReason || 'System Maintenance'}.`, 
        variant: "destructive" 
      });
      navigate("/");
    }
  }, [isDemoPath, isHome, isPublicDemoDisabled, isLoading, isAdminPreview]);

  // Global demo mode check
  // Public users lose access if isPublicDemoDisabled is true.
  // Admins keep access via isAdminPreview.
  const isDemoMode = isAdminPreview || ((stayInDemo || isDemoPath) && !isPublicDemoDisabled);

  useEffect(() => {
    localStorage.setItem("admin_demo_preview", isAdminPreview.toString());
    // Also sync to a flag supa-data can read easily
    if (isAdminPreview) localStorage.setItem("demo_mode_active", "true");
    
    // Dispatch event to notify layout/components
    window.dispatchEvent(new Event("demo-mode-changed"));
  }, [isAdminPreview]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const meta = await contentService.getServiceMeta("demo_config");
        if (meta && meta.meta) {
          setConfig(meta.meta);
          if (meta.meta.publicDemoEnabled === false) {
            setPublicDemoDisabled(true);
            if (meta.meta.disabledReason) setDisabledReason(meta.meta.disabledReason);
          } else {
            setPublicDemoDisabled(false);
          }
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
    if (!isDemoMode) return true; // Full access fallback
    
    // BLACKLIST: Specifically hide things that shouldn't be in demo mode even for visitors
    // E.g. "settings-danger-zone" or "actual-billing" if those were keys
    const blacklisted: string[] = [];
    if (blacklisted.includes(key)) return false;

    // Use current config as a primary whitelist if it exists and has and items
    if (config?.visibleSections && config.visibleSections.length > 0) {
      return config.visibleSections.includes(key);
    }

    // Default to TRUE in demo mode to showcase all features
    return true;
  };

  const updatePublicDemoStatus = async (isDisabled: boolean) => {
    setPublicDemoDisabled(isDisabled);
    const newConfig = { ...config, publicDemoEnabled: !isDisabled, disabledReason };
    setConfig(newConfig);
    await contentService.upsertServiceMeta({ key: "demo_config", meta: newConfig });
  };

  const updateDisabledReason = async (reason: string) => {
    setDisabledReason(reason);
    const newConfig = { ...config, publicDemoEnabled: !isPublicDemoDisabled, disabledReason: reason };
    setConfig(newConfig);
    await contentService.upsertServiceMeta({ key: "demo_config", meta: newConfig });
  };

  const setAdminPreview = (val: boolean) => {
    setIsAdminPreview(val);
    if (!val) {
      localStorage.removeItem("demo_mode_active");
      setStayInDemo(false);
    }
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
    mockUser,
    isPublicDemoDisabled,
    setPublicDemoDisabled: updatePublicDemoStatus,
    disabledReason,
    setDisabledReason: updateDisabledReason
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
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 h-10 flex items-center justify-between px-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 text-white">
        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/30">
          Demo/Training Mode
        </div>
        <p className="text-xs font-bold whitespace-nowrap">
          Interactive Simulation Active — <span className="hidden sm:inline opacity-90 font-medium tracking-tight">All data is mock and read-only. No persistent changes will occur.</span>
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-help', { detail: 'interactive-training-demo' }));
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all group"
          title="View Sharing Instructions & Help"
        >
          <span className="text-[10px] font-bold text-white uppercase tracking-wider hidden xs:inline">Sharing Help</span>
          <div className="w-4 h-4 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold text-[10px] group-hover:scale-110 transition-transform">?</div>
        </button>

        <button 
          onClick={() => {
            localStorage.removeItem("demo_mode_active");
            localStorage.removeItem("admin_demo_preview");
            window.location.href = "/";
          }}
          className="px-3 py-1 bg-white text-orange-600 hover:bg-zinc-200 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          Exit Training Session
        </button>
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
