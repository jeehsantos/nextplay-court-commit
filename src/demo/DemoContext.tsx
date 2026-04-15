import { createContext, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface DemoContextType {
  isDemoMode: true;
  demoRole: "player" | "manager";
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoContext must be used inside a DemoProvider");
  return ctx;
}

export function DemoProvider({ role, children }: { role: "player" | "manager"; children: ReactNode }) {
  const navigate = useNavigate();
  const exitDemo = () => navigate("/");

  return (
    <DemoContext.Provider value={{ isDemoMode: true, demoRole: role, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
