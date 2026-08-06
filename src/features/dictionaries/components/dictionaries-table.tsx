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
import { cn } from '@/lib/utils'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { useQuery } from '@tanstack/react-query'
import { fetchCaseDictAll, fetchCaseDictGroups } from '../api/client'
import { type CaseDictType } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { dictionariesColumns as columns } from './dictionaries-columns'

type DataTableProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function DictionariesTable({ search, navigate }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const { data: allRowsData, isLoading } = useQuery({
    queryKey: ['case-dict'],
    queryFn: fetchCaseDictAll,
  })
  const allRows: CaseDictType[] = allRowsData ?? []

  const { data: groupsData } = useQuery({
    queryKey: ['case-dict-groups'],
    queryFn: fetchCaseDictGroups,
  })
  const groups: string[] = groupsData ?? []

  const groupFilter: string[] = useMemo(
    () => (Array.isArray((search as any).dictGroup) ? (search as any).dictGroup : []),
    [search]
  )
  const nameFilter: string = useMemo(
    () => ((search as any).dictValue as string) ?? '',
    [search]
  )

  const filteredData: CaseDictType[] = useMemo(() => {
    let result = allRows
    if (groupFilter.length > 0) {
      result = result.filter((r) => groupFilter.includes(r.dict_group))
    }
    if (nameFilter.trim() !== '') {
      const q = nameFilter.trim().toLowerCase()
      result = result.filter(
        (r) =>
          String(r.dict_value).toLowerCase().includes(q) ||
          String(r.dict_key).toLowerCase().includes(q) ||
          String(r.dict_group).toLowerCase().includes(q)
      )
    }
    return result
  }, [allRows, groupFilter, nameFilter])

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

  const filters = useMemo(
    () => [
      {
        columnId: 'dict_group',
        title: '字典分组',
        options: groups.map((g) => ({ label: g, value: g })),
      },
    ],
    [groups]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
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

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='按字典键值/键名/分组筛选...'
        searchKey='dict_value'
        filters={filters}
      />
      <div className='flex flex-1 flex-col overflow-hidden rounded-md border'>
        <div className='flex-1 overflow-auto'>
          <Table>
            <TableHeader className='sticky top-0 z-10 bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='group/row'>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          header.column.columnDef.meta?.className,
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
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto flex-shrink-0' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
