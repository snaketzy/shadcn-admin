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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
} from '@/features/contacts/api/client'

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

  const typeMap = useMemo(
    () => makeDictMap(groupsData?.typeDict ?? []),
    [groupsData]
  )
  const rankMap = useMemo(
    () => makeDictMap(groupsData?.rankDict ?? []),
    [groupsData]
  )

  const filteredRows: Contact[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return contacts as Contact[]
    return (contacts as Contact[]).filter((c) => {
      return (
        String(c.contact_name ?? '').toLowerCase().includes(q) ||
        String(c.contact_mobile ?? '').toLowerCase().includes(q) ||
        String(c.contact_email ?? '').toLowerCase().includes(q) ||
        String(c.contact_remark ?? '').toLowerCase().includes(q) ||
        resolveType(c.contact_type, typeMap).toLowerCase().includes(q) ||
        resolveRank(c.contact_rank, rankMap).toLowerCase().includes(q)
      )
    })
  }, [contacts, searchKeyword, typeMap, rankMap])

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(() => {
    return [
      {
        accessorKey: 'contact_name',
        header: '联系人姓名',
        size: 180,
        cell: ({ row }) => {
          const v = row.original.contact_name
          return <LongText className='max-w-[180px]'>{v ?? '-'}</LongText>
        },
      },
      {
        accessorKey: 'contact_type',
        header: '联系人类型',
        size: 160,
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
        accessorKey: 'contact_rank',
        header: '联系人职级',
        size: 160,
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
        size: 160,
        cell: ({ row }) => {
          const v = row.original.contact_mobile
          return <span>{v ?? '-'}</span>
        },
      },
      {
        accessorKey: 'contact_email',
        header: '邮箱',
        size: 240,
        cell: ({ row }) => {
          const v = row.original.contact_email
          return <LongText className='max-w-[240px]'>{v ?? '-'}</LongText>
        },
      },
      {
        id: '_action',
        header: '',
        size: 100,
        enableSorting: false,
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
  }, [selectedId, typeMap, rankMap])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback(
    (row: { original: Contact }) => {
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
    },
    []
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>选择联系人</DialogTitle>
          <DialogDescription>
            从联系人列表中选择协作商联系人，支持关键词搜索、列排序、行点击快速选择。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按姓名 / 类型 / 手机 / 邮箱 / 备注搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-muted-foreground text-xs'>
              <UserRound className='size-3.5' />
              <span>共 {filteredRows.length} 条 / 总 {contacts.length} 条</span>
            </div>
          </div>
          <div className='h-[420px] overflow-auto rounded-md border'>
            <table className='w-full table-auto text-sm'>
              <TableHeader className='sticky top-0 z-10 bg-background'>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        style={{ width: h.getSize(), minWidth: h.getSize() }}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
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
                            ? 'bg-muted/70 cursor-pointer'
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
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
        <DialogFooter>
          <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
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
