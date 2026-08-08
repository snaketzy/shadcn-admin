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
import { type Collaboration } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getCollaborationsColumns } from './collaborations-columns'
import { fetchCollaborationAll, fetchCollaborationGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_authenticated/collaboration_list/')

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
  collaboration_name: {
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

type DataTableProps = Record<string, never>

export function CollaborationsTable(_: DataTableProps) {
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
    queryKey: ['collaboration-list'],
    queryFn: fetchCollaborationAll,
  })
  const allRows: Collaboration[] = allRowsData as Collaboration[]

  const { data: groupsData } = useQuery({
    queryKey: ['collaboration-list-groups'],
    queryFn: fetchCollaborationGroups,
  })
  const shortnames = groupsData?.shortnames ?? []
  const fields = groupsData?.fields ?? []
  const fieldDict = groupsData?.fieldDict ?? []
  const columns = useMemo(() => getCollaborationsColumns(fieldDict), [fieldDict])

  const fieldFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const result: { label: string; value: string }[] = []
    for (const d of fieldDict) {
      if (!d.dict_key) continue
      if (seen.has(d.dict_key)) continue
      seen.add(d.dict_key)
      result.push({ label: d.dict_value || d.dict_key, value: d.dict_key })
    }
    for (const raw of fields) {
      if (!raw) continue
      if (seen.has(raw)) continue
      seen.add(raw)
      result.push({ label: raw, value: raw })
    }
    return result
  }, [fieldDict, fields])

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<typeof useTableUrlState>[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'collaboration_shortname', searchKey: 'collaborationShortname', type: 'array' },
      { columnId: 'collaboration_field', searchKey: 'collaborationField', type: 'array' },
    ],
  })
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = urlState

  const collaborationName: string =
    (search as unknown as { collaborationName?: string }).collaborationName ?? ''
  const contactId: string =
    (search as unknown as { contactId?: string }).contactId ?? ''

  const shortnameFilter = useMemo(
    () =>
      Array.isArray((search as any).collaborationShortname)
        ? ((search as any).collaborationShortname as string[])
        : [],
    [(search as any).collaborationShortname]
  )
  const fieldFilter = useMemo(
    () =>
      Array.isArray((search as any).collaborationField)
        ? ((search as any).collaborationField as string[])
        : [],
    [(search as any).collaborationField]
  )

  const filteredData: Collaboration[] = useMemo(() => {
    let result = allRows
    if (collaborationName.trim() !== '') {
      const q = collaborationName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.collaboration_name).toLowerCase().includes(q)
      )
    }
    if (contactId.trim() !== '') {
      const q = Number(contactId.trim())
      if (!isNaN(q)) {
        result = result.filter((r) => r.collaboration_contact_id === q)
      }
    }
    if (shortnameFilter.length > 0) {
      result = result.filter((r) =>
        shortnameFilter.includes(r.collaboration_shortname ?? '')
      )
    }
    if (fieldFilter.length > 0) {
      result = result.filter((r) => {
        const raw = r.collaboration_field ?? ''
        const parts = String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        return fieldFilter.some((f) => parts.includes(f))
      })
    }
    return result
  }, [
    allRows,
    collaborationName,
    contactId,
    shortnameFilter,
    fieldFilter,
  ])

  const handleTextFilterChange = (
    type: 'collaborationName' | 'contactId',
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
        collaborationName: undefined,
        contactId: undefined,
        collaborationShortname: undefined,
        collaborationField: undefined,
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
    collaborationName.trim() !== '' ||
    contactId.trim() !== ''

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
            placeholder='按协作商名称筛选...'
            value={collaborationName}
            onChange={(e) => handleTextFilterChange('collaborationName', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按联系人ID筛选...'
            value={contactId}
            onChange={(e) => handleTextFilterChange('contactId', e.target.value)}
            type='number'
            className='h-8 w-37.5 lg:w-62.5'
          />
          <div className='flex gap-x-2'>
            {shortnames.length > 0 && table.getColumn('collaboration_shortname') && (
              <DataTableFacetedFilter
                column={table.getColumn('collaboration_shortname')!}
                title='协作商简称'
                options={shortnames.map((s) => ({ label: s, value: s }))}
              />
            )}
            {fieldFilterOptions.length > 0 && table.getColumn('collaboration_field') && (
              <DataTableFacetedFilter
                column={table.getColumn('collaboration_field')!}
                title='经营范围'
                options={fieldFilterOptions}
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
