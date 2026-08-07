import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Vessel } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const usersColumns: ColumnDef<Vessel>[] = [
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
    accessorKey: 'vessel_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='船名' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-50 ps-3'>{row.getValue('vessel_name')}</LongText>
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
    accessorKey: 'building_year',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='建造年份' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('building_year') as string | null
      return <div>{value ?? '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_imo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='IMO' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_imo') as number | null
      return <div>{value != null ? value : '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_loa',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='LOA' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_loa') as string | null
      return <div>{value ?? '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_breadth',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Breadth' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_breadth') as string | null
      return <div>{value ?? '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_gross',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Gross' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_gross') as number | null
      return <div>{value != null ? value : '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_dwt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Dwt' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_dwt') as number | null
      return <div>{value != null ? value : '-'}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_class',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Class' />
    ),
    cell: ({ row }) => {
      const value = row.original.vessel_class
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
    accessorKey: 'vessel_flag',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Flag' />
    ),
    cell: ({ row }) => {
      const value = row.original.vessel_flag
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
    accessorKey: 'vessel_team',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Team' />
    ),
    cell: ({ row }) => {
      const value = row.original.vessel_team
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
    accessorKey: 'vessel_incharge',
    header: ({ column }) => (
      <div className='pe-2 text-end'>
        <DataTableColumnHeader column={column} title='负责人' />
      </div>
    ),
    cell: ({ row }) => {
      const value = row.getValue('vessel_incharge') as string | null
      return (
        <div className='pe-2 text-end'>
          <LongText className='max-w-[44px]'>{value ?? '-'}</LongText>
        </div>
      )
    },
    meta: {
      className: cn(
        'sticky right-[88px] z-20 w-[50px] min-w-[50px] bg-background pe-0',
        'shadow-[inset_1px_0_0_hsl(var(--border))]'
      ),
      thClassName: cn(
        'sticky top-0 right-[88px] z-40 w-[50px] min-w-[50px] bg-background pe-0',
        'shadow-[inset_1px_0_0_hsl(var(--border))]'
      ),
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
