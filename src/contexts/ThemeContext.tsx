import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "screenshotgun-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }
  return null;
}

function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  return "system";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolvedTheme: "light" | "dark") {
  const root = document.documentElement;
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialTheme = getInitialTheme();
  const initialResolvedTheme = resolveTheme(initialTheme);

  // Apply theme immediately on mount (before first render)
  if (typeof window !== "undefined") {
    applyTheme(initialResolvedTheme);
  }

  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    initialResolvedTheme
  );

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newResolvedTheme);
      applyTheme(newResolvedTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      if (newTheme === "system") {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      }
    } catch {
      // localStorage may not be available, continue anyway
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
