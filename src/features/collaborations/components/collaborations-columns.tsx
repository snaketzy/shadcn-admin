import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Collaboration } from '../data/schema'
import { type CollaborationDictEntry } from '../api/client'
import { DataTableRowActions } from './data-table-row-actions'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: CollaborationDictEntry[]): DictMap {
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

export function getCollaborationsColumns(
  fieldDict: CollaborationDictEntry[] = [],
  contactNameMap: Map<string, string> = new Map()
): ColumnDef<Collaboration>[] {
  const fieldMap = makeDictMap(fieldDict)
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-0.5'
        />
      ),
      meta: {
        className: cn(
          'sticky left-0 z-30 w-12 min-w-12 rounded-tl-[inherit] bg-background'
        ),
        thClassName:
          'sticky top-0 left-0 z-40 w-12 min-w-12 rounded-tl-[inherit] bg-background',
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-0.5'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'collaboration_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='协作商名称' />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-50 ps-3'>{row.getValue('collaboration_name')}</LongText>
      ),
      meta: {
        className: cn(
          'sticky left-12 z-20 w-[220px] min-w-[220px] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-12 z-40 w-[220px] min-w-[220px] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
    },
    {
      accessorKey: 'collaboration_shortname',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='协作商简称' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('collaboration_shortname') as string | null
        if (!value) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {value}
          </Badge>
        )
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.getValue('collaboration_shortname'))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'collaboration_field',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='协作商经营范围' />
      ),
      cell: ({ row }) => {
        const raw = row.original.collaboration_field
        const labels = resolveLabels(raw, fieldMap)
        if (labels.length === 0) return <div>-</div>
        return (
          <div className='flex flex-wrap gap-1'>
            {labels.map((label) => (
              <Badge key={label} variant='outline' className={cn(getBadgeColor(label))}>
                {label}
              </Badge>
            ))}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const raw = (row.original as Collaboration).collaboration_field ?? ''
        const parts = String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const arr = Array.isArray(value) ? (value as unknown[]) : [value]
        if (arr.length === 0) return true
        return arr.some((v) => parts.includes(String(v)))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'collaboration_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='协作商地址' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('collaboration_address') as string | null
        return <LongText className='max-w-60'>{value ?? '-'}</LongText>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'collaboration_contact_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('collaboration_contact_id') as number | null
        if (value == null) return <div>-</div>
        const idStr = String(value)
        const name = contactNameMap.get(idStr)
        if (name) {
          return (
            <div className='flex items-center gap-1.5'>
              <span className='font-medium'>{name}</span>
              <span className='text-xs text-muted-foreground/70'>(ID: {idStr})</span>
            </div>
          )
        }
        return <div>{idStr}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'collaboration_remark',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='协作商备注' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('collaboration_remark') as string | null
        return <LongText className='max-w-50'>{value ?? '-'}</LongText>
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className='pe-3 inline-block w-full text-end'>操作</span>,
      cell: DataTableRowActions,
      meta: {
        className: cn(
          'sticky right-0 z-30 w-[88px] min-w-[88px] rounded-tr-[inherit] bg-background pe-0'
        ),
        thClassName: cn(
          'sticky top-0 right-0 z-40 w-[88px] min-w-[88px] rounded-tr-[inherit] bg-background pe-0'
        ),
      },
      enableHiding: false,
      enableSorting: false,
    },
  ]
}
