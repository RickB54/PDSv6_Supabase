
import { useState, useEffect } from "react";
import { getCurrentUser, User, finalizeSupabaseSession } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Lock, Save, Loader2, LayoutDashboard } from "lucide-react";

export default function UserSettings() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [loading, setLoading] = useState(false);

    // Profile State
    const [name, setName] = useState(user?.name || "");

    // Password State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        // Refresh user from local storage on mount
        const u = getCurrentUser();
        if (u) {
            setUser(u);
            setName(u.name);
        }
    }, []);

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            if (!name.trim()) throw new Error("Name cannot be empty");

            // Update Supabase Auth Metadata
            const { data, error } = await supabase.auth.updateUser({
                data: { full_name: name }
            });

            if (error) throw error;

            // Update app_users table (if we are syncing explicitly, finalizeSupabaseSession does this too)
            if (data.user) {
                await finalizeSupabaseSession(data.user);
            }

            toast({ title: "Profile Updated", description: "Your name has been updated." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setLoading(true);
        try {
            if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
            if (newPassword !== confirmPassword) throw new Error("Passwords do not match");

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast({ title: "Password Updated", description: "Your password has been changed successfully." });
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-8">Please log in to view settings.</div>;

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="User Settings" />

            <main className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
                <Card className="p-6 bg-gradient-card border-border">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <UserCog className="h-8 w-8 text-primary" />
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
                                <p className="text-muted-foreground text-sm">Manage your account credentials</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                            onClick={() => {
                                if (!user) return;
                                const r = (user.role || '').trim().toLowerCase();
                                if (r === 'admin' || r === 'owner') navigate("/dashboard/admin");
                                else if (r === 'employee') navigate("/employee-dashboard");
                                else navigate("/customer-dashboard");
                            }}
                        >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            My Dashboard
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-primary"
                            onClick={() => navigate("/employee-dashboard")}
                        >
                            Employee Access
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* User Info Read-Only */}
                        <div className="grid gap-2">
                            <Label>Email Address</Label>
                            <Input value={user.email} disabled className="bg-muted text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">To change your email, please contact support.</p>
                        </div>

                        <Separator />

                        {/* update Name */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your Name"
                                />
                            </div>
                            <Button onClick={handleUpdateProfile} disabled={loading} variant="secondary">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Update Profile
                            </Button>
                        </div>

                        <Separator />

                        {/* Update Password */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Lock className="h-4 w-4" /> Change Password
                            </h3>

                            <div className="grid gap-4">
                                <div>
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        type="password"
                                        id="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <Input
                                        type="password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                    />
                                </div>
                            </div>

                            <Button onClick={handleChangePassword} disabled={loading || !newPassword} variant="default">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Change Password
                            </Button>
                        </div>

                    </div>
                </Card>
            </main>
        </div>
    );
}
