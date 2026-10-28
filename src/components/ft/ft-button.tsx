import { cva, type VariantProps } from "class-variance-authority";

/** Server-safe twin of `buttonVariants` (`@/components/ui/button`).
 *
 *  `buttonVariants` lives in a `"use client"` module, so a Server
 *  Component can't call it to style a `<Link>`. This cva has no client
 *  boundary and mirrors the same pill shape, sizes and orange primary
 *  (ui-law §21), so a server-rendered link can still look exactly like
 *  a button. Client code should keep using `buttonVariants`.
 *
 *  Variants: `ember` = the filled orange primary, `ghost` = outline,
 *  `ink` = filled foreground, `ghostDark` = outline on a fixed dark
 *  surface (e.g. the dark share card). */
const ftButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-transparent font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        ember:
          "brand-surface font-semibold text-primary-foreground shadow-glow hover:brightness-110",
        ink: "bg-foreground text-background hover:bg-foreground/90",
        ghost:
          "border-border bg-card text-foreground hover:bg-accent hover:text-foreground",
        ghostDark:
          "border-white/20 bg-transparent text-white hover:bg-white/10",
      },
      size: {
        sm: "h-8 px-3 text-[0.8rem]",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-[0.9375rem]",
      },
    },
    defaultVariants: {
      variant: "ember",
      size: "md",
    },
  },
);

export type FtButtonVariantProps = VariantProps<typeof ftButtonVariants>;

export { ftButtonVariants };
