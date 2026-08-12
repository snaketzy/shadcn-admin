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
import { Briefcase, Search } from 'lucide-react'
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
  fetchSupplierAll,
  fetchSupplierGroups,
  type Supplier,
  type SupplierDictEntry,
} from '@/features/suppliers/api/client'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

const FIXED_COL_STYLES: Record<
  string,
  { th: React.CSSProperties; td: React.CSSProperties }
> = {
  supplier_name: {
    th: {
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 50,
      width: 320,
      minWidth: 320,
    },
    td: {
      position: 'sticky',
      left: 0,
      zIndex: 20,
      width: 320,
      minWidth: 320,
    },
  },
  _action: {
    th: {
      position: 'sticky',
      top: 0,
      right: 0,
      zIndex: 50,
      width: 120,
      minWidth: 120,
    },
    td: {
      position: 'sticky',
      right: 0,
      zIndex: 30,
      width: 120,
      minWidth: 120,
    },
  },
}

function makeDictMap(dict: SupplierDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

function resolveField(raw: unknown, map: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const v = String(raw).trim()
  if (!v) return ''
  const up = v.toUpperCase()
  if (map.keyMap.has(up)) return map.keyMap.get(up) as string
  if (map.valueMap.has(v)) return v
  return v
}

export type SupplierPickerResult = {
  supplier_id: string
  supplier_name: string
  supplier_shortname?: string
  supplier_field?: string
}

export type SupplierPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SupplierPickerResult) => void
  initialSelectedId?: string
}

