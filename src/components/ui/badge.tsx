import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Perfekt = green
        default:
          "border-transparent bg-green-600 text-white hover:bg-green-600/90",

        // Endnu ikke bedømt = grey
        secondary:
          "border-transparent bg-slate-200 text-slate-900 hover:bg-slate-200/90",

        // Ikke læst = more red
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-600/90",

        // Godt = positive yellow/orange
        outline:
          "border-transparent bg-amber-400 text-amber-950 hover:bg-amber-400/90",

        // Meget godt = light blue
        info:
          "border-transparent bg-sky-200 text-sky-900 hover:bg-sky-200/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
