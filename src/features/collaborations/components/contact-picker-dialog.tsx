'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Search, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LongText } from '@/components/long-text'
import {
  fetchContactAll,
  fetchContactGroups,
  type Contact,
  type ContactDictEntry,
  fetchDivisionSuppliers,
  fetchDivisionCollaborations,
  type DivisionSupplierRow,
  type DivisionCollaborationRow,
} from '@/features/contacts/api/client'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

const FIXED_COL_STYLES: Record<
  string,
  { th: React.CSSProperties; td: React.CSSProperties }
> = {
  contact_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 50,
      width: 200,
      minWidth: 200,
    },
    td: {
      position: 'sticky',
      left: 0,
      zIndex: 20,
      width: 200,
      minWidth: 200,
    },
  },
  _action: {
    th: {
      position: 'sticky',
      top: 0,
      right: 0,
      zIndex: 50,
      width: 100,
      minWidth: 100,
    },
    td: {
      position: 'sticky',
      right: 0,
      zIndex: 30,
      width: 100,
      minWidth: 100,
    },
  },
}

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

export type ContactPickerResult = {
  contact_id: string
  contact_name: string
  contact_mobile?: string
  contact_email?: string
}

export type ContactPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: ContactPickerResult) => void
  initialSelectedId?: string
}

