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
import { fetchVesselAll, fetchVesselGroups, type Vessel, type VesselDictEntry } from '../api/client'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

const FIXED_COL_STYLES: Record<
  string,
  { th: React.CSSProperties; td: React.CSSProperties }
> = {
  vessel_name: {
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

function makeDictMap(dict: VesselDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

export type VesselPickerResult = {
  vessel_id: string
  vessel_name: string
  vessel_flag?: string
  vessel_class?: string
  vessel_team?: string
  vessel_incharge?: string
}

export type VesselPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: VesselPickerResult) => void
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

export function VesselPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedName,
}: VesselPickerDialogProps) {
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

  const { data: vessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ['vessel-picker-all'],
    queryFn: fetchVesselAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['vessel-picker-groups'],
    queryFn: fetchVesselGroups,
    enabled: open,
    staleTime: 60000,
  })

  const inchargeMap = useMemo(
    () => makeDictMap(groupsData?.inchargeDict ?? []),
    [groupsData]
  )
  const fleetManagerMap = useMemo(
    () => makeDictMap(groupsData?.fleetManagerDict ?? []),
    [groupsData]
  )

  const filteredRows: Vessel[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return vessels as Vessel[]
    return (vessels as Vessel[]).filter((v) => {
      return (
        String(v.vessel_name ?? '').toLowerCase().includes(q) ||
        String(v.vessel_flag ?? '').toLowerCase().includes(q) ||
        String(v.vessel_class ?? '').toLowerCase().includes(q) ||
        String(v.vessel_team ?? '').toLowerCase().includes(q) ||
        resolveLabel(v.vessel_incharge, inchargeMap).toLowerCase().includes(q) ||
        resolveLabel(v.vessel_fleet_manager, fleetManagerMap).toLowerCase().includes(q) ||
        (v.vessel_imo != null && String(v.vessel_imo).includes(q)) ||
        String(v.building_year ?? '').includes(q)
      )
    })
  }, [vessels, searchKeyword, inchargeMap, fleetManagerMap])

  const columns = useMemo<ColumnDef<Vessel, unknown>[]>(() => {
    return [
      {
        accessorKey: 'vessel_name',
        header: '船名',
        size: 200,
        cell: ({ row }) => {
          const v = row.original.vessel_name
          return <LongText className='max-w-[200px]'>{v ?? '-'}</LongText>
        },
        meta: {
          label: '船名',
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
        accessorKey: 'vessel_flag',
        header: '船旗',
        size: 100,
        cell: ({ row }) => {
          const raw = row.original.vessel_flag
          if (!raw) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {raw}
            </Badge>
          )
        },
        meta: { label: '船旗' },
      },
      {
        accessorKey: 'vessel_class',
        header: '船级',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.vessel_class
          if (!raw) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {raw}
            </Badge>
          )
        },
        meta: { label: '船级' },
      },
      {
        accessorKey: 'vessel_team',
        header: '船队',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.vessel_team
          if (!raw) return <div>-</div>
          return (
            <Badge variant='outline' className={cn('bg-secondary/30')}>
              {raw}
            </Badge>
          )
        },
        meta: { label: '船队' },
      },
      {
        accessorKey: 'vessel_incharge',
        header: '负责人',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.vessel_incharge
          const label = resolveLabel(raw, inchargeMap)
          if (!label) return <div>-</div>
          return <span>{label}</span>
        },
        meta: { label: '负责人' },
      },
      {
        accessorKey: 'vessel_fleet_manager',
        header: '船队总管',
        size: 120,
        cell: ({ row }) => {
          const raw = row.original.vessel_fleet_manager
          const label = resolveLabel(raw, fleetManagerMap)
          if (!label) return <div>-</div>
          return <span>{label}</span>
        },
        meta: { label: '船队总管' },
      },
      {
        accessorKey: 'building_year',
        header: '建造年份',
        size: 110,
        cell: ({ row }) => {
          const v = row.original.building_year
          return <span>{v ?? '-'}</span>
        },
        meta: { label: '建造年份' },
      },
      {
        accessorKey: 'vessel_imo',
        header: 'IMO',
        size: 130,
        cell: ({ row }) => {
          const v = row.original.vessel_imo
          return <span>{v ?? '-'}</span>
        },
        meta: { label: 'IMO' },
      },
      {
        accessorKey: 'vessel_dwt',
        header: '载重吨(DWT)',
        size: 120,
        cell: ({ row }) => {
          const v = row.original.vessel_dwt
          return <span>{v ?? '-'}</span>
        },
        meta: { label: '载重吨(DWT)' },
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
          const name = row.original.vessel_name
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
                  setSelectedName(v.vessel_name)
                  onSelectRef.current({
                    vessel_id: String(v.vessel_id),
                    vessel_name: v.vessel_name ?? '',
                    vessel_flag: v.vessel_flag ?? undefined,
                    vessel_class: v.vessel_class ?? undefined,
                    vessel_team: v.vessel_team ?? undefined,
                    vessel_incharge:
                      resolveLabel(v.vessel_incharge, inchargeMap) || undefined,
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
  }, [selectedName, inchargeMap, fleetManagerMap])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback(
    (row: { original: Vessel }) => {
      const v = row.original
      setSelectedName(v.vessel_name)
      onSelectRef.current({
        vessel_id: String(v.vessel_id),
        vessel_name: v.vessel_name ?? '',
        vessel_flag: v.vessel_flag ?? undefined,
        vessel_class: v.vessel_class ?? undefined,
        vessel_team: v.vessel_team ?? undefined,
        vessel_incharge:
          resolveLabel(v.vessel_incharge, inchargeMap) || undefined,
      })
      onOpenChangeRef.current(false)
    },
    [inchargeMap]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[1200px]'>
        <DialogHeader>
          <DialogTitle>选择船只</DialogTitle>
          <DialogDescription>
            从船队列表中选择船只作为船名，支持关键词搜索、列排序、行点击快速选择。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[420px] min-w-[360px]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='按船名 / 船旗 / 船级 / 船队 / 负责人 / IMO 搜索...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className='ps-9 pl-9'
              />
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Ship className='size-3.5' />
              <span>
                共 {filteredRows.length} 条 / 总 {vessels.length} 条
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
                  {vesselsLoading ? (
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
                          ? '未找到匹配的船只，请更换搜索关键词。'
                          : '暂无船只数据。'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const rowName = row.original.vessel_name
                      const isSelectedRow = selectedName === rowName
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
                                ...(FIXED_COL_STYLES[
                                  cell.column.id ?? ''
                                ]?.td ?? {}),
                              }}
                              className={cn(
                                'bg-background',
                                cell.column.columnDef.meta?.className as
                                  | string
                                  | undefined,
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
