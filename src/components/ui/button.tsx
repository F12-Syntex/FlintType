"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { useState, type ReactNode } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

const buttonVariantsBase = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-pill border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The one spark: the filled primary, flat (no shadow; ui-law
        // §21). Hover deepens the fill on every element type, not only
        // links.
        default:
          "brand-surface font-semibold text-primary-foreground hover:brightness-110",
        outline:
          "border-border bg-card hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        // Primary CTA size — clears the 44px touch floor (ui-law §7).
        lg: "h-11 gap-2 px-6 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Button classes for any element (a `<Link>` styled as a button, a
 *  trigger). Runs through `cn()` so a caller's `className` replaces a
 *  conflicting variant class (`h-11` over the size's `h-9`) instead of
 *  both landing in the class list, the same as `<Button>` does. */
function buttonVariants(
  props?: Parameters<typeof buttonVariantsBase>[0]
): string {
  return cn(buttonVariantsBase(props))
}

/** Optional confirmation gate. When passed, clicking the button opens a
 *  ConfirmDialog instead of firing onClick directly; onClick runs only
 *  after the user confirms. Cancel does nothing. Use for destructive or
 *  irreversible actions ("Reset all", "Delete account", "Sign out") so
 *  every callsite gets a consistent are-you-sure flow without bespoke
 *  state. */
type ConfirmConfig = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: "default" | "destructive"
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariantsBase> & { confirm?: ConfirmConfig }

function Button({
  className,
  variant = "default",
  size = "default",
  confirm,
  onClick,
  ...props
}: ButtonProps) {
  const [open, setOpen] = useState(false)

  if (!confirm) {
    return (
      <ButtonPrimitive
        data-slot="button"
        className={buttonVariants({ variant, size, className })}
        onClick={onClick}
        {...props}
      />
    )
  }

  return (
    <>
      <ButtonPrimitive
        data-slot="button"
        className={buttonVariants({ variant, size, className })}
        onClick={(e) => {
          // Swallow the original click; defer the real action until the
          // user confirms in the dialog below.
          e.preventDefault()
          setOpen(true)
        }}
        {...props}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirm.title}
        confirmLabel={confirm.confirmLabel}
        cancelLabel={confirm.cancelLabel}
        confirmVariant={confirm.confirmVariant ?? "default"}
        onConfirm={() => {
          // The original click event is long gone; most action handlers
          // don't read it. Cast to keep the public type identical to the
          // no-confirm path.
          ;(onClick as ((e?: unknown) => void) | undefined)?.()
        }}
      >
        {confirm.description ?? null}
      </ConfirmDialog>
    </>
  )
}

export { Button, buttonVariants }
export type { ConfirmConfig }
