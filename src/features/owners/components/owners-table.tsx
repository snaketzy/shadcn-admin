import { useEffect, useState, useMemo } from 'react'
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
import { type Owner } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getOwnersColumns } from './owners-columns'
import { fetchOwnerAll, fetchOwnerGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_authenticated/owner_list/')

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
  owner_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 48,
      zIndex: 50,
      width: 220,
      minWidth: 220,
    },
    td: {
      position: 'sticky',
      left: 48,
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

export function OwnersTable() {
  const queryClient = useQueryClient()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const {
    data: allRowsData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['owner-list'],
    queryFn: fetchOwnerAll,
  })
  const allRows: Owner[] = allRowsData as Owner[]

  const { data: groupsData } = useQuery({
    queryKey: ['owner-list-groups'],
    queryFn: fetchOwnerGroups,
  })
  const teamDict = groupsData?.teamDict ?? []
  const departmentDict = groupsData?.departmentDict ?? []
  const rankDict = groupsData?.rankDict ?? []
  const columns = useMemo(
    () => getOwnersColumns(teamDict, departmentDict, rankDict),
    [teamDict, departmentDict, rankDict]
  )

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<typeof useTableUrlState>[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'owner_team', searchKey: 'ownerTeam', type: 'array' },
      { columnId: 'owner_department', searchKey: 'ownerDepartment', type: 'array' },
      { columnId: 'owner_rank', searchKey: 'ownerRank', type: 'array' },
    ],
  })
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = urlState

  const ownerName: string =
    (search as unknown as { ownerName?: string }).ownerName ?? ''
  const contactSearch: string =
    (search as unknown as { contactSearch?: string }).contactSearch ?? ''

  const ownerTeamFilter = useMemo(
    () =>
      Array.isArray((search as any).ownerTeam)
        ? ((search as any).ownerTeam as string[])
        : [],
    [search]
  )
  const ownerDepartmentFilter = useMemo(
    () =>
      Array.isArray((search as any).ownerDepartment)
        ? ((search as any).ownerDepartment as string[])
        : [],
    [search]
  )
  const ownerRankFilter = useMemo(
    () =>
      Array.isArray((search as any).ownerRank)
        ? ((search as any).ownerRank as string[])
        : [],
    [search]
  )

  const filteredData: Owner[] = useMemo(() => {
    let result = allRows
    if (ownerName.trim() !== '') {
      const q = ownerName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.owner_name).toLowerCase().includes(q)
      )
    }
    if (contactSearch.trim() !== '') {
      const q = contactSearch.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.owner_email ?? '').toLowerCase().includes(q) ||
        String(r.owner_phone ?? '').toLowerCase().includes(q) ||
        String(r.owner_department_email ?? '').toLowerCase().includes(q)
      )
    }
    if (ownerTeamFilter.length > 0) {
      result = result.filter((r) =>
        ownerTeamFilter.includes(r.owner_team ?? '')
      )
    }
    if (ownerDepartmentFilter.length > 0) {
      result = result.filter((r) =>
        ownerDepartmentFilter.includes(r.owner_department ?? '')
      )
    }
    if (ownerRankFilter.length > 0) {
      result = result.filter((r) =>
        ownerRankFilter.includes(r.owner_rank ?? '')
      )
    }
    return result
  }, [
    allRows,
    ownerName,
    contactSearch,
    ownerTeamFilter,
    ownerDepartmentFilter,
    ownerRankFilter,
  ])

  const handleTextFilterChange = (
    type: 'ownerName' | 'contactSearch',
    value: string
  ) => {
    navigate({
      search: (prev: any) => ({
        ...(prev ?? {}),
        [type]: value || undefined,
        page: undefined,
      }),
    })
  }

  const handleResetFilters = () => {
    navigate({
      search: {
        page: undefined,
        pageSize: undefined,
        ownerName: undefined,
        contactSearch: undefined,
        ownerTeam: undefined,
        ownerDepartment: undefined,
        ownerRank: undefined,
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
    ownerName.trim() !== '' ||
    contactSearch.trim() !== ''

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
            placeholder='按船东名称筛选...'
            value={ownerName}
            onChange={(e) => handleTextFilterChange('ownerName', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按邮箱/电话筛选...'
            value={contactSearch}
            onChange={(e) => handleTextFilterChange('contactSearch', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <div className='flex gap-x-2'>
            {teamDict.length > 0 && table.getColumn('owner_team') && (
              <DataTableFacetedFilter
                column={table.getColumn('owner_team')!}
                title='船东小组'
                options={teamDict.map((d) => ({
                  label: d.dict_value,
                  value: d.dict_key,
                }))}
              />
            )}
            {departmentDict.length > 0 && table.getColumn('owner_department') && (
              <DataTableFacetedFilter
                column={table.getColumn('owner_department')!}
                title='船东部门'
                options={departmentDict.map((d) => ({
                  label: d.dict_value,
                  value: d.dict_key,
                }))}
              />
            )}
            {rankDict.length > 0 && table.getColumn('owner_rank') && (
              <DataTableFacetedFilter
                column={table.getColumn('owner_rank')!}
                title='船东职级'
                options={rankDict.map((d) => ({
                  label: d.dict_value,
                  value: d.dict_key,
                }))}
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
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={async () => {
              await queryClient.refetchQueries({ queryKey: ['owner-list'] })
              await queryClient.refetchQueries({ queryKey: ['owner-list-groups'] })
            }}
          >
            <SearchIcon className='size-4' />
            查询
          </Button>
        <DataTableViewOptions table={table} />
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
