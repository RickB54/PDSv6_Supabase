import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout } from "@/lib/auth";
import { useNavigate, useLocation } from "react-router-dom";
import AboutDialog from "@/components/AboutDialog";
import { useState } from "react";
import { LogOut, Globe, User, ArrowLeft, Maximize2, Minimize2, FileText, CheckSquare, Settings } from "lucide-react";
import logo from "@/assets/logo-primary.png";
import NotificationBell from "@/components/NotificationBell";
import { Link } from "react-router-dom";
import { useCartStore } from "@/store/cart";
import { useFullScreen } from "@/hooks/useFullScreen";
import { useDemoMode } from "@/contexts/DemoContext";
import { contentService } from "@/lib/content";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const { isDemoMode } = useDemoMode();
  const user = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(false);
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  const [businessStatus, setBusinessStatus] = useState<any>(() => {
    const cached = contentService.getServiceMetaSync("global_settings");
    return cached?.meta?.businessStatus || null;
  });

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const meta = await contentService.getServiceMeta("global_settings");
        if (meta?.meta?.businessStatus) {
           setBusinessStatus(meta.meta.businessStatus);
        }
      } catch (err) {}
    };
    loadStatus();
    
    const handleContentChange = (e: any) => {
      if (e.detail?.kind === 'settings') loadStatus();
    };
    window.addEventListener('content-changed', handleContentChange as any);
    return () => window.removeEventListener('content-changed', handleContentChange as any);
  }, []);

  const handleLogout = async () => {
    useCartStore.getState().clear();
    await logout();
    navigate('/login');
  };

  // Show back button if we are not at root
  const showBackButton = location.pathname !== '/';

  const hasBanner = !!(businessStatus && businessStatus.isTopBannerActive);
  
  // Account for "View As" / Perspective mode banner
  const isViewingAsCustomer = (user?.role === 'admin' && localStorage.getItem('view_as_mode') === 'customer') || location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
  const isViewingAsEmployee = (user?.role === 'admin' && localStorage.getItem('view_as_mode') === 'employee') || location.pathname.startsWith('/dashboard/employee');
  const isPerspectiveMode = user?.role === 'admin' && (isViewingAsCustomer || isViewingAsEmployee);

  // Calculate total offset for the fixed header
  // Demo Bar: 40px
  // Business Banner: 40px
  // Perspective Banner: 40px
  const bannerOffset = (isDemoMode ? 40 : 0) + (hasBanner ? 40 : 0) + (isPerspectiveMode ? 40 : 0);

  return (
    <>
      {hasBanner && (
        <div 
          style={{ top: isDemoMode ? '40px' : '0' }}
          className={`fixed left-0 right-0 z-[150] py-2.5 px-4 text-center text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-lg border-b border-white/10 ${
          businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 
          businessStatus.mode === 'spring-prep' ? 'bg-emerald-600' :
          businessStatus.mode === 'emergency' ? 'bg-red-600' :
          'bg-red-600'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <span className="hidden sm:inline opacity-70">///</span>
            <span>{businessStatus.bannerText}</span>
            <span className="hidden sm:inline opacity-70">///</span>
          </div>
        </div>
      )}

      <header 
        style={{ top: `${bannerOffset}px` }}
        className={`fixed z-[140] left-0 right-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300 h-[64px]`}
      >
        <div className="relative flex items-center justify-between gap-4 px-6 h-full">
          <div className="flex items-center gap-1.5 sm:gap-4 flex-nowrap min-w-0">
            {user && (
              <SidebarTrigger className="text-foreground -ml-2 sm:ml-0" />
            )}

            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white h-8 w-8 sm:h-9 sm:w-9" title="Go Back">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}

            <button onClick={() => navigate("/")} className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-80 min-w-fit">
              <img src={logo} alt="Prime Auto Detail" className="h-7 w-7 sm:h-10 sm:w-10 aspect-square object-contain" />
            </button>

            {title && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-muted-foreground/60 hidden sm:inline">/</span>
                  <span className="text-foreground font-semibold tracking-tight truncate text-sm sm:text-base max-w-[120px] xs:max-w-[150px] sm:max-w-[60vw]">{title}</span>
                </div>
                {subtitle && <span className="text-[10px] text-muted-foreground pl-4 hidden md:block">{subtitle}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {children}

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1 sm:gap-3">
              <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="text-zinc-400 hover:text-white" title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>

              <Button asChild variant="outline" size="icon" className="flex">
                <Link to="/">
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">Website</span>
                </Link>
              </Button>

              {(user?.role === 'admin' || user?.role === 'employee') && (
                <div className="flex items-center gap-1 border-x border-border/50 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-quick-note', { detail: { path: location.pathname } }))}
                    title="Quick Note"
                  >
                    <FileText className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-quick-task', { detail: { path: location.pathname } }))}
                    title="Quick Task"
                  >
                    <CheckSquare className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile/Tablet "More" Menu */}
            <div className="flex md:hidden items-center">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400 h-8 w-8">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-900 text-white shadow-2xl">
                    <DropdownMenuItem onClick={toggleFullScreen} className="gap-2 focus:bg-zinc-900">
                      {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      {isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 focus:bg-zinc-900">
                      <Link to="/" className="flex items-center">
                        <Globe className="h-4 w-4" />
                        Website
                      </Link>
                    </DropdownMenuItem>
                    {(user?.role === 'admin' || user?.role === 'employee') && (
                      <>
                        <div className="h-px bg-zinc-900 my-1" />
                        <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-quick-note', { detail: { path: location.pathname } }))} className="gap-2 focus:bg-zinc-900">
                          <FileText className="h-4 w-4 text-blue-400" />
                          Quick Note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-quick-task', { detail: { path: location.pathname } }))} className="gap-2 focus:bg-zinc-900">
                          <CheckSquare className="h-4 w-4 text-emerald-400" />
                          Quick Task
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>

            {user?.role === 'admin' && (
              <div className="h-8 w-8 flex items-center justify-center">
                <NotificationBell />
              </div>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1.5 sm:gap-2 hover:bg-muted/50 p-1 sm:p-2 min-w-0 pr-3 sm:pr-4">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate max-w-[140px] xs:max-w-[160px] sm:max-w-[200px] text-xs sm:text-sm">Hi, {user.name || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-900 text-white w-48">
                  <DropdownMenuItem onClick={() => navigate('/user-settings')} className="gap-2 focus:bg-zinc-900">
                    <User className="h-4 w-4" />
                    User Settings
                  </DropdownMenuItem>
                  <div className="h-px bg-zinc-900 my-1" />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
      {/* Spacer to prevent fixed header from cutting off content */}
      {/* Dynamic spacer to prevent fixed header/banner from cutting off content */}
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </>
  );
}
