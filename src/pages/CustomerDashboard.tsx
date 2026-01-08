import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { MessageSquare, Clock, History, ShoppingCart, FileText, Settings, Key } from "lucide-react";
import { useCartStore } from "@/store/cart";

const CustomerDashboard = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Account" />
      <main className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Welcome, {user?.name || 'Customer'}!</h1>
            <div className="flex gap-2">
              <Link to="/customer-profile" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Profile</Link>
              <Button variant="outline" onClick={() => { try { useCartStore.getState().clear(); logout(); } finally { navigate('/login', { replace: true }); } }}>Logout</Button>
            </div>
          </div>

          <DashboardCard
            title="Contact Support"
            description="Message our team directly."
            icon={MessageSquare}
            to="/contact-support"
            color="text-blue-500"
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <DashboardCard
            title="Active Jobs"
            description="Track your current services."
            icon={Clock}
            to="/active-jobs"
            color="text-amber-500"
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <DashboardCard
            title="Job History"
            description="View past services and details."
            icon={History}
            to="/job-history"
            color="text-green-500"
            gradient="bg-gradient-to-br from-green-500 to-emerald-500"
          />
          <DashboardCard
            title="Payments & Cart"
            description="Pay invoices and manage cart."
            icon={ShoppingCart}
            to="/payments-cart"
            color="text-primary"
            gradient="bg-gradient-to-br from-primary to-purple-600"
          />
          <DashboardCard
            title="My Invoices"
            description="Download and view invoices."
            icon={FileText}
            to="/my-invoices"
            color="text-purple-500"
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <DashboardCard
            title="User Settings"
            description="Update your profile and password."
            icon={Settings}
            to="/user-settings"
            color="text-zinc-500"
            gradient="bg-gradient-to-br from-zinc-500 to-slate-500"
          />
        </div>
      </main>
    </div>
  );
};

const DashboardCard = ({ title, description, icon: Icon, to, color, gradient }: { title: string, description: string, icon: any, to: string, color: string, gradient: string }) => (
  <Link to={to} className="block group">
    <Card className={`p-6 border-border hover:border-primary/50 transition-all cursor-pointer h-full relative overflow-hidden`}>
      <div className={`absolute inset-0 opacity-10 ${gradient} group-hover:opacity-20 transition-opacity`} />
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className={`p-3 rounded-full bg-background/50 border border-border group-hover:scale-110 transition-transform ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Card>
  </Link>
);

export default CustomerDashboard;
