import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "maat:group/badge maat:inline-flex maat:h-5 maat:w-fit maat:shrink-0 maat:items-center maat:justify-center maat:gap-1 maat:overflow-hidden maat:rounded-4xl maat:border maat:border-transparent maat:px-2 maat:py-0.5 maat:text-xs maat:font-medium maat:whitespace-nowrap maat:transition-all maat:focus-visible:border-ring maat:focus-visible:ring-[3px] maat:focus-visible:ring-ring/50 maat:has-data-[icon=inline-end]:pr-1.5 maat:has-data-[icon=inline-start]:pl-1.5 maat:aria-invalid:border-destructive maat:aria-invalid:ring-destructive/20 maat:dark:aria-invalid:ring-destructive/40 maat:[&>svg]:pointer-events-none maat:[&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "maat:bg-primary maat:text-primary-foreground maat:[a]:hover:bg-primary/80",
        secondary:
          "maat:bg-secondary maat:text-secondary-foreground maat:[a]:hover:bg-secondary/80",
        destructive:
          "maat:bg-destructive/10 maat:text-destructive maat:focus-visible:ring-destructive/20 maat:dark:bg-destructive/20 maat:dark:focus-visible:ring-destructive/40 maat:[a]:hover:bg-destructive/20",
        outline:
          "maat:border-border maat:text-foreground maat:[a]:hover:bg-muted maat:[a]:hover:text-muted-foreground",
        ghost:
          "maat:hover:bg-muted maat:hover:text-muted-foreground maat:dark:hover:bg-muted/50",
        link: "maat:text-primary maat:underline-offset-4 maat:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
