import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
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
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
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
import { DataTablePagination } from '@/components/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import {
  fetchContactAll,
  fetchContactGroups,
  fetchDivisionSuppliers,
  fetchDivisionCollaborations,
} from '../api/client'
import { type Contact } from '../data/schema'
import { getContactsColumns } from './contacts-columns'
import { DataTableBulkActions } from './data-table-bulk-actions'

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
  const queryClient = useQueryClient()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const urlContactName: string =
    (search as unknown as { contactName?: string }).contactName ?? ''
  const urlContactSearch: string =
    (search as unknown as { contactSearch?: string }).contactSearch ?? ''
  const [editingName, setEditingName] = useState(urlContactName)
  const [editingSearch, setEditingSearch] = useState(urlContactSearch)
  const [nameComposing, setNameComposing] = useState(false)
  const [searchComposing, setSearchComposing] = useState(false)
  const commitDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  useEffect(() => {
    if (editingName !== urlContactName) setEditingName(urlContactName)
  }, [urlContactName])
  useEffect(() => {
    if (editingSearch !== urlContactSearch) setEditingSearch(urlContactSearch)
  }, [urlContactSearch])

  const scheduleCommit = useCallback(
    (type: 'contactName' | 'contactSearch', value: string) => {
      if (commitDebounceTimerRef.current)
        clearTimeout(commitDebounceTimerRef.current)
      commitDebounceTimerRef.current = setTimeout(() => {
        navigate({
          search: (prev: any) => ({
            ...(prev ?? {}),
            [type]: value || undefined,
            page: undefined,
          }),
        })
      }, 250)
    },
    [navigate]
  )

  const onTextChange = (
    type: 'contactName' | 'contactSearch',
    value: string,
    composing: boolean
  ) => {
    if (type === 'contactName') setEditingName(value)
    else setEditingSearch(value)
    if (composing) return
    scheduleCommit(type, value)
  }

  const onCompositionStart = (type: 'contactName' | 'contactSearch') => {
    if (type === 'contactName') setNameComposing(true)
    else setSearchComposing(true)
  }

  const onCompositionEnd = (
    type: 'contactName' | 'contactSearch',
    value: string
  ) => {
    if (type === 'contactName') {
      setNameComposing(false)
      setEditingName(value)
    } else {
      setSearchComposing(false)
      setEditingSearch(value)
    }
    scheduleCommit(type, value)
  }

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
  const { data: supplierRows = [] } = useQuery({
    queryKey: ['division-picker-suppliers'],
    queryFn: fetchDivisionSuppliers,
    staleTime: 60000,
  })
  const { data: collaborationRows = [] } = useQuery({
    queryKey: ['division-picker-collaborations'],
    queryFn: fetchDivisionCollaborations,
    staleTime: 60000,
  })
  const supplierShortnameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of supplierRows) {
      const id = String(s.supplier_id)
      const short = s.supplier_shortname?.trim()
      if (short) m.set(id, short)
    }
    return m
  }, [supplierRows])
  const collaborationShortnameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collaborationRows) {
      const id = String(c.collaboration_id)
      const short = c.collaboration_shortname?.trim()
      if (short) m.set(id, short)
    }
    return m
  }, [collaborationRows])
  const typeDict = groupsData?.typeDict ?? []
  const divisionDict = groupsData?.divisionDict ?? []
  const rankDict = groupsData?.rankDict ?? []
  const types = groupsData?.types ?? []
  const columns = useMemo(
    () =>
      getContactsColumns(
        typeDict,
        divisionDict,
        supplierShortnameMap,
        collaborationShortnameMap,
        rankDict
      ),
    [
      typeDict,
      divisionDict,
      supplierShortnameMap,
      collaborationShortnameMap,
      rankDict,
    ]
  )

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
    navigate: navigate as unknown as Parameters<
      typeof useTableUrlState
    >[0]['navigate'],
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

  const contactName = editingName
  const contactSearch = editingSearch

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
      result = result.filter(
        (r) =>
          String(r.contact_name ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.contact_mobile ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.contact_email ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.contact_type ?? '')
            .toLowerCase()
            .includes(q) ||
          String(r.contact_rank ?? '')
            .toLowerCase()
            .includes(q)
      )
    }
    if (typeFilter.length > 0) {
      result = result.filter((r) => typeFilter.includes(r.contact_type ?? ''))
    }
    return result
  }, [allRows, contactName, contactSearch, typeFilter])

  const handleResetFilters = () => {
    if (commitDebounceTimerRef.current)
      clearTimeout(commitDebounceTimerRef.current)
    setEditingName('')
    setEditingSearch('')
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
            value={editingName}
            onChange={(e) =>
              onTextChange('contactName', e.target.value, nameComposing)
            }
            onCompositionStart={() => onCompositionStart('contactName')}
            onCompositionEnd={(e) =>
              onCompositionEnd('contactName', (e.target as HTMLInputElement).value)
            }
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按名称/手机/邮箱/类型/职级筛选...'
            value={editingSearch}
            onChange={(e) =>
              onTextChange('contactSearch', e.target.value, searchComposing)
            }
            onCompositionStart={() => onCompositionStart('contactSearch')}
            onCompositionEnd={(e) =>
              onCompositionEnd('contactSearch', (e.target as HTMLInputElement).value)
            }
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
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={async () => {
              if (commitDebounceTimerRef.current) {
                clearTimeout(commitDebounceTimerRef.current)
                commitDebounceTimerRef.current = null
                const flush: { contactName?: string; contactSearch?: string } = {}
                if (editingName.trim() !== '' || urlContactName !== editingName) {
                  flush.contactName = editingName || undefined
                }
                if (editingSearch.trim() !== '' || urlContactSearch !== editingSearch) {
                  flush.contactSearch = editingSearch || undefined
                }
                if (Object.keys(flush).length > 0) {
                  navigate({
                    search: (prev: any) => ({
                      ...(prev ?? {}),
                      ...flush,
                      page: undefined,
                    }),
                  })
                }
              }
              await Promise.all([
                queryClient.refetchQueries({ queryKey: ['contact-list'] }),
                queryClient.refetchQueries({ queryKey: ['contact-list-groups'] }),
                queryClient.refetchQueries({ queryKey: ['division-picker-suppliers'] }),
                queryClient.refetchQueries({ queryKey: ['division-picker-collaborations'] }),
              ])
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
