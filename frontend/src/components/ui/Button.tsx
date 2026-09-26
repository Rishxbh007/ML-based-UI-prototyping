import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// Precise, compact, editorial. A confident hover, a small press. No glow.
const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 ease-out-expo select-none whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none active:translate-y-px";

const variants: Record<Variant, string> = {
  // The default action — a confident near-black.
  primary: "bg-ink text-white hover:bg-black",
  // The single most important action on a view earns the accent.
  accent: "bg-morph-500 text-white hover:bg-morph-600",
  // Quiet, hairline-bounded.
  secondary: "bg-white text-ink border border-line-strong hover:border-ink/40",
  ghost: "text-ink-soft hover:text-ink hover:bg-ink/[0.04]",
  outline: "border border-line-strong text-ink hover:border-ink/40 hover:bg-ink/[0.02]",
  danger: "bg-danger text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
