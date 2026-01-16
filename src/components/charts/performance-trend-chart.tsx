"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", completionRate: 88, inspectionScore: 92 },
  { month: "February", completionRate: 92, inspectionScore: 94 },
  { month: "March", completionRate: 91, inspectionScore: 95 },
  { month: "April", completionRate: 95, inspectionScore: 96 },
  { month: "May", completionRate: 93, inspectionScore: 94 },
  { month: "June", completionRate: 96, inspectionScore: 98 },
]

const chartConfig = {
  completionRate: {
    label: "Completion Rate (%)",
    color: "hsl(var(--primary))",
  },
  inspectionScore: {
    label: "Inspection Score (%)",
    color: "hsl(var(--secondary))",
  },
}

export function PerformanceTrendChart() {
  return (
    <div className="h-[350px] w-full">
      <ChartContainer config={chartConfig}>
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis 
            domain={[80, 100]}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={4} />
          <Bar dataKey="inspectionScore" fill="var(--color-inspectionScore)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
