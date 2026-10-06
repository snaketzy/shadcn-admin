import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchMonthlyProgressStatistics } from '../api'

const PROGRESS_KEYS: {
  key: string
  label: string
  color: string
  codeLabel: string
}[] = [
  { key: 'R0', label: 'Inquiry', color: '#000000', codeLabel: '0' },
  {
    key: 'BUSY',
    label: 'R1/R10/R11/R2/R3/R4（处理中）',
    color: '#10B981',
    codeLabel: '业务进度',
  },
  {
    key: 'R6',
    label: 'Waiting for Confirm',
    color: '#e17100',
    codeLabel: '6',
  },
  {
    key: 'R99',
    label: 'closed inquiry (no response from shipowner)',
    color: '#4b5563',
    codeLabel: '99',
  },
  {
    key: 'R98',
    label: 'unable quote',
    color: '#9ca3af',
    codeLabel: '98',
  },
  {
    key: 'R93',
    label: 'no assistance from Owner',
    color: '#fde68a',
    codeLabel: '93',
  },
]

const BUSY_MERGE_KEYS = new Set(['R1', 'R10', 'R11', 'R2', 'R3', 'R4'])

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

export interface CaseProgressMonthlyStackedChartProps {
  year?: number
  ownerTeam: string
  chartHeight?: number
  showLegendFooter?: boolean
}

export function CaseProgressMonthlyStackedChart(
  props: CaseProgressMonthlyStackedChartProps
) {
  const {
    year = 2026,
    ownerTeam,
    chartHeight = 380,
    showLegendFooter = true,
  } = props
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistic-chart-1-monthly-progress', year, ownerTeam],
    queryFn: () =>
      fetchMonthlyProgressStatistics({ year, ownerTeam: String(ownerTeam) }),
    staleTime: 60000,
  })

  const { chartData, maxTotal } = useMemo(() => {
    const byMonth = new Map<number, Record<string, number>>()
    for (let m = 1; m <= 12; m++) {
      const row: Record<string, number> = { month: m }
      for (const p of PROGRESS_KEYS) row[p.key] = 0
      byMonth.set(m, row)
    }
    function normalizeProgressKey(raw: string): string {
      let k = (raw ?? '').trim().toUpperCase()
      if (k === '') return ''
      if (!k.startsWith('R')) k = 'R' + k
      return k
    }
    for (const r of data ?? []) {
      const month = Number(r.month)
      if (month < 1 || month > 12) continue
      const agg = byMonth.get(month)
      if (!agg) continue
      let k = normalizeProgressKey(String(r.progressKey ?? ''))
      if (k && BUSY_MERGE_KEYS.has(k)) k = 'BUSY'
      if (k && k in agg) {
        agg[k] = Number(agg[k] ?? 0) + Number(r.count ?? 0)
      }
    }
    let max = 0
    const cData = MONTH_LABELS.map((label, i) => {
      const agg = byMonth.get(i + 1)!
      const total = PROGRESS_KEYS.reduce(
        (sum, p) => sum + Number(agg[p.key] ?? 0),
        0
      )
      if (total > max) max = total
      return {
        monthLabel: label,
        ...agg,
        total,
      }
    })
    return { chartData: cData, maxTotal: max }
  }, [data])

  return (
    <div className='flex w-full flex-col gap-3 rounded-md border bg-background p-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-semibold'>
          {year}年 {ownerTeam}组船东联系人案件进度月度分布
        </h2>
        {isLoading ? (
          <span className='text-sm text-muted-foreground'>加载中…</span>
        ) : error ? (
          <span className='text-sm text-destructive'>
            {error instanceof Error ? error.message : '加载失败'}
          </span>
        ) : null}
      </div>
      <div
        className='w-full'
        style={{ minHeight: chartHeight, height: chartHeight }}
      >
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={chartData}
            margin={{ top: 26, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='monthLabel' />
            <YAxis
              allowDecimals={false}
              domain={[
                0,
                (dataMax: number) => {
                  const cap = Math.max(maxTotal, dataMax, 1)
                  if (cap <= 10) return Math.max(10, cap + 2)
                  return cap + 2
                },
              ]}
            />
            <Tooltip />
            <Legend />
            {PROGRESS_KEYS.map((p) => (
              <Bar
                key={p.key}
                dataKey={p.key}
                stackId={`progress-${ownerTeam}`}
                name={p.label}
                fill={p.color}
                isAnimationActive={false}
              >
                {chartData.map((_row, i) => (
                  <Cell key={`c-${i}`} fill={p.color} />
                ))}
              </Bar>
            ))}
            <Line
              type='stepAfter'
              dataKey='total'
              stroke='transparent'
              strokeWidth={0}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType='none'
              tooltipType='none'
              label={{
                position: 'top',
                fill: '#ef4444',
                fontSize: 18,
                fontWeight: 700,
                formatter: (value: any) => {
                  const v = Number(value)
                  return v > 0 ? String(v) : ''
                },
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {showLegendFooter ? (
        <div className='mt-2 text-xs text-muted-foreground'>
          颜色说明：
          {PROGRESS_KEYS.map((p) => (
            <span key={p.key} className='ml-3 inline-flex items-center gap-1'>
              <span
                className='inline-block h-3 w-3 rounded-sm border'
                style={{ backgroundColor: p.color, borderColor: p.color }}
              />
              <span>
                {p.codeLabel}:{p.label}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
