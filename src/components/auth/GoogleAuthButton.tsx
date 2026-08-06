import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  GOOGLE_CLIENT_ID,
  exchangeGoogleIdToken,
  isLovableHost,
  loadGis,
  signInWithGoogle,
} from "@/lib/google-auth";

interface GoogleAuthButtonProps {
  /** Rota para onde enviar o usuário após o login. */
  redirectPath?: string;
  /** Se true, resolve o destino conforme o papel do usuário (super admin → /super-admin). */
  roleAwareRedirect?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

async function resolveRolePath(userId: string, fallback: string) {
  try {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = data?.map((r) => r.role) || [];
    if (roles.includes("super_admin")) return "/super-admin";
  } catch {
    /* ignore */
  }
  return fallback;
}

export default function GoogleAuthButton({
  redirectPath = "/dashboard",
  roleAwareRedirect = false,
  label = "Continuar com Google",
  disabled,
  className,
}: GoogleAuthButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const gisContainer = useRef<HTMLDivElement>(null);
  const external = !isLovableHost();

  const finish = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const target = session?.user && roleAwareRedirect
      ? await resolveRolePath(session.user.id, redirectPath)
      : redirectPath;
    toast.success("Login realizado com sucesso!");
    navigate(target, { replace: true });
  };

  // Em domínios externos, renderiza o botão oficial do Google (GIS, popup).
  useEffect(() => {
    if (!external) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGis();
        if (cancelled || !gisContainer.current) return;
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          auto_select: false,
          callback: async (response: { credential?: string }) => {
            setLoading(true);
            try {
              if (!response?.credential) throw new Error("Token do Google não recebido");
              await exchangeGoogleIdToken(response.credential);
              await finish();
            } catch (e: any) {
              toast.error(e?.message || "Não foi possível entrar com o Google");
            } finally {
              setLoading(false);
            }
          },
        });
        gisContainer.current.innerHTML = "";
        google.accounts.id.renderButton(gisContainer.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(gisContainer.current.offsetWidth || 360, 400),
        });
        setGisReady(true);
      } catch (e: any) {
        if (!cancelled) {
          setGisReady(false);
          console.error("[GoogleAuthButton] GIS load failed", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);

  const handleFallbackClick = async () => {
    setLoading(true);
    try {
      const { redirected } = await signInWithGoogle();
      if (redirected) return; // navegador está redirecionando
      await finish();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao entrar com Google");
    } finally {
      setLoading(false);
    }
  };

  if (external) {
    return (
      <div className={className}>
        <div ref={gisContainer} className="flex justify-center [&>div]:!w-full" />
        {!gisReady && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3 font-medium"
            onClick={handleFallbackClick}
            disabled={disabled || loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            {label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className ?? "w-full h-11 gap-3 font-medium border-border hover:bg-muted/50"}
      onClick={handleFallbackClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  );
}
