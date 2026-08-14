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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchIcon } from 'lucide-react'
import { type Vessel } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getUsersColumns } from './users-columns'
import { fetchVesselAll, fetchVesselGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_authenticated/vessel_list/')

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
      width: 100,
      minWidth: 100,
    },
    td: {
      position: 'sticky',
      right: 88,
      zIndex: 20,
      width: 100,
      minWidth: 100,
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

export function UsersTable(_: DataTableProps) {
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
  const inchargeDict = groupsData?.inchargeDict ?? []
  const fleetManagerDict = groupsData?.fleetManagerDict ?? []
  const columns = useMemo(
    () => getUsersColumns(inchargeDict, fleetManagerDict),
    [inchargeDict, fleetManagerDict]
  )

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<typeof useTableUrlState>[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 50 },
    columnFilters: [
      { columnId: 'vessel_team', searchKey: 'vesselTeam', type: 'array' },
      { columnId: 'vessel_flag', searchKey: 'vesselFlag', type: 'array' },
      { columnId: 'vessel_class', searchKey: 'vesselClass', type: 'array' },
      { columnId: 'vessel_incharge', searchKey: 'vesselIncharge', type: 'array' },
      { columnId: 'vessel_fleet_manager', searchKey: 'vesselFleetManager', type: 'array' },
    ],
  })
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = urlState

  const vesselName: string =
    (search as unknown as { vesselName?: string }).vesselName ?? ''

  const vesselTeamFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselTeam)
        ? ((search as any).vesselTeam as string[])
        : [],
    [search]
  )
  const vesselFlagFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselFlag)
        ? ((search as any).vesselFlag as string[])
        : [],
    [search]
  )
  const vesselClassFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselClass)
        ? ((search as any).vesselClass as string[])
        : [],
    [search]
  )
  const vesselInchargeFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselIncharge)
        ? ((search as any).vesselIncharge as string[])
        : [],
    [search]
  )
  const vesselFleetManagerFilter = useMemo(
    () =>
      Array.isArray((search as any).vesselFleetManager)
        ? ((search as any).vesselFleetManager as string[])
        : [],
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
    if (vesselTeamFilter.length > 0) {
      result = result.filter((r) =>
        vesselTeamFilter.includes(r.vessel_team ?? '')
      )
    }
    if (vesselFlagFilter.length > 0) {
      result = result.filter((r) =>
        vesselFlagFilter.includes(r.vessel_flag ?? '')
      )
    }
    if (vesselClassFilter.length > 0) {
      result = result.filter((r) =>
        vesselClassFilter.includes(r.vessel_class ?? '')
      )
    }
    if (vesselInchargeFilter.length > 0) {
      result = result.filter((r) =>
        vesselInchargeFilter.includes(r.vessel_incharge ?? '')
      )
    }
    if (vesselFleetManagerFilter.length > 0) {
      result = result.filter((r) =>
        vesselFleetManagerFilter.includes(r.vessel_fleet_manager ?? '')
      )
    }
    return result
  }, [
    allRows,
    vesselName,
    vesselTeamFilter,
    vesselFlagFilter,
    vesselClassFilter,
    vesselInchargeFilter,
    vesselFleetManagerFilter,
  ])

  const handleTextFilterChange = (
    type: 'vesselName',
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
        vesselName: undefined,
        vesselIncharge: undefined,
        vesselFleetManager: undefined,
        vesselTeam: undefined,
        vesselFlag: undefined,
        vesselClass: undefined,
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
    vesselName.trim() !== ''

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
        'flex flex-1 flex-col gap-4 overflow-hidden w-full min-w-0'
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-1 flex-col items-start gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-x-2'>
          <Input
            placeholder='按船名筛选...'
            value={vesselName}
            onChange={(e) => handleTextFilterChange('vesselName', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <div className='flex gap-x-2'>
            {inchargeDict.length > 0 && table.getColumn('vessel_incharge') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_incharge')!}
                title='负责人'
                options={inchargeDict.map((d) => ({
                  label: d.dict_value,
                  value: d.dict_key,
                }))}
              />
            )}
            {teams.length > 0 && table.getColumn('vessel_team') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_team')!}
                title='Team'
                options={teams.map((t) => ({ label: t, value: t }))}
              />
            )}
            {fleetManagerDict.length > 0 && table.getColumn('vessel_fleet_manager') && (
              <DataTableFacetedFilter
                column={table.getColumn('vessel_fleet_manager')!}
                title='管理公司'
                options={fleetManagerDict.map((d) => ({
                  label: d.dict_value,
                  value: d.dict_key,
                }))}
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
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={async () => {
              await queryClient.refetchQueries({ queryKey: ['vessel-list'] })
              await queryClient.refetchQueries({ queryKey: ['vessel-list-groups'] })
            }}
          >
            <SearchIcon className='size-4' />
            查询
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className='flex flex-1 flex-col overflow-hidden rounded-md border w-full min-w-0'>
        <div className='relative w-full flex-1 overflow-auto'>
          <table className='w-full min-w-[1200px] table-auto caption-bottom text-sm'>
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
