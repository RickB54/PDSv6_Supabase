import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDemoMode } from "@/contexts/DemoContext";
import { Button } from "@/components/ui/button";
import { Menu, X, UserCog, User, ShoppingCart, Sidebar as SidebarIcon, ArrowLeft } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import logo from "@/assets/logo-primary.png";
import NotificationBell from "@/components/NotificationBell";
import { useCartStore } from "@/store/cart";
import { useSidebar } from "@/components/ui/sidebar"; // Import Use Sidebar
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Phone } from "lucide-react";

import { contentService } from "@/lib/content";

const sanitizeShopOnlyText = (text: string, isShopOnly: boolean) => {
  if (!text || !isShopOnly) return text;
  return text
    .replace(/PREMIUM MOBILE DETAILING/g, 'PREMIUM SHOP-ONLY DETAILING')
    .replace(/premium mobile detailing/gi, 'premium shop detailing')
    .replace(/at your driveway/gi, 'at our shop facility')
    .replace(/to your driveway/gi, 'at our Methuen facility')
    .replace(/mobile units are active/gi, 'shop facility is fully active')
    .replace(/mobile units are/gi, 'shop facility is')
    .replace(/mobile detailing/gi, 'shop detailing')
    .replace(/mobile/gi, 'shop-only');
};

const stripAddressForTopBanner = (text: string) => {
  if (!text) return text;
  return text
    .replace(/at 54 Boston Street, Methuen, MA/gi, '')
    .replace(/located at 54 Boston Street, Methuen, MA/gi, '')
    .replace(/located at 54 Boston Street/gi, '')
    .replace(/at 54 Boston Street/gi, '')
    .replace(/54 Boston Street, Methuen, MA/gi, 'Methuen, MA')
    .replace(/54 Boston Street/gi, '');
};

