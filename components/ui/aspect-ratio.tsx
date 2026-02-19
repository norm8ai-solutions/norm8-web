"use client"

import * as React from "react"
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AspectRatioProps
  extends React.ComponentPropsWithoutRef<
    typeof AspectRatioPrimitive.Root
  > {}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(({ className, ...props }, ref) => {
  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      className={cn(className)}
      {...props}
    />
  )
})

AspectRatio.displayName = "AspectRatio"