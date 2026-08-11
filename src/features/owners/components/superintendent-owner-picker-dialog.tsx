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
import { Search, Wrench } from 'lucide-react'
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
  fetchOwnerAll,
  fetchOwnerGroups,
  type Owner,
  type OwnerDictEntry,
} from '../api/client'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

const FIXED_COL_STYLES: Record<
  string,
  { th: React.CSSProperties; td: React.CSSProperties }
> = {
  owner_name: {
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

function makeDictMap(dict: OwnerDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

export type SuperintendentOwnerPickerResult = {
  owner_id: string
  owner_name: string
  owner_email?: string
  owner_phone?: string
  owner_team?: string
  owner_department?: string
  owner_rank?: string
}

export type SuperintendentOwnerPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SuperintendentOwnerPickerResult) => void
  initialSelectedName?: string
}

const SUPERINTENDENT_DEPARTMENT_TYPE = 'F1'

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

export function SuperintendentOwnerPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedName,
}: SuperintendentOwnerPickerDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedName, setSelectedName] = useState<string | null>(
    initialSelectedName ?? null
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
    const next = initialSelectedName ?? null
    setSelectedName((prev) => (prev === next ? prev : next))
  }, [open, initialSelectedName])

  const { data: owners = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['superintendent-owner-picker-all'],
    queryFn: fetchOwnerAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['superintendent-owner-picker-groups'],
    queryFn: fetchOwnerGroups,
    enabled: open,
    staleTime: 60000,
  })

  const filteredOwners = useMemo<Owner[]>(() => {
    return (owners as Owner[]).filter(
      (o) =>
        String(o.owner_department ?? '').toUpperCase() ===
        SUPERINTENDENT_DEPARTMENT_TYPE
    )
  }, [owners])

  const teamMap = useMemo(
    () => makeDictMap(groupsData?.teamDict ?? []),
    [groupsData]
  )
  const departmentMap = useMemo(
    () => makeDictMap(groupsData?.departmentDict ?? []),
    [groupsData]
  )

  const superintendentDepartmentLabel = useMemo(() => {
    return (
      resolveLabel(SUPERINTENDENT_DEPARTMENT_TYPE, departmentMap) ||
      SUPERINTENDENT_DEPARTMENT_TYPE
    )
  }, [departmentMap])
  const rankMap = useMemo(
    () => makeDictMap(groupsData?.rankDict ?? []),
    [groupsData]
  )

  const filteredRows: Owner[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return filteredOwners
    return filteredOwners.filter((o) => {
      return (
        String(o.owner_name ?? '').toLowerCase().includes(q) ||
        String(o.owner_email ?? '').toLowerCase().includes(q) ||
        String(o.owner_phone ?? '').toLowerCase().includes(q) ||
        resolveLabel(o.owner_team, teamMap).toLowerCase().includes(q) ||
        resolveLabel(o.owner_department, departmentMap)
          .toLowerCase()
          .includes(q) ||
        resolveLabel(o.owner_rank, rankMap).toLowerCase().includes(q)
      )
    })
  }, [filteredOwners, searchKeyword, teamMap, departmentMap, rankMap])

  const columns = useMemo<ColumnDef<Owner, unknown>[]>(() => {
    return [
      {
        accessorKey: 'owner_name',
        header: '案件机务联系人',
        size: 200,
        cell: ({ row }) => {
          const v = row.original.owner_name
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
        accessorKey: 'owner_email',
        header: '邮箱',
        size: 220,
        cell: ({ row }) => {
          const raw = row.original.owner_email
          if (!raw) return <div>-</div>
          return <LongText className='max-w-[220px]'>{raw}</LongText>
        },
      },
      {
        accessorKey: 'owner_phone',
        header: '电话',
        size: 160,
        cell: ({ row }) => {
          const raw = row.original.owner_phone
          if (!raw) return <div>-</div>
          return <span>{raw}</span>
        },
      },
      {
        accessorKey: 'owner_team',
        header: '小组',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.owner_team
          const label = resolveLabel(raw, teamMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'owner_department',
        header: '部门',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.owner_department
          const label = resolveLabel(raw, departmentMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'owner_rank',
        header: '职级',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.owner_rank
          const label = resolveLabel(raw, rankMap)
          if (!label) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {label}
            </Badge>
          )
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
          const name = row.original.owner_name
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
                  setSelectedName(v.owner_name)
                  queueMicrotask(() => {
                    onSelectRef.current({
                      owner_id: String(v.owner_id),
                      owner_name: v.owner_name ?? '',
                      owner_email: v.owner_email ?? undefined,
                      owner_phone: v.owner_phone ?? undefined,
                      owner_team:
                        resolveLabel(v.owner_team, teamMap) || undefined,
                      owner_department:
                        resolveLabel(v.owner_department, departmentMap) ||
                        undefined,
                      owner_rank:
                        resolveLabel(v.owner_rank, rankMap) || undefined,
                    })
                    onOpenChangeRef.current(false)
                  })
                }}
              >
                {isSelected ? '已选择' : '选择'}
              </Button>
            </div>
          )
        },
      },
    ]
  }, [selectedName, teamMap, departmentMap, rankMap])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback(
    (row: { original: Owner }) => {
      const v = row.original
      setSelectedName(v.owner_name)
      queueMicrotask(() => {
        onSelectRef.current({
          owner_id: String(v.owner_id),
          owner_name: v.owner_name ?? '',
          owner_email: v.owner_email ?? undefined,
          owner_phone: v.owner_phone ?? undefined,
          owner_team: resolveLabel(v.owner_team, teamMap) || undefined,
          owner_department:
            resolveLabel(v.owner_department, departmentMap) || undefined,
          owner_rank: resolveLabel(v.owner_rank, rankMap) || undefined,
        })
        onOpenChangeRef.current(false)
      })
    },
    [teamMap, departmentMap, rankMap]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[1100px]'>
        <DialogHeader>
          <DialogTitle>选择案件机务</DialogTitle>
          <DialogDescription>
            从 owner_list {superintendentDepartmentLabel}（{SUPERINTENDENT_DEPARTMENT_TYPE}）中选择作为案件机务，支持关键词搜索、列排序、行点击快速选择。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按案件机务姓名 / 邮箱 / 电话 / 小组 / 部门 / 职级搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Wrench className='size-3.5' />
              <span>
                共 {filteredRows.length} 条 / 总 {filteredOwners.length} 条（
                {superintendentDepartmentLabel}
                ）
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
                  {ownersLoading ? (
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
                          ? '未找到匹配的案件机务，请更换搜索关键词。'
                          : `暂无${superintendentDepartmentLabel}（${SUPERINTENDENT_DEPARTMENT_TYPE}）的数据。`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const rowName = row.original.owner_name
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
