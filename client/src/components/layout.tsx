import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Practice" },
  { href: "/learn", label: "Learn" },
  { href: "/stats", label: "Stats" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            data-testid="nav-logo"
          >
            {/* Small indigo accent dot */}
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Fermi Estimation Simulator
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => {
              const isActive = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-link-${label.toLowerCase()}`}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm transition-all duration-200",
                    isActive
                      ? "font-medium text-indigo-700 bg-indigo-50"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
