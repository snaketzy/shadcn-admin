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
  type Case,
} from '@/features/cases/api/client'
import { getBadgeColor } from '@/features/cases/data/data'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
  type CaseDictEntry,
} from '@/features/dictionaries/api/client'
import { useVesselDetail } from '../vessel-detail-route'

type CaseForTable = Case

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

type Props = {
  vesselId: string
}

export function VesselCooperationCasesTable({ vesselId }: Props) {
  const { vessel } = useVesselDetail()

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

  const vesselNameNormalized = useMemo(() => {
    const n = vessel?.vessel_name
    return n ? String(n).trim().toLowerCase() : ''
  }, [vessel])

  const vesselIdNum = useMemo(() => {
    const n = Number(vesselId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [vesselId])

  const filteredRows = useMemo(() => {
    const all = (caseRows as CaseForTable[]) ?? []
    if (!vesselNameNormalized && vesselIdNum == null) return []
    return all.filter((c) => {
      const vn = c.vessel_name ? String(c.vessel_name).trim().toLowerCase() : ''
      if (vesselNameNormalized && vn === vesselNameNormalized) return true
      return false
    })
  }, [caseRows, vesselNameNormalized, vesselIdNum])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [vesselId, globalFilter])

  const filteredByGlobal = useMemo(() => {
    const q = globalFilter.trim().toLowerCase()
    if (!q) return filteredRows
    return filteredRows.filter((r) =>
      [
        r.vessel_name,
        r.case_inquiry_keyword,
        r.invoice_number,
        r.order_number,
        r.case_progress,
        r.case_inquiry_type,
        r.shipyard_business,
        r.case_delivery_or_service_incharge,
        r.owner_following,
      ]
        .map((v) => (v == null ? '' : String(v).toLowerCase()))
        .some((s) => s.includes(q))
    )
  }, [filteredRows, globalFilter])

  const columns: ColumnDef<CaseForTable>[] = useMemo(
    () => [
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
        size: 180,
        enableSorting: false,
      },
      {
        accessorKey: 'case_inquiry_keyword',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='需求/名称' />
        ),
        cell: ({ row }) => {
          const caseId = String(row.original.case_id)
          const value = row.getValue('case_inquiry_keyword') as string | null
          return (
            <Link
              to='/case_edit/$caseId'
              params={{ caseId }}
              className='inline-flex max-w-64 items-center truncate align-middle font-medium hover:underline'
              title={value ?? ''}
            >
              <LongText className='max-w-64 truncate'>{value ?? '-'}</LongText>
            </Link>
          )
        },
        size: 260,
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
        size: 130,
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
        size: 120,
        enableSorting: false,
      },
      {
        accessorKey: 'owner_following',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='船东联系人' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('owner_following') as string | null
          return (
            <LongText className='max-w-32 truncate'>{value ?? '-'}</LongText>
          )
        },
        size: 140,
        enableSorting: false,
      },
      {
        accessorKey: 'case_superintendent',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='机务' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('case_superintendent') as string | null
          return (
            <LongText className='max-w-28 truncate'>{value ?? '-'}</LongText>
          )
        },
        size: 120,
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
    [progressMap, inqTypeAMap]
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

  const isLoading = caseLoading
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

  if (!vessel) return null

  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-1 flex-col items-start gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-x-2'>
          <Input
            placeholder='搜索需求、发票号、订单号、船东联系人、机务…'
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className='h-8 w-37.5 lg:w-80'
          />
          <Badge variant='outline' className='h-8 px-3 font-normal'>
            共 {totalCount} 条关联案件
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
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
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
                    暂无该船舶的关联案件（当前筛选 {totalCount} 条）
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
