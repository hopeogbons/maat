import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "maat:h-8 maat:w-full maat:min-w-0 maat:rounded-lg maat:border maat:border-input maat:bg-transparent maat:px-2.5 maat:py-1 maat:text-base maat:transition-colors maat:outline-none maat:file:inline-flex maat:file:h-6 maat:file:border-0 maat:file:bg-transparent maat:file:text-sm maat:file:font-medium maat:file:text-foreground maat:placeholder:text-muted-foreground maat:focus-visible:border-ring maat:focus-visible:ring-3 maat:focus-visible:ring-ring/50 maat:disabled:pointer-events-none maat:disabled:cursor-not-allowed maat:disabled:bg-input/50 maat:disabled:opacity-50 maat:aria-invalid:border-destructive maat:aria-invalid:ring-3 maat:aria-invalid:ring-destructive/20 maat:md:text-sm maat:dark:bg-input/30 maat:dark:disabled:bg-input/80 maat:dark:aria-invalid:border-destructive/50 maat:dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