export function ContactPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedId,
}: ContactPickerDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  )

  const onSelectRef = useRef(onSelect)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    setSearchKeyword('')
    const next = initialSelectedId ?? null
    setSelectedId((prev) => (prev === next ? prev : next))
  }, [open, initialSelectedId])

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: open,
    staleTime: 60000,
  })

  const { data: supplierRows = [] } = useQuery({
    queryKey: ['division-supplier-all'],
    queryFn: fetchDivisionSuppliers,
    enabled: open,
    staleTime: 60000,
  })

  const { data: collaborationRows = [] } = useQuery({
    queryKey: ['division-collaboration-all'],
    queryFn: fetchDivisionCollaborations,
    enabled: open,
    staleTime: 60000,
  })

  const typeMap = useMemo(
    () => makeDictMap(groupsData?.typeDict ?? []),
    [groupsData]
  )
  const rankMap = useMemo(
    () => makeDictMap(groupsData?.rankDict ?? []),
    [groupsData]
  )

  const supplierShortnameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of supplierRows as DivisionSupplierRow[]) {
      if (!s.supplier_shortname) continue
      m.set(String(s.supplier_id), s.supplier_shortname)
    }
    return m
  }, [supplierRows])

  const collaborationShortnameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collaborationRows as DivisionCollaborationRow[]) {
      if (!c.collaboration_shortname) continue
      m.set(String(c.collaboration_id), c.collaboration_shortname)
    }
    return m
  }, [collaborationRows])

  function resolveDivisionLabel(c: Contact): { label: string; prefix: string } {
    const idStr =
      c.contact_division_id == null || c.contact_division_id === ''
        ? ''
        : String(c.contact_division_id)
    if (!idStr) return { label: '', prefix: '' }
    const t = String(c.contact_division_type ?? '').toUpperCase()
    if (t === 'K1') {
      const sn = supplierShortnameMap.get(idStr)
      return { label: sn ?? '', prefix: '供应商' }
    } else if (t === 'K2') {
      const sn = collaborationShortnameMap.get(idStr)
      return { label: sn ?? '', prefix: '协作商' }
    }
    return { label: '', prefix: '' }
  }

  const filteredRows: Contact[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return contacts as Contact[]
    return (contacts as Contact[]).filter((c) => {
      const d = resolveDivisionLabel(c)
      return (
        String(c.contact_name ?? '')
          .toLowerCase()
          .includes(q) ||
        String(c.contact_mobile ?? '')
          .toLowerCase()
          .includes(q) ||
        String(c.contact_email ?? '')
          .toLowerCase()
          .includes(q) ||
        String(c.contact_remark ?? '')
          .toLowerCase()
          .includes(q) ||
        resolveType(c.contact_type, typeMap).toLowerCase().includes(q) ||
        resolveRank(c.contact_rank, rankMap).toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        d.prefix.toLowerCase().includes(q)
      )
    })
  }, [
    contacts,
    searchKeyword,
    typeMap,
    rankMap,
    supplierShortnameMap,
    collaborationShortnameMap,
  ])

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(() => {
    return [
      {
        accessorKey: 'contact_name',
        header: '联系人姓名',
        size: 200,
        cell: ({ row }) => {
          const v = row.original.contact_name
          return <LongText className='max-w-[200px]'>{v ?? '-'}</LongText>
        },
        meta: {
          className: cn(
            'sticky left-0 z-20 w-[200px] min-w-[200px] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
          thClassName: cn(
            'sticky top-0 left-0 z-40 w-[200px] min-w-[200px] rounded-tl-[inherit] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
        },
        enableHiding: false,
      },
      {
        accessorKey: 'contact_type',
        header: '联系人类型',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.contact_type
          const label = resolveType(raw, typeMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
      },
      {
        id: 'contact_division',
        header: '联系人单位',
        accessorFn: (row: Contact) => {
          const idStr =
            row.contact_division_id == null || row.contact_division_id === ''
              ? ''
              : String(row.contact_division_id)
          const t = String(row.contact_division_type ?? '').toUpperCase()
          if (t === 'K1') return supplierShortnameMap.get(idStr) ?? ''
          if (t === 'K2') return collaborationShortnameMap.get(idStr) ?? ''
          return ''
        },
        size: 180,
        cell: ({ row }) => {
          const c = row.original
          const idStr =
            c.contact_division_id == null || c.contact_division_id === ''
              ? ''
              : String(c.contact_division_id)
          if (!idStr) return <div>-</div>
          const t = String(c.contact_division_type ?? '').toUpperCase()
          let sn: string | undefined
          let prefix: string
          if (t === 'K1') {
            sn = supplierShortnameMap.get(idStr)
            prefix = '供应商'
          } else if (t === 'K2') {
            sn = collaborationShortnameMap.get(idStr)
            prefix = '协作商'
          } else {
            sn = undefined
            prefix = ''
          }
          return (
            <div className='flex items-center gap-1.5'>
              {sn ? (
                <div className='flex flex-col gap-0.5'>
                  <div className='max-w-[160px] truncate leading-tight font-medium'>
                    {sn}
                  </div>
                  {prefix && (
                    <div className='text-[10px] leading-none text-muted-foreground'>
                      {prefix}ID: {idStr}
                    </div>
                  )}
                </div>
              ) : (
                <span>{idStr}</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'contact_rank',
        header: '联系人职级',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.contact_rank
          const label = resolveRank(raw, rankMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'contact_mobile',
        header: '手机号',
        size: 130,
        cell: ({ row }) => {
          const v = row.original.contact_mobile
          return <span>{v ?? '-'}</span>
        },
      },
      {
        accessorKey: 'contact_email',
        header: '邮箱',
        size: 180,
        cell: ({ row }) => {
          const v = row.original.contact_email
          return <LongText className='max-w-[180px]'>{v ?? '-'}</LongText>
        },
      },
      {
        id: '_action',
        header: '',
        size: 100,
        enableSorting: false,
        enableHiding: false,
        meta: {
          className: cn(
            'sticky right-0 z-30 w-[100px] min-w-[100px] rounded-tr-[inherit] bg-background pe-0'
          ),
          thClassName: cn(
            'sticky top-0 right-0 z-40 w-[100px] min-w-[100px] rounded-tr-[inherit] bg-background pe-0'
          ),
        },
        cell: ({ row }) => {
          const id = String(row.original.contact_id)
          const isSelected = selectedId === id
          return (
            <div className='flex justify-end'>
              <Button
                type='button'
                size='sm'
                variant={isSelected ? 'default' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation()
                  const c = row.original
                  setSelectedId(String(c.contact_id))
                  onSelectRef.current({
                    contact_id: String(c.contact_id),
                    contact_name: c.contact_name ?? '',
                    contact_mobile: c.contact_mobile ?? undefined,
                    contact_email: c.contact_email ?? undefined,
                  })
                  onOpenChangeRef.current(false)
                }}
              >
                {isSelected ? '已选择' : '选择'}
              </Button>
            </div>
          )
        },
      },
    ]
  }, [
    selectedId,
    typeMap,
    rankMap,
    supplierShortnameMap,
    collaborationShortnameMap,
  ])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback((row: { original: Contact }) => {
    const c = row.original
    const id = String(c.contact_id)
    setSelectedId(id)
    onSelectRef.current({
      contact_id: id,
      contact_name: c.contact_name ?? '',
      contact_mobile: c.contact_mobile ?? undefined,
      contact_email: c.contact_email ?? undefined,
    })
    onOpenChangeRef.current(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[1200px]'>
        <DialogHeader>
          <DialogTitle>选择联系人</DialogTitle>
          <DialogDescription>
            从联系人列表中选择协作商联系人，支持关键词搜索、列排序、行点击快速选择。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按姓名 / 类型 / 手机 / 邮箱 / 备注搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <UserRound className='size-3.5' />
              <span>
                共 {filteredRows.length} 条 / 总 {contacts.length} 条
              </span>
            </div>
          </div>
          <div className='h-[420px] overflow-auto rounded-md border'>
            <div className='w-full min-w-max overflow-x-auto'>
              <table className='w-full table-auto text-sm'>
                <TableHeader className='sticky top-0 z-10 bg-background'>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          style={{
                            width: h.getSize(),
                            minWidth: h.getSize(),
                            ...(FIXED_COL_STYLES[h.column.id ?? '']?.th ?? {}),
                          }}
                          className={cn(
                            'bg-background',
                            !FIXED_COL_STYLES[h.column.id ?? ''] &&
                              'sticky top-0 z-10',
                            h.column.columnDef.meta?.thClassName,
                            h.column.columnDef.meta?.className as
                              string | undefined
                          )}
                        >
                          {h.isPlaceholder
                            ? null
                            : flexRender(
                                h.column.columnDef.header,
                                h.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {contactsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length || 1}
                        className='h-24 text-center text-muted-foreground'
                      >
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length || 1}
                        className='h-24 text-center text-muted-foreground'
                      >
                        {searchKeyword.trim() !== ''
                          ? '未找到匹配的联系人，请更换搜索关键词。'
                          : '暂无联系人数据。'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const rowId = String(row.original.contact_id)
                      const isSelectedRow = selectedId === rowId
                      return (
                        <TableRow
                          key={row.id}
                          data-state={isSelectedRow && 'selected'}
                          className={
                            isSelectedRow
                              ? 'cursor-pointer bg-muted/70'
                              : 'cursor-pointer'
                          }
                          onClick={() => handleRowClick(row)}
                          onDoubleClick={() => handleRowClick(row)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                minWidth: cell.column.getSize(),
                                ...(FIXED_COL_STYLES[cell.column.id ?? '']
                                  ?.td ?? {}),
                              }}
                              className={cn(
                                'bg-background',
                                cell.column.columnDef.meta?.className as
                                  string | undefined,
                                (cell.column.columnDef.meta as any)?.tdClassName
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </table>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function resolveType(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const p = String(raw).trim()
  if (!p) return ''
  const k = keyMap.get(p.toUpperCase())
  if (k) return k
  const v = valueMap.get(p)
  if (v) return v
  return p
}

function resolveRank(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const p = String(raw).trim()
  if (!p) return ''
  const k = keyMap.get(p.toUpperCase())
  if (k) return k
  const v = valueMap.get(p)
  if (v) return v
  return p
}
