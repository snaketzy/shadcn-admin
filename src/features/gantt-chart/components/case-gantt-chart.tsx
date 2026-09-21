import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GanttChart as GanttChartIcon,
  Diamond,
  RefreshCw,
  ChevronRight as ChevronRightFlat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  fetchCasePaginated,
  fetchCaseInquiryListByCaseIds,
  type Case,
  type CaseInquiry,
} from '@/features/cases/api/client'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
} from '@/features/dictionaries/api/client'
import {
  fetchSupplierAll,
  type Supplier,
} from '@/features/suppliers/api/client'

const DAY_WIDTH = 22
const WEEK_WIDTH = DAY_WIDTH * 7
const LEFT_COL_WIDTH_DEFAULT = 336
const LEFT_COL_WIDTH_MIN = 180
const LEFT_COL_WIDTH_MAX = 960
const ROW_HEIGHT_PARENT = 40
const ROW_HEIGHT_CHILD = 32
const ROW_HEIGHT_RECORD = 26
const GROUP_PADDING_Y = 6

const INQ_KEY_TO_LABEL: Record<string, string> = {
  Q1: '案件询价',
  Q2: '案件报价',
  Q3: '案件竞标',
  Q4: '案件中标',
}

const INQ_KEY_TO_COLOR: Record<string, string> = {
  Q1: 'bg-sky-500/90 border-sky-600 text-sky-50',
  Q2: 'bg-amber-500/90 border-amber-600 text-amber-50',
  Q3: 'bg-violet-500/90 border-violet-600 text-violet-50',
  Q4: 'bg-orange-500/90 border-orange-600 text-orange-50',
}

const INQ_KEY_TO_COLOR_SOFT: Record<string, string> = {
  Q1: 'bg-sky-400/80 border-sky-500 text-sky-50',
  Q2: 'bg-amber-400/80 border-amber-500 text-amber-50',
  Q3: 'bg-violet-400/80 border-violet-500 text-violet-50',
  Q4: 'bg-orange-400/80 border-orange-500 text-orange-50',
}

