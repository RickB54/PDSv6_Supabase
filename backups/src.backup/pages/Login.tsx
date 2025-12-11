import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSupabaseEnabled, signupSupabase, finalizeSupabaseSession, quickAccessLogin } from "@/lib/auth";
import logo from "@/assets/logo-3inch.png";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { getCookie, setCookie } from "@/lib/cookies";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [qaEnabled, setQaEnabled] = useState<boolean>(false);
  const logoClicksRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const normalize = (v: unknown) => String(v ?? '')
        .trim()
        .replace(/^['"`]\s*/, '')
        .replace(/\s*['"`]$/, '');
      const envMode = normalize(import.meta.env.VITE_AUTH_MODE);
      const envUrl = normalize(import.meta.env.VITE_SUPABASE_URL);
      const envAnon = normalize(import.meta.env.VITE_SUPABASE_ANON_KEY);
      const lsMode = localStorage.getItem('auth_mode');
      console.info(`[Login] env VITE_AUTH_MODE=${envMode || '<missing>'} VITE_SUPABASE_URL=${envUrl || '<missing>'} VITE_SUPABASE_ANON_KEY=${envAnon ? '<present>' : '<missing>'} localStorage auth_mode=${lsMode || '<missing>'} isSupabaseEnabled=${isSupabaseEnabled()}`);
    } catch { }
    // Device-gated Admin Quick Access via cookie
    try {
      setQaEnabled(getCookie('pds_admin_qaccess') === 'yes');
    } catch { }
  }, []);

  // Hidden gesture: click logo 5 times to enable Admin Quick Access for this device
  const onLogoClick = () => {
    logoClicksRef.current += 1;
    window.setTimeout(() => { logoClicksRef.current = 0; }, 2500);
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      const ok = window.confirm('Enable Admin Quick Access on THIS device? It adds a local cookie so only this computer sees the button.');
      if (ok) {
        setCookie('pds_admin_qaccess', 'yes', 365);
        setQaEnabled(true);
        // Immediately grant admin session on this device and route to Admin Dashboard
        try { localStorage.setItem('session_user_id', 'admin-quick-access'); } catch { }
        try { quickAccessLogin('admin'); } catch { }
        navigate('/admin-dashboard', { replace: true });
      }
    }
  };

  const handleAdminQuickAccess = () => {
    try { localStorage.setItem('session_user_id', 'admin-quick-access'); } catch { }
    try { quickAccessLogin('admin'); } catch { }
    navigate('/admin-dashboard', { replace: true });
  };

  // Supabase-only authentication flow

  const isValidEmail = (v: string) => /.+@.+\..+/.test(v.trim());

  const classifyLoginFailure = (emailAddr: string): 'invalid_email' | 'incorrect_password' | 'unknown' => {
    if (!isValidEmail(emailAddr)) return 'invalid_email';
    return 'incorrect_password';
  };

  const handleSupabaseLogin = async () => {
    console.log('1. Sign in button clicked');
    if (!email || !password) {
      console.warn('[Login] Missing email or password');
      toast({ title: 'Missing credentials', description: 'Please enter email and password.', variant: 'destructive' });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: 'Invalid user id / email', description: 'Please check your email address and try again.', variant: 'destructive' });
      return;
    }
    setLoadingSignIn(true);
    try {
      const emailTrimmed = email.trim().toLowerCase();
      console.log('2. Form submitted with email:', emailTrimmed);
      console.log('3. Calling Supabase auth...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      console.log('4. Supabase response:', data, error);
      // Extra auth logging for diagnostics
      console.log('🔐 AUTH:', !error && !!data?.user);
      console.log('  User ID:', data?.user?.id);
      console.log('  Role:', (data?.user?.user_metadata as any)?.role);
      console.log('  Error:', error);
      if (error) {
        console.error('Supabase auth error:', error);
        const failure = await classifyLoginFailure(emailTrimmed);
        if (failure === 'invalid_email') {
          toast({ title: 'Invalid user id / email', description: 'Please check your email address and try again.', variant: 'destructive' });
        } else if (failure === 'incorrect_password') {
          toast({ title: 'Incorrect Password', description: 'The email or password is incorrect.', variant: 'destructive' });
        } else {
          toast({ title: 'Sign in failed', description: error.message || 'Please try again.', variant: 'destructive' });
        }
        // Ensure we exit loading state even on error
        setLoadingSignIn(false);
        return;
      }
      // Persist minimal user for routing and exit loading immediately (avoid stalls)
      try { localStorage.setItem('user', JSON.stringify(data.user)); } catch { }
      setLoadingSignIn(false);

      // Navigate immediately using metadata role; do not block on DB reads
      const metaRole = ((data.user?.user_metadata as any)?.role as any) || 'customer';
      const inferredRole = (metaRole === 'admin' || metaRole === 'employee' || metaRole === 'customer') ? metaRole : 'customer';
      const routeFromMeta = inferredRole === 'admin'
        ? '/admin-dashboard'
        : inferredRole === 'employee'
          ? '/employee-dashboard'
          : '/customer-dashboard';
      console.log('[Login] Navigating immediately with role:', inferredRole);
      navigate(routeFromMeta, { replace: true });

      // Finalize session in the background (do not block UI)
      try { finalizeSupabaseSession(); } catch { }

      // Background role lookup; if differs from metadata, adjust route
      (async () => {
        try {
          const { data: appUser, error: appErr } = await supabase
            .from('app_users')
            .select('role')
            .eq('id', data.user!.id)
            .maybeSingle();
          if (!appErr && appUser?.role && ['admin', 'employee', 'customer'].includes(appUser.role)) {
            const dbRole = appUser.role as 'admin' | 'employee' | 'customer';
            if (dbRole !== inferredRole) {
              const route = dbRole === 'admin'
                ? '/admin-dashboard'
                : dbRole === 'employee'
                  ? '/employee-dashboard'
                  : '/customer-dashboard';
              console.log('7. Adjusting route based on DB role:', route);
              navigate(route, { replace: true });
            }
          } else {
            console.warn('[Login] Role lookup failed or no role; keeping metadata route');
          }
        } catch (lookupErr) {
          console.warn('[Login] Background role lookup error:', lookupErr);
        }
      })();
    } catch (err: any) {
      console.error('Sign in error:', err);
      toast({ title: 'Sign in failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      console.log('5. (finally) ensure loading=false');
      setLoadingSignIn(false);
    }
  };

  const handleSupabaseSignup = async () => {
    console.info('[Login] Sign Up clicked');
    if (!email || !password) {
      console.warn('[Login] Missing email or password');
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: 'Invalid user id / email', description: 'Please check your email address and try again.', variant: 'destructive' });
      return;
    }
    setLoadingSignup(true);
    try {
      // Guard against stalls during sign up as well
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
      const created = await Promise.race([
        signupSupabase(email.trim().toLowerCase(), password),
        timeout,
      ]);
      // Attempt to finalize from any existing session
      const mapped = await finalizeSupabaseSession();
      setLoadingSignup(false);
      if (mapped || created) {
        navigate('/customer-dashboard', { replace: true });
      } else {
        toast({ title: 'Check your email', description: 'Please verify your email to activate your account before signing in.', variant: 'default' });
      }
    } catch (e) {
      setLoadingSignup(false);
      console.error('[Login] Sign Up failed');
      // Heuristic messaging: existing account or invalid email
      toast({ title: 'Signup failed', description: 'This account may already exist or the password is invalid.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img src={logo} alt="Prime Detail Solutions" className="w-48 mx-auto" onClick={onLogoClick} />
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground">Precision, Protection, Perfection</p>
          <div className="mt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Back to Website</Link>
            </Button>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
            <p className="text-sm text-muted-foreground">Use your email and password to sign in or create an account.</p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 bg-background"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 bg-background pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={handleSupabaseLogin} variant="default" type="button" disabled={loadingSignIn || loadingSignup}>
                {loadingSignIn ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button onClick={handleSupabaseSignup} variant="outline" type="button" disabled={loadingSignIn || loadingSignup}>
                {loadingSignup ? 'Creating...' : 'Sign Up'}
              </Button>
            </div>
            {/* Admin Quick Access button intentionally hidden; 5× logo now logs in instantly */}
            {!isSupabaseEnabled() && (
              <p className="text-xs text-red-500">
                Supabase is not enabled. Ensure `VITE_AUTH_MODE="supabase"` and valid `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set, then restart dev server.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
