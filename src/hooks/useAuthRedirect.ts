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

    const handleRedirect = async () => {
      // Let Supabase process the hash tokens first via setSession or internal detection
      // Poll for session since Supabase processes the hash asynchronously
      let attempts = 0;
      const tryRedirect = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Clear the hash AFTER Supabase processed it
          window.history.replaceState(null, "", window.location.pathname);
          const path = await getRedirectPath(session.user.id);
          navigate(path, { replace: true });
          return;
        }
        attempts++;
        if (attempts < 20) {
          setTimeout(tryRedirect, 500);
        }
      };

      // Also listen for auth state change as primary mechanism
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          window.history.replaceState(null, "", window.location.pathname);
          const path = await getRedirectPath(session.user.id);
          navigate(path, { replace: true });
          subscription.unsubscribe();
        }
      });

      // Start polling as backup
      tryRedirect();

      // Cleanup after 15s
      setTimeout(() => subscription.unsubscribe(), 15000);
    };

    handleRedirect();
  }, [navigate]);
}
