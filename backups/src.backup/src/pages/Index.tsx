import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import CustomerPortal from "./CustomerPortal";

const Index = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();

  // Note: No auto-redirect from the public homepage. Authenticated users may stay here.
  // This preserves access to the public site and avoids unwanted redirects.
  
  // Show public homepage (CustomerPortal) for everyone; staff can navigate via "Staff Login".
  // (Role dashboards are reached after explicit login.)

  // Show public homepage (CustomerPortal) for non-authenticated users
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Single sign-in entry lives in Navbar; homepage card removed */}
      <CustomerPortal />
    </div>
  );
};

export default Index;
