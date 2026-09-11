import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "maat:group/button maat:inline-flex maat:shrink-0 maat:items-center maat:justify-center maat:rounded-lg maat:border maat:border-transparent maat:bg-clip-padding maat:text-sm maat:font-medium maat:whitespace-nowrap maat:transition-all maat:outline-none maat:select-none maat:focus-visible:border-ring maat:focus-visible:ring-3 maat:focus-visible:ring-ring/50 maat:active:not-aria-[haspopup]:translate-y-px maat:disabled:pointer-events-none maat:disabled:opacity-50 maat:aria-invalid:border-destructive maat:aria-invalid:ring-3 maat:aria-invalid:ring-destructive/20 maat:dark:aria-invalid:border-destructive/50 maat:dark:aria-invalid:ring-destructive/40 maat:[&_svg]:pointer-events-none maat:[&_svg]:shrink-0 maat:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: "maat:bg-primary maat:text-primary-foreground maat:hover:bg-primary/80",
        outline:
          "maat:border-border maat:bg-background maat:hover:bg-muted maat:hover:text-foreground maat:aria-expanded:bg-muted maat:aria-expanded:text-foreground maat:dark:border-input maat:dark:bg-input/30 maat:dark:hover:bg-input/50",
        secondary:
          "maat:bg-secondary maat:text-secondary-foreground maat:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] maat:aria-expanded:bg-secondary maat:aria-expanded:text-secondary-foreground",
        ghost:
          "maat:hover:bg-muted maat:hover:text-foreground maat:aria-expanded:bg-muted maat:aria-expanded:text-foreground maat:dark:hover:bg-muted/50",
        destructive:
          "maat:bg-destructive/10 maat:text-destructive maat:hover:bg-destructive/20 maat:focus-visible:border-destructive/40 maat:focus-visible:ring-destructive/20 maat:dark:bg-destructive/20 maat:dark:hover:bg-destructive/30 maat:dark:focus-visible:ring-destructive/40",
        link: "maat:text-primary maat:underline-offset-4 maat:hover:underline",
      },
      size: {
        default:
          "maat:h-8 maat:gap-1.5 maat:px-2.5 maat:has-data-[icon=inline-end]:pr-2 maat:has-data-[icon=inline-start]:pl-2",
        xs: "maat:h-6 maat:gap-1 maat:rounded-[min(var(--radius-md),10px)] maat:px-2 maat:text-xs maat:in-data-[slot=button-group]:rounded-lg maat:has-data-[icon=inline-end]:pr-1.5 maat:has-data-[icon=inline-start]:pl-1.5 maat:[&_svg:not([class*=size-])]:size-3",
        sm: "maat:h-7 maat:gap-1 maat:rounded-[min(var(--radius-md),12px)] maat:px-2.5 maat:text-[0.8rem] maat:in-data-[slot=button-group]:rounded-lg maat:has-data-[icon=inline-end]:pr-1.5 maat:has-data-[icon=inline-start]:pl-1.5 maat:[&_svg:not([class*=size-])]:size-3.5",
        lg: "maat:h-9 maat:gap-1.5 maat:px-2.5 maat:has-data-[icon=inline-end]:pr-2 maat:has-data-[icon=inline-start]:pl-2",
        icon: "maat:size-8",
        "icon-xs":
          "maat:size-6 maat:rounded-[min(var(--radius-md),10px)] maat:in-data-[slot=button-group]:rounded-lg maat:[&_svg:not([class*=size-])]:size-3",
        "icon-sm":
          "maat:size-7 maat:rounded-[min(var(--radius-md),12px)] maat:in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "maat:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
