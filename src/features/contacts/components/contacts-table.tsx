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
import { type Contact } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getContactsColumns } from './contacts-columns'
import { fetchContactAll, fetchContactGroups } from '../api/client'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_authenticated/contact_list/')

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
  contact_name: {
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

export function ContactsTable(_: DataTableProps) {
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
    queryKey: ['contact-list'],
    queryFn: fetchContactAll,
  })
  const allRows: Contact[] = allRowsData as Contact[]

  const { data: groupsData } = useQuery({
    queryKey: ['contact-list-groups'],
    queryFn: fetchContactGroups,
  })
  const typeDict = groupsData?.typeDict ?? []
  const divisionDict = groupsData?.divisionDict ?? []
  const types = groupsData?.types ?? []
  const columns = useMemo(() => getContactsColumns(typeDict, divisionDict), [typeDict, divisionDict])

  const typeFacetOptions = useMemo(() => {
    const result: { label: string; value: string }[] = []
    const seenValues = new Set<string>()
    for (const d of typeDict) {
      if (!seenValues.has(d.dict_key)) {
        seenValues.add(d.dict_key)
        result.push({ label: d.dict_value, value: d.dict_key })
      }
    }
    for (const t of types) {
      if (!seenValues.has(t)) {
        seenValues.add(t)
        result.push({ label: t, value: t })
      }
    }
    return result
  }, [typeDict, types])

  const urlState = useTableUrlState({
    search: search as Record<string, unknown>,
    navigate: navigate as unknown as Parameters<typeof useTableUrlState>[0]['navigate'],
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'contact_type', searchKey: 'contactType', type: 'array' },
    ],
  })
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = urlState

  const contactName: string =
    (search as unknown as { contactName?: string }).contactName ?? ''
  const contactSearch: string =
    (search as unknown as { contactSearch?: string }).contactSearch ?? ''

  const typeFilter = useMemo(
    () =>
      Array.isArray((search as any).contactType)
        ? ((search as any).contactType as string[])
        : [],
    [search]
  )

  const filteredData: Contact[] = useMemo(() => {
    let result = allRows
    if (contactName.trim() !== '') {
      const q = contactName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.contact_name).toLowerCase().includes(q)
      )
    }
    if (contactSearch.trim() !== '') {
      const q = contactSearch.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.contact_name ?? '').toLowerCase().includes(q) ||
        String(r.contact_mobile ?? '').toLowerCase().includes(q) ||
        String(r.contact_email ?? '').toLowerCase().includes(q) ||
        String(r.contact_type ?? '').toLowerCase().includes(q) ||
        String(r.contact_rank ?? '').toLowerCase().includes(q)
      )
    }
    if (typeFilter.length > 0) {
      result = result.filter((r) =>
        typeFilter.includes(r.contact_type ?? '')
      )
    }
    return result
  }, [
    allRows,
    contactName,
    contactSearch,
    typeFilter,
  ])

  const handleTextFilterChange = (
    type: 'contactName' | 'contactSearch',
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
        contactName: undefined,
        contactSearch: undefined,
        contactType: undefined,
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
    contactName.trim() !== '' ||
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
            placeholder='按联系人名称筛选...'
            value={contactName}
            onChange={(e) => handleTextFilterChange('contactName', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按名称/手机/邮箱/类型/职级筛选...'
            value={contactSearch}
            onChange={(e) => handleTextFilterChange('contactSearch', e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <div className='flex gap-x-2'>
            {typeFacetOptions.length > 0 && table.getColumn('contact_type') && (
              <DataTableFacetedFilter
                column={table.getColumn('contact_type')!}
                title='联系人类型'
                options={typeFacetOptions}
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
