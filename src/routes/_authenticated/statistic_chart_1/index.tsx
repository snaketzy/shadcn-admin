import { createFileRoute } from '@tanstack/react-router'
import { StatisticChart1Page } from '@/features/statistic-chart-1'

export const Route = createFileRoute('/_authenticated/statistic_chart_1/')({
  component: StatisticChart1Page,
})
