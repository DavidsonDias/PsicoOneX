import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const getRedirectPath = async (userId: string): Promise<string> => {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return data?.some(r => r.role === "super_admin") ? "/super-admin" : "/dashboard";
};

export function useAuthRedirect() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (pathname === "/reset-password") return;
    if (params.get("type") === "recovery") {
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }
    if (!params.has("access_token")) return;

    let cancelled = false;
    let running = false;
    let attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const canRedirect = () => !cancelled && window.location.pathname !== "/reset-password" &&
      new URLSearchParams(window.location.hash.slice(1)).get("type") !== "recovery";

    const tryRedirect = async () => {
      if (!canRedirect() || running) return;
      running = true;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!canRedirect() || error) return;
        if (session?.user) {
          const path = await getRedirectPath(session.user.id);
          if (!canRedirect()) return;
          cancelled = true;
          navigate(path, { replace: true });
        } else if (++attempts < 20) {
          retry = setTimeout(() => void tryRedirect(), 500);
        }
      } catch {
        // Keep the auth page available for another login attempt.
      } finally {
        running = false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        cancelled = true;
        if (retry) clearTimeout(retry);
        navigate("/reset-password", { replace: true });
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (retry) clearTimeout(retry);
        // Defer SDK calls until its auth callback releases the session lock.
        retry = setTimeout(() => void tryRedirect(), 0);
      }
    });
    void tryRedirect();
    const deadline = setTimeout(() => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      subscription.unsubscribe();
    }, 15000);
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      clearTimeout(deadline);
      subscription.unsubscribe();
    };
  }, [navigate, pathname, hash]);
}
