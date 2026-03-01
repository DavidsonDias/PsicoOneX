import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const getRedirectPath = async (userId: string): Promise<string> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = data?.map(r => r.role) || [];
  return roles.includes("super_admin") ? "/super-admin" : "/dashboard";
};

export function useAuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    // Clear the hash immediately
    window.history.replaceState(null, "", window.location.pathname);

    const handleRedirect = async () => {
      // Try to get session directly (token may already be processed)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const path = await getRedirectPath(session.user.id);
        navigate(path, { replace: true });
        return;
      }

      // Fallback: listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const path = await getRedirectPath(session.user.id);
          navigate(path, { replace: true });
          subscription.unsubscribe();
        }
      });

      // Cleanup after 10s timeout
      setTimeout(() => subscription.unsubscribe(), 10000);
    };

    handleRedirect();
  }, [navigate]);
}
