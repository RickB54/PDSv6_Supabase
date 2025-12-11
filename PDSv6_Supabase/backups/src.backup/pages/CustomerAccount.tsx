import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const CustomerAccount = () => {
  const user = getCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      navigate('/');
      return;
    }
    setEmail(user.email);
  }, [user, navigate]);

  const handleSave = () => {
    if (password && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (user) {
      const updatedUser = {
        ...user,
        email: email
      };
      setCurrentUser(updatedUser);
      
      toast({
        title: "Success",
        description: "Account updated successfully"
      });
      
      // Clear password fields
      setPassword("");
      setConfirmPassword("");
    }
  };

  if (!user || user.role !== 'customer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Account" />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6 bg-gradient-card border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Account Settings</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email (Username)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-2"
              />
            </div>

            <Button 
              onClick={handleSave}
              className="w-full mt-6 bg-gradient-hero"
            >
              Save Changes
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default CustomerAccount;
