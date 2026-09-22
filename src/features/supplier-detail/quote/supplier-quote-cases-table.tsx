import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTableColumnHeader } from '@/components/data-table'
import { DataTablePagination } from '@/components/data-table'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { LongText } from '@/components/long-text'
import {
  fetchCaseAll,
  fetchCaseGroups,
  fetchCaseInquiryListByCaseIds,
  type Case,
  type CaseInquiry,
} from '@/features/cases/api/client'
import { getBadgeColor } from '@/features/cases/data/data'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
  type CaseDictEntry,
} from '@/features/dictionaries/api/client'
import { useSupplierDetail } from '../supplier-detail-route'

type CaseForTable = Case & {
  supplierInquiries?: CaseInquiry[]
}

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: CaseDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value ?? '')
    valueMap.set(d.dict_value ?? '', d.dict_value ?? '')
  }
  return { keyMap, valueMap }
}

function resolveLabel(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const rawStr = String(raw)
  const byKey = keyMap.get(rawStr.toUpperCase())
  if (byKey) return byKey
  const byValue = valueMap.get(rawStr)
  if (byValue) return byValue
  return rawStr
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateAsHyphen(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const str = String(raw).trim()
  if (!str) return ''
  let d: Date
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str) ||
    /^\d{4}\d{2}\d{2}$/.test(str)
  ) {
    const normalized = /^\d{8}$/.test(str)
      ? `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
      : str.replace(/\//g, '-')
    const [y, m, day] = normalized.split('-').map((s) => parseInt(s, 10))
    if (
      !Number.isNaN(y) &&
      !Number.isNaN(m) &&
      !Number.isNaN(day) &&
      y >= 1000 &&
      m >= 1 &&
      m <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${y}-${pad2(m)}-${pad2(day)}`
    }
  }
  d = new Date(str)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }
  return str
}

function formatDateTimeShort(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const s = String(raw).trim()
  if (!s) return ''
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (m) return `${m[1]} ${m[2]}`
  const dOnly = formatDateAsHyphen(s)
  return dOnly
}

type SupplierQuoteCasesTableProps = {
  supplierId: string
}

