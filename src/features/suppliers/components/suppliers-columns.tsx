import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Supplier } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export function getSuppliersColumns(): ColumnDef<Supplier>[] {
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
      accessorKey: 'supplier_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商名称' />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-50 ps-3'>{row.getValue('supplier_name')}</LongText>
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
      accessorKey: 'supplier_shortname',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商简称' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_shortname') as string | null
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
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商地址' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_address') as string | null
        return <LongText className='max-w-60'>{value ?? '-'}</LongText>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_field',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商经营范围' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_field') as string | null
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
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_advantage',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商主营' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_advantage') as string | null
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
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_contact_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商联系人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_contact_name') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_contact_phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人手机' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_contact_phone') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_contact_email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='联系人邮箱' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_contact_email') as string | null
        return <div>{value ?? '-'}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_remark',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商备注' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('supplier_remark') as string | null
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
