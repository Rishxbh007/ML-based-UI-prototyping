import { Link, useLocation } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { Button } from "./ui/Button";
import { cn } from "@/lib/cn";

/** Top navigation for internal (app) pages — minimal, almost invisible, white. */
export function TopNav() {
  const { pathname } = useLocation();
  const links = [
    { to: "/dashboard", label: "Projects" },
    { to: "/create", label: "Generate" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Wordmark size="sm" />
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                aria-current={pathname === l.to ? "page" : undefined}
                className={cn(
                  "relative text-sm transition-colors",
                  pathname === l.to ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {l.label}
                {pathname === l.to && <span className="absolute -bottom-[21px] left-0 h-px w-full bg-ink" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hidden text-sm text-ink-muted transition-colors hover:text-ink sm:block">
            Home
          </Link>
          <Link to="/create">
            <Button size="sm">New prototype</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
