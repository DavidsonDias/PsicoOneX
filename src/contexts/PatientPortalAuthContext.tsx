import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface PatientPortalProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  psychologist_id: string;
  psychologist_name?: string;
}

interface PatientPortalAuthCtx {
  user: User | null;
  patient: PatientPortalProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PatientPortalAuthCtx>({
  user: null,
  patient: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function PatientPortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<PatientPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPatient = async (uid: string) => {
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, psychologist_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (error || !data) {
      setPatient(null);
      return;
    }
    // Get psychologist name
    const { data: psy } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.psychologist_id)
      .maybeSingle();
    setPatient({ ...data, psychologist_name: psy?.full_name });
  };

  useEffect(() => {
    // Set up listener BEFORE getSession (Supabase best practice)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadPatient(session.user.id), 0);
      } else {
        setPatient(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadPatient(session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPatient(null);
  };

  const refresh = async () => {
    if (user) await loadPatient(user.id);
  };

  return (
    <Ctx.Provider value={{ user, patient, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePatientPortalAuth = () => useContext(Ctx);
