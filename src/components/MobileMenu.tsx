"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const MobileMenuContext = createContext<{ aberto: boolean; setAberto: (v: boolean) => void }>({
  aberto: false,
  setAberto: () => {},
});

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return <MobileMenuContext.Provider value={{ aberto, setAberto }}>{children}</MobileMenuContext.Provider>;
}
