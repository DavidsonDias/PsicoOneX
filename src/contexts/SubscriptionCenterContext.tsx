import { createContext, useContext, useState, ReactNode } from "react";

interface SubscriptionCenterContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SubscriptionCenterContext = createContext<SubscriptionCenterContextType>({
  open: false,
  setOpen: () => {},
});

export const useSubscriptionCenter = () => useContext(SubscriptionCenterContext);

export function SubscriptionCenterProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SubscriptionCenterContext.Provider value={{ open, setOpen }}>
      {children}
    </SubscriptionCenterContext.Provider>
  );
}
