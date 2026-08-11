'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Search, Ship } from 'lucide-react'
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
} from '../api/client'

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

export type SurveyorPickerResult = {
  contact_id: string
  contact_name: string
  contact_mobile?: string
  contact_email?: string
  contact_type?: string
  contact_rank?: string
  contact_division_type?: string
  contact_remark?: string
}

export type SurveyorPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SurveyorPickerResult) => void
  initialSelectedName?: string
}

function resolveLabel(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const p = String(raw).trim()
  if (!p) return ''
  const k = keyMap.get(p.toUpperCase())
  if (k) return k
  const v = valueMap.get(p)
  if (v) return v
  return p
}

export function SurveyorPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedName,
}: SurveyorPickerDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedName, setSelectedName] = useState<string | null>(
    initialSelectedName ?? null
  )

  useEffect(() => {
    if (!open) return
    setSearchKeyword('')
    const next = initialSelectedName ?? null
    setSelectedName((prev) => (prev === next ? prev : next))
  }, [open, initialSelectedName])

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['surveyor-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
    select: useCallback((rows: Contact[]) => {
      return rows.filter((r) => {
        const t = String(r.contact_type ?? '').trim()
        return (
          t.toUpperCase() === 'J2' ||
          t === 'J2' ||
          t.includes('J2')
        )
      })
    }, []),
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
  const divisionMap = useMemo(
    () => makeDictMap(groupsData?.divisionDict ?? []),
    [groupsData]
  )

  const filteredRows: Contact[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return contacts as Contact[]
    return (contacts as Contact[]).filter((v) => {
      return (
        String(v.contact_name ?? '').toLowerCase().includes(q) ||
        String(v.contact_email ?? '').toLowerCase().includes(q) ||
        String(v.contact_mobile ?? '').toLowerCase().includes(q) ||
        resolveLabel(v.contact_type, typeMap).toLowerCase().includes(q) ||
        resolveLabel(v.contact_rank, rankMap).toLowerCase().includes(q) ||
        resolveLabel(v.contact_division_type, divisionMap)
          .toLowerCase()
          .includes(q) ||
        String(v.contact_remark ?? '').toLowerCase().includes(q)
      )
    })
  }, [contacts, searchKeyword, typeMap, rankMap, divisionMap])

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(() => {
    return [
      {
        accessorKey: 'contact_name',
        header: '案件船检姓名',
        size: 200,
        cell: ({ row }) => {
          const v = row.original.contact_name
          return <LongText className='max-w-[200px]'>{v ?? '-'}</LongText>
        },
        meta: {
          label: '案件船检姓名',
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
        accessorKey: 'contact_mobile',
        header: '手机',
        size: 140,
        cell: ({ row }) => {
          const raw = row.original.contact_mobile
          if (!raw) return <div>-</div>
          return <LongText className='max-w-[140px]'>{raw}</LongText>
        },
        meta: { label: '手机' },
      },
      {
        accessorKey: 'contact_email',
        header: '邮箱',
        size: 200,
        cell: ({ row }) => {
          const raw = row.original.contact_email
          if (!raw) return <div>-</div>
          return <LongText className='max-w-[200px]'>{raw}</LongText>
        },
        meta: { label: '邮箱' },
      },
      {
        accessorKey: 'contact_type',
        header: '类型',
        size: 140,
        cell: ({ row }) => {
          const raw = row.original.contact_type
          const label = resolveLabel(raw, typeMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
        meta: { label: '类型' },
      },
      {
        accessorKey: 'contact_division_type',
        header: '业务归属',
        size: 140,
        cell: ({ row }) => {
          const raw = row.original.contact_division_type
          const label = resolveLabel(raw, divisionMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
        meta: { label: '业务归属' },
      },
      {
        accessorKey: 'contact_rank',
        header: '职级',
        size: 110,
        cell: ({ row }) => {
          const raw = row.original.contact_rank
          const label = resolveLabel(raw, rankMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
        meta: { label: '职级' },
      },
      {
        accessorKey: 'contact_remark',
        header: '备注',
        size: 200,
        cell: ({ row }) => {
          const raw = row.original.contact_remark
          if (!raw) return <div>-</div>
          return <LongText className='max-w-[200px]'>{raw}</LongText>
        },
        meta: { label: '备注' },
      },
      {
        id: '_action',
        header: '',
        size: 100,
        enableSorting: false,
        enableHiding: false,
        meta: {
          label: '',
          className: cn(
            'sticky right-0 z-30 w-[100px] min-w-[100px] rounded-tr-[inherit] bg-background pe-0'
          ),
          thClassName: cn(
            'sticky top-0 right-0 z-40 w-[100px] min-w-[100px] rounded-tr-[inherit] bg-background pe-0'
          ),
        },
        cell: ({ row }) => {
          const name = row.original.contact_name
          const isSelected = selectedName === name
          return (
            <div className='flex justify-end'>
              <Button
                type='button'
                size='sm'
                variant={isSelected ? 'default' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation()
                  const v = row.original
                  setSelectedName(v.contact_name)
                  const result: SurveyorPickerResult = {
                    contact_id: String(v.contact_id),
                    contact_name: v.contact_name ?? '',
                    contact_mobile: v.contact_mobile ?? undefined,
                    contact_email: v.contact_email ?? undefined,
                    contact_type:
                      resolveLabel(v.contact_type, typeMap) || undefined,
                    contact_rank:
                      resolveLabel(v.contact_rank, rankMap) || undefined,
                    contact_division_type:
                      resolveLabel(v.contact_division_type, divisionMap) ||
                      undefined,
                    contact_remark: v.contact_remark ?? undefined,
                  }
                  onSelect(result)
                  queueMicrotask(() => onOpenChange(false))
                }}
              >
                {isSelected ? '已选择' : '选择'}
              </Button>
            </div>
          )
        },
      },
    ]
  }, [selectedName, typeMap, rankMap, divisionMap, onSelect, onOpenChange])

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
      const v = row.original
      setSelectedName(v.contact_name)
      const result: SurveyorPickerResult = {
        contact_id: String(v.contact_id),
        contact_name: v.contact_name ?? '',
        contact_mobile: v.contact_mobile ?? undefined,
        contact_email: v.contact_email ?? undefined,
        contact_type: resolveLabel(v.contact_type, typeMap) || undefined,
        contact_rank: resolveLabel(v.contact_rank, rankMap) || undefined,
        contact_division_type:
          resolveLabel(v.contact_division_type, divisionMap) || undefined,
        contact_remark: v.contact_remark ?? undefined,
      }
      onSelect(result)
      queueMicrotask(() => onOpenChange(false))
    },
    [typeMap, rankMap, divisionMap, onSelect, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[1200px]'>
        <DialogHeader>
          <DialogTitle>选择案件船检</DialogTitle>
          <DialogDescription>
            从联系人类别为“案件船检”的列表中选择，支持关键词搜索、列排序、行点击快速选择。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按姓名 / 手机 / 邮箱 / 类型 / 职级 / 业务归属 / 备注搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Ship className='size-3.5' />
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
                              | string
                              | undefined
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
                          ? '未找到匹配的案件船检，请更换搜索关键词。'
                          : '暂无案件船检数据（请在联系人管理中维护 contact_type=J2 的记录）。'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const rowName = row.original.contact_name
                      const isSelectedRow = selectedName === rowName
                      return (
                        <TableRow
                          key={row.id}
                          data-state={isSelectedRow && 'selected'}
                          className={cn(
                            isSelectedRow
                              ? 'cursor-pointer bg-muted/70 hover:bg-muted/80'
                              : 'cursor-pointer hover:bg-muted/40'
                          )}
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
                                cell.column.columnDef.meta?.className as
                                  | string
                                  | undefined,
                                (cell.column.columnDef.meta as any)
                                  ?.tdClassName
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
