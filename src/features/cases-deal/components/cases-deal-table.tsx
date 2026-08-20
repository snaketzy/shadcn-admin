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
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { SearchIcon, CalendarIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import {
  fetchCasePaginated,
  fetchCaseMemoListByCaseIds,
  fetchCaseInquiryListByCaseIds,
  type CaseMemo,
  type CaseInquiry,
} from '@/features/cases/api/client'
import { fetchOwnerAll, type Owner } from '@/features/owners/api/client'
import { fetchSupplierAll, type Supplier } from '@/features/suppliers/api/client'
import {
  fetchContactAll,
  fetchDivisionCollaborations,
  type Contact,
  type DivisionCollaborationRow,
} from '@/features/contacts/api/client'
import { type Case } from '@/features/cases/data/schema'
import { getCasesDealColumns } from './cases-deal-columns'
import { DataTableBulkActions } from '@/features/cases/components/data-table-bulk-actions'

const route = getRouteApi('/_authenticated/case_deal_list/')

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
  icon_flag: {
    th: {
      position: 'sticky',
      top: 0,
      left: 48,
      zIndex: 50,
      width: 60,
      minWidth: 60,
    },
    td: {
      position: 'sticky',
      left: 48,
      zIndex: 30,
      width: 60,
      minWidth: 60,
    },
  },
  vessel_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 108,
      zIndex: 50,
      width: 200,
      minWidth: 200,
    },
    td: {
      position: 'sticky',
      left: 108,
      zIndex: 20,
      width: 200,
      minWidth: 200,
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

export function CasesDealTable(_: DataTableProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [inqDatePopoverOpen, setInqDatePopoverOpen] = useState(false)

  const { data: ownerAllRows = [] } = useQuery({
    queryKey: ['owner-picker-all-for-case-deal-list'],
    queryFn: fetchOwnerAll,
    staleTime: 60000,
  })
  const ownerNameEmailMap = useMemo<
    Map<string, { owner_name: string; owner_email: string }>
  >(() => {
    const m = new Map<string, { owner_name: string; owner_email: string }>()
    const list = (ownerAllRows as Owner[]) ?? []
    for (const o of list) {
      if (o.owner_name) {
        m.set(String(o.owner_name), {
          owner_name: o.owner_name,
          owner_email: o.owner_email ? String(o.owner_email) : '',
        })
      }
    }
    return m
  }, [ownerAllRows])

  const ownerIdEmailMap = useMemo<
    Map<string, { owner_name: string; owner_email: string }>
  >(() => {
    const m = new Map<string, { owner_name: string; owner_email: string }>()
    const list = (ownerAllRows as Owner[]) ?? []
    for (const o of list) {
      if (o.owner_id != null) {
        m.set(String(o.owner_id), {
          owner_name: o.owner_name ? String(o.owner_name) : '',
          owner_email: o.owner_email ? String(o.owner_email) : '',
        })
      }
    }
    return m
  }, [ownerAllRows])

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

  const urgentBIsUrgentSet = useMemo<Set<string>>(() => {
    const s = new Set<string>()
    for (const o of urgentBOptions) {
      if (!o.value) continue
      const lbl = (o.label || '').trim().toUpperCase()
      const val = String(o.value).trim().toUpperCase()
      const isNo =
        lbl === 'NO' ||
        lbl === '否' ||
        lbl.includes('普通') ||
        lbl.includes('非紧急') ||
        lbl.includes('常规') ||
        val === 'NO' ||
        /^B-?0/.test(val)
      if (!isNo && (lbl.includes('紧急') || val.includes('URGENT') || /^B-?1/.test(val) || lbl.includes('是') || lbl === 'YES')) {
        s.add(String(o.value).toUpperCase())
      }
    }
    return s
  }, [urgentBOptions])

  const handleTodayBIsYesSet = useMemo<Set<string>>(() => {
    const s = new Set<string>()
    for (const o of urgentBOptions) {
      if (!o.value) continue
      const lbl = (o.label || '').trim().toUpperCase()
      const val = String(o.value).trim().toUpperCase()
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
      if (!isNo && (lbl.includes('当日需处理') || lbl.includes('当日') || lbl === '是' || lbl === 'YES' || /^B-?1/.test(val) || lbl.includes('需要处理'))) {
        s.add(String(o.value).toUpperCase())
      }
    }
    return s
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

  const { data: serviceContactAllRows = [] } = useQuery({
    queryKey: ['contact-all-for-case-deal-list'],
    queryFn: fetchContactAll,
    staleTime: 60000,
  })

  const serviceContactIdMap = useMemo<Map<string, Contact>>(() => {
    const m = new Map<string, Contact>()
    const list = (serviceContactAllRows as Contact[]) ?? []
    for (const c of list) {
      if (c.contact_id != null) {
        m.set(String(c.contact_id), c)
      }
    }
    return m
  }, [serviceContactAllRows])

  const serviceContactNameMap = useMemo<Map<string, Contact>>(() => {
    const m = new Map<string, Contact>()
    const list = (serviceContactAllRows as Contact[]) ?? []
    for (const c of list) {
      if (c.contact_name) {
        const n = String(c.contact_name).trim()
        if (n) m.set(n, c)
      }
    }
    return m
  }, [serviceContactAllRows])

  const { data: divisionCollabRows = [] } = useQuery({
    queryKey: ['division-collab-all-for-case-deal-list'],
    queryFn: fetchDivisionCollaborations,
    staleTime: 60000,
  })

  const collaborationIdNameMap = useMemo<Map<number, string>>(() => {
    const m = new Map<number, string>()
    const list = (divisionCollabRows as DivisionCollaborationRow[]) ?? []
    for (const r of list) {
      const idRaw = r.collaboration_id
      const id =
        typeof idRaw === 'number'
          ? idRaw
          : typeof idRaw === 'string' && idRaw.trim() !== ''
            ? Number(idRaw)
            : Number.NaN
      const name = r.collaboration_name
        ? String(r.collaboration_name)
        : ''
      if (Number.isFinite(id) && id > 0 && name) m.set(id, name)
    }
    return m
  }, [divisionCollabRows])

  const { data: divisionKRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-K-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('K'),
    staleTime: 60000,
  })

  const divisionKeyMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    const list = (divisionKRowsData as CaseDict[]) ?? []
    for (const d of list) {
      if (!d.dict_key) continue
      const k = String(d.dict_key).trim().toUpperCase()
      const v = String(d.dict_value ?? d.dict_key ?? '')
      if (k) m.set(k, v)
    }
    return m
  }, [divisionKRowsData])

  const { data: supplierAllRows = [] } = useQuery({
    queryKey: ['supplier-all-for-case-deal-list'],
    queryFn: fetchSupplierAll,
    staleTime: 60000,
  })

  const supplierIdNameMap = useMemo<Map<number, string>>(() => {
    const m = new Map<number, string>()
    const list = (supplierAllRows as Supplier[]) ?? []
    for (const s of list) {
      const idRaw = (s as any).supplier_id
      const id =
        typeof idRaw === 'number'
          ? idRaw
          : typeof idRaw === 'string' && idRaw.trim() !== ''
            ? Number(idRaw)
            : Number.NaN
      const name = (s as any).supplier_name
        ? String((s as any).supplier_name)
        : ''
      if (Number.isFinite(id) && id > 0 && name) m.set(id, name)
    }
    return m
  }, [supplierAllRows])

  const { data: inquiryTypeQRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-Q-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('Q'),
    staleTime: 60000,
  })

  const inquiryTypeQKeyToLabel = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    const list = (inquiryTypeQRowsData as CaseDict[]) ?? []
    for (const d of list) {
      if (!d.dict_key) continue
      const k = String(d.dict_key).trim().toUpperCase()
      const v = String(d.dict_value ?? d.dict_key ?? '')
      if (k) m.set(k, v)
    }
    return m
  }, [inquiryTypeQRowsData])

  const memoRowsRef = useRef<CaseMemo[]>([])
  const inquiryRowsRef = useRef<CaseInquiry[]>([])
  const caseIdInquiriesMapRef = useRef<Map<number, CaseInquiry[]>>(new Map())
  const [inquiryTick, setInquiryTick] = useState(0)
  const caseIdMemosMapRef = useRef<Map<number, CaseMemo[]>>(new Map())
  const [memoTick, setMemoTick] = useState(0)

  const columns = useMemo(
    () =>
      getCasesDealColumns({
        urgentBMap,
        urgentBIsUrgentSet,
        handleTodayBIsYesSet,
        ownerNameEmailMap,
        ownerIdEmailMap,
        inqTypeAMap,
        inchargeEMap,
        rankDMap,
        vesselPositionCMap,
        progressRMap,
        getCaseIdMemosMap: () => caseIdMemosMapRef.current,
        getCaseIdInquiriesMap: () => caseIdInquiriesMapRef.current,
        supplierIdNameMap,
        inquiryTypeQKeyToLabel,
        serviceContactIdMap,
        serviceContactNameMap,
        collaborationIdNameMap,
        divisionKeyMap,
      }),
    [
      urgentBMap,
      urgentBIsUrgentSet,
      handleTodayBIsYesSet,
      ownerNameEmailMap,
      ownerIdEmailMap,
      inqTypeAMap,
      inchargeEMap,
      rankDMap,
      vesselPositionCMap,
      progressRMap,
      memoTick,
      inquiryTick,
      supplierIdNameMap,
      inquiryTypeQKeyToLabel,
      serviceContactIdMap,
      serviceContactNameMap,
      collaborationIdNameMap,
      divisionKeyMap,
    ]
  )

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<
      typeof useTableUrlState
    >[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 50 },
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

  const caseProgressFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseProgress)
        ? ((search as any).caseProgress as string[])
        : [],
    [search]
  )
  const caseInquiryTypeFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseInquiryType)
        ? ((search as any).caseInquiryType as string[])
        : [],
    [search]
  )
  const caseInchargeFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseIncharge)
        ? ((search as any).caseIncharge as string[])
        : [],
    [search]
  )
  const caseRankFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseRank)
        ? ((search as any).caseRank as string[])
        : [],
    [search]
  )
  const caseUrgentFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseUrgent)
        ? ((search as any).caseUrgent as string[])
        : [],
    [search]
  )
  const caseShouldHandleTodayFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).caseShouldHandleToday)
        ? ((search as any).caseShouldHandleToday as string[])
        : [],
    [search]
  )
  const vesselPositionFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).vesselPosition)
        ? ((search as any).vesselPosition as string[])
        : [],
    [search]
  )

  const invoiceNumberFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).invoiceNumber)
        ? ((search as any).invoiceNumber as string[])
        : [],
    [search]
  )
  const orderNumberFilter: string[] = useMemo(
    () =>
      Array.isArray((search as any).orderNumber)
        ? ((search as any).orderNumber as string[])
        : [],
    [search]
  )

  const {
    data: pageData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      'case-deal-list-paginated',
      pagination.pageIndex,
      pagination.pageSize,
      urlVesselName,
      urlKeyword,
      urlInqDateFrom,
      urlInqDateTo,
      invoiceNumberFilter,
      orderNumberFilter,
      caseProgressFilter,
      caseUrgentFilter,
      caseShouldHandleTodayFilter,
      caseInquiryTypeFilter,
      caseInchargeFilter,
      caseRankFilter,
      vesselPositionFilter,
    ],
    queryFn: () =>
      fetchCasePaginated({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        vesselName: urlVesselName || undefined,
        caseInquiryKeyword: urlKeyword || undefined,
        caseInquiryDateFrom: urlInqDateFrom || undefined,
        caseInquiryDateTo: urlInqDateTo || undefined,
        invoiceNumber:
          invoiceNumberFilter.length > 0 ? invoiceNumberFilter : undefined,
        orderNumber:
          orderNumberFilter.length > 0 ? orderNumberFilter : undefined,
        orderNumberHasValue: true,
        caseProgress:
          caseProgressFilter.length > 0 ? caseProgressFilter : undefined,
        caseUrgent: caseUrgentFilter.length > 0 ? caseUrgentFilter : undefined,
        caseShouldHandleToday:
          caseShouldHandleTodayFilter.length > 0
            ? caseShouldHandleTodayFilter
            : undefined,
        caseInquiryType:
          caseInquiryTypeFilter.length > 0 ? caseInquiryTypeFilter : undefined,
        caseIncharge:
          caseInchargeFilter.length > 0 ? caseInchargeFilter : undefined,
        caseRank: caseRankFilter.length > 0 ? caseRankFilter : undefined,
        vesselPosition:
          vesselPositionFilter.length > 0 ? vesselPositionFilter : undefined,
      }),
    placeholderData: (prev) => prev,
  })
  const pagedRows: Case[] = (pageData?.rows as Case[]) ?? []
  const totalRows: number = pageData?.total ?? 0
  const rowCount = totalRows

  const currentPageCaseIds = useMemo<number[]>(() => {
    return pagedRows
      .map((r) => {
        const raw = (r as any)?.case_id
        if (raw == null || raw === '') return NaN
        const n = Number(raw)
        return Number.isFinite(n) && n > 0 ? n : NaN
      })
      .filter((n) => Number.isFinite(n)) as number[]
  }, [pagedRows])

  const memoQuery = useQuery({
    queryKey: [
      'case-deal-memo-list-by-page-case-ids',
      currentPageCaseIds
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    ],
    queryFn: () => fetchCaseMemoListByCaseIds(currentPageCaseIds),
    enabled: currentPageCaseIds.length > 0,
    staleTime: 0,
  })

  useEffect(() => {
    const data = memoQuery.data
    const rows = Array.isArray(data) ? (data as CaseMemo[]) : []
    memoRowsRef.current = rows
    const m = new Map<number, CaseMemo[]>()
    for (const memo of rows) {
      const rawId = (memo as any).case_id
      const cid =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string' && rawId.trim() !== ''
            ? Number(rawId)
            : Number.NaN
      if (!Number.isFinite(cid)) continue
      if (!m.has(cid)) m.set(cid, [])
      m.get(cid)!.push(memo)
    }
    caseIdMemosMapRef.current = m
    setMemoTick((t) => (t + 1) & 0x3fffffff)
  }, [memoQuery.data])

  const inquiryQuery = useQuery({
    queryKey: [
      'case-deal-inquiry-list-by-page-case-ids',
      currentPageCaseIds
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    ],
    queryFn: () => fetchCaseInquiryListByCaseIds(currentPageCaseIds),
    enabled: currentPageCaseIds.length > 0,
    staleTime: 0,
  })

  useEffect(() => {
    const data = inquiryQuery.data
    const rows = Array.isArray(data) ? (data as CaseInquiry[]) : []
    inquiryRowsRef.current = rows
    const m = new Map<number, CaseInquiry[]>()
    for (const r of rows) {
      const rawId = (r as any).case_id
      const cid =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string' && rawId.trim() !== ''
            ? Number(rawId)
            : Number.NaN
      if (!Number.isFinite(cid)) continue
      if (!m.has(cid)) m.set(cid, [])
      m.get(cid)!.push(r)
    }
    caseIdInquiriesMapRef.current = m
    setInquiryTick((t) => (t + 1) & 0x3fffffff)
  }, [inquiryQuery.data])

  const pageCount = Math.max(
    1,
    Math.ceil(totalRows / Math.max(1, pagination.pageSize))
  )

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
    data: pagedRows,
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount,
    rowCount,
  })

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
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            initialFocus
            mode='range'
            defaultMonth={
              editingInqDateFrom ? new Date(editingInqDateFrom) : undefined
            }
            selected={{
              from: editingInqDateFrom
                ? new Date(editingInqDateFrom)
                : undefined,
              to: editingInqDateTo ? new Date(editingInqDateTo) : undefined,
            }}
            onSelect={(range) => {
              const from = range?.from ? formatInqDateISO(range.from) : ''
              const to = range?.to ? formatInqDateISO(range.to) : ''
              if (from) setEditingInqDateFrom(from)
              if (to) setEditingInqDateTo(to)
              if ((from && !to) || (!from && to)) {
                if (inqDateCommitRef.current)
                  clearTimeout(inqDateCommitRef.current)
                return
              }
              scheduleInqDateCommit(from, to)
            }}
            numberOfMonths={1}
          />
          <div className='space-y-2 border-t p-3'>
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
              await queryClient.refetchQueries({
                queryKey: ['case-deal-list-paginated'],
              })
              await queryClient.refetchQueries({
                queryKey: ['case-deal-list-groups'],
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
                table.getRowModel().rows.map((row) => {
                  const progressVal = (row.original as any)?.case_progress
                    ? String((row.original as any).case_progress).toUpperCase()
                    : null
                  const progressDisplay =
                    progressVal && progressRMap?.get(progressVal)
                  const isR9 =
                    progressVal &&
                    (progressVal.startsWith('R9') ||
                      progressVal.includes('R9') ||
                      (progressDisplay &&
                        (/^9/.test(progressDisplay) ||
                          /\b9/.test(progressDisplay))))
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn('group/row', isR9 && 'bg-slate-200/70')}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={
                            FIXED_COL_STYLES[cell.column.id ?? '']?.td ??
                            undefined
                          }
                          className={cn(
                            isR9
                              ? 'bg-slate-200/70 group-hover/row:bg-slate-200 group-data-[state=selected]/row:bg-slate-200'
                              : 'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
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
                  )
                })
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
