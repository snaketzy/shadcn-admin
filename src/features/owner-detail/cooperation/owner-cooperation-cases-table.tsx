import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTableColumnHeader, DataTablePagination } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { fetchCaseAll, type Case } from '@/features/cases/api/client'
import { getBadgeColor } from '@/features/cases/data/data'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
} from '@/features/dictionaries/api/client'
import { fetchOwnerAll, type Owner } from '@/features/owners/api/client'
import { useOwnerDetail } from '../owner-detail-route'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: { dict_key: string | number | null; dict_value: string | null }[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    if (d.dict_key == null) continue
    const k = String(d.dict_key).toUpperCase()
    const v = d.dict_value ?? ''
    if (v) {
      keyMap.set(k, v)
      valueMap.set(v, v)
    }
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

type CaseForTable = Case & {
  owner_following_id?: number | null
  case_superintendent_id?: number | null
}

function useProgressDict() {
  return useQuery({
    queryKey: ['case-list-groups'],
    queryFn: async () => {
      const { fetchCaseGroups } = await import('@/features/cases/api/client')
      return fetchCaseGroups()
    },
    staleTime: 60 * 1000,
  })
}

export function OwnerCooperationCasesTable() {
  const { owner, ownerId } = useOwnerDetail()
  const ownerIdNum = Number(ownerId)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'case_uptodate_date', desc: true },
  ])
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  const { data: allCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['case-all'],
    queryFn: fetchCaseAll,
    staleTime: 60 * 1000,
  })

  const { data: ownerAllRows = [] } = useQuery({
    queryKey: ['owner-picker-all-for-cooperation'],
    queryFn: fetchOwnerAll,
    staleTime: 60 * 1000,
  })

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

  const { data: groupsData } = useProgressDict()
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

  const filteredRows = useMemo(() => {
    if (!owner || !Number.isFinite(ownerIdNum) || ownerIdNum <= 0) return []
    return (allCases as CaseForTable[]).filter((c) => {
      const followId = c.owner_following_id
      const superId = c.case_superintendent_id
      const matchFollow =
        followId != null && Number.isFinite(followId) && Number(followId) === ownerIdNum
      const matchSuper =
        superId != null && Number.isFinite(superId) && Number(superId) === ownerIdNum
      return matchFollow || matchSuper
    })
  }, [allCases, owner, ownerIdNum])

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
              <LongText className='max-w-44 truncate'>
                {value ?? '-'}
              </LongText>
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
            <LongText className='max-w-40 truncate'>
              {value ?? '-'}
            </LongText>
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
            <LongText className='max-w-40 truncate'>
              {value ?? '-'}
            </LongText>
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
            <LongText className='max-w-56 truncate'>
              {value ?? '-'}
            </LongText>
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
        accessorKey: 'owner_following',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='船东联系人' />
        ),
        cell: ({ row }) => {
          const value = row.getValue('owner_following') as string | null
          const id = (row.original as CaseForTable).owner_following_id
          const isCurrent =
            id != null && Number(id) === ownerIdNum
          return (
            <div className='flex items-center gap-1.5'>
              <span>{value ?? '-'}</span>
              {isCurrent && (
                <Badge variant='secondary' className='h-5 px-1.5 text-[10px]'>
                  当前
                </Badge>
              )}
            </div>
          )
        },
        size: 140,
        enableSorting: false,
      },
      {
        accessorKey: 'case_superintendent',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='案件机务' />
        ),
        cell: ({ row }) => {
          const superintendentId = (row.original as CaseForTable)
            .case_superintendent_id
          let displayName: string | null = null
          if (
            superintendentId != null &&
            superintendentId !== '' &&
            ownerIdEmailMap
          ) {
            const found = ownerIdEmailMap.get(String(superintendentId))
            if (found?.owner_name) {
              displayName = found.owner_name
            }
          }
          if (!displayName) {
            const value = row.getValue('case_superintendent') as string | null
            displayName = value
          }
          return <LongText className='max-w-40'>{displayName ?? '-'}</LongText>
        },
        size: 140,
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
          return (
            <div className='font-mono text-xs'>{formatted || '-'}</div>
          )
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
          return (
            <div className='font-mono text-xs'>{formatted || '-'}</div>
          )
        },
        size: 120,
      },
    ],
    [progressMap, ownerIdNum, inqTypeAMap, ownerIdEmailMap]
  )

  const pagination = useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  )

  const table = useReactTable<CaseForTable>({
    data: filteredRows,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    pageCount: Math.max(
      1,
      Math.ceil(filteredRows.length / Math.max(1, pageSize))
    ),
  })

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='flex flex-wrap items-center gap-2 p-2 flex-none'>
        <div className='relative flex-1 min-w-64 max-w-sm'>
          <Search className='absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='搜索船名、需求、发票号…'
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(String(e.target.value))}
            className='h-9 w-full pl-8'
          />
        </div>
        <Badge variant='outline' className='h-8 px-2'>
          共 {filteredRows.length} 条合作案件
        </Badge>
      </div>

      <div className='relative min-h-0 flex-1 overflow-hidden rounded-md border'>
        <div className='absolute inset-0 overflow-auto'>
          <Table>
            <TableHeader className='sticky top-0 z-10 bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: `${header.getSize()}px` }}
                        className={cn(
                          'border-b bg-muted/30 whitespace-nowrap'
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
              {casesLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={`sk-${i}-${j}`}>
                        <Skeleton className='h-6 w-full' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: `${cell.column.getSize()}px` }}
                        className='whitespace-nowrap'
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
                    className='h-40 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground'>
                      <Search className='size-6 opacity-40' />
                      <span>暂无合作案件记录</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className='flex-none py-3'>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
