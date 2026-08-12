import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Vessel } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { type VesselDictEntry } from '../api/client'

export function getUsersColumns(
  inchargeDict: VesselDictEntry[] = [],
  fleetManagerDict: VesselDictEntry[] = []
): ColumnDef<Vessel>[] {
  const inchargeMap = new Map<string, string>(
    inchargeDict.map((d) => [String(d.dict_key).toUpperCase(), d.dict_value])
  )
  const inchargeValueToLabel = new Map<string, string>(
    inchargeDict.map((d) => [d.dict_value, d.dict_value])
  )
  const fleetManagerMap = new Map<string, string>(
    fleetManagerDict.map((d) => [String(d.dict_key).toUpperCase(), d.dict_value])
  )
  const fleetValueToLabel = new Map<string, string>(
    fleetManagerDict.map((d) => [d.dict_value, d.dict_value])
  )

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
    meta: { className: 'w-[1%] min-w-[110px]' },
    enableSorting: false,
  },
  {
    id: 'vessel_age',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='船龄' />
    ),
    cell: ({ row }) => {
      const built = row.original.building_year
      if (!built) return <div>-</div>
      const builtDate = new Date(built)
      if (Number.isNaN(builtDate.getTime())) return <div>-</div>
      const today = new Date()
      let age = today.getFullYear() - builtDate.getFullYear()
      const monthDiff = today.getMonth() - builtDate.getMonth()
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < builtDate.getDate())
      ) {
        age--
      }
      return <div>{age < 0 ? '-' : `${age}年`}</div>
    },
    meta: { className: 'w-[1%] min-w-[80px]' },
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
    meta: { className: 'w-[1%] min-w-[100px]' },
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
    meta: { className: 'w-[1%] min-w-[90px]' },
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
    meta: { className: 'w-[1%] min-w-[100px]' },
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
    meta: { className: 'w-[1%] min-w-[90px]' },
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
    meta: { className: 'w-[1%] min-w-[90px]' },
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
    meta: { className: 'w-[1%] min-w-[100px]' },
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
    meta: { className: 'w-[1%] min-w-[110px]' },
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
    meta: { className: 'w-[1%] min-w-[90px]' },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_fleet_manager',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='管理公司' />
    ),
    cell: ({ row }) => {
      const raw = row.getValue('vessel_fleet_manager') as string | number | null
      if (raw === null || raw === undefined || raw === '') {
        return <div>-</div>
      }
      const rawStr = String(raw)
      const byKey = fleetManagerMap.get(rawStr.toUpperCase())
      const byValue = fleetValueToLabel.get(rawStr)
      const label = byKey ?? byValue ?? rawStr
      return (
        <Badge variant='outline' className={cn(getBadgeColor(label))}>
          {label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    meta: { className: 'w-[1%] min-w-[120px]' },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'vessel_incharge',
    header: ({ column }) => (
      <div className='flex h-full w-full items-center justify-end pe-3'>
        <DataTableColumnHeader column={column} title='负责人' className='justify-end' />
      </div>
    ),
    cell: ({ row }) => {
      const raw = row.getValue('vessel_incharge') as string | number | null
      if (raw === null || raw === undefined || raw === '') {
        return (
          <div className='flex h-full w-full items-center justify-end pe-3'>
            <LongText className='max-w-[80px] text-right'>-</LongText>
          </div>
        )
      }
      const rawStr = String(raw)
      const byKey = inchargeMap.get(rawStr.toUpperCase())
      const byValue = inchargeValueToLabel.get(rawStr)
      const label = byKey ?? byValue ?? rawStr
      return (
        <div className='flex h-full w-full items-center justify-end pe-3'>
          <LongText className='max-w-[80px] text-right'>{label}</LongText>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    meta: {
      className: cn(
        'sticky right-[88px] z-20 w-[100px] min-w-[100px] bg-background pe-0 text-right',
        'shadow-[inset_1px_0_0_hsl(var(--border))]'
      ),
      thClassName: cn(
        'sticky top-0 right-[88px] z-40 w-[100px] min-w-[100px] bg-background pe-0 text-right',
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
}
