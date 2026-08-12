import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { SearchIcon, CalendarIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
} from '@/features/dictionaries/api/client'
import { fetchCaseAll, fetchCaseGroups } from '../api/client'
import { type Case } from '../data/schema'
import { getCasesColumns } from './cases-columns'
import { DataTableBulkActions } from './data-table-bulk-actions'

const route = getRouteApi('/_authenticated/case_list/')

const FIXED_COL_STYLES: Record<
  string,
  { th: React.CSSProperties; td: React.CSSProperties }
> = {
  select: {
    th: {
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 50,
      width: 48,
      minWidth: 48,
    },
    td: {
      position: 'sticky',
      left: 0,
      zIndex: 30,
      width: 48,
      minWidth: 48,
    },
  },
  vessel_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 48,
      zIndex: 50,
      width: 200,
      minWidth: 200,
    },
    td: {
      position: 'sticky',
      left: 48,
      zIndex: 20,
      width: 200,
      minWidth: 200,
    },
  },
  invoice_number: {
    th: {
      position: 'sticky',
      top: 0,
      left: 248,
      zIndex: 50,
      width: 160,
      minWidth: 160,
    },
    td: {
      position: 'sticky',
      left: 248,
      zIndex: 20,
      width: 160,
      minWidth: 160,
    },
  },
  order_number: {
    th: {
      position: 'sticky',
      top: 0,
      left: 408,
      zIndex: 50,
      width: 180,
      minWidth: 180,
    },
    td: {
      position: 'sticky',
      left: 408,
      zIndex: 20,
      width: 180,
      minWidth: 180,
    },
  },
  case_inquiry_keyword: {
    th: {
      position: 'sticky',
      top: 0,
      left: 588,
      zIndex: 50,
      width: 220,
      minWidth: 220,
    },
    td: {
      position: 'sticky',
      left: 588,
      zIndex: 20,
      width: 220,
      minWidth: 220,
    },
  },
  actions: {
    th: {
      position: 'sticky',
      top: 0,
      right: 0,
      zIndex: 50,
      width: 88,
      minWidth: 88,
    },
    td: {
      position: 'sticky',
      right: 0,
      zIndex: 30,
      width: 88,
      minWidth: 88,
    },
  },
}

type DataTableProps = Record<string, never>

