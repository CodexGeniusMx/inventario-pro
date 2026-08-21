"use client"

import { Switch as SwitchPrimitive, type SwitchProps } from "react-aria-components"

import { cn } from "@/lib/utils"

type AppSwitchProps = Omit<SwitchProps, "children"> & {
  label?: React.ReactNode
  description?: React.ReactNode
}

export function Switch({
  className,
  label,
  description,
  ...props
}: AppSwitchProps) {
  return (
    <SwitchPrimitive
      className={cn(
        "group inline-flex items-center gap-3 text-sm outline-none",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent bg-input transition-colors",
          "group-data-selected:bg-primary group-data-focus-visible:ring-2 group-data-focus-visible:ring-ring group-data-focus-visible:ring-offset-2 group-data-focus-visible:ring-offset-background",
          "group-data-disabled:cursor-not-allowed group-data-disabled:opacity-50"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform",
            "group-data-selected:translate-x-[1.35rem]"
          )}
        />
      </span>
      {label || description ? (
        <span className="flex-1">
          {label ? <span className="block font-medium">{label}</span> : null}
          {description ? (
            <span className="block text-muted-foreground">{description}</span>
          ) : null}
        </span>
      ) : null}
    </SwitchPrimitive>
  )
}
