// Single white theme. No dark mode toggle.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  return { theme: "light" as const, toggleTheme: () => {} };
}
