import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import AboutDialog from "@/components/AboutDialog";
import { useState } from "react";
import { LogOut, Globe, User } from "lucide-react";
import logo from "@/assets/logo-3inch.png";
import NotificationBell from "@/components/NotificationBell";
import { Link } from "react-router-dom";
import { useCartStore } from "@/store/cart";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);

  const handleLogout = async () => {
    useCartStore.getState().clear();
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap min-w-0">
            <SidebarTrigger className="text-foreground" />
            <button onClick={() => setShowAbout(true)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <img src={logo} alt="Prime Detail Solutions" className="h-10 w-auto" />
            </button>
            {title && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/60 hidden sm:inline">/</span>
                  <span className="text-foreground font-semibold tracking-tight truncate max-w-[40vw] sm:max-w-[60vw]">{title}</span>
                </div>
                {subtitle && <span className="text-xs text-muted-foreground pl-4 hidden md:block">{subtitle}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 min-w-0">
            {children}

            <Button asChild variant="outline" size="icon" className="sm:gap-2 hidden sm:flex">
              <Link to="/">
                <Globe className="h-4 w-4" />
                <span className="sr-only">Website</span>
              </Link>
            </Button>

            {user?.role === 'admin' && <NotificationBell />}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 truncate max-w-[50vw] sm:max-w-none hover:bg-muted/50">
                    <User className="h-4 w-4 text-primary" />
                    <span className="truncate hidden sm:inline">Hi, {user.name || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/user-settings')}>
                    User Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-500 focus:text-red-500">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
      {/* Spacer removed for sticky positioning */}

      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </>
  );
}
