import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";

const Portal = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const user = getCurrentUser();

  useEffect(() => {
    // Magic link is not supported in this build; require real auth
    if (user?.role === "customer") {
      navigate("/customer-portal", { replace: true });
      return;
    }
    navigate("/login", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading customer portal…</p>
    </div>
  );
};

export default Portal;
