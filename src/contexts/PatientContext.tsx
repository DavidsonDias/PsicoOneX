import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PatientContextData {
  id: string;
  full_name: string;
  default_session_value?: number | null;
  payment_day?: number | null;
}

interface PatientContextType {
  activePatient: PatientContextData | null;
  setActivePatient: (patient: PatientContextData | null) => void;
  clearPatient: () => void;
}

const PatientContext = createContext<PatientContextType>({
  activePatient: null,
  setActivePatient: () => {},
  clearPatient: () => {},
});

export function PatientProvider({ children }: { children: ReactNode }) {
  const [activePatient, setActivePatient] = useState<PatientContextData | null>(null);
  const clearPatient = useCallback(() => setActivePatient(null), []);

  return (
    <PatientContext.Provider value={{ activePatient, setActivePatient, clearPatient }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatientContext = () => useContext(PatientContext);
