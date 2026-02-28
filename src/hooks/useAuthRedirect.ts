import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  useEffect(() => {
    // Only handle OAuth redirects (hash contains access_token)
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Clear the hash fragment
        window.history.replaceState(null, "", window.location.pathname);
        const path = await getRedirectPath(session.user.id);
        navigate(path, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);
}
