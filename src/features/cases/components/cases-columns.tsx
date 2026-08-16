import { type ColumnDef } from '@tanstack/react-table'
import { AlertCircle, ListChecks, Handshake, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { parseAttachments, type CaseMemo } from '../api/client'
import { getBadgeColor } from '../data/data'
import { type Case } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function getTodayHyphen(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${pad2(m)}-${pad2(day)}`
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
  urgentBIsUrgentSet?: Set<string>
  handleTodayBIsYesSet?: Set<string>
  ownerNameEmailMap?: Map<string, { owner_name: string; owner_email: string }>
  ownerIdEmailMap?: Map<string, { owner_name: string; owner_email: string }>
  inqTypeAMap?: Map<string, string>
  inchargeEMap?: Map<string, string>
  rankDMap?: Map<string, string>
  vesselPositionCMap?: Map<string, string>
  progressRMap?: Map<string, string>
  getCaseIdMemosMap?: () => Map<number, CaseMemo[]> | undefined
}): ColumnDef<Case>[] {
  const urgentBMap = params?.urgentBMap
  const urgentBIsUrgentSet = params?.urgentBIsUrgentSet
  const handleTodayBIsYesSet = params?.handleTodayBIsYesSet
  const ownerNameEmailMap = params?.ownerNameEmailMap
  const ownerIdEmailMap = params?.ownerIdEmailMap
  const inqTypeAMap = params?.inqTypeAMap
  const inchargeEMap = params?.inchargeEMap
  const rankDMap = params?.rankDMap
  const vesselPositionCMap = params?.vesselPositionCMap
  const progressRMap = params?.progressRMap
  const getCaseIdMemosMap = params?.getCaseIdMemosMap
  const isUrgentRow = (raw: unknown): boolean => {
    if (!urgentBIsUrgentSet) return false
    if (raw === null || raw === undefined || raw === '') return false
    const p = String(raw).trim()
    if (!p) return false
    return urgentBIsUrgentSet.has(p.toUpperCase())
  }
  const isHandleTodayRow = (raw: unknown): boolean => {
    if (!handleTodayBIsYesSet) return false
    if (raw === null || raw === undefined || raw === '') return false
    const p = String(raw).trim()
    if (!p) return false
    return handleTodayBIsYesSet.has(p.toUpperCase())
  }
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
      id: 'icon_flag',
      header: () => <div className='w-full text-center' aria-hidden />,
      cell: ({ row }) => {
        const urgent = isUrgentRow(row.original.case_urgent)
        const handleToday = isHandleTodayRow(
          row.original.case_should_handle_today
        )
        const hasOrderNumber = Boolean(
          String(row.original.order_number ?? '').trim()
        )
        const caseId = Number((row.original as any)?.case_id)
        const memos: CaseMemo[] =
          (Number.isFinite(caseId)
            ? getCaseIdMemosMap?.()?.get(caseId)
            : undefined) ?? []
        const hasMemo = memos.length > 0
        if (!urgent && !handleToday && !hasOrderNumber && !hasMemo)
          return <div className='h-full w-full' aria-hidden />
        const basicTooltip: string[] = []
        if (urgent) basicTooltip.push('紧急案件')
        if (handleToday) basicTooltip.push('当日需处理')
        if (hasOrderNumber) basicTooltip.push('已成交')
        if (hasMemo) basicTooltip.push(`含 ${memos.length} 条案件备忘`)
        const trigger = (
          <div
            className='flex w-full items-center justify-center gap-1'
            title={basicTooltip.join(' / ')}
          >
            {urgent && (
              <AlertCircle
                className='size-4 shrink-0 fill-red-100 text-red-600'
                aria-hidden
              />
            )}
            {handleToday && (
              <ListChecks
                className='size-4 shrink-0 fill-blue-100 text-blue-600'
                aria-hidden
              />
            )}
            {hasOrderNumber && (
              <Handshake
                className='size-4 shrink-0 fill-emerald-100 text-emerald-600'
                aria-hidden
              />
            )}
            {hasMemo && (
              <StickyNote
                className='size-4 shrink-0 fill-amber-100 text-amber-600'
                aria-hidden
              />
            )}
          </div>
        )
        if (!hasMemo) return trigger
        return (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild tabIndex={-1}>
                <span className='inline-flex cursor-default'>{trigger}</span>
              </TooltipTrigger>
              <TooltipContent
                side='right'
                align='start'
                sideOffset={6}
                className='w-[520px] max-w-[90vw] border border-amber-200/80 bg-amber-50/95 p-0 shadow-lg shadow-amber-500/10 backdrop-blur'
              >
                <div className='flex items-center gap-2 border-b border-amber-200/80 bg-amber-100/70 px-3 py-2'>
                  <StickyNote className='size-4 shrink-0 text-amber-700' />
                  <span className='text-sm font-semibold text-amber-900'>
                    案件备忘（共 {memos.length} 条）
                  </span>
                </div>
                <ScrollArea className='max-h-[60vh]'>
                  <div className='flex flex-col gap-0 p-2'>
                    {memos.map((memo, idx) => {
                      const attach = parseAttachments(
                        (memo as any).case_memo_attachment ?? null
                      )
                      const sep = idx > 0
                      return (
                        <div key={memo.case_memo_id ?? idx} className='py-2'>
                          {sep && (
                            <Separator className='mb-2 border-amber-200/70' />
                          )}
                          <div className='flex flex-wrap items-center gap-2 px-1'>
                            {(memo as any).case_memo_date && (
                              <Badge
                                variant='secondary'
                                className='bg-amber-200/70 text-amber-900 hover:bg-amber-200'
                              >
                                日期：
                                {String((memo as any).case_memo_date ?? '')}
                              </Badge>
                            )}
                            {memo.created_at && (
                              <span className='text-xs text-amber-900/70'>
                                保存：{String(memo.created_at)}
                              </span>
                            )}
                            {attach.length > 0 && (
                              <span className='text-xs text-amber-900/80'>
                                附件：{attach.length} 个
                              </span>
                            )}
                          </div>
                          {(
                            (memo as any).case_memo_content ??
                            (memo as any).case_memo_remark ??
                            ''
                          ).trim() && (
                            <div className='mt-2 space-y-1 px-1 text-[13px] leading-relaxed text-amber-950/90'>
                              {(memo as any).case_memo_content && (
                                <div className='rounded-md bg-white/80 p-2 break-words whitespace-pre-wrap ring-1 ring-amber-200/60'>
                                  <div className='mb-0.5 text-[11px] tracking-wide text-amber-700/80 uppercase'>
                                    内容
                                  </div>
                                  <LongText className='max-w-none'>
                                    {String(
                                      (memo as any).case_memo_content ?? ''
                                    )}
                                  </LongText>
                                </div>
                              )}
                              {(memo as any).case_memo_remark && (
                                <div className='rounded-md bg-white/60 p-2 break-words whitespace-pre-wrap ring-1 ring-amber-200/40'>
                                  <div className='mb-0.5 text-[11px] tracking-wide text-amber-700/80 uppercase'>
                                    备注
                                  </div>
                                  <LongText className='max-w-none'>
                                    {String(
                                      (memo as any).case_memo_remark ?? ''
                                    )}
                                  </LongText>
                                </div>
                              )}
                              {attach.length > 0 && (
                                <div className='rounded-md bg-white/50 p-2 ring-1 ring-amber-200/40'>
                                  <div className='mb-1 text-[11px] tracking-wide text-amber-700/80 uppercase'>
                                    附件（{attach.length}）
                                  </div>
                                  <ul className='list-inside list-disc space-y-0.5 text-[12px] text-amber-900/90'>
                                    {attach.map((a, ai) => (
                                      <li key={ai} className='truncate'>
                                        <LongText className='max-w-[420px] truncate'>
                                          {String(a.name ?? '未命名文件')}
                                        </LongText>
                                        {typeof a.size === 'number'
                                          ? ` · ${a.size} B`
                                          : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      meta: {
        label: '',
        className: cn(
          'sticky left-12 z-20 w-[60px] max-w-[60px] min-w-[60px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-12 z-40 w-[60px] max-w-[60px] min-w-[60px] bg-background',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
      },
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
            <LongText className='max-w-50 truncate'>{value ?? '-'}</LongText>
          </span>
        )
      },
      meta: {
        label: '船名',
        className: cn(
          'sticky left-[108px] z-20 w-[200px] min-w-[200px] bg-background ps-0.5',
          'shadow-[inset_-1px_0_0_hsl(var(--border))]'
        ),
        thClassName: cn(
          'sticky top-0 left-[108px] z-40 w-[200px] min-w-[200px] bg-background ps-0.5',
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
        return <LongText className='max-w-40'>{value}</LongText>
      },
      meta: {
        label: '发票号',
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
        return <LongText className='max-w-45'>{value}</LongText>
      },
      meta: {
        label: '订单编号',
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'case_inquiry_keyword',
      size: 185,
      minSize: 185,
      maxSize: 185,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='需求编号/名称' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_inquiry_keyword') as string | null
        if (!value) return <div>-</div>
        return <LongText className='max-w-55'>{value}</LongText>
      },
      meta: {
        label: '需求编号/名称',
        className: 'w-[185px] min-w-[185px] max-w-[185px]',
        thClassName: 'w-[185px] min-w-[185px] max-w-[185px]',
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
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='w-full overflow-hidden'>
                  <Badge
                    variant='outline'
                    className={cn(
                      getBadgeColor(value),
                      'max-w-full px-2 whitespace-nowrap'
                    )}
                  >
                    <span className='truncate'>{display}</span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{display}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      size: 120,
      minSize: 120,
      maxSize: 120,
      meta: {
        label: '案件进度',
        className: 'w-[120px] min-w-[120px] max-w-[120px]',
        thClassName: 'w-[120px] min-w-[120px] max-w-[120px]',
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
        const isService = display.trim().toLowerCase() === 'service'
        const badgeClass = isService
          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200'
          : getBadgeColor(value)
        return (
          <Badge variant='outline' className={cn(badgeClass)}>
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
      size: 122,
      minSize: 122,
      maxSize: 122,
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
        className: 'w-[122px] min-w-[122px] max-w-[122px]',
        thClassName: 'w-[122px] min-w-[122px] max-w-[122px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_follow_date',
      size: 122,
      minSize: 122,
      maxSize: 122,
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
        className: 'w-[122px] min-w-[122px] max-w-[122px]',
        thClassName: 'w-[122px] min-w-[122px] max-w-[122px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'case_uptodate_date',
      size: 122,
      minSize: 122,
      maxSize: 122,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='跟进日期' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('case_uptodate_date') as string | null
        const formatted = formatDateAsHyphen(value)
        if (!formatted) return <div>-</div>
        const today = getTodayHyphen()
        const isToday = formatted === today
        const isHandleToday = isHandleTodayRow(
          row.original.case_should_handle_today
        )
        return (
          <div
            className={cn(
              isToday &&
                'inline-flex items-center rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-300',
              !isToday &&
                isHandleToday &&
                'inline-flex items-center rounded border border-rose-200 bg-rose-100 px-2 py-0.5 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-300'
            )}
          >
            {formatted}
          </div>
        )
      },
      meta: {
        label: '跟进日期',
        className: 'w-[122px] min-w-[122px] max-w-[122px]',
        thClassName: 'w-[122px] min-w-[122px] max-w-[122px]',
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_following',
      size: 180,
      minSize: 180,
      maxSize: 180,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='船东联系人' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('owner_following') as string | null
        const ownerIdRaw = (row.original as any)?.owner_following_id
        const ownerIdStr =
          ownerIdRaw != null &&
          ownerIdRaw !== '' &&
          !Number.isNaN(Number(ownerIdRaw))
            ? String(ownerIdRaw)
            : ''
        let info: { owner_name: string; owner_email: string } | undefined
        if (ownerIdStr) info = ownerIdEmailMap?.get(ownerIdStr)
        if (!info && value) info = ownerNameEmailMap?.get(String(value))
        const name = info?.owner_name ?? (value ? String(value) : '')
        const email = info?.owner_email ?? ''
        const parts = [name, email].filter(
          (p) => p && String(p).trim().length > 0
        )
        if (parts.length === 0) return <div>-</div>
        const fullText = parts.join(' ')
        const emailShort = email ? email.split('@')[0] : ''
        const shortParts = [name, emailShort].filter(
          (p) => p && String(p).trim().length > 0
        )
        const shortText = shortParts.join(' ')
        return (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='w-full overflow-hidden'>
                  <span className='block truncate whitespace-nowrap'>
                    {shortText}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      meta: {
        label: '船东联系人',
        className: 'w-[180px] min-w-[180px] max-w-[180px]',
        thClassName: 'w-[180px] min-w-[180px] max-w-[180px]',
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
        const value = row.getValue('case_delivery_or_service_incharge') as
          string | null
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
        const value = row.getValue('case_delivery_or_service_deadline') as
          string | null
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
        const value = row.getValue('case_etb_cargo_departure_date') as
          string | null
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
        const value = row.getValue('case_etd_cargo_delivery_date') as
          string | null
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
              <Badge key={k} variant='outline' className={cn(getBadgeColor(k))}>
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
              String(s ?? '')
                .trim()
                .toUpperCase()
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
