import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Owner } from '../data/schema'
import { type OwnerDictEntry } from '../api/client'
import { DataTableRowActions } from './data-table-row-actions'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

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

function resolveLabel(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const rawStr = String(raw)
  const byKey = keyMap.get(rawStr.toUpperCase())
  if (byKey) return byKey
  const byValue = valueMap.get(rawStr)
  if (byValue) return byValue
  return rawStr
}

export function getOwnersColumns(
  teamDict: OwnerDictEntry[] = [],
  departmentDict: OwnerDictEntry[] = [],
  rankDict: OwnerDictEntry[] = []
): ColumnDef<Owner>[] {
  const teamMap = makeDictMap(teamDict)
  const deptMap = makeDictMap(departmentDict)
  const rankMap = makeDictMap(rankDict)

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
      accessorKey: 'owner_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东名称' />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-50 ps-3'>{row.getValue('owner_name')}</LongText>
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
      accessorKey: 'onwer_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('onwer_email') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东电话' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_phone') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_team',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东小组' />
      ),
      cell: ({ row }) => {
        const raw = row.original.owner_team
        const label = resolveLabel(raw, teamMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'owner_department',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东部门' />
      ),
      cell: ({ row }) => {
        const raw = row.original.owner_department
        const label = resolveLabel(raw, deptMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'owner_department_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东部门邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_department_email') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_rank',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东职级' />
      ),
      cell: ({ row }) => {
        const raw = row.original.owner_rank
        const label = resolveLabel(raw, rankMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableHiding: false,
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
