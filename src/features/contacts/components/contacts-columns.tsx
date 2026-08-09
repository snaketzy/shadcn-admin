import { type ColumnDef, type Row } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Contact } from '../data/schema'
import { type ContactDictEntry } from '../api/client'
import { DataTableRowActions } from './data-table-row-actions'

function toDetailParams(row: Row<Contact>): { contactId: string } {
  return { contactId: String(row.original.contact_id) }
}

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

function resolveLabel(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const rawStr = String(raw)
  const byKey = keyMap.get(rawStr.toUpperCase())
  if (byKey) return byKey
  const byValue = valueMap.get(rawStr)
  if (byValue) return byValue
  return rawStr
}

export function getContactsColumns(
  typeDict: ContactDictEntry[] = [],
  divisionDict: ContactDictEntry[] = [],
  supplierShortnameMap: Map<string, string> = new Map(),
  collaborationShortnameMap: Map<string, string> = new Map(),
  rankDict: ContactDictEntry[] = []
): ColumnDef<Contact>[] {
  const typeMap = makeDictMap(typeDict)
  const divisionMap = makeDictMap(divisionDict)
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
      accessorKey: 'contact_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人名称' />
      ),
      cell: ({ row }) => (
        <Link
          to='/contact_detail/$contactId'
          params={toDetailParams(row)}
          className='inline-flex max-w-50 items-center truncate ps-3 align-middle font-medium hover:underline'
          title={String(row.original.contact_name ?? '')}
        >
          <LongText className='max-w-50 truncate'>
            {row.original.contact_name}
          </LongText>
        </Link>
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
      accessorKey: 'contact_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人类型' />
      ),
      cell: ({ row }) => {
        const raw = row.original.contact_type
        const label = resolveLabel(raw, typeMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.getValue('contact_type'))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_rank',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人职级' />
      ),
      cell: ({ row }) => {
        const raw = row.original.contact_rank
        const label = resolveLabel(raw, rankMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_mobile',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人手机' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_mobile') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_email') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_division_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='所属单位类型' />
      ),
      cell: ({ row }) => {
        const raw = row.original.contact_division_type
        const label = resolveLabel(raw, divisionMap)
        if (!label) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(label))}>
            {label}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_division_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='所属单位' />
      ),
      cell: ({ row }) => {
        const value = row.original.contact_division_id
        const divisionType = (row.original.contact_division_type ?? '')
          .toString()
          .toUpperCase()
        if (!value) return <div>-</div>
        const idStr = String(value)
        let label: string | undefined
        if (divisionType === 'K1') {
          label = supplierShortnameMap.get(idStr)
        } else if (divisionType === 'K2') {
          label = collaborationShortnameMap.get(idStr)
        }
        const display = label ?? idStr
        return <LongText className='max-w-50'>{display}</LongText>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contact_remark',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人备注' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('contact_remark') as string | null
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
