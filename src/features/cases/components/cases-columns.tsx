import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { getBadgeColor } from '../data/data'
import { type Case } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateAsHyphen(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const str = String(raw).trim()
  if (!str) return ''
  let d: Date
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str) ||
    /^\d{4}\d{2}\d{2}$/.test(str)
  ) {
    const normalized = /^\d{8}$/.test(str)
      ? `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
      : str.replace(/\//g, '-')
    const [y, m, day] = normalized.split('-').map((s) => parseInt(s, 10))
    if (
      !Number.isNaN(y) &&
      !Number.isNaN(m) &&
      !Number.isNaN(day) &&
      y >= 1000 &&
      m >= 1 &&
      m <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${y}-${pad2(m)}-${pad2(day)}`
    }
  }
  d = new Date(str)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }
  return str
}

export function getCasesColumns(params?: {
  urgentBMap?: Map<string, string>
  inqTypeAMap?: Map<string, string>
  inchargeEMap?: Map<string, string>
  rankDMap?: Map<string, string>
  vesselPositionCMap?: Map<string, string>
  progressRMap?: Map<string, string>
}): ColumnDef<Case>[] {
  const urgentBMap = params?.urgentBMap
  const inqTypeAMap = params?.inqTypeAMap
  const inchargeEMap = params?.inchargeEMap
  const rankDMap = params?.rankDMap
  const vesselPositionCMap = params?.vesselPositionCMap
  const progressRMap = params?.progressRMap
  const resolveUrgentBLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = urgentBMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const resolveInqTypeALabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = inqTypeAMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const resolveInchargeELabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = inchargeEMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const resolveRankDLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = rankDMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const resolveVesselPositionCLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = vesselPositionCMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const resolveProgressRLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const hit = progressRMap?.get(p.toUpperCase())
    if (hit) return hit
    return p
  }
  const splitCsvKeys = (raw: unknown): string[] => {
    if (raw === null || raw === undefined) return []
    const s = String(raw)
    if (!s || s.trim() === '') return []
    return s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  }
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
      cell: ({ row }) => {
        const value = row.getValue('vessel_name') as string | null
        return (
          <span
            className='inline-flex max-w-50 items-center truncate ps-3 align-middle font-medium'
            title={String(value ?? '')}
          >
            <LongText className='max-w-50 truncate'>
              {value ?? '-'}
            </LongText>
          </span>
        )
      },
      meta: {
        label: '船名',
        className: cn(
          'sticky left-12 z-20 w-[200px] min-w-[200px] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-12 z-40 w-[200px] min-w-[200px] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
    },
    {
      accessorKey: 'invoice_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='发票号' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('invoice_number') as string | null
        if (!value) return <div>-</div>
        return (
          <LongText className='max-w-40'>{value}</LongText>
        )
      },
      meta: {
        label: '发票号',
        className: cn(
          'sticky left-[248px] z-20 w-[160px] min-w-[160px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-[248px] z-40 w-[160px] min-w-[160px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'order_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='订单编号' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('order_number') as string | null
        if (!value) return <div>-</div>
        return (
          <LongText className='max-w-45'>{value}</LongText>
        )
      },
      meta: {
        label: '订单编号',
        className: cn(
          'sticky left-[408px] z-20 w-[180px] min-w-[180px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-[408px] z-40 w-[180px] min-w-[180px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'case_inquiry_keyword',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='需求编号/名称' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_inquiry_keyword') as string | null
        if (!value) return <div>-</div>
        return (
          <LongText className='max-w-55'>{value}</LongText>
        )
      },
      meta: {
        label: '需求编号/名称',
        className: cn(
          'sticky left-[588px] z-20 w-[220px] min-w-[220px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-[588px] z-40 w-[220px] min-w-[220px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'case_progress',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件进度' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_progress') as string | null
        if (!value) return <div>-</div>
        const display = resolveProgressRLabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '案件进度',
        className: 'w-[110px] min-w-[110px]',
        thClassName: 'w-[110px] min-w-[110px]',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_urgent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='紧急案件' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_urgent') as string | null
        if (!value) return <div>-</div>
        const display = resolveUrgentBLabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '紧急案件',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_inquiry_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='需求类型' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_inquiry_type') as string | null
        if (!value) return <div>-</div>
        const display = resolveInqTypeALabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '需求类型',
        className: 'w-[110px] min-w-[110px]',
        thClassName: 'w-[110px] min-w-[110px]',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_inquiry_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='询价日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_inquiry_date') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '询价日期',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_follow_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='开始日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_follow_date') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '开始日期',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_uptodate_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='跟进日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_uptodate_date') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '跟进日期',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_should_handle_today',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='当日需处理' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_should_handle_today') as string | null
        if (!value) return <div>-</div>
        const display = resolveUrgentBLabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '当日需处理',
        className: 'w-[110px] min-w-[110px]',
        thClassName: 'w-[110px] min-w-[110px]',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_following',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船東联络人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_following') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '船東联络人',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'shipyard_business',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船厂经营' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('shipyard_business') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '船厂经营',
        className: 'w-[120px] min-w-[120px]',
        thClassName: 'w-[120px] min-w-[120px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_agent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件代理' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_agent') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '案件代理',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_superintendent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件机务' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_superintendent') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '案件机务',
        className: 'w-[120px] min-w-[120px]',
        thClassName: 'w-[120px] min-w-[120px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_surveyor',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件船检' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_surveyor') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '案件船检',
        className: 'w-[120px] min-w-[120px]',
        thClassName: 'w-[120px] min-w-[120px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_delivery_or_service_incharge',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='承运人｜服务负责人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_delivery_or_service_incharge') as string | null
        return <LongText className='max-w-40'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '承运人｜服务负责人',
        className: 'w-[160px] min-w-[160px]',
        thClassName: 'w-[160px] min-w-[160px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_delivery_or_service_deadline',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='运输｜服务截止日' />
      ),
      cell: ({ row }) => {
        const value = row.getValue(
          'case_delivery_or_service_deadline'
        ) as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '运输｜服务截止日',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_eta_cargo_ready_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船舶到港 | 备货完成' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_eta_cargo_ready_date') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '船舶到港 | 备货完成',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_etb_cargo_departure_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船舶靠港 ｜ 货物发出' />
      ),
      cell: ({ row }) => {
        const value = row.getValue(
          'case_etb_cargo_departure_date'
        ) as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '船舶靠港 ｜ 货物发出',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_etd_cargo_delivery_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船舶开航 ｜ 货物签收' />
      ),
      cell: ({ row }) => {
        const value = row.getValue(
          'case_etd_cargo_delivery_date'
        ) as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '船舶开航 ｜ 货物签收',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'vessel_position',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船舶位置' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('vessel_position') as string | null
        if (!value) return <div>-</div>
        const display = resolveVesselPositionCLabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '船舶位置',
        className: 'w-[110px] min-w-[110px]',
        thClassName: 'w-[110px] min-w-[110px]',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_settlement_done',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件结算完成日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_settlement_done') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '案件结算完成日期',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_epd',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东结账日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_epd') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '船东结账日期',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_spd',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='供应商结账日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_spd') as string | null
        const formatted = formatDateAsHyphen(value)
        return <div>{formatted || '-'}</div>
      },
      meta: {
        label: '供应商结账日期',
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_incharge',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件负责人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_incharge') as string | null
        const keys = splitCsvKeys(value)
        if (keys.length === 0) return <div>-</div>
        return (
          <div className='flex flex-wrap gap-1.5'>
            {keys.map((k) => (
              <Badge
                key={k}
                variant='outline'
                className={cn(getBadgeColor(k))}
              >
                {resolveInchargeELabel(k)}
              </Badge>
            ))}
          </div>
        )
      },
      meta: {
        label: '案件负责人',
      },
      filterFn: (row, id, filterValues: unknown) => {
        const rowRaw = row.getValue(id)
        const rowKeys = splitCsvKeys(rowRaw).map((s) => s.toUpperCase())
        const filterArr = Array.isArray(filterValues)
          ? (filterValues as string[]).map((s) =>
              String(s ?? '').trim().toUpperCase()
            )
          : []
        if (filterArr.length === 0) return true
        return filterArr.some((f) => rowKeys.includes(f))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_memo_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件备忘录名称' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_memo_name') as string | null
        return <LongText className='max-w-50'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '案件备忘录名称',
        className: 'w-[160px] min-w-[160px]',
        thClassName: 'w-[160px] min-w-[160px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_memo_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件备忘录地址' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_memo_address') as string | null
        return <LongText className='max-w-60'>{value ?? '-'}</LongText>
      },
      meta: {
        label: '案件备忘录地址',
        className: 'w-[220px] min-w-[220px]',
        thClassName: 'w-[220px] min-w-[220px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_rank',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='案件评级' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_rank') as string | null
        if (!value) return <div>-</div>
        const display = resolveRankDLabel(value)
        return (
          <Badge variant='outline' className={cn(getBadgeColor(value))}>
            {display}
          </Badge>
        )
      },
      meta: {
        label: '案件评级',
        className: 'w-[110px] min-w-[110px]',
        thClassName: 'w-[110px] min-w-[110px]',
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => (
        <span className='inline-block w-full pe-3 text-end'>操作</span>
      ),
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
