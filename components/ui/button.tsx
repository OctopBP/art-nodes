import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
      variant === "outline"
        ? "border border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5"
        : "border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/60 hover:bg-black/5 dark:hover:bg-white/10";
    return <button ref={ref} className={cn(base, styles, className)} {...props} />;
  }
);

Button.displayName = "Button";

