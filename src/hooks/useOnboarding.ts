import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>("email");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const user = session.user;

      // Detect auth provider from user metadata
      const provider = user.app_metadata?.provider || "email";
      setAuthProvider(provider);

      // Update auth_provider in profiles if needed
      await supabase.from("profiles").update({ 
        auth_provider: provider 
      } as any).eq("id", user.id);

      // Check if onboarding completed
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const onboardingCompleted = (profile as any)?.onboarding_completed ?? false;

      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }

      // Check Google Calendar connection
      const { data: gcToken } = await supabase
        .from("google_calendar_tokens")
        .select("id, sync_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      setGoogleCalendarConnected(!!gcToken && gcToken.sync_enabled !== false);
    } catch (err) {
      console.error("Error checking onboarding:", err);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ 
        onboarding_completed: true 
      } as any).eq("id", user.id);
      setShowOnboarding(false);
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
  };

  const resetOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ 
        onboarding_completed: false 
      } as any).eq("id", user.id);
      setShowOnboarding(true);
    } catch (err) {
      console.error("Error resetting onboarding:", err);
    }
  };

  return {
    showOnboarding,
    setShowOnboarding,
    authProvider,
    googleCalendarConnected,
    loading,
    completeOnboarding,
    resetOnboarding,
  };
}