export function SupplierQuoteCasesTable({
  supplierId,
}: SupplierQuoteCasesTableProps) {
  const { supplier } = useSupplierDetail()
  const supplierIdNum = Number(supplierId)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'case_uptodate_date', desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })
  const [globalFilter, setGlobalFilter] = useState('')

  const { data: caseRows = [], isLoading: caseLoading } = useQuery({
    queryKey: ['case-all'],
    queryFn: fetchCaseAll,
    staleTime: 30 * 1000,
  })

  const caseIds = useMemo<number[]>(() => {
    const rows = (caseRows as Case[]) ?? []
    return rows
      .map((c) => Number(c.case_id))
      .filter((n) => Number.isFinite(n) && n > 0)
  }, [caseRows])

  const { data: allInquiries = [], isLoading: inquiryLoading } = useQuery({
    queryKey: ['case-inquiry-all-for-supplier-quote', supplierId],
    queryFn: () => fetchCaseInquiryListByCaseIds(caseIds),
    enabled: caseIds.length > 0,
    staleTime: 30 * 1000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['case-list-groups'],
    queryFn: fetchCaseGroups,
    staleTime: 60 * 1000,
  })
  const progressMap = useMemo(
    () => makeDictMap(groupsData?.progressDict ?? []),
    [groupsData]
  )

  const { data: inqTypeARowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-A-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('A'),
    staleTime: 60 * 1000,
  })
  const inqTypeAMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    const list = (inqTypeARowsData as CaseDict[]) ?? []
    for (const d of list) {
      const k = String(d.dict_key ?? '')
      const v = String(d.dict_value ?? d.dict_key ?? '')
      if (k) m.set(k.toUpperCase(), v)
    }
    return m
  }, [inqTypeARowsData])

  const resolveInqTypeALabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = inqTypeAMap.get(p.toUpperCase())
    if (hit) return hit
    return p
  }

  const { data: inqTypeQRowsData = [] } = useQuery({
    queryKey: ['case-dict-prefix-Q-table'],
    queryFn: () => fetchCaseDictByKeyPrefix('Q'),
    staleTime: 60 * 1000,
  })
  const inqTypeQMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>()
    const list = (inqTypeQRowsData as CaseDict[]) ?? []
    for (const d of list) {
      const k = String(d.dict_key ?? '')
      const v = String(d.dict_value ?? d.dict_key ?? '')
      if (k) m.set(k.toUpperCase(), v)
    }
    return m
  }, [inqTypeQRowsData])
  const resolveInqTypeQLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const k = String(raw).trim().toUpperCase()
    if (!k) return ''
    return inqTypeQMap.get(k) ?? String(raw)
  }
  const getQBadgeClass = (rawType: unknown): string => {
    const k = String(rawType ?? '').trim().toUpperCase()
    switch (k) {
      case 'Q1':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200'
      case 'Q2':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200'
      case 'Q3':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200'
      case 'Q4':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200'
      case 'Q7':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const filteredRows = useMemo<CaseForTable[]>(() => {
    const inquiries = (allInquiries as CaseInquiry[]) ?? []
    const inquiriesByCase = new Map<number, CaseInquiry[]>()
    for (const inq of inquiries) {
      if (!Number.isFinite(Number(inq.case_id))) continue
      if (Number(inq.case_inquiry_division_id) !== supplierIdNum) continue
      const cid = Number(inq.case_id)
      if (!inquiriesByCase.has(cid)) inquiriesByCase.set(cid, [])
      inquiriesByCase.get(cid)!.push(inq)
    }
    if (inquiriesByCase.size === 0) return []
    const all = (caseRows as Case[]) ?? []
    const out: CaseForTable[] = []
    for (const c of all) {
      const cid = Number(c.case_id)
      const inqList = inquiriesByCase.get(cid)
      if (!inqList || inqList.length === 0) continue
      out.push({ ...c, supplierInquiries: inqList })
    }
    return out
  }, [allInquiries, caseRows, supplierIdNum])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [supplierId, globalFilter])

  const filteredByGlobal = useMemo(() => {
    const q = globalFilter.trim().toLowerCase()
    if (!q) return filteredRows
    return filteredRows.filter((r) => {
      const baseFields = [
        r.vessel_name,
        r.case_inquiry_keyword,
        r.invoice_number,
        r.order_number,
        r.case_progress,
        r.case_inquiry_type,
        r.case_inquiry_date,
        r.case_uptodate_date,
      ]
        .map((v) => (v == null ? '' : String(v).toLowerCase()))
        .some((s) => s.includes(q))
      if (baseFields) return true
      if (r.supplierInquiries) {
        for (const inq of r.supplierInquiries) {
          const inqText = [
            resolveInqTypeQLabel(inq.case_inquiry_type),
            inq.case_inquired_date,
            inq.remark,
          ]
            .map((v) => (v == null ? '' : String(v).toLowerCase()))
            .join(' ')
          if (inqText.includes(q)) return true
        }
      }
      return false
    })
  }, [filteredRows, globalFilter, inqTypeQMap])

  const columns: ColumnDef<CaseForTable>[] = useMemo(
    () => [
      {
        accessorKey: 'vessel_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='船名' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('vessel_name') as string | null
          const caseId = String(row.original.case_id)
          return (
            <Link
              to='/case_edit/$caseId'
              params={{ caseId }}
              className='inline-flex max-w-44 items-center truncate align-middle font-medium hover:underline'
              title={value ?? ''}
            >
              <LongText className='max-w-44 truncate'>{value ?? '-'}</LongText>
            </Link>
          )
        },
        size: 180,
      },
      {
        accessorKey: 'invoice_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='发票号' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('invoice_number') as string | null
          return (
            <LongText className='max-w-40 truncate'>{value ?? '-'}</LongText>
          )
        },
        size: 160,
        enableSorting: false,
      },
      {
        accessorKey: 'order_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='订单编号' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('order_number') as string | null
          return (
            <LongText className='max-w-40 truncate'>{value ?? '-'}</LongText>
          )
        },
        size: 160,
        enableSorting: false,
      },
      {
        accessorKey: 'case_inquiry_keyword',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='需求/名称' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('case_inquiry_keyword') as string | null
          return (
            <LongText className='max-w-56 truncate'>{value ?? '-'}</LongText>
          )
        },
        size: 240,
      },
      {
        accessorKey: 'case_progress',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='案件进度' />
        ),
        cell: ({ row }) => {
          const raw = row.original.case_progress
          const label = resolveLabel(raw, progressMap) || (raw ?? '')
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn(getBadgeColor(label))}>
              {label}
            </Badge>
          )
        },
        size: 120,
        enableSorting: false,
      },
      {
        accessorKey: 'case_inquiry_type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='需求类型' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('case_inquiry_type') as string | null
          if (!value) return <div>-</div>
          const display = resolveInqTypeALabel(value)
          const isService = display.trim().toLowerCase() === 'service'
          const badgeClass = isService
            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200'
            : getBadgeColor(value)
          return (
            <Badge variant='outline' className={cn(badgeClass)}>
              {display}
            </Badge>
          )
        },
        size: 110,
        enableSorting: false,
      },
      {
        id: 'supplier_inquiry_summary',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='本供应商询价/报价记录' />
        ),
        cell: ({ row }) => {
          const inqList = row.original.supplierInquiries ?? []
          if (inqList.length === 0) {
            return <div className='text-muted-foreground'>-</div>
          }
          const sorted = [...inqList].sort((a, b) => {
            const ad = a.case_inquired_date ?? ''
            const bd = b.case_inquired_date ?? ''
            if (ad === bd) return 0
            return ad < bd ? -1 : 1
          })
          return (
            <div className='flex max-w-[360px] flex-col gap-1.5 py-0.5'>
              {sorted.map((inq) => {
                const typeLabel =
                  resolveInqTypeQLabel(inq.case_inquiry_type) ||
                  String(inq.case_inquiry_type ?? '未分类')
                const dateStr = formatDateTimeShort(inq.case_inquired_date)
                const remark = inq.remark ? String(inq.remark).trim() : ''
                return (
                  <div
                    key={inq.inquiry_id}
                    className='flex flex-col gap-0.5 rounded-md border border-slate-200/70 bg-slate-50/60 px-2 py-1.5'
                  >
                    <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-5 px-1.5 text-[10px] font-medium',
                          getQBadgeClass(inq.case_inquiry_type)
                        )}
                      >
                        {typeLabel}
                      </Badge>
                      {dateStr && (
                        <span className='font-mono text-[11px] text-muted-foreground'>
                          {dateStr}
                        </span>
                      )}
                    </div>
                    {remark && (
                      <LongText
                        className='max-w-full text-[12px] leading-snug text-foreground/80'
                        title={remark}
                      >
                        {remark}
                      </LongText>
                    )}
                  </div>
                )
              })}
            </div>
          )
        },
        size: 380,
        enableSorting: false,
      },
      {
        accessorKey: 'case_inquiry_date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='询价日期' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('case_inquiry_date') as string | null
          const formatted = formatDateAsHyphen(value)
          return <div className='font-mono text-xs'>{formatted || '-'}</div>
        },
        size: 120,
      },
      {
        accessorKey: 'case_uptodate_date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='跟进日期' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('case_uptodate_date') as string | null
          const formatted = formatDateAsHyphen(value)
          return <div className='font-mono text-xs'>{formatted || '-'}</div>
        },
        size: 120,
      },
    ],
    [progressMap, inqTypeAMap, inqTypeQMap]
  )

  const table = useReactTable({
    data: filteredByGlobal,
    columns,
    state: { sorting, pagination, columnVisibility },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: false,
  })

  const isLoading = caseLoading || inquiryLoading
  const totalCount = filteredByGlobal.length

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col gap-4 overflow-hidden'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-9 w-72' />
          <Skeleton className='h-9 w-32' />
        </div>
        <div className='flex flex-1 flex-col gap-2 rounded-md border p-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-full' />
          ))}
        </div>
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-1 flex-col items-start gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-x-2'>
          <Input
            placeholder='搜索船名、需求、发票号、询价类型/备注…'
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className='h-8 w-37.5 lg:w-80'
          />
          <Badge variant='outline' className='h-8 px-3 font-normal'>
            共 {totalCount} 条报价案件
          </Badge>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={() => table.resetColumnFilters(true)}
          >
            <SearchIcon className='size-4' />
            查询
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className='flex flex-1 flex-col overflow-hidden rounded-md border'>
        <div className='relative w-full flex-1 overflow-auto'>
          <table className='w-max min-w-full table-auto caption-bottom text-sm'>
            <TableHeader className='bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='group/row'>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'sticky top-0 z-10 bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        header.column.columnDef.meta?.thClassName
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
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
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted align-top',
                          cell.column.columnDef.meta?.className
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
                    className='h-24 text-center text-muted-foreground'
                  >
                    暂无该供应商的询价/报价记录（当前筛选 {totalCount} 条）
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
