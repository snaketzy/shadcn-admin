import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type CaseDictType } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const dictionariesColumns: ColumnDef<CaseDictType>[] = [
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
      className: cn('inset-s-0 z-10 rounded-tl-[inherit] max-md:sticky'),
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
    accessorKey: 'dict_group',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='字典分组' />
    ),
    cell: ({ row }) => {
      const group = row.getValue<string>('dict_group')
      return (
        <div className='ps-3'>
          <Badge variant='outline'>
            <LongText className='max-w-32'>{group}</LongText>
          </Badge>
        </div>
      )
    },
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'inset-s-6 ps-0.5 max-md:sticky @4xl/content:table-cell @4xl/content:drop-shadow-none'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'dict_key',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='字典键名' />
    ),
    cell: ({ row }) => <div>{String(row.getValue('dict_key'))}</div>,
    enableSorting: true,
  },
  {
    accessorKey: 'dict_value',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='字典键值' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-72'>{row.getValue('dict_value')}</LongText>
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <span className='pe-3 inline-block w-full text-end'>操作</span>,
    cell: DataTableRowActions,
  },
]
