import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Owner } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export function getOwnersColumns(): ColumnDef<Owner>[] {
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
      accessorKey: 'owner_company',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='公司' />
      ),
      cell: ({ row }) => {
        const value = row.original.owner_company
        if (!value) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {value}
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
      accessorKey: 'owner_contact',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_contact') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='电话' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_phone') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_email') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_country',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='国家' />
      ),
      cell: ({ row }) => {
        const value = row.original.owner_country
        if (!value) return <div>-</div>
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {value}
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
      accessorKey: 'owner_fax',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='传真' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_fax') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='地址' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_address') as string | null
        if (!value) return <div>-</div>
        return (
          <LongText className='max-w-40'>{value}</LongText>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_remark',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='备注' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_remark') as string | null
        if (!value) return <div>-</div>
        return (
          <LongText className='max-w-40'>{value}</LongText>
        )
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
