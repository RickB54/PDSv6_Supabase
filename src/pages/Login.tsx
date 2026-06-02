
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSupabase } from "@/lib/auth";
import { toast } from "sonner";

import { Eye, EyeOff, ArrowLeft, ShieldAlert, Rocket } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const demoDisabled = searchParams.get('demo_disabled') === 'true';
    const disabledReason = searchParams.get('reason');

    useEffect(() => {
        if (demoDisabled) {
            toast.error("Demo Mode Offline", {
                description: `Access suspended. Reason: ${disabledReason || 'System Maintenance'}.`,
                duration: 6000,
            });
        }
        
        // Auto-fill Test Customer credentials for Admin
        const wasJustAdmin = localStorage.getItem('wasJustAdmin') === 'true';

        if (wasJustAdmin) {
            setEmail("rberube54+test@gmail.com");
            setPassword("test1234");
            
            // Clear the flag so it only auto-fills once after logout
            localStorage.removeItem('wasJustAdmin');
        }
    }, [demoDisabled, disabledReason]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await loginSupabase(email, password);
            if (user) {
                toast.success(`Welcome back, ${user.name}`);
                // Small delay to allow auth-changed event to propagate to App.tsx
                await new Promise(resolve => setTimeout(resolve, 100));
                // Role based redirect
                if (user.role === 'admin') navigate("/dashboard/admin");
                else if (user.role === 'employee') navigate("/dashboard/employee");
                else navigate("/customer-dashboard");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 relative flex flex-col items-center justify-center">
            <div className="absolute top-8 left-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-zinc-200 text-zinc-600 hover:text-black font-bold uppercase tracking-widest text-[10px]">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                </Button>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                    {demoDisabled && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-in slide-in-from-top-2">
                            <h4 className="text-red-500 font-bold text-sm flex items-center gap-2 mb-1">
                                <ShieldAlert className="w-4 h-4" />
                                Demo Mode Offline
                            </h4>
                            <p className="text-red-400/80 text-[11px] leading-relaxed mb-3">
                                Access to the public simulation has been suspended. 
                                <br />Reason: <span className="text-red-400 font-black uppercase tracking-tight">{disabledReason || 'System Maintenance'}</span>
                            </p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                className="w-full bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-white text-[10px] uppercase font-black tracking-widest gap-2"
                                onClick={() => navigate('/demo')}
                            >
                                <Rocket className="w-3 h-3 text-red-500" />
                                Retry Connection
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                        <div className="text-center text-sm">
                            Don't have an account?{" "}
                            <Link to="/signup" className="text-blue-600 hover:underline">
                                Sign up
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
