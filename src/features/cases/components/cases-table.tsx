import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
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
import { Cross2Icon } from '@radix-ui/react-icons'
import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { type Case } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getCasesColumns } from './cases-columns'
import { fetchCaseAll, fetchCaseGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

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

  const columns = useMemo(() => getCasesColumns(), [])

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<typeof useTableUrlState>[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'invoice_number', searchKey: 'invoiceNumber', type: 'array' },
      { columnId: 'order_number', searchKey: 'orderNumber', type: 'array' },
      { columnId: 'case_progress', searchKey: 'caseProgress', type: 'array' },
      { columnId: 'case_inquiry_type', searchKey: 'caseInquiryType', type: 'array' },
      { columnId: 'case_incharge', searchKey: 'caseIncharge', type: 'array' },
      { columnId: 'case_rank', searchKey: 'caseRank', type: 'array' },
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
    (search as unknown as { caseInquiryKeyword?: string }).caseInquiryKeyword ?? ''

  const [editingVesselName, setEditingVesselName] = useState(urlVesselName)
  const vesselNameComposingRef = useRef(false)
  const vesselNameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingKeyword, setEditingKeyword] = useState(urlKeyword)
  const keywordComposingRef = useRef(false)
  const keywordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingVesselName !== urlVesselName)
      setEditingVesselName(urlVesselName)
  }, [urlVesselName])

  useEffect(() => {
    if (editingKeyword !== urlKeyword)
      setEditingKeyword(urlKeyword)
  }, [urlKeyword])

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
      if (keywordDebounceRef.current)
        clearTimeout(keywordDebounceRef.current)
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

  const filteredData: Case[] = useMemo(() => {
    const vesselName = editingVesselName
    const keyword = editingKeyword
    let result = allRows
    if (vesselName.trim() !== '') {
      const q = vesselName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.vessel_name ?? '').toLowerCase().includes(q)
      )
    }
    if (keyword.trim() !== '') {
      const q = keyword.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.case_inquiry_keyword ?? '').toLowerCase().includes(q)
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
      result = result.filter((r) =>
        caseInchargeFilter.includes(r.case_incharge ?? '')
      )
    }
    if (caseRankFilter.length > 0) {
      result = result.filter((r) =>
        caseRankFilter.includes(r.case_rank ?? '')
      )
    }
    return result
  }, [
    allRows,
    editingVesselName,
    editingKeyword,
    caseProgressFilter,
    caseInquiryTypeFilter,
    caseInchargeFilter,
    caseRankFilter,
  ])

  const handleResetFilters = () => {
    navigate({
      search: {
        page: undefined,
        pageSize: undefined,
        vesselName: undefined,
        caseInquiryKeyword: undefined,
        invoiceNumber: undefined,
        orderNumber: undefined,
        caseProgress: undefined,
        caseInquiryType: undefined,
        caseIncharge: undefined,
        caseRank: undefined,
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
    editingKeyword.trim() !== ''

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

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
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
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按需求编号/名称筛选...'
            value={editingKeyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onCompositionStart={onKeywordCompositionStart}
            onCompositionEnd={(e) =>
              onKeywordCompositionEnd((e.target as HTMLInputElement).value)
            }
            className='h-8 w-37.5 lg:w-62.5'
          />
          <div className='flex gap-x-2'>
            {caseProgresses.length > 0 && table.getColumn('case_progress') && (
              <DataTableFacetedFilter
                column={table.getColumn('case_progress')!}
                title='案件进度'
                options={caseProgresses.map((s) => ({ label: s, value: s }))}
              />
            )}
            {caseInquiryTypes.length > 0 && table.getColumn('case_inquiry_type') && (
              <DataTableFacetedFilter
                column={table.getColumn('case_inquiry_type')!}
                title='需求類型'
                options={caseInquiryTypes.map((s) => ({ label: s, value: s }))}
              />
            )}
            {caseInCharges.length > 0 && table.getColumn('case_incharge') && (
              <DataTableFacetedFilter
                column={table.getColumn('case_incharge')!}
                title='案件负责人'
                options={caseInCharges.map((s) => ({ label: s, value: s }))}
              />
            )}
            {caseRanks.length > 0 && table.getColumn('case_rank') && (
              <DataTableFacetedFilter
                column={table.getColumn('case_rank')!}
                title='案件评级'
                options={caseRanks.map((s) => ({ label: s, value: s }))}
              />
            )}
          </div>
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
              await queryClient.refetchQueries({ queryKey: ['case-list-groups'] })
            }}
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
