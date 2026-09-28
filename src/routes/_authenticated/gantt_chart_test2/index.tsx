import { createFileRoute } from '@tanstack/react-router'
import { GanttChartWaitingPage } from '@/features/gantt-chart-waiting'

export const Route = createFileRoute('/_authenticated/gantt_chart_test2/')({
  component: GanttChartWaitingPage,
})
