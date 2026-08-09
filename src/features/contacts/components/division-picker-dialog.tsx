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
import { Search } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../../suppliers/data/data'
import {
  fetchContactGroups,
  fetchDivisionCollaborations,
  fetchDivisionSuppliers,
  type ContactDictEntry,
  type DivisionCollaborationRow,
  type DivisionSupplierRow,
} from '../api/client'

export type DivisionPickerResult =
  | {
      divisionType: 'K1'
      divisionId: string
      displayShortname: string
      displayName: string
    }
  | {
      divisionType: 'K2'
      divisionId: string
      displayShortname: string
      displayName: string
    }

export type DivisionPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisionType: 'K1' | 'K2' | null
  onSelect: (result: DivisionPickerResult) => void
  initialSelectedId?: string
}

type AnyRow = DivisionSupplierRow | DivisionCollaborationRow

export function DivisionPickerDialog({
  open,
  onOpenChange,
  divisionType,
  onSelect,
  initialSelectedId,
}: DivisionPickerDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  )
  const [activeFieldFilter, setActiveFieldFilter] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    if (!open) return
    setSearchKeyword('')
    setActiveFieldFilter(new Set())
    const next = initialSelectedId ?? null
    setSelectedId((prev) => (prev === next ? prev : next))
  }, [open, initialSelectedId])

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['division-picker-suppliers'],
    queryFn: fetchDivisionSuppliers,
    enabled: open && divisionType === 'K1',
  })

  const { data: collaborations = [], isLoading: collaborationsLoading } =
    useQuery({
      queryKey: ['division-picker-collaborations'],
      queryFn: fetchDivisionCollaborations,
      enabled: open && divisionType === 'K2',
    })

  const { data: groupsData } = useQuery({
    queryKey: ['contact-list-groups'],
    queryFn: fetchContactGroups,
    enabled: open && divisionType === 'K1',
  })
  const supplierFieldDict = useMemo<ContactDictEntry[]>(
    () => groupsData?.supplierFieldDict ?? [],
    [groupsData]
  )
  const { fieldKeyMap, fieldValueMap } = useMemo(() => {
    const km = new Map<string, string>()
    const vm = new Map<string, string>()
    for (const d of supplierFieldDict) {
      const k = String(d.dict_key ?? '').trim()
      const v = String(d.dict_value ?? '').trim()
      if (!k && !v) continue
      if (k) km.set(k.toUpperCase(), v || k)
      if (v) vm.set(v, v)
    }
    return { fieldKeyMap: km, fieldValueMap: vm }
  }, [supplierFieldDict])
  function resolveFieldLabels(raw: unknown): string[] {
    if (raw === null || raw === undefined || raw === '') return []
    const parts = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const out: string[] = []
    const seen = new Set<string>()
    for (const p of parts) {
      let resolved = fieldKeyMap.get(p.toUpperCase())
      if (!resolved) resolved = fieldValueMap.get(p)
      if (!resolved) resolved = p
      if (!resolved) continue
      if (seen.has(resolved)) continue
      seen.add(resolved)
      out.push(resolved)
    }
    return out
  }

  const rawRows: AnyRow[] = useMemo(() => {
    if (divisionType === 'K1') return suppliers as AnyRow[]
    if (divisionType === 'K2') return collaborations as AnyRow[]
    return []
  }, [divisionType, suppliers, collaborations])

  const filteredRows = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    const filterLabels = activeFieldFilter
    const temp = rawRows.filter((r) => {
      if (divisionType === 'K1') {
        const s = r as DivisionSupplierRow
        const labels = resolveFieldLabels(s.supplier_field)
        if (filterLabels.size > 0) {
          const labelSet = new Set(labels)
          let ok = false
          for (const f of filterLabels) {
            if (labelSet.has(f)) {
              ok = true
              break
            }
          }
          if (!ok) return false
        }
        if (!q) return true
        return (
          String(s.supplier_shortname ?? '')
            .toLowerCase()
            .includes(q) ||
          String(s.supplier_name ?? '')
            .toLowerCase()
            .includes(q) ||
          String(s.supplier_advantage ?? '')
            .toLowerCase()
            .includes(q) ||
          String(s.supplier_contact_name ?? '')
            .toLowerCase()
            .includes(q) ||
          labels.some((l) => l.toLowerCase().includes(q))
        )
      } else {
        if (!q) return true
        const c = r as DivisionCollaborationRow
        return (
          String(c.collaboration_shortname ?? '')
            .toLowerCase()
            .includes(q) ||
          String(c.collaboration_name ?? '')
            .toLowerCase()
            .includes(q)
        )
      }
    })
    return temp
  }, [rawRows, searchKeyword, divisionType, activeFieldFilter])

  const fieldFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const result: { label: string; value: string }[] = []
    for (const d of supplierFieldDict) {
      if (!d.dict_key) continue
      const label = d.dict_value || d.dict_key
      if (seen.has(label)) continue
      seen.add(label)
      result.push({ label, value: label })
    }
    for (const r of suppliers) {
      const labels = resolveFieldLabels(
        (r as DivisionSupplierRow).supplier_field
      )
      for (const l of labels) {
        if (seen.has(l)) continue
        seen.add(l)
        result.push({ label: l, value: l })
      }
    }
    return result
  }, [suppliers, supplierFieldDict])

  const columns = useMemo<ColumnDef<AnyRow, unknown>[]>(() => {
    if (divisionType === 'K1') {
      return [
        {
          accessorKey: 'supplier_shortname',
          header: '供应商简称',
          size: 160,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_shortname
            return <LongText className='max-w-[160px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'supplier_name',
          header: '供应商名称',
          size: 240,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_name
            return <LongText className='max-w-[240px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'supplier_field',
          header: '供应商经营范围',
          size: 260,
          cell: ({ row }) => {
            const raw = (row.original as DivisionSupplierRow).supplier_field
            const labels = resolveFieldLabels(raw)
            if (labels.length === 0) return <div>-</div>
            return (
              <div className='flex max-w-[260px] flex-wrap gap-1'>
                {labels.map((label) => (
                  <Badge
                    key={label}
                    variant='outline'
                    className={cn(getBadgeColor(label))}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )
          },
          enableSorting: false,
        },
        {
          accessorKey: 'supplier_advantage',
          header: '供应商主营业务',
          size: 240,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_advantage
            return <LongText className='max-w-[240px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'supplier_contact_name',
          header: '供应商联系人',
          size: 120,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow)
              .supplier_contact_name
            return <span>{v ?? '-'}</span>
          },
        },
        {
          id: '_action',
          header: '',
          size: 100,
          enableSorting: false,
          cell: ({ row }) => {
            const id = String((row.original as DivisionSupplierRow).supplier_id)
            const isSelected = selectedId === id
            return (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  size='sm'
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={() => {
                    const s = row.original as DivisionSupplierRow
                    setSelectedId(String(s.supplier_id))
                    onSelect({
                      divisionType: 'K1',
                      divisionId: String(s.supplier_id),
                      displayShortname: s.supplier_shortname ?? '',
                      displayName: s.supplier_name ?? '',
                    })
                    onOpenChange(false)
                  }}
                >
                  {isSelected ? '已选择' : '选择'}
                </Button>
              </div>
            )
          },
        },
      ]
    }
    if (divisionType === 'K2') {
      return [
        {
          accessorKey: 'collaboration_shortname',
          header: '协作商简称',
          size: 180,
          cell: ({ row }) => {
            const v = (row.original as DivisionCollaborationRow)
              .collaboration_shortname
            return <LongText className='max-w-[180px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'collaboration_name',
          header: '协作商名称',
          size: 320,
          cell: ({ row }) => {
            const v = (row.original as DivisionCollaborationRow)
              .collaboration_name
            return <LongText className='max-w-[320px]'>{v ?? '-'}</LongText>
          },
        },
        {
          id: '_action',
          header: '',
          size: 100,
          enableSorting: false,
          cell: ({ row }) => {
            const id = String(
              (row.original as DivisionCollaborationRow).collaboration_id
            )
            const isSelected = selectedId === id
            return (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  size='sm'
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={() => {
                    const c = row.original as DivisionCollaborationRow
                    setSelectedId(String(c.collaboration_id))
                    onSelect({
                      divisionType: 'K2',
                      divisionId: String(c.collaboration_id),
                      displayShortname: c.collaboration_shortname ?? '',
                      displayName: c.collaboration_name ?? '',
                    })
                    onOpenChange(false)
                  }}
                >
                  {isSelected ? '已选择' : '选择'}
                </Button>
              </div>
            )
          },
        },
      ]
    }
    return []
  }, [divisionType, selectedId])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback(
    (row: { original: AnyRow; getIsSelected: () => boolean }) => {
      if (divisionType === 'K1') {
        const s = row.original as DivisionSupplierRow
        const id = String(s.supplier_id)
        setSelectedId(id)
        onSelect({
          divisionType: 'K1',
          divisionId: id,
          displayShortname: s.supplier_shortname ?? '',
          displayName: s.supplier_name ?? '',
        })
        onOpenChange(false)
      } else if (divisionType === 'K2') {
        const c = row.original as DivisionCollaborationRow
        const id = String(c.collaboration_id)
        setSelectedId(id)
        onSelect({
          divisionType: 'K2',
          divisionId: id,
          displayShortname: c.collaboration_shortname ?? '',
          displayName: c.collaboration_name ?? '',
        })
        onOpenChange(false)
      }
    },
    [divisionType, onSelect, onOpenChange]
  )

  const dialogTitle =
    divisionType === 'K1'
      ? '选择供应商（所属单位）'
      : divisionType === 'K2'
        ? '选择协作商（所属单位）'
        : '选择所属单位'

  const isLoading =
    divisionType === 'K1' ? suppliersLoading : collaborationsLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {divisionType === 'K1'
              ? '从供应商列表中选择所属单位，支持关键词搜索、列排序、双击快速选择。'
              : divisionType === 'K2'
                ? '从协作商列表中选择所属单位，支持关键词搜索、列排序、双击快速选择。'
                : '请先选择联系人类型以联动确定所属单位类型。'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-row flex-wrap items-center gap-3'>
            <div className='relative flex-1 min-w-[260px] max-w-[50%]'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder={
                  divisionType === 'K1'
                    ? '按简称 / 名称 / 经营范围 / 主营业务 / 联系人搜索供应商...'
                    : divisionType === 'K2'
                      ? '按简称 / 名称搜索协作商...'
                      : '请先确定所属单位类型...'
                }
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                disabled={divisionType == null}
                className='ps-9 pe-18 pl-9'
              />
            </div>
            {divisionType === 'K1' && fieldFilterOptions.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 gap-1 normal-case shrink-0'
                  >
                    经营范围
                    {activeFieldFilter.size > 0 && (
                      <span className='ml-1 rounded-sm bg-muted-foreground/20 px-1.5 text-[11px]'>
                        {activeFieldFilter.size}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-72 p-3' align='start'>
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-xs font-medium'>经营范围</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      disabled={activeFieldFilter.size === 0}
                      onClick={() => setActiveFieldFilter(new Set())}
                    >
                      重置
                    </Button>
                  </div>
                  <ScrollArea className='mt-1 h-60 rounded-md border'>
                    <div className='space-y-1.5 p-2'>
                      {fieldFilterOptions.map((opt) => {
                        const checked = activeFieldFilter.has(opt.value)
                        return (
                          <div
                            key={opt.value}
                            className='flex items-center gap-2 rounded-sm px-1 hover:bg-muted/50'
                          >
                            <Checkbox
                              id={`ff_${opt.value}`}
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = new Set(activeFieldFilter)
                                if (v) next.add(opt.value)
                                else next.delete(opt.value)
                                setActiveFieldFilter(next)
                              }}
                            />
                            <Label
                              htmlFor={`ff_${opt.value}`}
                              className='flex-1 cursor-pointer text-sm'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {divisionType === 'K1' && activeFieldFilter.size > 0 && (
            <div className='flex flex-wrap items-center gap-1'>
              {Array.from(activeFieldFilter).map((label) => (
                <Badge
                  key={label}
                  variant='outline'
                  className='h-6 gap-1 px-2'
                >
                  <span className='text-xs'>{label}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='ml-0.5 h-auto w-auto min-w-0 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground'
                    onClick={() => {
                      const next = new Set(activeFieldFilter)
                      next.delete(label)
                      setActiveFieldFilter(next)
                    }}
                    aria-label={`取消筛选 ${label}`}
                  >
                    ×
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          <div className='h-[420px] overflow-auto rounded-md border'>
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
                        }}
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
                {isLoading ? (
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
                      {divisionType == null
                        ? '请先选择联系人类型。'
                        : searchKeyword.trim() !== ''
                          ? '未找到匹配的结果，请更换搜索关键词。'
                          : '暂无数据。'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const rowId =
                      divisionType === 'K1'
                        ? String(
                            (row.original as DivisionSupplierRow).supplier_id
                          )
                        : String(
                            (row.original as DivisionCollaborationRow)
                              .collaboration_id
                          )
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
                            }}
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