export const Navbar = () => {
    const { isDemoMode } = useDemoMode();
    const { toggleSidebar, isMobile } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const cartCount = useCartStore((s) => s.count());
  const [bookingTestMode, setBookingTestMode] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<any>(null);

  const defaultNavLinks = [
    { to: "/", label: "Home" },
    { to: "/services", label: "Services" },
    { to: "/about", label: "About" },
    { to: "/availability", label: "Availability" },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
    { to: "/blog", label: "Blog" },
  ];

  const [navLinks, setNavLinks] = useState(defaultNavLinks);

  const loadLinks = async () => {
    try {
      const allMeta = await contentService.getAllServiceMeta();
      const meta = allMeta.find(m => m.key === 'header_links');
      const bMode = allMeta.find(m => m.key === 'booking_test_mode');
      const gs = allMeta.find(m => m.key === 'global_settings');
      
      setBookingTestMode(!!bMode?.meta?.active);
      if (gs && gs.meta && gs.meta.businessStatus) {
        setBusinessStatus(gs.meta.businessStatus);
      }
      
      if (meta && meta.meta && Array.isArray(meta.meta.links)) {
        setNavLinks(meta.meta.links);
      } else {
        setNavLinks(defaultNavLinks);
      }
    } catch { }
  };

  useEffect(() => {
    loadLinks();
    const handleContentChange = (e: any) => {
      if (e.detail?.kind === 'header' || e.detail?.kind === 'booking_test_mode' || e.detail?.kind === 'settings') {
        loadLinks();
      }
    };
    window.addEventListener('content-changed', handleContentChange as any);

    const update = () => setUser(getCurrentUser());
    window.addEventListener('auth-changed', update as EventListener);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('content-changed', handleContentChange as any);
      window.removeEventListener('auth-changed', update as EventListener);
      window.removeEventListener('storage', update);
    };
  }, []);

  const handleLogout = () => {
    useCartStore.getState().clear();
    logout();
    window.location.href = "/";
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogoClick = (e: React.MouseEvent) => {
    // Standard navigation only
  };
    const isAdmin = user?.role === 'admin';
    const isViewingAsCustomer = (isAdmin && localStorage.getItem('view_as_mode') === 'customer') || location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
    const isViewingAsEmployee = (isAdmin && localStorage.getItem('view_as_mode') === 'employee') || location.pathname.startsWith('/dashboard/employee');
    const isPerspectiveMode = isAdmin && (isViewingAsCustomer || isViewingAsEmployee);

    const navOffset = (isDemoMode ? 40 : 0) + (businessStatus?.isTopBannerActive ? 40 : 0) + (isPerspectiveMode ? 40 : 0);

    return (
    <>
      {businessStatus && !!businessStatus.isTopBannerActive && (
        <div 
          style={{ top: isDemoMode ? '40px' : '0' }}
          className={`fixed left-0 right-0 z-[60] py-2.5 px-4 text-center text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-lg border-b border-white/10 ${
          businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 
          businessStatus.mode === 'pre-launch' ? 'bg-red-600' : 
          businessStatus.mode === 'marketing' ? 'bg-purple-600' : 'bg-primary'
        }`}>
          <div className="container mx-auto flex items-center justify-center gap-4">
            <span className="hidden sm:inline opacity-70">///</span>
            <span>{stripAddressForTopBanner(sanitizeShopOnlyText(businessStatus.topBannerText || businessStatus.bannerText, !!businessStatus.shopOnly))}</span>
            <span className="hidden sm:inline opacity-70">///</span>
            <span className="hidden lg:inline text-[9px] lowercase tracking-normal font-medium opacity-80">{stripAddressForTopBanner(sanitizeShopOnlyText(businessStatus.topBannerDescription || businessStatus.bannerDescription, !!businessStatus.shopOnly))}</span>
          </div>
        </div>
      )}
      <nav 
        style={{ top: `${navOffset}px` }}
        className={`fixed left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-all duration-300`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Sidebar Toggle */}
            <div className="flex items-center gap-2">
              {user && (user.role === 'admin' || user.role === 'employee') && (
                <>
                  <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
                    <SidebarIcon className="h-5 w-5" />
                  </Button>
                  {location.pathname !== '/' && (
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2 text-zinc-400 hover:text-white" title="Go Back">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}
              <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2">
                <img src={logo} alt="Prime Auto Detail" className="h-12 w-12 aspect-square object-contain" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {[...navLinks, ...(bookingTestMode && user?.role === 'admin' && !navLinks.some(l => l.to === '/book') ? [{ to: "/book", label: "Booking (Test)" }] : [])].map(link => (
                <Link
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  className={`text-sm font-medium transition-colors hover:text-primary ${isActive(link.to) ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* Checkout link with cart count */}
              <Link to="/checkout" className="relative">
                <Button variant="outline" size="sm" className="flex items-center">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs px-2 py-0.5">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-foreground">
                        Hi, {user.name || user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {(user?.role === 'admin' || user?.role === 'employee') && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/user-settings" className="cursor-pointer w-full">
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>User Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="bg-gradient-hero min-h-[48px]">
                  <Link to="/login" className="w-full cursor-pointer">
                    <UserCog className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
              {user && (user.role === 'admin' || user.role === 'employee') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.dispatchEvent(new Event('open-call-assistant'))}
                  className="bg-primary/10 border-primary/20 text-primary font-black uppercase tracking-tighter hover:bg-primary hover:text-white transition-all animate-pulse-subtle"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Assistant
                </Button>
              )}
              {user && user.role === 'admin' && (
                <div className="ml-2"><NotificationBell /></div>
              )}
            </div>

            {/* Mobile: Always-visible Phone Assistant + Hamburger */}
            <div className="md:hidden flex items-center gap-1">
              {user && (user.role === 'admin' || user.role === 'employee') && (
                <button
                  onClick={() => window.dispatchEvent(new Event('open-call-assistant'))}
                  aria-label="Phone Assistant"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary font-black uppercase text-[10px] tracking-tight hover:bg-primary hover:text-white active:scale-95 transition-all shadow-[0_0_10px_rgba(var(--primary),0.3)] animate-pulse-subtle"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>Assistant</span>
                </button>
              )}
              <button
                className="p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 text-foreground" />
                ) : (
                  <Menu className="h-6 w-6 text-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <div className="flex flex-col gap-4">
                {[...navLinks, ...(bookingTestMode && user?.role === 'admin' && !navLinks.some(l => l.to === '/book') ? [{ to: "/book", label: "Booking (Test)" }] : [])].map(link => (
                  <Link
                    key={`${link.to}-${link.label}`}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-medium transition-colors hover:text-primary px-2 py-1 ${isActive(link.to) ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Checkout in mobile menu */}
                <Link
                  to="/checkout"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium transition-colors hover:text-primary px-2 py-1 ${isActive('/checkout') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                >
                  <span className="inline-flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Checkout {cartCount > 0 ? `(${cartCount})` : ''}
                  </span>
                </Link>

                {user ? (
                  <>
                    <span className="text-sm text-muted-foreground px-2 flex items-center">
                      <User className="h-4 w-4 text-purple-500 mr-1" />
                      Hi, {user.name || user.email}
                    </span>
                    {(user?.role === 'admin' || user?.role === 'employee') && (
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary px-2 py-1 flex items-center"
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    )}
                    {(user.role === 'admin' || user.role === 'employee') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.dispatchEvent(new Event('open-call-assistant'));
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-primary/10 border-primary/20 text-primary font-black uppercase tracking-tighter mb-2"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Phone Assistant
                      </Button>
                    )}
                    {user?.role === 'admin' && (
                      <div className="px-2 mb-2"><NotificationBell /></div>
                    )}
                    <Button onClick={handleLogout} variant="outline" size="sm" className="w-full">
                      Logout
                    </Button>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="default" size="sm" className="w-full bg-gradient-hero min-h-[48px]">
                        <UserCog className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      {/* Dynamic spacer to prevent fixed header/banner from cutting off content */}
      <div 
        style={{ height: `${navOffset + 64}px` }}
        className="w-full transition-all duration-300"
      />
    </>
  );
};