export function SupplierPickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialSelectedId,
}: SupplierPickerDialogProps) {
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

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['supplier-picker-all'],
    queryFn: fetchSupplierAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['supplier-picker-groups'],
    queryFn: fetchSupplierGroups,
    enabled: open,
    staleTime: 60000,
  })

  const fieldMap = useMemo(
    () => makeDictMap(groupsData?.fieldDict ?? []),
    [groupsData]
  )

  const filteredRows: Supplier[] = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase()
    if (!q) return suppliers as Supplier[]
    return (suppliers as Supplier[]).filter((s) => {
      return (
        String(s.supplier_name ?? '')
          .toLowerCase()
          .includes(q) ||
        String(s.supplier_shortname ?? '')
          .toLowerCase()
          .includes(q) ||
        resolveField(s.supplier_field, fieldMap).toLowerCase().includes(q) ||
        String(s.supplier_remark ?? '')
          .toLowerCase()
          .includes(q) ||
        String(s.supplier_id ?? '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [suppliers, searchKeyword, fieldMap])

  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(() => {
    return [
      {
        accessorKey: 'supplier_name',
        header: '单位名称',
        size: 320,
        cell: ({ row }) => {
          const s = row.original
          const sn = s.supplier_shortname?.trim()
          return (
            <div className='flex flex-col gap-0.5'>
              <div className='max-w-[300px] truncate leading-tight font-medium'>
                {sn ?? s.supplier_name ?? '-'}
              </div>
              {sn && sn !== s.supplier_name ? (
                <div className='max-w-[300px] truncate text-[10px] leading-none text-muted-foreground'>
                  全称：{s.supplier_name ?? '-'}
                </div>
              ) : null}
            </div>
          )
        },
        meta: {
          className: cn(
            'sticky left-0 z-20 w-[320px] min-w-[320px] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
          thClassName: cn(
            'sticky top-0 left-0 z-40 w-[320px] min-w-[320px] rounded-tl-[inherit] bg-background ps-0.5',
            'shadow-[inset_-1px_0_0_hsl(var(--border))]'
          ),
        },
        enableHiding: false,
      },
      {
        accessorKey: 'supplier_advantage',
        header: '优势',
        size: 240,
        cell: ({ row }) => {
          const v = row.original.supplier_advantage
          return <LongText className='max-w-[240px]'>{v ?? '-'}</LongText>
        },
      },
      {
        accessorKey: 'supplier_remark',
        header: '备注',
        size: 240,
        cell: ({ row }) => {
          const v = row.original.supplier_remark
          return <LongText className='max-w-[240px]'>{v ?? '-'}</LongText>
        },
      },
      {
        id: '_action',
        header: '',
        size: 120,
        enableSorting: false,
        enableHiding: false,
        meta: {
          className: cn(
            'sticky right-0 z-30 w-[120px] min-w-[120px] rounded-tr-[inherit] bg-background pe-0'
          ),
          thClassName: cn(
            'sticky top-0 right-0 z-40 w-[120px] min-w-[120px] rounded-tr-[inherit] bg-background pe-0'
          ),
        },
        cell: ({ row }) => {
          const id = String(row.original.supplier_id)
          const isSelected = selectedId === id
          const s = row.original
          return (
            <div className='flex justify-end'>
              <Button
                type='button'
                size='sm'
                variant={isSelected ? 'default' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(String(s.supplier_id))
                  onSelectRef.current({
                    supplier_id: String(s.supplier_id),
                    supplier_name: s.supplier_name ?? '',
                    supplier_shortname: s.supplier_shortname ?? undefined,
                    supplier_field: s.supplier_field ?? undefined,
                  })
                  queueMicrotask(() => onOpenChangeRef.current(false))
                }}
              >
                {isSelected ? '已选择' : '选择'}
              </Button>
            </div>
          )
        },
      },
    ]
  }, [selectedId])

  const table = useReactTable<Supplier>({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChangeRef.current}>
      <DialogContent
        style={{
          width: 'min(800px, calc(100vw - 32px))',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Briefcase className='h-4 w-4 text-muted-foreground' />
            选择单位（供应商）
          </DialogTitle>
          <DialogDescription>
            搜索并选择要关联的供应商/单位，点击「选择」后将回填到表单。
          </DialogDescription>
        </DialogHeader>
        <div className='flex items-center gap-2 py-2'>
          <div className='relative flex-1'>
            <Search className='absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='搜索：单位名称 / 简称 / 业务领域 / 备注 / 编号'
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className='ps-8'
            />
          </div>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={() => setSearchKeyword('')}
          >
            清空
          </Button>
        </div>
        <div className='overflow-hidden rounded-md border'>
          <div className='relative max-h-[55vh] overflow-auto'>
            <table className='min-w-full table-fixed border-collapse text-sm'>
              <thead className='sticky top-0 z-30 bg-secondary/60 backdrop-blur'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const accessorKey = String(
                        header.column.columnDef.accessorKey ??
                          header.column.id ??
                          ''
                      )
                      const w = header.column.getSize()
                      const baseStyle = FIXED_COL_STYLES[accessorKey]?.th ?? {}
                      const style: React.CSSProperties = {
                        ...baseStyle,
                        width: w,
                        minWidth: w,
                      }
                      return (
                        <th
                          key={header.id}
                          style={style}
                          className={cn(
                            'border-b bg-secondary/50 px-2 py-2 text-left text-xs font-medium',
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : ''
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {suppliersLoading && filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className='h-24 text-center text-muted-foreground'
                    >
                      加载中...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className='h-24 text-center text-muted-foreground'
                    >
                      暂无匹配的供应商
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b transition-colors last:border-b-0 hover:bg-accent/40',
                        selectedId === String(row.original.supplier_id)
                          ? 'bg-accent/20'
                          : ''
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const accessorKey = String(
                          cell.column.columnDef.accessorKey ??
                            cell.column.id ??
                            ''
                        )
                        const w = cell.column.getSize()
                        const baseStyle =
                          FIXED_COL_STYLES[accessorKey]?.td ?? {}
                        const style: React.CSSProperties = {
                          ...baseStyle,
                          width: w,
                          minWidth: w,
                        }
                        return (
                          <td
                            key={cell.id}
                            style={style}
                            className='bg-background px-2 py-2 align-middle'
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter className='gap-2'>
          <div className='text-xs text-muted-foreground'>
            共 {filteredRows.length} 条记录
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChangeRef.current(false)}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