const INQ_KEY_TO_DIAMOND: Record<string, string> = {
  Q4: 'text-orange-500 fill-orange-100',
  Q3: 'text-violet-500 fill-violet-100',
  Q2: 'text-amber-500 fill-amber-100',
  Q1: 'text-sky-500 fill-sky-100',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function ymdStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseYmdOrNull(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

function sameYmd(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getHandleTodayYesDictValues(dictB: CaseDict[]): string[] {
  const out: string[] = []
  for (const o of dictB) {
    if (!o.dict_key) continue
    const lbl = (o.dict_value ?? '').trim().toUpperCase()
    const val = String(o.dict_key).trim().toUpperCase()
    const isNo =
      lbl === 'NO' ||
      lbl === '否' ||
      lbl.includes('不需') ||
      lbl.includes('不用') ||
      lbl.includes('普通') ||
      lbl.includes('非当日') ||
      lbl.includes('无需') ||
      val === 'NO' ||
      /^B-?0/.test(val)
    if (
      !isNo &&
      (lbl.includes('当日需处理') ||
        lbl.includes('当日') ||
        lbl === '是' ||
        lbl === 'YES' ||
        /^B-?1/.test(val) ||
        lbl.includes('需要处理'))
    ) {
      out.push(String(o.dict_key))
    }
  }
  return out
}

function inqKeyUpper(t: unknown): string {
  return String(t ?? '')
    .trim()
    .toUpperCase()
}

type GanttRowType = 'parent' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface GanttRow {
  caseId: number
  rowKey: string
  type: GanttRowType
  label: string
  startDate: Date | null
  endDate: Date | null
  startLabel?: string
  endLabel?: string
  caseTitle: string
  vesselName: string | null
  caseLink: string
  colorClass?: string
  isRecord?: boolean
  recordRemark?: string
  recordOrder?: number
  recordSupplierShort?: string | null
  showDiamond?: boolean
  rowHeight?: number
  indentLevel?: number
}

interface GanttConnector {
  fromRowKey: string
  toRowKey: string
  fromEdge: 'end' | 'start'
  toEdge: 'end' | 'start'
}

interface GanttGroup {
  caseId: number
  caseTitle: string
  vesselName: string | null
  rows: GanttRow[]
  totalHeight: number
  connectors: GanttConnector[]
}

const route = getRouteApi('/_authenticated/gantt_chart_test1/')

export function CaseGanttChart() {
  const navigate = route.useNavigate()
  const search = route.useSearch()
  const [anchorDeltaDays, setAnchorDeltaDays] = useState(0)
  const [collapsedCaseIds, setCollapsedCaseIds] = useState<Set<number>>(
    new Set()
  )

  const toggleCaseCollapse = (caseId: number) => {
    setCollapsedCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) next.delete(caseId)
      else next.add(caseId)
      return next
    })
  }

  const { data: dictB = [] } = useQuery({
    queryKey: ['case-dict-prefix-B-gantt-chart'],
    queryFn: () => fetchCaseDictByKeyPrefix('B'),
    staleTime: 60000,
  })

  const { data: supplierRows = [] } = useQuery({
    queryKey: ['gantt-supplier-all'],
    queryFn: () => fetchSupplierAll(),
    staleTime: 60000 * 30,
  })

  const supplierIdNameMap = useMemo<Map<number, string>>(() => {
    const m = new Map<number, string>()
    for (const s of supplierRows as Supplier[]) {
      const id = Number((s as any).supplier_id)
      if (!Number.isFinite(id) || id <= 0) continue
      const shortName = String((s as any).supplier_shortname ?? '').trim()
      const fullName = String((s as any).supplier_name ?? '').trim()
      const name = shortName || fullName || ''
      if (name) m.set(id, name)
    }
    return m
  }, [supplierRows])

  const handleTodayYesValues = useMemo(
    () => getHandleTodayYesDictValues(dictB),
    [dictB]
  )

  const {
    data: pageData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ['gantt-case-today-list-paginated', handleTodayYesValues],
    queryFn: () =>
      fetchCasePaginated({
        page: 1,
        pageSize: 2000,
        caseShouldHandleToday:
          handleTodayYesValues.length > 0 ? handleTodayYesValues : undefined,
      }),
    staleTime: 30000,
    enabled: handleTodayYesValues.length > 0,
  })

  const caseRows: Case[] = (pageData?.rows as Case[]) ?? []
  const caseCount: number = pageData?.total ?? caseRows.length

  const caseIds = useMemo<number[]>(() => {
    return caseRows
      .map((r) => (r.case_id != null ? Number(r.case_id) : NaN))
      .filter((n) => Number.isFinite(n) && n > 0)
  }, [caseRows])

  const { data: inquiryRows = [], isLoading: inqLoading } = useQuery({
    queryKey: ['gantt-case-inquiry-list-by-caseids', caseIds],
    queryFn: () => fetchCaseInquiryListByCaseIds(caseIds),
    staleTime: 30000,
    enabled: caseIds.length > 0,
  })

  const inquiryMap = useMemo<Map<number, CaseInquiry[]>>(() => {
    const m = new Map<number, CaseInquiry[]>()
    for (const r of inquiryRows) {
      const id = Number(r.case_id)
      if (!Number.isFinite(id)) continue
      const arr = m.get(id) ?? []
      arr.push(r)
      m.set(id, arr)
    }
    return m
  }, [inquiryRows])

  const { groups, minDate, maxDate, totalRows } = useMemo(() => {
    const out: GanttGroup[] = []
    let globalMin: Date | null = null
    let globalMax: Date | null = null
    const expand = (d: Date | null) => {
      if (!d) return
      if (globalMin == null || d < globalMin) globalMin = new Date(d)
      if (globalMax == null || d > globalMax) globalMax = new Date(d)
    }
    let rowCount = 0
    const resolveSupplierShort = (id: unknown): string => {
      const n =
        typeof id === 'number'
          ? id
          : typeof id === 'string' && id.trim() !== ''
            ? Number(id)
            : Number.NaN
      if (!Number.isFinite(n) || n <= 0) return ''
      return supplierIdNameMap.get(n) ?? ''
    }
    for (const c of caseRows) {
      const caseTitle =
        (c.case_inquiry_keyword && c.case_inquiry_keyword.trim()) ||
        `${c.vessel_name ?? '未命名案件'}`
      const parentStart = parseYmdOrNull(c.case_inquiry_date)
      const parentEnd = parseYmdOrNull(c.case_follow_date)
      expand(parentStart)
      expand(parentEnd)

      const inqs = inquiryMap.get(Number(c.case_id)) ?? []
      const byKey = new Map<string, CaseInquiry[]>()
      for (const i of inqs) {
        const k = inqKeyUpper(i.case_inquiry_type)
        if (!k) continue
        const arr = byKey.get(k) ?? []
        arr.push(i)
        byKey.set(k, arr)
      }

      const minDateForKey = (key: string): Date | null => {
        const arr = byKey.get(key) ?? []
        let out: Date | null = null
        for (const i of arr) {
          const d = parseYmdOrNull(i.case_inquired_date)
          if (!d) continue
          if (out == null || d < out) out = d
        }
        return out
      }
      const maxDateForKey = (key: string): Date | null => {
        const arr = byKey.get(key) ?? []
        let out: Date | null = null
        for (const i of arr) {
          const d = parseYmdOrNull(i.case_inquired_date)
          if (!d) continue
          if (out == null || d > out) out = d
        }
        return out
      }
      const sortedRecordsForKey = (
        key: string
      ): Array<{ rec: CaseInquiry; d: Date }> => {
        const arr = byKey.get(key) ?? []
        const out: Array<{ rec: CaseInquiry; d: Date }> = []
        for (const r of arr) {
          const d = parseYmdOrNull(r.case_inquired_date)
          if (d) out.push({ rec: r, d: startOfDay(d) })
        }
        out.sort((a, b) => a.d.getTime() - b.d.getTime())
        return out
      }
      const firstRemarkForKey = (key: string): string => {
        const s = sortedRecordsForKey(key)
        for (const o of s) {
          const t = (o.rec.remark ?? '').trim()
          if (t) return t
        }
        return ''
      }

      const rows: GanttRow[] = []
      const caseLink = `case_list?search=${encodeURIComponent(
        c.case_inquiry_keyword ?? String(c.case_id)
      )}`

      rows.push({
        caseId: c.case_id,
        rowKey: `p-${c.case_id}`,
        type: 'parent',
        label: caseTitle,
        startDate: parentStart ? startOfDay(parentStart) : null,
        endDate: parentEnd ? startOfDay(parentEnd) : null,
        caseTitle,
        vesselName: c.vessel_name,
        caseLink: caseLink,
        startLabel: parentStart ? ymdStr(parentStart) : '',
        endLabel: parentEnd ? ymdStr(parentEnd) : '',
        colorClass: 'bg-emerald-500/90 border-emerald-600 text-emerald-50',
        isRecord: false,
        indentLevel: 0,
        rowHeight: ROW_HEIGHT_PARENT,
      })

      const has = {
        Q1: (byKey.get('Q1')?.length ?? 0) > 0,
        Q2: (byKey.get('Q2')?.length ?? 0) > 0,
        Q3: (byKey.get('Q3')?.length ?? 0) > 0,
        Q4: (byKey.get('Q4')?.length ?? 0) > 0,
      }

      const stageKeys: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = [
        'Q1',
        'Q2',
        'Q3',
        'Q4',
      ]
      const stageRowKeys: Record<string, string | null> = {
        Q1: null,
        Q2: null,
        Q3: null,
        Q4: null,
      }

      for (const key of stageKeys) {
        if (!has[key]) continue
        const s = minDateForKey(key)
        const e = maxDateForKey(key)
        expand(s)
        expand(e)
        const list = sortedRecordsForKey(key)
        const cnt = list.length
        const firstRm = firstRemarkForKey(key)
        const rmSummary = firstRm ? firstRm.slice(0, 18) : ''
        let startS = s,
          endE = e
        if (key === 'Q4') {
          const q3s = has.Q3 ? minDateForKey('Q3') : null
          startS = q3s ?? s
          endE = e ?? s
        }
        const aggKey = `${key.toLowerCase()}-agg-${c.case_id}`
        stageRowKeys[key] = aggKey
        rows.push({
          caseId: c.case_id,
          rowKey: aggKey,
          type: key,
          label: INQ_KEY_TO_LABEL[key] + (cnt > 1 ? ` · ${cnt}条` : ''),
          startDate: startS ? startOfDay(startS) : null,
          endDate: endE ? startOfDay(endE) : null,
          caseTitle,
          vesselName: c.vessel_name,
          caseLink,
          startLabel: startS ? ymdStr(startS) : '',
          endLabel: endE ? ymdStr(endE) : '',
          colorClass: INQ_KEY_TO_COLOR[key],
          isRecord: false,
          indentLevel: 1,
          rowHeight: ROW_HEIGHT_CHILD,
          recordRemark: rmSummary || `共 ${cnt} 条${INQ_KEY_TO_LABEL[key]}记录`,
          showDiamond: key === 'Q4',
        })
        let order = 0
        for (const { rec, d } of list) {
          order += 1
          const rm = (rec.remark ?? '').trim()
          const supplierShort = resolveSupplierShort(
            rec.case_inquiry_division_id
          )
          const lblShort = rm ? rm.slice(0, 14) : `备注#${order}`
          const prefix = supplierShort ? `· ${supplierShort} - ` : '· '
          rows.push({
            caseId: c.case_id,
            rowKey: `${key.toLowerCase()}-rec-${c.case_id}-${rec.inquiry_id ?? order}`,
            type: key,
            label: `${prefix}${lblShort.replace(/^·\s*/, '')}`,
            startDate: d,
            endDate: d,
            caseTitle,
            vesselName: c.vessel_name,
            caseLink,
            startLabel: ymdStr(d),
            endLabel: ymdStr(d),
            colorClass: INQ_KEY_TO_COLOR_SOFT[key],
            isRecord: true,
            indentLevel: 2,
            rowHeight: ROW_HEIGHT_RECORD,
            recordRemark: rm || lblShort,
            recordOrder: order,
            recordSupplierShort: supplierShort || null,
            showDiamond: key === 'Q4',
          })
        }
      }

      let totalH = 0
      for (const r of rows) {
        totalH +=
          r.rowHeight ??
          (r.type === 'parent' ? ROW_HEIGHT_PARENT : ROW_HEIGHT_CHILD)
      }
      totalH += GROUP_PADDING_Y * 2
      for (let i = 0; i < rows.length; i++) rowCount += 1

      const connectors: GanttConnector[] = []
      for (let i = 0; i < stageKeys.length - 1; i++) {
        const from = stageKeys[i]
        const to = stageKeys[i + 1]
        if (stageRowKeys[from] && stageRowKeys[to]) {
          connectors.push({
            fromRowKey: stageRowKeys[from]!,
            toRowKey: stageRowKeys[to]!,
            fromEdge: 'end',
            toEdge: 'start',
          })
        }
      }
      if (stageRowKeys.Q1 && stageRowKeys.Q3 && !stageRowKeys.Q2) {
        connectors.push({
          fromRowKey: stageRowKeys.Q1!,
          toRowKey: stageRowKeys.Q3!,
          fromEdge: 'end',
          toEdge: 'start',
        })
      }
      if (stageRowKeys.Q2 && stageRowKeys.Q4 && !stageRowKeys.Q3) {
        connectors.push({
          fromRowKey: stageRowKeys.Q2!,
          toRowKey: stageRowKeys.Q4!,
          fromEdge: 'end',
          toEdge: 'start',
        })
      }

      out.push({
        caseId: c.case_id,
        caseTitle,
        vesselName: c.vessel_name,
        rows,
        totalHeight: totalH,
        connectors,
      })
    }
    if (globalMin == null || globalMax == null) {
      const today = startOfDay(new Date())
      globalMin = addDays(today, -7 * 4)
      globalMax = addDays(today, 7 * 8)
    } else {
      const today = startOfDay(new Date())
      if (today < globalMin) globalMin = new Date(today)
      if (today > globalMax) globalMax = new Date(today)
    }
    return {
      groups: out,
      minDate: startOfWeek(globalMin),
      maxDate: startOfWeek(addDays(globalMax, 7)),
      totalRows: rowCount,
    }
  }, [caseRows, inquiryMap, supplierIdNameMap])

  const weekHeaders = useMemo<
    Array<{ weekStart: Date; label: string; leftPx: number }>
  >(() => {
    const out: Array<{ weekStart: Date; label: string; leftPx: number }> = []
    if (!minDate || !maxDate) return out
    let cur = startOfWeek(minDate)
    let left = 0
    const end = startOfWeek(maxDate)
    while (cur <= end) {
      const y = cur.getFullYear()
      const m = cur.getMonth() + 1
      const d = cur.getDate()
      out.push({
        weekStart: new Date(cur),
        label: `${y}-${pad(m)}-${pad(d)}`,
        leftPx: left,
      })
      cur = addDays(cur, 7)
      left += WEEK_WIDTH
    }
    return out
  }, [minDate, maxDate])

  const weeksWidthPx = weekHeaders.length * WEEK_WIDTH
  const todayLine = useMemo<number | null>(() => {
    if (!minDate) return null
    const today = startOfDay(new Date())
    const diffDay = Math.round(
      (today.getTime() - startOfWeek(minDate).getTime()) / 86400000
    )
    const maxDiffDay = (weekHeaders.length || 1) * 7 - 1
    if (diffDay < 0 || diffDay > maxDiffDay) return null
    return diffDay * DAY_WIDTH
  }, [minDate, weekHeaders.length])

  const leftPxForDate = (d: Date): number => {
    if (!minDate) return 0
    const base = startOfWeek(minDate).getTime()
    const diff = Math.round((startOfDay(d).getTime() - base) / 86400000)
    return diff * DAY_WIDTH
  }

  const widthForRange = (s: Date, e: Date): number => {
    if (sameYmd(s, e)) return Math.max(DAY_WIDTH * 1.2, DAY_WIDTH * 1)
    const diff = Math.round(
      (startOfDay(e).getTime() - startOfDay(s).getTime()) / 86400000
    )
    return (diff + 1) * DAY_WIDTH
  }

  const [showOnlyDateRange, setShowOnlyDateRange] = useState(true)
  const [leftColWidth, setLeftColWidth] = useState<number>(
    LEFT_COL_WIDTH_DEFAULT
  )
  const [isDragging, setIsDragging] = useState(false)
  useEffect(() => {}, [anchorDeltaDays])

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const container = document.querySelector(
        '.gantt-root-wrapper'
      ) as HTMLElement | null
      if (!container) return
      const clientX =
        'touches' in e
          ? ((e as TouchEvent).touches[0]?.clientX ?? 0)
          : (e as MouseEvent).clientX
      const rect = container.getBoundingClientRect()
      const next = Math.max(
        LEFT_COL_WIDTH_MIN,
        Math.min(LEFT_COL_WIDTH_MAX, clientX - rect.left)
      )
      setLeftColWidth(next)
    }
    const handleUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
    if (!isDragging) return
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging])

  const dataLoading = casesLoading || inqLoading

  const computeRowTopMap = (rows: GanttRow[]): Map<string, number> => {
    const m = new Map<string, number>()
    let y = GROUP_PADDING_Y
    for (const r of rows) {
      const h =
        r.rowHeight ??
        (r.type === 'parent' ? ROW_HEIGHT_PARENT : ROW_HEIGHT_CHILD)
      m.set(r.rowKey, y + h / 2)
      y += h
    }
    return m
  }

  return (
    <div className='flex flex-col gap-4 p-4 lg:p-6'>
      <Card>
        <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <GanttChartIcon className='size-5 text-emerald-600' />
              <CardTitle className='text-xl'>跟进中案件甘特图</CardTitle>
            </div>
            <CardDescription className='mt-1'>
              数据源 =
              「当日处理案件」列表。横坐标：日期（按周）。每个案件为一组：父级（询价日期
              → 跟进日期） + 子级（询价 / 报价 / 竞标 / 中标）。 当前共计{' '}
              <span className='font-semibold text-emerald-700'>
                {caseCount}
              </span>{' '}
              条跟进中案件，
              <span className='font-semibold text-slate-700'>
                {totalRows}
              </span>{' '}
              行甘特。 父级可 <ChevronRightFlat className='inline size-3' />{' '}
              折叠。
            </CardDescription>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 border-dashed border-emerald-500/60 text-emerald-700'
            >
              <BarChart3 className='size-3.5' /> 数据源：当日处理案件
            </Badge>
            <Button
              size='sm'
              variant='outline'
              className='gap-1'
              onClick={() => setShowOnlyDateRange((v) => !v)}
            >
              {showOnlyDateRange ? '仅显示有日期范围' : '显示全部案件'}
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='gap-1'
              onClick={() => setAnchorDeltaDays((v) => v - 14)}
            >
              <ChevronLeft className='size-4' /> 2 周
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='gap-1'
              onClick={() => setAnchorDeltaDays((v) => v + 14)}
            >
              2 周 <ChevronRight className='size-4' />
            </Button>
            <Button
              size='sm'
              variant='default'
              className='gap-1'
              onClick={() => refetchCases()}
            >
              <RefreshCw
                className={cn('size-4', dataLoading && 'animate-spin')}
              />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {casesError ? (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
              加载数据失败：{(casesError as any)?.message ?? String(casesError)}
            </div>
          ) : dataLoading ? (
            <div className='flex flex-col gap-3'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-[520px] w-full' />
            </div>
          ) : groups.length === 0 ? (
            <div className='flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground'>
              <GanttChartIcon className='size-10 opacity-40' />
              <div className='text-sm'>
                暂无「当日处理案件」，请先在案件列表里把需要处理的案件打上
                <span className='mx-1 rounded bg-emerald-100 px-1 py-0.5 font-medium text-emerald-800'>
                  当日需处理
                </span>
                标记。
              </div>
            </div>
          ) : (
            <TooltipProvider delayDuration={120}>
              <div className='rounded-lg border'>
                <div
                  className='gantt-root-wrapper overflow-auto'
                  style={
                    isDragging
                      ? { cursor: 'col-resize', userSelect: 'none' }
                      : undefined
                  }
                >
                  <div
                    className='relative'
                    style={{
                      width: leftColWidth + weeksWidthPx,
                      minWidth: '100%',
                    }}
                  >
                    <div
                      className='sticky top-0 z-40 grid border-b bg-background'
                      style={{
                        gridTemplateColumns: `${leftColWidth}px ${weeksWidthPx}px`,
                      }}
                    >
                      <div className='sticky left-0 z-50 flex items-center gap-2 border-r bg-background px-4 py-3 text-sm font-semibold shadow-[2px_0_4px_rgba(15,23,42,0.05)]'>
                        <GanttChartIcon className='size-4 text-muted-foreground' />
                        案件 / 阶段
                      </div>
                      <div
                        className='relative overflow-hidden bg-muted/30'
                        style={{ width: weeksWidthPx, height: 76 }}
                      >
                        {weekHeaders.map((w, idx) => (
                          <div
                            key={w.label}
                            className={cn(
                              'absolute top-0 flex flex-col items-start gap-0.5 border-r py-2 text-[11px] text-muted-foreground',
                              idx % 2 === 0
                                ? 'bg-background/40'
                                : 'bg-transparent'
                            )}
                            style={{
                              left: w.leftPx,
                              width: WEEK_WIDTH,
                              height: 76,
                            }}
                          >
                            <div className='pr-1 pl-3 font-medium text-slate-700'>
                              {w.label}
                            </div>
                            <div
                              className='flex flex-nowrap gap-0'
                              style={{ width: WEEK_WIDTH }}
                            >
                              {Array.from({ length: 7 }).map((_, di) => {
                                const date = addDays(w.weekStart, di)
                                const wd = date.getDay()
                                const weekend = wd === 0 || wd === 6
                                return (
                                  <div
                                    key={di}
                                    className={cn(
                                      'flex h-6 shrink-0 items-center justify-center text-[10px]',
                                      weekend
                                        ? 'font-semibold text-rose-500/80'
                                        : 'font-normal text-slate-500'
                                    )}
                                    style={{
                                      width: DAY_WIDTH,
                                      flexBasis: DAY_WIDTH,
                                      maxWidth: DAY_WIDTH,
                                      minWidth: DAY_WIDTH,
                                    }}
                                  >
                                    {date.getDate()}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        {todayLine != null ? (
                          <div
                            className='pointer-events-none absolute top-0 z-30'
                            style={{
                              left: todayLine,
                              width: DAY_WIDTH,
                              height: 76,
                            }}
                          >
                            <div
                              className='absolute inset-0 rounded border border-t-0 shadow'
                              style={{
                                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                                borderColor: 'rgba(14, 165, 233, 1)',
                                boxShadow:
                                  '0 0 10px rgba(14,165,233,0.35), inset 0 1px 0 rgba(255,255,255,0.7)',
                              }}
                            />
                            <div className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px] rounded-b bg-sky-600 px-2 py-[1px] text-[11px] leading-5 font-semibold whitespace-nowrap text-white shadow-md ring-1 ring-sky-300'>
                              今日
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <svg width={0} height={0} className='absolute'>
                      <defs>
                        <marker
                          id='gantt-arrow'
                          viewBox='0 0 10 10'
                          refX='8'
                          refY='5'
                          markerWidth='6'
                          markerHeight='6'
                          orient='auto-start-reverse'
                        >
                          <path d='M 0 0 L 10 5 L 0 10 z' fill='#94a3b8' />
                        </marker>
                      </defs>
                    </svg>

                    {groups.map((g, gIdx) => {
                      const allRows = g.rows
                      const visibleRows = collapsedCaseIds.has(g.caseId)
                        ? allRows.filter((r) => r.type === 'parent')
                        : allRows
                      const filteredRows = showOnlyDateRange
                        ? visibleRows.filter(
                            (r) => r.startDate != null && r.endDate != null
                          )
                        : visibleRows
                      if (filteredRows.length === 0) return null
                      let realHeight = 0
                      for (const r of filteredRows) {
                        realHeight +=
                          r.rowHeight ??
                          (r.type === 'parent'
                            ? ROW_HEIGHT_PARENT
                            : ROW_HEIGHT_CHILD)
                      }
                      realHeight += GROUP_PADDING_Y * 2
                      const rowTopCenterMap = computeRowTopMap(filteredRows)
                      return (
                        <div
                          key={g.caseId}
                          className={cn(
                            'relative grid border-b',
                            gIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-background'
                          )}
                          style={{
                            gridTemplateColumns: `${leftColWidth}px ${weeksWidthPx}px`,
                            minHeight: realHeight,
                          }}
                        >
                          <div
                            className={cn(
                              'sticky left-0 z-20 border-r shadow-[2px_0_4px_rgba(15,23,42,0.05)]',
                              gIdx % 2 === 1 ? 'bg-slate-50' : 'bg-background'
                            )}
                            style={{
                              width: leftColWidth,
                              minHeight: realHeight,
                            }}
                          >
                            {filteredRows.map((r, ri) => {
                              const h =
                                r.rowHeight ??
                                (r.type === 'parent'
                                  ? ROW_HEIGHT_PARENT
                                  : ROW_HEIGHT_CHILD)
                              const indentPx =
                                r.indentLevel === 0
                                  ? 8
                                  : r.indentLevel === 1
                                    ? 36
                                    : 60
                              const isFirst = ri === 0
                              const isLast = ri === filteredRows.length - 1
                              return (
                                <div
                                  key={r.rowKey}
                                  className={cn(
                                    'flex w-full items-center gap-1.5',
                                    r.type === 'parent'
                                      ? 'bg-slate-100/70 font-semibold text-slate-800'
                                      : r.isRecord
                                        ? 'text-slate-500'
                                        : 'text-slate-700',
                                    isFirst && 'pt-[6px]',
                                    isLast && 'pb-[6px]'
                                  )}
                                  style={{
                                    height: h,
                                    paddingLeft: indentPx,
                                    paddingRight: 12,
                                  }}
                                >
                                  {r.type === 'parent' ? (
                                    <Button
                                      type='button'
                                      size='icon'
                                      variant='ghost'
                                      className={cn(
                                        'h-6 w-6 shrink-0 rounded p-0 text-slate-500 hover:bg-slate-200/70'
                                      )}
                                      onClick={() =>
                                        toggleCaseCollapse(r.caseId)
                                      }
                                      aria-label={
                                        collapsedCaseIds.has(r.caseId)
                                          ? '展开'
                                          : '折叠'
                                      }
                                    >
                                      {collapsedCaseIds.has(r.caseId) ? (
                                        <ChevronRight className='size-4' />
                                      ) : (
                                        <ChevronDown className='size-4' />
                                      )}
                                    </Button>
                                  ) : (
                                    <span className='inline-block w-6 shrink-0' />
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link
                                        to='/case_list'
                                        search={{
                                          caseInquiryKeyword:
                                            r.caseTitle || undefined,
                                        }}
                                        className={cn(
                                          'truncate text-left hover:text-emerald-700 hover:underline',
                                          r.type === 'parent'
                                            ? 'text-[13px] font-semibold'
                                            : r.isRecord
                                              ? 'text-[11.5px] font-normal'
                                              : 'text-[12.5px] font-medium'
                                        )}
                                      >
                                        {r.type === 'parent' && r.vesselName
                                          ? `${r.vesselName} // ${r.label}`
                                          : r.label}
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side='right' align='start'>
                                      <div className='max-w-[280px] text-xs leading-5'>
                                        <div>
                                          <span className='text-muted-foreground'>
                                            船名：
                                          </span>
                                          {r.vesselName || '-'}
                                        </div>
                                        <div>
                                          <span className='text-muted-foreground'>
                                            阶段：
                                          </span>
                                          {r.type === 'parent'
                                            ? '案件主链路（询价→跟进）'
                                            : r.isRecord
                                              ? INQ_KEY_TO_LABEL[r.type] +
                                                ' · 记录'
                                              : INQ_KEY_TO_LABEL[r.type] +
                                                ' · 聚合'}
                                        </div>
                                        {r.startLabel ? (
                                          <div>
                                            <span className='text-muted-foreground'>
                                              起始：
                                            </span>
                                            {r.startLabel}
                                          </div>
                                        ) : null}
                                        {r.endLabel &&
                                        r.endLabel !== r.startLabel ? (
                                          <div>
                                            <span className='text-muted-foreground'>
                                              终止：
                                            </span>
                                            {r.endLabel}
                                          </div>
                                        ) : null}
                                        {r.recordRemark ? (
                                          <div>
                                            <span className='text-muted-foreground'>
                                              备注：
                                            </span>
                                            {r.recordRemark}
                                          </div>
                                        ) : null}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )
                            })}
                          </div>
                          <div
                            className='relative'
                            style={{
                              width: weeksWidthPx,
                              minHeight: realHeight,
                              height: realHeight,
                            }}
                          >
                            <div className='pointer-events-none absolute inset-0'>
                              {weekHeaders.map((w, idx) => (
                                <div
                                  key={w.label + '-grid'}
                                  className={cn(
                                    'absolute top-0 h-full border-r',
                                    idx % 2 === 1
                                      ? 'border-slate-200/70 bg-slate-50/50'
                                      : 'border-slate-200/50'
                                  )}
                                  style={{
                                    left: w.leftPx,
                                    width: WEEK_WIDTH,
                                  }}
                                />
                              ))}
                              {todayLine != null ? (
                                <div
                                  className='pointer-events-none absolute top-0 z-30'
                                  style={{
                                    left: todayLine,
                                    width: DAY_WIDTH,
                                    height: '100%',
                                  }}
                                >
                                  <div
                                    className='absolute inset-0 border-x'
                                    style={{
                                      backgroundColor:
                                        'rgba(56, 189, 248, 0.5)',
                                      borderColor: 'rgba(14, 165, 233, 1)',
                                      boxShadow:
                                        '0 0 8px rgba(14,165,233,0.3), inset 0 0 0 1px rgba(255,255,255,0.3)',
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>

                            <svg
                              className='pointer-events-none absolute inset-0 z-[1]'
                              width={weeksWidthPx}
                              height={realHeight}
                            >
                              {g.connectors.map((conn, ci) => {
                                const y1 = rowTopCenterMap.get(conn.fromRowKey)
                                const y2 = rowTopCenterMap.get(conn.toRowKey)
                                if (y1 == null || y2 == null) return null
                                const fromRow = filteredRows.find(
                                  (x) => x.rowKey === conn.fromRowKey
                                )
                                const toRow = filteredRows.find(
                                  (x) => x.rowKey === conn.toRowKey
                                )
                                if (!fromRow || !toRow) return null
                                if (
                                  !fromRow.startDate ||
                                  !fromRow.endDate ||
                                  !toRow.startDate ||
                                  !toRow.endDate
                                )
                                  return null
                                const x1 =
                                  leftPxForDate(fromRow.endDate) +
                                  widthForRange(
                                    fromRow.startDate,
                                    fromRow.endDate
                                  )
                                const x2 = leftPxForDate(toRow.startDate)
                                const midY = (y1 + y2) / 2
                                const path = `M ${x1} ${y1} L ${x1 + 4} ${y1} L ${x1 + 4} ${midY} L ${Math.max(0, x2 - 6)} ${midY} L ${Math.max(0, x2 - 6)} ${y2} L ${Math.max(0, x2)} ${y2}`
                                return (
                                  <path
                                    key={ci}
                                    d={path}
                                    fill='none'
                                    stroke='#94a3b8'
                                    strokeWidth={1.25}
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    markerEnd='url(#gantt-arrow)'
                                    opacity={0.8}
                                  />
                                )
                              })}
                            </svg>

                            {filteredRows.map((r, ri) => {
                              if (r.startDate == null || r.endDate == null)
                                return null
                              const left = leftPxForDate(r.startDate)
                              const width = Math.max(
                                widthForRange(r.startDate, r.endDate),
                                DAY_WIDTH
                              )
                              const h =
                                r.rowHeight ??
                                (r.type === 'parent'
                                  ? ROW_HEIGHT_PARENT
                                  : ROW_HEIGHT_CHILD)
                              let cumY = GROUP_PADDING_Y
                              for (let k = 0; k < ri; k++) {
                                cumY +=
                                  filteredRows[k].rowHeight ?? ROW_HEIGHT_CHILD
                              }
                              const actualTop = cumY
                              const isParent = r.type === 'parent'
                              const isRecord = !!r.isRecord
                              const barHeight = isParent
                                ? 28
                                : isRecord
                                  ? 18
                                  : 22
                              const barTop = actualTop + (h - barHeight) / 2
                              const showDiamond = !!r.showDiamond
                              const diamondColor =
                                INQ_KEY_TO_DIAMOND[r.type] ?? 'text-slate-400'
                              const barInnerText = isParent
                                ? `${r.caseTitle.length > 22 ? r.caseTitle.slice(0, 22) + '…' : r.caseTitle}${
                                    r.startLabel && r.endLabel
                                      ? ` · ${r.startLabel} → ${r.endLabel}`
                                      : ''
                                  }`
                                : isRecord
                                  ? r.recordRemark
                                    ? r.recordRemark.length > 28
                                      ? r.recordRemark.slice(0, 28) + '…'
                                      : r.recordRemark
                                    : (r.startLabel ?? '')
                                  : r.recordRemark && width > 180
                                    ? r.recordRemark
                                    : `${r.startLabel ?? ''}${
                                        r.endLabel &&
                                        r.endLabel !== r.startLabel
                                          ? ` → ${r.endLabel}`
                                          : ''
                                      }`
                              const endX = left + width
                              return (
                                <div
                                  key={r.rowKey}
                                  className='absolute'
                                  style={{
                                    left: 0,
                                    top: 0,
                                    width: weeksWidthPx,
                                    height: realHeight,
                                  }}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link
                                        to='/case_list'
                                        search={{
                                          caseInquiryKeyword:
                                            r.caseTitle || undefined,
                                        }}
                                        className={cn(
                                          'absolute cursor-pointer rounded-md border shadow-sm transition hover:shadow-md hover:brightness-110',
                                          r.colorClass ??
                                            'bg-slate-500 text-white'
                                        )}
                                        style={{
                                          left: Math.max(0, left),
                                          top: barTop,
                                          width,
                                          height: barHeight,
                                          padding: isRecord
                                            ? '1px 6px'
                                            : '2px 8px',
                                          fontSize: isRecord ? 10.5 : 11.5,
                                          lineHeight: 1.25,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          zIndex: 2,
                                        }}
                                      >
                                        <span className='truncate font-medium'>
                                          {barInnerText}
                                        </span>
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side='top'
                                      align='start'
                                      alignOffset={-4}
                                    >
                                      <div className='max-w-[280px] text-xs leading-5'>
                                        <div className='font-semibold'>
                                          {r.caseTitle}
                                        </div>
                                        <div className='text-muted-foreground'>
                                          {r.type === 'parent'
                                            ? '案件主链路'
                                            : isRecord
                                              ? INQ_KEY_TO_LABEL[r.type] +
                                                ' · 单条记录'
                                              : INQ_KEY_TO_LABEL[r.type] +
                                                ' · 阶段聚合'}
                                          {' · '}
                                          {r.vesselName || '无船名'}
                                        </div>
                                        {r.startLabel && r.endLabel ? (
                                          <div>
                                            {r.startLabel}
                                            {sameYmd(r.startDate, r.endDate)
                                              ? ''
                                              : ` → ${r.endLabel}`}
                                          </div>
                                        ) : null}
                                        {r.recordRemark ? (
                                          <div className='mt-1 border-t border-slate-200/70 pt-1'>
                                            备注：{r.recordRemark}
                                          </div>
                                        ) : null}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                  {showDiamond ? (
                                    <Diamond
                                      className={cn(
                                        'absolute z-[3] drop-shadow-sm',
                                        diamondColor
                                      )}
                                      style={{
                                        left: Math.max(0, endX - 7),
                                        top: barTop + barHeight / 2 - 7,
                                        width: 16,
                                        height: 16,
                                        strokeWidth: 2,
                                      }}
                                    />
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    <div
                      aria-hidden
                      role='separator'
                      aria-orientation='vertical'
                      className={cn(
                        'group/resize absolute top-0 left-0 z-[60] flex cursor-col-resize items-stretch justify-start transition-colors',
                        isDragging && 'bg-sky-400/10'
                      )}
                      style={{
                        marginLeft: leftColWidth - 3,
                        width: 6,
                        height: '100%',
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                    >
                      <div
                        className={cn(
                          'pointer-events-none my-2 ml-[2px] h-auto w-[2px] shrink-0 self-stretch rounded-sm transition-colors',
                          isDragging
                            ? 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.55)]'
                            : 'bg-transparent group-hover/resize:bg-slate-400/70'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground'>
                <LegendSwatch
                  className='bg-emerald-500'
                  label='案件主链路（询价日期 → 跟进日期）'
                />
                <LegendSwatch
                  className='bg-sky-500'
                  label='案件询价（阶段聚合 + 逐记录）'
                />
                <LegendSwatch
                  className='bg-amber-500'
                  label='案件报价（阶段聚合 + 逐记录）'
                />
                <LegendSwatch
                  className='bg-violet-500'
                  label='案件竞标（阶段聚合 + 逐记录）'
                />
                <LegendSwatch
                  className='bg-orange-500'
                  label='案件中标（最早竞标→中标 + 🔷 里程碑）'
                />
                <div className='flex items-center gap-1.5'>
                  <Diamond
                    className='size-3.5 fill-orange-100 text-orange-500'
                    strokeWidth={2}
                  />
                  <span>中标里程碑</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span
                    className='inline-block h-4 w-[22px] shrink-0 rounded border align-middle'
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.55)',
                      borderColor: 'rgba(14, 165, 233, 1)',
                      boxShadow: '0 0 6px rgba(14,165,233,0.3)',
                    }}
                  />
                  <span>今日高亮列</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <svg width='28' height='14' viewBox='0 0 28 14'>
                    <defs>
                      <marker
                        id='legend-arrow'
                        viewBox='0 0 10 10'
                        refX='8'
                        refY='5'
                        markerWidth='5'
                        markerHeight='5'
                        orient='auto'
                      >
                        <path d='M 0 0 L 10 5 L 0 10 z' fill='#94a3b8' />
                      </marker>
                    </defs>
                    <path
                      d='M 2 4 L 12 4 L 12 10 L 22 10'
                      fill='none'
                      stroke='#94a3b8'
                      strokeWidth='1.2'
                      markerEnd='url(#legend-arrow)'
                    />
                  </svg>
                  <span>阶段间流转箭头</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <ChevronDown className='size-3.5 text-slate-500' />
                  <span>父级可折叠</span>
                </div>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LegendSwatch({
  className,
  label,
}: {
  className?: string
  label: string
}) {
  return (
    <div className='flex items-center gap-1.5'>
      <span
        className={cn(
          'inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10 align-middle',
          className
        )}
      />
      <span>{label}</span>
    </div>
  )
}
