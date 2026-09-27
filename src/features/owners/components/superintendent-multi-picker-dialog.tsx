'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  _select: {
    th: {
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 50,
      width: 56,
      minWidth: 56,
      maxWidth: 56,
    },
    td: {
      position: 'sticky',
      left: 0,
      zIndex: 20,
      width: 56,
      minWidth: 56,
      maxWidth: 56,
    },
  },
  owner_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 56,
      zIndex: 50,
      width: 200,
      minWidth: 200,
    },
    td: {
      position: 'sticky',
      left: 56,
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

export type SuperintendentMultiPickerResult = {
  owner_ids: string[]
  owner_names: string[]
  items: Owner[]
}

export type SuperintendentMultiPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SuperintendentMultiPickerResult) => void
  initialSelectedIds?: (string | number)[] | string | number | null
  initialSelectedNames?: string | string[] | null
  departmentLabel?: string
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

const F1_DEPT_CODE = 'F1'
const F4_DEPT_CODE = 'F4'

function toIdsArr(
  raw:
    | (string | number)[]
    | string
    | number
    | null
    | undefined
): string[] {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v ?? '').trim())
      .filter((s) => s !== '')
  }
  const s = String(raw).trim()
  if (!s) return []
  return s
    .split(/[,，]\s*/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

function toNamesArr(raw: string | string[] | null | undefined): string[] {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? '').trim()).filter((s) => s !== '')
  }
  const s = String(raw).trim()
  if (!s) return []
  return s
    .split(/[，,]\s*/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

export function SuperintendentMultiPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedIds,
  initialSelectedNames,
  departmentLabel,
}: SuperintendentMultiPickerDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const onSelectRef = useRef(onSelect)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const { data: owners = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['owner-picker-all'],
    queryFn: fetchOwnerAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['owner-picker-groups'],
    queryFn: fetchOwnerGroups,
    enabled: open,
    staleTime: 60000,
  })

  const teamMap = useMemo(
    () => makeDictMap(groupsData?.teamDict ?? []),
    [groupsData]
  )
  const departmentMap = useMemo(
    () => makeDictMap(groupsData?.departmentDict ?? []),
    [groupsData]
  )
  const rankMap = useMemo(
    () => makeDictMap(groupsData?.rankDict ?? []),
    [groupsData]
  )

  const superintendentRows = useMemo<Owner[]>(() => {
    return (owners as Owner[]).filter((o) => {
      const dept = String(o.owner_department ?? '').toUpperCase()
      return dept === F1_DEPT_CODE || dept === F4_DEPT_CODE
    })
  }, [owners])

  const resolveInitialOwnerIds = useCallback(
    (supers: Owner[]): string[] => {
      const initIds = toIdsArr(initialSelectedIds)
      const idSet = new Set<string>()
      for (const id of initIds) {
        const hit = supers.find((o) => String(o.owner_id ?? '') === id)
        if (hit) idSet.add(String(hit.owner_id))
      }
      if (idSet.size > 0) return [...idSet]
      const initNames = toNamesArr(initialSelectedNames)
      for (const n of initNames) {
        const hit = supers.find(
          (o) => String(o.owner_name ?? '').trim() === n
        )
        if (hit) idSet.add(String(hit.owner_id))
      }
      return [...idSet]
    },
    [initialSelectedIds, initialSelectedNames]
  )

  useEffect(() => {
    if (!open) return
    setSearchKeyword('')
    const initArr = resolveInitialOwnerIds(superintendentRows)
    const next = new Set<string>(initArr)
    setSelectedIds((prev) => {
      if (
        prev.size === next.size &&
        [...prev].every((v) => next.has(v))
      ) {
        return prev
      }
      return next
    })
  }, [open, superintendentRows, resolveInitialOwnerIds])

  const f1Label = useMemo(() => {
    if (departmentLabel) return departmentLabel
    const f1 = departmentMap.keyMap.get(F1_DEPT_CODE) || F1_DEPT_CODE
    const f4 = departmentMap.keyMap.get(F4_DEPT_CODE) || F4_DEPT_CODE
    return `${f1}/${f4}`
  }, [departmentLabel, departmentMap])

  const filteredRows: Owner[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return superintendentRows
    return superintendentRows.filter((o) => {
      return (
        String(o.owner_name ?? '')
          .toLowerCase()
          .includes(q) ||
        String(o.owner_email ?? '')
          .toLowerCase()
          .includes(q) ||
        String(o.owner_phone ?? '')
          .toLowerCase()
          .includes(q) ||
        resolveLabel(o.owner_team, teamMap)
          .toLowerCase()
          .includes(q) ||
        resolveLabel(o.owner_department, departmentMap)
          .toLowerCase()
          .includes(q) ||
        resolveLabel(o.owner_rank, rankMap)
          .toLowerCase()
          .includes(q)
      )
    })
  }, [superintendentRows, searchKeyword, teamMap, departmentMap, rankMap])

  const toggleSelected = useCallback((idStr: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(idStr)) next.delete(idStr)
      else next.add(idStr)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const filtered = filteredRows
    if (filtered.length === 0) return
    const firstId = String(filtered[0].owner_id ?? '')
    const allChecked =
      selectedIds.size > 0 &&
      filtered.every((o) => selectedIds.has(String(o.owner_id ?? '')))
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const o of filtered) next.delete(String(o.owner_id ?? ''))
        return next
      })
      return
    }
    void firstId
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const o of filtered) next.add(String(o.owner_id ?? ''))
      return next
    })
  }, [filteredRows, selectedIds])

  const handleConfirm = useCallback(() => {
    const idOrder = [...selectedIds]
    const supList = superintendentRows as Owner[]
    const byId = new Map<string, Owner>()
    for (const o of supList) byId.set(String(o.owner_id ?? ''), o)
    const pickedItems: Owner[] = []
    const pickedIds: string[] = []
    const pickedNames: string[] = []
    for (const idStr of idOrder) {
      const o = byId.get(idStr)
      if (!o) continue
      pickedItems.push(o)
      pickedIds.push(idStr)
      pickedNames.push(o.owner_name ?? '')
    }
    onSelectRef.current({
      owner_ids: pickedIds,
      owner_names: pickedNames,
      items: pickedItems,
    })
    onOpenChangeRef.current(false)
  }, [selectedIds, superintendentRows])

  const columns = useMemo<ColumnDef<Owner, unknown>[]>(() => {
    return [
      {
        id: '_select',
        header: () => {
          const total = filteredRows.length
          if (total === 0) return null
          const allChecked =
            selectedIds.size > 0 &&
            filteredRows.every((o) =>
              selectedIds.has(String(o.owner_id ?? ''))
            )
          return (
            <div className='flex items-center justify-center'>
              <Checkbox
                checked={allChecked}
                onCheckedChange={(v) => {
                  if (v === 'indeterminate') return
                  if (v) {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      for (const o of filteredRows) {
                        next.add(String(o.owner_id ?? ''))
                      }
                      return next
                    })
                  } else {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      for (const o of filteredRows) {
                        next.delete(String(o.owner_id ?? ''))
                      }
                      return next
                    })
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label='全选当前筛选案件机务'
              />
            </div>
          )
        },
        size: 56,
        minSize: 56,
        maxSize: 56,
        enableSorting: false,
        enableHiding: false,
        meta: {
          className: cn(
            'sticky left-0 z-20 w-[56px] min-w-[56px] max-w-[56px] bg-background ps-0.5 text-center',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
          thClassName: cn(
            'sticky top-0 left-0 z-40 w-[56px] min-w-[56px] max-w-[56px] rounded-tl-[inherit] bg-background ps-0.5 text-center',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
        },
        cell: ({ row }) => {
          const id = String(row.original.owner_id)
          const checked = selectedIds.has(id)
          return (
            <div className='flex items-center justify-center'>
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => {
                  if (v === 'indeterminate') return
                  toggleSelected(id)
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )
        },
      },
      {
        accessorKey: 'owner_name',
        header: '机务人员名称',
        size: 180,
        minSize: 160,
        cell: ({ row }) => {
          const v = row.original.owner_name
          return <LongText className='max-w-[180px]'>{v ?? '-'}</LongText>
        },
        meta: {
          label: '机务人员名称',
          className: cn(
            'sticky z-20 w-[180px] min-w-[180px] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
          thClassName: cn(
            'sticky top-0 z-40 w-[180px] min-w-[180px] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
        },
        enableHiding: false,
      },
      {
        accessorKey: 'owner_email',
        header: '邮箱',
        size: 240,
        minSize: 200,
        cell: ({ row }) => {
          const raw = row.original.owner_email
          if (!raw) return <div>-</div>
          return <LongText className='max-w-[240px]'>{raw}</LongText>
        },
        meta: { label: '邮箱' },
      },
      {
        accessorKey: 'owner_phone',
        header: '电话',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const raw = row.original.owner_phone
          if (!raw) return <div>-</div>
          return <span>{raw}</span>
        },
        meta: { label: '电话' },
      },
      {
        accessorKey: 'owner_team',
        header: '小组',
        size: 90,
        minSize: 80,
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
        meta: { label: '小组' },
      },
      {
        accessorKey: 'owner_department',
        header: '部门',
        size: 90,
        minSize: 80,
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
        meta: { label: '部门' },
      },
      {
        accessorKey: 'owner_rank',
        header: '职级',
        size: 110,
        minSize: 100,
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
        meta: { label: '职级' },
      },
      {
        id: '_action',
        header: '',
        size: 90,
        minSize: 80,
        enableSorting: false,
        enableHiding: false,
        meta: {
          label: '',
          className: cn(
            'sticky right-0 z-30 w-[90px] min-w-[90px] rounded-tr-[inherit] bg-background pe-0'
          ),
          thClassName: cn(
            'sticky top-0 right-0 z-40 w-[90px] min-w-[90px] rounded-tr-[inherit] bg-background pe-0'
          ),
        },
        cell: ({ row }) => {
          const id = String(row.original.owner_id ?? '')
          const isSelected = selectedIds.has(id)
          return (
            <div className='flex justify-end'>
              <Button
                type='button'
                size='sm'
                variant={isSelected ? 'default' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSelected(id)
                }}
              >
                {isSelected ? '已选' : '选择'}
              </Button>
            </div>
          )
        },
      },
    ]
  }, [selectedIds, teamMap, departmentMap, rankMap, toggleSelected, toggleSelectAll, filteredRows])

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
      const id = String(row.original.owner_id ?? '')
      toggleSelected(id)
    },
    [toggleSelected]
  )

  const selectedCount = selectedIds.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[1300px] w-[92vw]'>
        <DialogHeader>
          <DialogTitle>选择案件机务（{f1Label}，支持多选）</DialogTitle>
          <DialogDescription>
            从船东列表的 {f1Label} 部门中多选作为案件机务，支持关键词搜索、列排序、行点击切换勾选。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按机务名称 / 邮箱 / 电话 / 小组 / 部门 / 职级搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Wrench className='size-3.5' />
              <span>
                共 {filteredRows.length} 条 / 总 {superintendentRows.length} 条（{f1Label}）
              </span>
            </div>
            {selectedCount > 0 && (
              <Badge variant='secondary' className='ms-2 ml-2'>
                已选 {selectedCount} 项
              </Badge>
            )}
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
                            ...(FIXED_COL_STYLES[h.column.id ?? '']?.th ??
                              {}),
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
                          ? `未找到匹配的案件机务（${f1Label}），请更换搜索关键词。`
                          : `暂无案件机务（${f1Label}）数据。`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const rowId = String(row.original.owner_id ?? '')
                      const isSelectedRow = selectedIds.has(rowId)
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
          <Button
            type='button'
            variant='default'
            onClick={handleConfirm}
            disabled={selectedCount === 0}
          >
            确认选择{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
