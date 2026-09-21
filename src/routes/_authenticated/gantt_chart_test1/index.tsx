import { createFileRoute } from '@tanstack/react-router'
import { GanttChartPage } from '@/features/gantt-chart'

export const Route = createFileRoute('/_authenticated/gantt_chart_test1/')({
  component: GanttChartPage,
})
