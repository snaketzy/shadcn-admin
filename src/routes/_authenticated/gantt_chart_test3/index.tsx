import { createFileRoute } from '@tanstack/react-router'
import { GanttChartDryDockingPage } from '@/features/gantt-chart-drydocking'

export const Route = createFileRoute('/_authenticated/gantt_chart_test3/')({
  component: GanttChartDryDockingPage,
})
