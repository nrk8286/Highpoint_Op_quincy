"use client"

import * as React from "react"
import { Label, Pie, PieChart, RadialBar, RadialBarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function CompletionRingChart({ percentage }: { percentage: number }) {
  const chartData = [{ name: "completed", value: percentage, fill: "hsl(var(--primary))" }]

  return (
    <div className="h-[200px] w-full">
        <ChartContainer
          config={{}}
          className="mx-auto aspect-square h-full"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius="70%"
            outerRadius="100%"
            barSize={20}
            cy="50%"
          >
            <RadialBar
              background={{ fill: "hsl(var(--muted))" }}
              dataKey="value"
              cornerRadius={10}
            />
            <g>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                    {percentage}%
                </text>
            </g>
          </RadialBarChart>
        </ChartContainer>
    </div>
  )
}
