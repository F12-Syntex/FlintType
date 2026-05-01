import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const ftButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border font-mono uppercase tracking-[0.16em] transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ink: "border-ft-ink bg-ft-ink text-ft-paper hover:bg-ft-ink/90",
        ember: "border-ft-ember bg-ft-ember text-white hover:bg-ft-ember/90",
        ghost: "border-ft-ink bg-transparent text-ft-ink hover:bg-ft-ink hover:text-ft-paper",
        ghostDark: "border-ft-paper bg-transparent text-ft-paper hover:bg-ft-paper hover:text-ft-ink",
      },
      size: {
        sm: "px-3 py-2 text-[10px]",
        md: "px-4 py-2.5 text-[11px]",
        lg: "px-5 py-3.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "ink",
      size: "md",
    },
  },
);

export type FtButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof ftButtonVariants> & {
    asChild?: boolean;
  };

export const FtButton = React.forwardRef<HTMLButtonElement, FtButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(ftButtonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
FtButton.displayName = "FtButton";

export { ftButtonVariants };
