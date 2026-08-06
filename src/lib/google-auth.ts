import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/** Client ID público do Google Cloud (projeto PsicoOne). */
export const GOOGLE_CLIENT_ID =
  "11820044570-ecg0q3adde3ui9h5a01ijc312lgjmvsd.apps.googleusercontent.com";

const LOVABLE_HOSTS = [".lovable.app", ".lovable.dev", "localhost", "127.0.0.1"];

/** Detecta se estamos em um domínio da Lovable (preview/publicação) ou local. */
export function isLovableHost(host: string = window.location.hostname): boolean {
  return LOVABLE_HOSTS.some((h) =>
    h.startsWith(".") ? host === h.slice(1) || host.endsWith(h) : host === h,
  );
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Carrega a biblioteca Google Identity Services uma única vez. */
export function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.google?.accounts?.id) return Promise.resolve();
  if (w.__gisPromise) return w.__gisPromise as Promise<void>;

  w.__gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Google Identity Services")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Google Identity Services"));
    document.head.appendChild(script);
  });

  return w.__gisPromise as Promise<void>;
}

/** Troca um ID token do Google por sessão no Supabase (fluxo popup, domínio atual). */
export async function exchangeGoogleIdToken(token: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
  if (error) throw error;
  return data;
}

/**
 * Fluxo GIS em popup: nunca redireciona para fora do domínio atual.
 * Resolve quando a sessão já foi criada no Supabase.
 */
export function signInWithGoogleGisPopup(): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    try {
      await loadGis();
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) throw new Error("Google Identity Services indisponível");

      const client = google.accounts.oauth2.initCodeClient
        ? null
        : null;
      void client;

      // Popup implícito com id_token (fluxo sem redirect).
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        auto_select: false,
        callback: async (response: { credential?: string }) => {
          try {
            if (!response?.credential) throw new Error("Token do Google não recebido");
            await exchangeGoogleIdToken(response.credential);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          reject(
            new Error(
              "O Google bloqueou o pop-up de login. Use o botão oficial do Google exibido na tela.",
            ),
          );
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Escolhe o fluxo correto conforme o domínio:
 * - Lovable/localhost: broker gerenciado da Lovable (redirect).
 * - Externo (Vercel/domínio próprio): GIS em popup no domínio atual.
 */
export async function signInWithGoogle(): Promise<{ redirected: boolean }> {
  if (isLovableHost()) {
    const result: any = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) throw result.error;
    return { redirected: Boolean(result?.redirected) };
  }

  await signInWithGoogleGisPopup();
  return { redirected: false };
}