export function CasesTable(_: DataTableProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [inqDatePopoverOpen, setInqDatePopoverOpen] = useState(false)

  const {
    data: allRowsData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['case-list'],
    queryFn: fetchCaseAll,
  })
  const allRows: Case[] = allRowsData as Case[]

  const { data: groupsData } = useQuery({
    queryKey: ['case-list-groups'],
    queryFn: fetchCaseGroups,
  })
  const caseProgresses = groupsData?.caseProgresses ?? []
  const caseInquiryTypes = groupsData?.caseInquiryTypes ?? []
  const caseInCharges = groupsData?.caseInCharges ?? []
  const caseRanks = groupsData?.caseRanks ?? []

  const { data: urgentBRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-B-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('B'),
    staleTime: 60000,
  })

  const urgentBOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (urgentBRowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [urgentBRowsData])

  const urgentBMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of urgentBOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [urgentBOptions])

  const { data: inqTypeARowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-A-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('A'),
    staleTime: 60000,
  })

  const inqTypeAOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (inqTypeARowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [inqTypeARowsData])

  const inqTypeAMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of inqTypeAOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [inqTypeAOptions])

  const { data: inchargeERowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-E-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('E'),
    staleTime: 60000,
  })

  const inchargeEOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (inchargeERowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [inchargeERowsData])

  const inchargeEMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of inchargeEOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [inchargeEOptions])

  const { data: rankDRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-D-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('D'),
    staleTime: 60000,
  })

  const rankDOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (rankDRowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [rankDRowsData])

  const rankDMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of rankDOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [rankDOptions])

  const { data: vesselPositionCRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-C-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('C'),
    staleTime: 60000,
  })

  const vesselPositionCOptions = useMemo<
    { value: string; label: string }[]
  >(() => {
    const list = (vesselPositionCRowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [vesselPositionCRowsData])

  const vesselPositionCMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of vesselPositionCOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [vesselPositionCOptions])

  const { data: progressRRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-R-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('R'),
    staleTime: 60000,
  })

  const progressROptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (progressRRowsData as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [progressRRowsData])

  const progressRMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const o of progressROptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [progressROptions])

  const columns = useMemo(
    () =>
      getCasesColumns({
        urgentBMap,
        inqTypeAMap,
        inchargeEMap,
        rankDMap,
        vesselPositionCMap,
        progressRMap,
      }),
    [
      urgentBMap,
      inqTypeAMap,
      inchargeEMap,
      rankDMap,
      vesselPositionCMap,
      progressRMap,
    ]
  )

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<
      typeof useTableUrlState
    >[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'invoice_number', searchKey: 'invoiceNumber', type: 'array' },
      { columnId: 'order_number', searchKey: 'orderNumber', type: 'array' },
      { columnId: 'case_progress', searchKey: 'caseProgress', type: 'array' },
      { columnId: 'case_urgent', searchKey: 'caseUrgent', type: 'array' },
      {
        columnId: 'case_should_handle_today',
        searchKey: 'caseShouldHandleToday',
        type: 'array',
      },
      {
        columnId: 'case_inquiry_type',
        searchKey: 'caseInquiryType',
        type: 'array',
      },
      { columnId: 'case_incharge', searchKey: 'caseIncharge', type: 'array' },
      { columnId: 'case_rank', searchKey: 'caseRank', type: 'array' },
      {
        columnId: 'vessel_position',
        searchKey: 'vesselPosition',
        type: 'array',
      },
    ],
  })
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = urlState

  const urlVesselName: string =
    (search as unknown as { vesselName?: string }).vesselName ?? ''
  const urlKeyword: string =
    (search as unknown as { caseInquiryKeyword?: string }).caseInquiryKeyword ??
    ''
  const urlInqDateFrom: string =
    (search as unknown as { caseInquiryDateFrom?: string })
      .caseInquiryDateFrom ?? ''
  const urlInqDateTo: string =
    (search as unknown as { caseInquiryDateTo?: string }).caseInquiryDateTo ??
    ''

  const [editingVesselName, setEditingVesselName] = useState(urlVesselName)
  const vesselNameComposingRef = useRef(false)
  const vesselNameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const [editingKeyword, setEditingKeyword] = useState(urlKeyword)
  const keywordComposingRef = useRef(false)
  const keywordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingInqDateFrom, setEditingInqDateFrom] = useState(urlInqDateFrom)
  const [editingInqDateTo, setEditingInqDateTo] = useState(urlInqDateTo)
  const inqDateCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingVesselName !== urlVesselName) setEditingVesselName(urlVesselName)
  }, [urlVesselName])

  useEffect(() => {
    if (editingKeyword !== urlKeyword) setEditingKeyword(urlKeyword)
  }, [urlKeyword])

  useEffect(() => {
    if (editingInqDateFrom !== urlInqDateFrom)
      setEditingInqDateFrom(urlInqDateFrom)
  }, [urlInqDateFrom])

  useEffect(() => {
    if (editingInqDateTo !== urlInqDateTo) setEditingInqDateTo(urlInqDateTo)
  }, [urlInqDateTo])

  const scheduleVesselNameCommit = useCallback(
    (value: string) => {
      if (vesselNameDebounceRef.current)
        clearTimeout(vesselNameDebounceRef.current)
      vesselNameDebounceRef.current = setTimeout(() => {
        if (vesselNameComposingRef.current) return
        navigate({
          search: (prev: any) => ({
            ...(prev ?? {}),
            vesselName: value || undefined,
            page: undefined,
          }),
        })
      }, 300)
    },
    [navigate]
  )

  const scheduleKeywordCommit = useCallback(
    (value: string) => {
      if (keywordDebounceRef.current) clearTimeout(keywordDebounceRef.current)
      keywordDebounceRef.current = setTimeout(() => {
        if (keywordComposingRef.current) return
        navigate({
          search: (prev: any) => ({
            ...(prev ?? {}),
            caseInquiryKeyword: value || undefined,
            page: undefined,
          }),
        })
      }, 300)
    },
    [navigate]
  )

  const onVesselNameChange = (value: string) => {
    setEditingVesselName(value)
    scheduleVesselNameCommit(value)
  }

  const onVesselNameCompositionStart = () => {
    vesselNameComposingRef.current = true
  }

  const onVesselNameCompositionEnd = (value: string) => {
    vesselNameComposingRef.current = false
    setEditingVesselName(value)
    scheduleVesselNameCommit(value)
  }

  const onKeywordChange = (value: string) => {
    setEditingKeyword(value)
    scheduleKeywordCommit(value)
  }

  const onKeywordCompositionStart = () => {
    keywordComposingRef.current = true
  }

  const onKeywordCompositionEnd = (value: string) => {
    keywordComposingRef.current = false
    setEditingKeyword(value)
    scheduleKeywordCommit(value)
  }

  const pad2Inq = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

  const formatInqDateISO = (d: Date): string =>
    `${d.getFullYear()}-${pad2Inq(d.getMonth() + 1)}-${pad2Inq(d.getDate())}`

  const scheduleInqDateCommit = useCallback(
    (fromRaw: string, toRaw: string) => {
      if (inqDateCommitRef.current) clearTimeout(inqDateCommitRef.current)
      inqDateCommitRef.current = setTimeout(() => {
        const from = fromRaw.trim()
        const to = toRaw.trim()
        navigate({
          search: (prev: any) => ({
            ...(prev ?? {}),
            caseInquiryDateFrom: from || undefined,
            caseInquiryDateTo: to || undefined,
            page: undefined,
          }),
        })
      }, 180)
    },
    [navigate]
  )

  const setInquiryDatePreset = useCallback(
    (preset: 'thisWeek' | 'thisMonth') => {
      const now = new Date()
      let from: Date
      let to: Date
      if (preset === 'thisWeek') {
        const day = now.getDay()
        const diffMon = day === 0 ? -6 : 1 - day
        from = new Date(now)
        from.setHours(0, 0, 0, 0)
        from.setDate(now.getDate() + diffMon)
        to = new Date(from)
        to.setDate(from.getDate() + 6)
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      const fromStr = formatInqDateISO(from)
      const toStr = formatInqDateISO(to)
      setEditingInqDateFrom(fromStr)
      setEditingInqDateTo(toStr)
      scheduleInqDateCommit(fromStr, toStr)
    },
    [scheduleInqDateCommit]
  )

  const clearInquiryDateFilter = useCallback(() => {
    setEditingInqDateFrom('')
    setEditingInqDateTo('')
    scheduleInqDateCommit('', '')
  }, [scheduleInqDateCommit])

  const caseProgressFilter = useMemo(
    () =>
      Array.isArray((search as any).caseProgress)
        ? ((search as any).caseProgress as string[])
        : [],
    [search]
  )
  const caseInquiryTypeFilter = useMemo(
    () =>
      Array.isArray((search as any).caseInquiryType)
        ? ((search as any).caseInquiryType as string[])
        : [],
    [search]
  )
  const caseInchargeFilter = useMemo(
    () =>
      Array.isArray((search as any).caseIncharge)
        ? ((search as any).caseIncharge as string[])
        : [],
    [search]
  )
  const caseRankFilter = useMemo(
    () =>
      Array.isArray((search as any).caseRank)
        ? ((search as any).caseRank as string[])
        : [],
    [search]
  )
  const caseUrgentFilter = useMemo(
    () =>
      Array.isArray((search as any).caseUrgent)
        ? ((search as any).caseUrgent as string[])
        : [],
    [search]
  )
  const caseShouldHandleTodayFilter = useMemo(
    () =>
      Array.isArray((search as any).caseShouldHandleToday)
        ? ((search as any).caseShouldHandleToday as string[])
        : [],
    [search]
  )
  const vesselPositionFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselPosition)
        ? ((search as any).vesselPosition as string[])
        : [],
    [search]
  )

  const filteredData: Case[] = useMemo(() => {
    const vesselName = editingVesselName
    const keyword = editingKeyword
    let result = allRows
    if (vesselName.trim() !== '') {
      const q = vesselName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.vessel_name ?? '')
          .toLowerCase()
          .includes(q)
      )
    }
    if (keyword.trim() !== '') {
      const q = keyword.trim().toLowerCase()
      result = result.filter(
        (r) =>
          String(r.case_inquiry_keyword ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.invoice_number ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.order_number ?? '')
            .toLowerCase()
            .includes(q)
      )
    }
    if (caseProgressFilter.length > 0) {
      result = result.filter((r) =>
        caseProgressFilter.includes(r.case_progress ?? '')
      )
    }
    if (caseInquiryTypeFilter.length > 0) {
      result = result.filter((r) =>
        caseInquiryTypeFilter.includes(r.case_inquiry_type ?? '')
      )
    }
    if (caseInchargeFilter.length > 0) {
      const filterKeys = caseInchargeFilter.map((s) =>
        String(s ?? '')
          .trim()
          .toUpperCase()
      )
      result = result.filter((r) => {
        const rowRaw = r.case_incharge ?? ''
        const rowKeys = (rowRaw ? String(rowRaw).split(',') : [])
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
        if (rowKeys.length === 0) return false
        return filterKeys.some((f) => rowKeys.includes(f))
      })
    }
    if (caseRankFilter.length > 0) {
      result = result.filter((r) => caseRankFilter.includes(r.case_rank ?? ''))
    }
    if (caseUrgentFilter.length > 0) {
      result = result.filter((r) =>
        caseUrgentFilter.includes(r.case_urgent ?? '')
      )
    }
    if (caseShouldHandleTodayFilter.length > 0) {
      result = result.filter((r) =>
        caseShouldHandleTodayFilter.includes(r.case_should_handle_today ?? '')
      )
    }
    if (vesselPositionFilter.length > 0) {
      result = result.filter((r) =>
        vesselPositionFilter.includes(r.vessel_position ?? '')
      )
    }
    const inqDateFrom = editingInqDateFrom.trim()
    const inqDateTo = editingInqDateTo.trim()
    if (inqDateFrom || inqDateTo) {
      const normRow = (raw: unknown): string => {
        if (raw === null || raw === undefined || raw === '') return ''
        const s = String(raw).trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-')
        if (/^\d{8}$/.test(s))
          return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
        const d = new Date(s)
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = d.getMonth() + 1
          const da = d.getDate()
          return `${y}-${m < 10 ? `0${m}` : `${m}`}-${da < 10 ? `0${da}` : `${da}`}`
        }
        return s
      }
      result = result.filter((r) => {
        const rowDate = normRow(r.case_inquiry_date)
        if (!rowDate) return false
        if (inqDateFrom && rowDate < inqDateFrom) return false
        if (inqDateTo && rowDate > inqDateTo) return false
        return true
      })
    }
    return result
  }, [
    allRows,
    editingVesselName,
    editingKeyword,
    editingInqDateFrom,
    editingInqDateTo,
    caseProgressFilter,
    caseInquiryTypeFilter,
    caseInchargeFilter,
    caseRankFilter,
    caseUrgentFilter,
    caseShouldHandleTodayFilter,
    vesselPositionFilter,
  ])

  const handleResetFilters = () => {
    navigate({
      search: {
        page: undefined,
        pageSize: undefined,
        vesselName: undefined,
        caseInquiryKeyword: undefined,
        caseInquiryDateFrom: undefined,
        caseInquiryDateTo: undefined,
        invoiceNumber: undefined,
        orderNumber: undefined,
        caseProgress: undefined,
        caseInquiryType: undefined,
        caseIncharge: undefined,
        caseRank: undefined,
        caseUrgent: undefined,
        caseShouldHandleToday: undefined,
        vesselPosition: undefined,
      } as any,
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: false,
  })

  const pageCount = table.getPageCount()
  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  const isFiltered =
    columnFilters.length > 0 ||
    editingVesselName.trim() !== '' ||
    editingKeyword.trim() !== '' ||
    editingInqDateFrom.trim() !== '' ||
    editingInqDateTo.trim() !== ''

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col gap-4 overflow-hidden'>
        <div className='h-10 rounded-md border bg-muted/30'>
          <Skeleton className='h-full w-full' />
        </div>
        <div className='flex flex-1 flex-col gap-2 rounded-md border p-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-full' />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex flex-1 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 p-8 text-destructive'>
        加载数据失败: {error instanceof Error ? error.message : String(error)}
      </div>
    )
  }

  const filtersToolbar = (
    <div className='flex shrink-0 items-center gap-2'>
      <Popover open={inqDatePopoverOpen} onOpenChange={setInqDatePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='h-8 shrink-0 border-dashed'
          >
            <CalendarIcon className='size-4' />
            询价日期
            {(editingInqDateFrom || editingInqDateTo) && (
              <>
                <Separator orientation='vertical' className='mx-2 h-4' />
                <div className='hidden gap-x-1 lg:flex'>
                  {editingInqDateFrom && (
                    <Badge
                      variant='secondary'
                      className='rounded-sm px-1 font-normal'
                    >
                      {editingInqDateFrom}
                    </Badge>
                  )}
                  {(editingInqDateFrom || editingInqDateTo) &&
                    (editingInqDateFrom ? '→' : 'Until')}
                  {editingInqDateTo && (
                    <Badge
                      variant='secondary'
                      className='rounded-sm px-1 font-normal'
                    >
                      {editingInqDateTo}
                    </Badge>
                  )}
                </div>
                <Badge
                  variant='secondary'
                  className='rounded-sm px-1 font-normal lg:hidden'
                >
                  {(editingInqDateFrom ? '1' : '') +
                    (editingInqDateTo ? '1' : '')}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-80' align='start'>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setInquiryDatePreset('thisWeek')}
              >
                本周
              </Button>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setInquiryDatePreset('thisMonth')}
              >
                本月
              </Button>
              {(editingInqDateFrom || editingInqDateTo) && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearInquiryDateFilter}
                >
                  清空
                </Button>
              )}
            </div>
            <div className='space-y-2'>
              <div className='grid grid-cols-8 items-center gap-2'>
                <label className='col-span-2 text-xs text-muted-foreground'>
                  起始日期
                </label>
                <Input
                  type='date'
                  value={editingInqDateFrom}
                  className='col-span-6 h-8 text-xs'
                  onChange={(e) => {
                    const v = e.target.value
                    setEditingInqDateFrom(v)
                    scheduleInqDateCommit(v, editingInqDateTo)
                  }}
                />
              </div>
              <div className='grid grid-cols-8 items-center gap-2'>
                <label className='col-span-2 text-xs text-muted-foreground'>
                  结束日期
                </label>
                <Input
                  type='date'
                  value={editingInqDateTo}
                  className='col-span-6 h-8 text-xs'
                  onChange={(e) => {
                    const v = e.target.value
                    setEditingInqDateTo(v)
                    scheduleInqDateCommit(editingInqDateFrom, v)
                  }}
                />
              </div>
            </div>
            <p className='pt-1 text-center text-xs text-muted-foreground'>
              支持自定义日期范围或点击上方「本周 / 本月」快速选择
            </p>
          </div>
        </PopoverContent>
      </Popover>
      {progressROptions.length > 0 && table.getColumn('case_progress') && (
        <div className='shrink-0'>
          <DataTableFacetedFilter
            column={table.getColumn('case_progress')!}
            title='案件进度'
            options={progressROptions}
          />
        </div>
      )}
      {urgentBOptions.length > 0 && table.getColumn('case_urgent') && (
        <div className='shrink-0'>
          <DataTableFacetedFilter
            column={table.getColumn('case_urgent')!}
            title='紧急案件'
            options={urgentBOptions}
          />
        </div>
      )}
      {urgentBOptions.length > 0 &&
        table.getColumn('case_should_handle_today') && (
          <div className='shrink-0'>
            <DataTableFacetedFilter
              column={table.getColumn('case_should_handle_today')!}
              title='当日需处理'
              options={urgentBOptions}
            />
          </div>
        )}
      {inqTypeAOptions.length > 0 && table.getColumn('case_inquiry_type') && (
        <div className='shrink-0'>
          <DataTableFacetedFilter
            column={table.getColumn('case_inquiry_type')!}
            title='需求类型'
            options={inqTypeAOptions}
          />
        </div>
      )}
      {inchargeEOptions.length > 0 && table.getColumn('case_incharge') && (
        <div className='shrink-0'>
          <DataTableFacetedFilter
            column={table.getColumn('case_incharge')!}
            title='案件负责人'
            options={inchargeEOptions}
          />
        </div>
      )}
      {rankDOptions.length > 0 && table.getColumn('case_rank') && (
        <div className='shrink-0'>
          <DataTableFacetedFilter
            column={table.getColumn('case_rank')!}
            title='案件评级'
            options={rankDOptions}
          />
        </div>
      )}
      {vesselPositionCOptions.length > 0 &&
        table.getColumn('vessel_position') && (
          <div className='shrink-0'>
            <DataTableFacetedFilter
              column={table.getColumn('vessel_position')!}
              title='船舶位置'
              options={vesselPositionCOptions}
            />
          </div>
        )}
    </div>
  )

  const portalTarget =
    typeof document !== 'undefined'
      ? document.getElementById('header-filters-portal')
      : null

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex w-full flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
      {portalTarget && createPortal(filtersToolbar, portalTarget)}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-1 flex-col items-start gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-x-2'>
          <Input
            placeholder='按船名筛选...'
            value={editingVesselName}
            onChange={(e) => onVesselNameChange(e.target.value)}
            onCompositionStart={onVesselNameCompositionStart}
            onCompositionEnd={(e) =>
              onVesselNameCompositionEnd((e.target as HTMLInputElement).value)
            }
            className='h-8 w-34 lg:w-50'
          />
          <Input
            placeholder='按发票号 / 订单编号 / 需求编号/名称筛选...'
            value={editingKeyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onCompositionStart={onKeywordCompositionStart}
            onCompositionEnd={(e) =>
              onKeywordCompositionEnd((e.target as HTMLInputElement).value)
            }
            className='h-8 w-45 lg:w-75'
          />
          {isFiltered && (
            <Button
              variant='ghost'
              onClick={handleResetFilters}
              className='h-8 px-2 lg:px-3'
            >
              Reset
              <Cross2Icon className='ms-2 h-4 w-4' />
            </Button>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={async () => {
              await queryClient.refetchQueries({ queryKey: ['case-list'] })
              await queryClient.refetchQueries({
                queryKey: ['case-list-groups'],
              })
            }}
          >
            <SearchIcon className='size-4' />
            查询
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className='flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border'>
        <div className='relative w-full min-w-0 flex-1 [scrollbar-gutter:stable] overflow-auto'>
          <table className='w-full min-w-max table-auto caption-bottom text-sm whitespace-nowrap'>
            <TableHeader className='bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='group/row'>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={
                          FIXED_COL_STYLES[header.column.id ?? '']?.th ??
                          undefined
                        }
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          !FIXED_COL_STYLES[header.column.id ?? ''] &&
                            'sticky top-0 z-10',
                          header.column.columnDef.meta?.thClassName,
                          header.column.columnDef.meta?.className
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='group/row'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={
                          FIXED_COL_STYLES[cell.column.id ?? '']?.td ??
                          undefined
                        }
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          cell.column.columnDef.meta?.className,
                          cell.column.columnDef.meta?.tdClassName
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    暂无数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto shrink-0' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
