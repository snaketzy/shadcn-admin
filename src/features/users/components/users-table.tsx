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
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { type NavigateFn } from '@/hooks/use-table-url-state'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { type Vessel } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { usersColumns as columns } from './users-columns'
import { fetchVesselAll, fetchVesselGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

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
  vessel_incharge: {
    th: {
      position: 'sticky',
      top: 0,
      right: 88,
      zIndex: 50,
      width: 50,
      minWidth: 50,
    },
    td: {
      position: 'sticky',
      right: 88,
      zIndex: 20,
      width: 50,
      minWidth: 50,
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

type DataTableProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function UsersTable({ search, navigate }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const {
    data: allRowsData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['vessel-list'],
    queryFn: fetchVesselAll,
  })
  const allRows: Vessel[] = allRowsData as Vessel[]

  const { data: groupsData } = useQuery({
    queryKey: ['vessel-list-groups'],
    queryFn: fetchVesselGroups,
  })
  const teams = groupsData?.teams ?? []
  const flags = groupsData?.flags ?? []
  const classes = groupsData?.classes ?? []

  const vesselName: string = useMemo(
    () => ((search as any).vesselName as string) ?? '',
    [search]
  )
  const vesselIncharge: string = useMemo(
    () => ((search as any).vesselIncharge as string) ?? '',
    [search]
  )
  const vesselTeamFilter: string[] = useMemo(
    () => (Array.isArray((search as any).vesselTeam) ? (search as any).vesselTeam : []),
    [search]
  )
  const vesselFlagFilter: string[] = useMemo(
    () => (Array.isArray((search as any).vesselFlag) ? (search as any).vesselFlag : []),
    [search]
  )
  const vesselClassFilter: string[] = useMemo(
    () => (Array.isArray((search as any).vesselClass) ? (search as any).vesselClass : []),
    [search]
  )

  const filteredData: Vessel[] = useMemo(() => {
    let result = allRows
    if (vesselName.trim() !== '') {
      const q = vesselName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.vessel_name).toLowerCase().includes(q)
      )
    }
    if (vesselIncharge.trim() !== '') {
      const q = vesselIncharge.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.vessel_incharge ?? '').toLowerCase().includes(q)
      )
    }
    if (vesselTeamFilter.length > 0) {
      result = result.filter((r) => vesselTeamFilter.includes(r.vessel_team ?? ''))
    }
    if (vesselFlagFilter.length > 0) {
      result = result.filter((r) => vesselFlagFilter.includes(r.vessel_flag ?? ''))
    }
    if (vesselClassFilter.length > 0) {
      result = result.filter((r) => vesselClassFilter.includes(r.vessel_class ?? ''))
    }
    return result
  }, [allRows, vesselName, vesselIncharge, vesselTeamFilter, vesselFlagFilter, vesselClassFilter])

  const page = Number((search as any).page ?? 1)
  const pageSize = Number((search as any).pageSize ?? 10)

  const pagination = useMemo(
    () => ({ pageIndex: Math.max(0, page - 1), pageSize }),
    [page, pageSize]
  )

  const totalPageCount = Math.max(1, Math.ceil(filteredData.length / pageSize))

  const onPaginationChange = (
    updater: React.SetStateAction<{ pageIndex: number; pageSize: number }>
  ) => {
    const next =
      typeof updater === 'function' ? updater(pagination) : updater
    navigate({
      search: (prev: any) => ({
        ...(prev ?? {}),
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      }),
      replace: true,
    })
  }

  useEffect(() => {
    if (pagination.pageIndex >= totalPageCount && totalPageCount > 0) {
      navigate({
        search: (prev: any) => ({
          ...(prev ?? {}),
          page: totalPageCount,
        }),
        replace: true,
      })
    }
  }, [pagination.pageIndex, totalPageCount, navigate])

  const columnFilters = useMemo(() => {
    const result: Array<{ id: string; value: unknown }> = []
    if (vesselTeamFilter.length > 0) {
      result.push({ id: 'vessel_team', value: vesselTeamFilter })
    }
    if (vesselFlagFilter.length > 0) {
      result.push({ id: 'vessel_flag', value: vesselFlagFilter })
    }
    if (vesselClassFilter.length > 0) {
      result.push({ id: 'vessel_class', value: vesselClassFilter })
    }
    return result
  }, [vesselTeamFilter, vesselFlagFilter, vesselClassFilter])

  const onColumnFiltersChange = (
    updater: React.SetStateAction<Array<{ id: string; value: unknown }>>
  ) => {
    const next =
      typeof updater === 'function' ? updater(columnFilters) : updater
    const nextMap = new Map(next.map((f) => [f.id, f.value]))
    navigate({
      search: (prev: any) => ({
        ...(prev ?? {}),
        vesselTeam: (nextMap.get('vessel_team') as string[]) ?? [],
        vesselFlag: (nextMap.get('vessel_flag') as string[]) ?? [],
        vesselClass: (nextMap.get('vessel_class') as string[]) ?? [],
      }),
      replace: true,
    })
  }

  const handleResetFilters = () => {
    navigate({
      search: (prev: any) => ({
        ...(prev ?? {}),
        vesselName: '',
        vesselIncharge: '',
        vesselTeam: [],
        vesselFlag: [],
        vesselClass: [],
        page: 1,
      }),
      replace: true,
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

  const isFiltered =
    columnFilters.length > 0 ||
    vesselName.trim() !== '' ||
    vesselIncharge.trim() !== ''

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
            value={vesselName}
            onChange={(e) =>
              navigate({
                search: (prev: any) => ({
                  ...(prev ?? {}),
                  vesselName: e.target.value,
                  page: 1,
                }),
                replace: true,
              })
            }
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按负责人筛选...'
            value={vesselIncharge}
            onChange={(e) =>
              navigate({
                search: (prev: any) => ({
                  ...(prev ?? {}),
                  vesselIncharge: e.target.value,
                  page: 1,
                }),
                replace: true,
              })
            }
            className='h-8 w-37.5 lg:w-50'
          />
          <div className='flex gap-x-2'>
            {teams.length > 0 && table.getColumn('vessel_team') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_team')!}
                title='Team'
                options={teams.map((t) => ({ label: t, value: t }))}
              />
            )}
            {flags.length > 0 && table.getColumn('vessel_flag') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_flag')!}
                title='Flag'
                options={flags.map((f) => ({ label: f, value: f }))}
              />
            )}
            {classes.length > 0 && table.getColumn('vessel_class') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_class')!}
                title='Class'
                options={classes.map((c) => ({ label: c, value: c }))}
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
