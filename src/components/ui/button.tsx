"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { useState, type ReactNode } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

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
  VariantProps<typeof buttonVariants> & { confirm?: ConfirmConfig }

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
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={onClick}
        {...props}
      />
    )
  }

  return (
    <>
      <ButtonPrimitive
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
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
