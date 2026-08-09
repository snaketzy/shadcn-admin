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
import { Search, X } from 'lucide-react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
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
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import {
  fetchDivisionCollaborations,
  fetchDivisionSuppliers,
  fetchDivisionSupplierGroups,
  fetchDivisionCollaborationGroups,
  type DivisionCollaborationRow,
  type DivisionSupplierRow,
  type SupplierDictEntry,
  type CollaborationDictEntry,
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

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(
  dict: SupplierDictEntry[] | CollaborationDictEntry[]
): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

function resolveLabels(raw: unknown, { keyMap, valueMap }: DictMap): string[] {
  if (raw === null || raw === undefined || raw === '') return []
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    let resolved = keyMap.get(p.toUpperCase())
    if (!resolved) resolved = valueMap.get(p)
    if (!resolved) resolved = p
    if (!resolved) continue
    if (seen.has(resolved)) continue
    seen.add(resolved)
    out.push(resolved)
  }
  return out
}

function resolveFieldHit(
  partsFromDb: string[],
  filterValues: string[],
  map: DictMap
): boolean {
  const expanded: string[] = []
  for (const p of partsFromDb) {
    expanded.push(p)
    const upper = p.toUpperCase()
    if (map.keyMap.has(upper)) expanded.push(map.keyMap.get(upper) as string)
    if (map.valueMap.has(p)) expanded.push(p)
    const revEntry = [...map.keyMap.entries()].find(([, v]) => v === p)
    if (revEntry) expanded.push(revEntry[0])
  }
  const set = new Set(expanded.map((x) => x.toLowerCase()))
  return filterValues.some((fp) => {
    const fpLower = fp.toLowerCase()
    if (set.has(fpLower)) return true
    const fpUpper = fp.toUpperCase()
    if (map.keyMap.has(fpUpper)) {
      const mapped = (map.keyMap.get(fpUpper) as string).toLowerCase()
      if (set.has(mapped)) return true
    }
    if (map.valueMap.has(fp)) {
      const rev = [...map.keyMap.entries()].find(([, v]) => v === fp)
      if (rev && set.has(rev[0].toLowerCase())) return true
    }
    return false
  })
}

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
  const [fieldFilter, setFieldFilter] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setSearchKeyword('')
    setFieldFilter([])
    const next = initialSelectedId ?? null
    setSelectedId((prev) => (prev === next ? prev : next))
  }, [open, initialSelectedId])

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['division-picker-suppliers'],
    queryFn: fetchDivisionSuppliers,
    enabled: open && divisionType === 'K1',
    staleTime: 60000,
  })

  const { data: collaborations = [], isLoading: collaborationsLoading } = useQuery({
    queryKey: ['division-picker-collaborations'],
    queryFn: fetchDivisionCollaborations,
    enabled: open && divisionType === 'K2',
    staleTime: 60000,
  })

  const { data: supplierGroups } = useQuery({
    queryKey: ['division-picker-supplier-groups'],
    queryFn: fetchDivisionSupplierGroups,
    enabled: open && divisionType === 'K1',
    staleTime: 60000,
  })
  const { data: collaborationGroups } = useQuery({
    queryKey: ['division-picker-collaboration-groups'],
    queryFn: fetchDivisionCollaborationGroups,
    enabled: open && divisionType === 'K2',
    staleTime: 60000,
  })

  const supplierFieldDict = supplierGroups?.fieldDict ?? []
  const collaborationFieldDict = collaborationGroups?.fieldDict ?? []
  const supplierFieldMap = useMemo(
    () => makeDictMap(supplierFieldDict),
    [supplierFieldDict]
  )
  const collaborationFieldMap = useMemo(
    () => makeDictMap(collaborationFieldDict),
    [collaborationFieldDict]
  )

  const rawRows: AnyRow[] = useMemo(() => {
    if (divisionType === 'K1') return suppliers as AnyRow[]
    if (divisionType === 'K2') return collaborations as AnyRow[]
    return []
  }, [divisionType, suppliers, collaborations])

  const filteredRows = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    const fieldParts = fieldFilter.map((s) => s.trim()).filter(Boolean)
    if (!q && fieldParts.length === 0) return rawRows
    return rawRows.filter((r) => {
      if (divisionType === 'K1') {
        const s = r as DivisionSupplierRow
        const keywordOk =
          !q ||
          String(s.supplier_shortname ?? '').toLowerCase().includes(q) ||
          String(s.supplier_name ?? '').toLowerCase().includes(q) ||
          String(s.supplier_advantage ?? '').toLowerCase().includes(q) ||
          String(s.supplier_contact_name ?? '').toLowerCase().includes(q) ||
          resolveLabels(s.supplier_field ?? '', supplierFieldMap)
            .join(',')
            .toLowerCase()
            .includes(q)
        if (!keywordOk) return false
        if (fieldParts.length > 0) {
          const raw = s.supplier_field ?? ''
          const parts = String(raw)
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
          if (!resolveFieldHit(parts, fieldParts, supplierFieldMap)) return false
        }
        return true
      }
      if (divisionType === 'K2') {
        const c = r as DivisionCollaborationRow
        const keywordOk =
          !q ||
          String(c.collaboration_shortname ?? '').toLowerCase().includes(q) ||
          String(c.collaboration_name ?? '').toLowerCase().includes(q) ||
          resolveLabels(c.collaboration_field ?? '', collaborationFieldMap)
            .join(',')
            .toLowerCase()
            .includes(q)
        if (!keywordOk) return false
        if (fieldParts.length > 0) {
          const raw = c.collaboration_field ?? ''
          const parts = String(raw)
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
          if (!resolveFieldHit(parts, fieldParts, collaborationFieldMap)) return false
        }
        return true
      }
      return false
    })
  }, [
    rawRows,
    searchKeyword,
    divisionType,
    fieldFilter,
    supplierFieldMap,
    collaborationFieldMap,
  ])

  const fieldFacetOptions = useMemo(() => {
    const result: { label: string; value: string }[] = []
    const seen = new Set<string>()
    const dict: Array<{ dict_key: string; dict_value: string }> =
      divisionType === 'K1' ? supplierFieldDict : collaborationFieldDict
    const list = divisionType === 'K1' ? suppliers : collaborations
    for (const d of dict) {
      if (!seen.has(d.dict_key)) {
        seen.add(d.dict_key)
        result.push({ label: d.dict_value, value: d.dict_key })
      }
    }
    const rawValues: string[] = []
    for (const r of list) {
      const raw =
        divisionType === 'K1'
          ? (r as DivisionSupplierRow).supplier_field ?? ''
          : (r as DivisionCollaborationRow).collaboration_field ?? ''
      const parts = String(raw)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      for (const p of parts) rawValues.push(p)
    }
    const uniqRaw = Array.from(new Set(rawValues))
    for (const rv of uniqRaw) {
      const inDict = seen.has(rv) || result.some((o) => o.label === rv || o.value === rv)
      if (!inDict) {
        seen.add(rv)
        result.push({ label: rv, value: rv })
      }
    }
    return result
  }, [divisionType, supplierFieldDict, collaborationFieldDict, suppliers, collaborations])

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
          size: 220,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_name
            return <LongText className='max-w-[220px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'supplier_field',
          header: '供应商经营范围',
          size: 260,
          cell: ({ row }) => {
            const raw = (row.original as DivisionSupplierRow).supplier_field
            const labels = resolveLabels(raw, supplierFieldMap)
            if (labels.length === 0) return <div>-</div>
            return (
              <div className='flex flex-wrap gap-1'>
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
        },
        {
          accessorKey: 'supplier_advantage',
          header: '供应商主营业务',
          size: 220,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_advantage
            return <LongText className='max-w-[220px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'supplier_contact_name',
          header: '供应商联系人',
          size: 120,
          cell: ({ row }) => {
            const v = (row.original as DivisionSupplierRow).supplier_contact_name
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
                  onClick={(e) => {
                    e.stopPropagation()
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
            const v = (row.original as DivisionCollaborationRow).collaboration_shortname
            return <LongText className='max-w-[180px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'collaboration_name',
          header: '协作商名称',
          size: 260,
          cell: ({ row }) => {
            const v = (row.original as DivisionCollaborationRow).collaboration_name
            return <LongText className='max-w-[260px]'>{v ?? '-'}</LongText>
          },
        },
        {
          accessorKey: 'collaboration_field',
          header: '协作商经营范围',
          size: 260,
          cell: ({ row }) => {
            const raw = (row.original as DivisionCollaborationRow).collaboration_field
            const labels = resolveLabels(raw, collaborationFieldMap)
            if (labels.length === 0) return <div>-</div>
            return (
              <div className='flex flex-wrap gap-1'>
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
        },
        {
          id: '_action',
          header: '',
          size: 100,
          enableSorting: false,
          cell: ({ row }) => {
            const id = String((row.original as DivisionCollaborationRow).collaboration_id)
            const isSelected = selectedId === id
            return (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  size='sm'
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation()
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
  }, [divisionType, selectedId, supplierFieldMap, collaborationFieldMap, onSelect, onOpenChange])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = useCallback(
    (row: { original: AnyRow }) => {
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

  const filterButtonLabel =
    divisionType === 'K1' ? '供应商经营范围' : '协作商经营范围'

  const isLoading = divisionType === 'K1' ? suppliersLoading : collaborationsLoading

  const fieldSelectedSet = useMemo(() => new Set(fieldFilter), [fieldFilter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-7xl'>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {divisionType === 'K1'
              ? '从供应商列表中选择所属单位，支持经营范围过滤、关键词搜索、列排序、双击快速选择。'
              : divisionType === 'K2'
                ? '从协作商列表中选择所属单位，支持经营范围过滤、关键词搜索、列排序、双击快速选择。'
                : '请先选择联系人类型以联动确定所属单位类型。'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-[360px] min-w-[360px]'>
              <Search className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder={
                  divisionType === 'K1'
                    ? '按简称 / 名称 / 经营范围 / 主营业务 / 联系人搜索...'
                    : divisionType === 'K2'
                      ? '按简称 / 名称 / 经营范围搜索协作商...'
                      : '请先确定所属单位类型...'
                }
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                disabled={divisionType == null}
                className='ps-9 pl-9'
              />
            </div>
            {(divisionType === 'K1' || divisionType === 'K2') && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='outline' size='sm' className='h-9 border-dashed'>
                    <PlusCircledIcon className='size-4' />
                    {filterButtonLabel}
                    {fieldFilter.length > 0 && (
                      <>
                        <Separator orientation='vertical' className='mx-2 h-4' />
                        <Badge variant='secondary' className='rounded-sm px-1 font-normal'>
                          {fieldFilter.length}
                        </Badge>
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[240px] p-0' align='start'>
                  <Command>
                    <CommandInput placeholder='过滤选项...' />
                    <CommandList>
                      <CommandEmpty>未找到匹配项。</CommandEmpty>
                      <CommandGroup>
                        {fieldFacetOptions.map((o) => {
                          const isSelected = fieldSelectedSet.has(o.value)
                          return (
                            <CommandItem
                              key={o.value}
                              value={o.label}
                              onSelect={() => {
                                setFieldFilter((prev) =>
                                  isSelected
                                    ? prev.filter((x) => x !== o.value)
                                    : [...prev, o.value]
                                )
                              }}
                            >
                              <span
                                className={cn(
                                  'mr-2 flex size-4 items-center justify-center rounded-sm border',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/40 opacity-60'
                                )}
                              >
                                {isSelected && <CheckIcon className='size-3' />}
                              </span>
                              {o.label}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                      {fieldFilter.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setFieldFilter([])}
                              className='justify-center text-center'
                            >
                              <X className='mr-2 size-4' />
                              清除全部
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {fieldFilter.length > 0 && (
              <div className='flex flex-wrap items-center gap-1'>
                {fieldFilter.map((f) => {
                  const opt = fieldFacetOptions.find((o) => o.value === f)
                  const label = opt?.label ?? f
                  return (
                    <Badge
                      key={f}
                      variant='outline'
                      className={cn(getBadgeColor(label), 'cursor-pointer')}
                      onClick={() => setFieldFilter((prev) => prev.filter((x) => x !== f))}
                    >
                      {label}
                      <X className='ms-1 size-3' />
                    </Badge>
                  )
                })}
              </div>
            )}
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
                        : searchKeyword.trim() !== '' || fieldFilter.length > 0
                          ? '未找到匹配的结果，请更换搜索关键词或筛选条件。'
                          : '暂无数据。'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const rowId =
                      divisionType === 'K1'
                        ? String((row.original as DivisionSupplierRow).supplier_id)
                        : String((row.original as DivisionCollaborationRow).collaboration_id)
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
                            style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
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
