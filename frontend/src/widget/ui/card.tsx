import * as React from "react"
import { cn } from "cn"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "maat:group/card maat:flex maat:flex-col maat:gap-(--card-spacing) maat:overflow-hidden maat:rounded-xl maat:bg-card maat:py-(--card-spacing) maat:text-sm maat:text-card-foreground maat:ring-1 maat:ring-foreground/10 maat:[--card-spacing:--spacing(4)] maat:has-data-[slot=card-footer]:pb-0 maat:has-[>img:first-child]:pt-0 maat:data-[size=sm]:[--card-spacing:--spacing(3)] maat:data-[size=sm]:has-data-[slot=card-footer]:pb-0 maat:*:[img:first-child]:rounded-t-xl maat:*:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "maat:group/card-header maat:@container/card-header maat:grid maat:auto-rows-min maat:items-start maat:gap-1 maat:rounded-t-xl maat:px-(--card-spacing) maat:has-data-[slot=card-action]:grid-cols-[1fr_auto] maat:has-data-[slot=card-description]:grid-rows-[auto_auto] maat:[.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "maat:font-heading maat:text-base maat:leading-snug maat:font-medium maat:group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("maat:text-sm maat:text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "maat:col-start-2 maat:row-span-2 maat:row-start-1 maat:self-start maat:justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("maat:px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "maat:flex maat:items-center maat:rounded-b-xl maat:border-t maat:bg-muted/50 maat:p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
