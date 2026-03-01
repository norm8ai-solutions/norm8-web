"use client"

import * as React from "react"
import * as Recharts from "recharts"
import type { TooltipProps, LegendProps } from "recharts"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type ChartItemConfig = {
  label?: string
  color?: string
  icon?: React.ComponentType<any>
}

export type ChartConfig = Record<string, ChartItemConfig>

type ChartContextType = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextType | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used inside <ChartContainer />")
  }
  return context
}

/* -------------------------------------------------------------------------- */
/*                               CHART CONTAINER                              */
/* -------------------------------------------------------------------------- */

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig
}

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn("w-full aspect-video text-xs", className)}
        {...props}
      >
        <Recharts.ResponsiveContainer width="100%" height="100%">
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  TOOLTIP                                   */
/* -------------------------------------------------------------------------- */

export const ChartTooltip = Recharts.Tooltip

type SafeTooltipProps = {
  active?: boolean
  payload?: any[]
  label?: string | number
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: SafeTooltipProps) {
  const { config } = useChart()

  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      {label && (
        <div className="mb-1 font-medium text-muted-foreground">
          {label}
        </div>
      )}

      <div className="space-y-1">
        {payload.map((item: any) => {
          const itemConfig = config[item.dataKey]

          return (
            <div
              key={item.dataKey}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span>{itemConfig?.label ?? item.name}</span>
              </div>

              <span className="font-mono tabular-nums">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   LEGEND                                   */
/* -------------------------------------------------------------------------- */

export const ChartLegend = Recharts.Legend

export function ChartLegendContent(props: { payload?: any[] }) {
  const { config } = useChart()
  const { payload } = props

  if (!payload || payload.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {payload.map((item: any) => {
        const itemConfig = config[item.dataKey]

        return (
          <div
            key={item.value}
            className="flex items-center gap-2 text-xs"
          >
            <div
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{itemConfig?.label ?? item.value}</span>
          </div>
        )
      })}
    </div>
  )
}