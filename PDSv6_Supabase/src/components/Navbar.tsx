import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, UserCog, User, ShoppingCart } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import logo from "@/assets/logo-3inch.png";
import NotificationBell from "@/components/NotificationBell";
import { useCartStore } from "@/store/cart";
import {
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

let clickTimer: number | null = null;
let clickCount = 0;

function handleAdminUnlock() {
  clickCount++;
  if (clickTimer) window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => {
    if (clickCount >= 5) {
      localStorage.setItem('adminMode', 'true');
      window.location.href = '/dashboard';
    }
    clickCount = 0;
  }, 600);
}

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const cartCount = useCartStore((s) => s.count());

  useEffect(() => {
    const update = () => setUser(getCurrentUser());
    window.addEventListener('auth-changed', update as EventListener);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('auth-changed', update as EventListener);
      window.removeEventListener('storage', update);
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const navLinks = [
    { to: "/about", label: "About" },
    { to: "/", label: "Services" },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
    { to: "/book", label: "Book Now" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // 5-tap admin unlock logic
  const handleLogoClick = (e: React.MouseEvent) => {
    // We allow default navigation to /, but we also count clicks
    // If we want to prevent navigation on the 5th click, we could, but redirecting to dashboard handles it.

    // Use module-level variables or refs? 
    // Since this is a functional component, let's use a ref or just static variables outside if we want persistence across re-renders (though Navbar shouldn't unmount often).
    // The user provided snippet used module level lets. I'll put them outside or use refs.
    // Let's use the user's snippet logic but adapted for the component.
    handleAdminUnlock();
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2">
            <img src={logo} alt="Prime Detail Solutions" className="w-10 h-10" />
            <span className="font-bold text-foreground hidden sm:inline">Prime Detail Solutions</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
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
                <ShoppingCart className="h-4 w-4 mr-2" />
                Checkout
              </Button>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs px-2 py-0.5">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <>
                <span className="text-sm text-muted-foreground flex items-center">
                  <User className="h-4 w-4 text-purple-500 mr-1" />
                  {user.role === 'admin' ? 'Hi, admin' : user.role === 'employee' ? 'Hi, employee' : `Hi, ${user.email}`}
                </span>
                {user.role === 'admin' && (
                  <div className="ml-2"><NotificationBell /></div>
                )}
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild variant="default" size="sm" className="bg-gradient-hero min-h-[48px]">
                <Link to="/login" className="w-full cursor-pointer">
                  <UserCog className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map(link => (
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
                    {user.role === 'admin' ? 'Hi, admin' : user.role === 'employee' ? 'Hi, employee' : `Hi, ${user.email}`}
                  </span>
                  {user.role === 'admin' && (
                    <div className="px-2"><NotificationBell /></div>
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
  );
};
