import { useEffect, useMemo, useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
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
import { SearchIcon, Link as LinkIcon } from 'lucide-react'
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
  fetchContactsByDivision,
  fetchContactGroups,
  type Contact,
  type ContactDictEntry,
} from '@/features/contacts/api/client'
import { getBadgeColor } from '@/features/contacts/data/data'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: ContactDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
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

function getColumns(
  typeDict: ContactDictEntry[] = [],
  rankDict: ContactDictEntry[] = []
): ColumnDef<Contact>[] {
  const typeMap = makeDictMap(typeDict)
  const rankMap = makeDictMap(rankDict)

  return [
    {
      accessorKey: 'contact_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人姓名' />
      ),
      cell: ({ row }) => (
        <Link
          to='/contact_list'
          search={{ contactSearch: String(row.original.contact_name ?? '') }}
          className='inline-flex max-w-[8em] items-center gap-1.5 ps-3 font-medium hover:underline'
        >
          <span className='truncate'>{row.getValue('contact_name')}</span>
          <LinkIcon className='size-3 shrink-0 text-muted-foreground' />
        </Link>
      ),
      meta: {
        className: cn(
          'sticky left-0 z-20 w-[10rem] min-w-[10rem] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-0 z-40 w-[10rem] min-w-[10rem] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
    },
    {
      accessorKey: 'contact_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人类型' />
      ),
      cell: ({ row }) => {
        const label = resolveLabel(row.original.contact_type, typeMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      filterFn: (row, _id, value) =>
        value.includes(row.getValue('contact_type')),
      enableSorting: false,
    },
    {
      accessorKey: 'contact_rank',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人职级' />
      ),
      cell: ({ row }) => {
        const label = resolveLabel(row.original.contact_rank, rankMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_mobile',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人手机' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_mobile') as string | null
        if (!value) return <div>-</div>
        return <span className='font-mono text-sm'>{value}</span>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_email') as string | null
        if (!value) return <div>-</div>
        return (
          <a
            href={`mailto:${value}`}
            className='text-sm break-all hover:underline'
          >
            {value}
          </a>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_remark',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人备注' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_remark') as string | null
        return <LongText className='max-w-50'>{value ?? '-'}</LongText>
      },
      enableSorting: false,
    },
  ]
}

type StaffContactsTableProps = {
  supplierId: string
}

export function StaffContactsTable({ supplierId }: StaffContactsTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [contactName, setContactName] = useState('')
  const [contactSearch, setContactSearch] = useState('')

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['supplier-staff-contacts', supplierId],
    queryFn: () => fetchContactsByDivision({ type: 'K1', id: supplierId }),
    enabled: !!supplierId,
    staleTime: 30 * 1000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['contact-list-groups'],
    queryFn: fetchContactGroups,
    staleTime: 60 * 1000,
  })

  const typeDict = groupsData?.typeDict ?? []
  const rankDict = groupsData?.rankDict ?? []
  const columns = useMemo(
    () => getColumns(typeDict, rankDict),
    [typeDict, rankDict]
  )

  const filteredData = useMemo<Contact[]>(() => {
    let result = rows as Contact[]
    if (contactName.trim() !== '') {
      const q = contactName.trim().toLowerCase()
      result = result.filter((r) =>
        String(r.contact_name).toLowerCase().includes(q)
      )
    }
    if (contactSearch.trim() !== '') {
      const q = contactSearch.trim().toLowerCase()
      result = result.filter((r) =>
        [
          r.contact_name,
          r.contact_mobile,
          r.contact_email,
          r.contact_type,
          r.contact_rank,
        ]
          .map((v) => (v == null ? '' : String(v).toLowerCase()))
          .some((s) => s.includes(q))
      )
    }
    return result
  }, [rows, contactName, contactSearch])

  const table = useReactTable({
    data: filteredData,
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

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [supplierId, contactName, contactSearch])

  const isFiltered = contactName.trim() !== '' || contactSearch.trim() !== ''

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
    <div className='flex flex-1 flex-col gap-4 overflow-hidden'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex flex-1 flex-col items-start gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-x-2'>
          <Input
            placeholder='按联系人名称筛选...'
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          <Input
            placeholder='按名称/手机/邮箱/类型/职级筛选...'
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
          {isFiltered && (
            <Button
              variant='ghost'
              onClick={() => {
                setContactName('')
                setContactSearch('')
              }}
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
            onClick={() => refetch()}
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
                    className='h-24 text-center'
                  >
                    暂无关联联系人。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto shrink-0' />
    </div>
  )
}
