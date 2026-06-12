"use client";

import { createContext, useContext, useEffect, useState } from "react";

// 1. Create context
const DarkModeContext = createContext();

// 2. Provider component
export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  // Sync with document class
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <DarkModeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// 3. Hook to use context easily
export function useDarkMode() {
  return useContext(DarkModeContext);
}
