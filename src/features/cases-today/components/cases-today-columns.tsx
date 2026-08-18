import { type ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  ListChecks,
  Handshake,
  StickyNote,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import {
  parseAttachments,
  type CaseMemo,
  type CaseInquiry,
} from '@/features/cases/api/client'
import { getBadgeColor } from '@/features/cases/data/data'
import { type Case } from '@/features/cases/data/schema'
import { useCasesToday } from './cases-today-provider'
import { DataTableRowActionsToday } from './data-table-row-actions-today'

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

function safeMemoStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  if (s === 'null' || s === 'undefined') return ''
  return s
}

function CaseMemoEditButton({
  rowData,
  memo,
}: {
  rowData: Case
  memo: CaseMemo
}) {
  const { setCurrentRow, setEditingMemo, setOpen } = useCasesToday()
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='h-7 w-7 shrink-0 text-amber-800/70 hover:bg-amber-200/80 hover:text-amber-900'
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        setCurrentRow(rowData)
        setEditingMemo(memo)
        setOpen('memo')
      }}
      aria-label='编辑该备忘'
      title='编辑该备忘'
    >
      <Pencil size={14} />
    </Button>
  )
}

export function getCasesTodayColumns(params?: {
  urgentBMap?: Map<string, string>
  urgentBIsUrgentSet?: Set<string>
  handleTodayBIsYesSet?: Set<string>
  ownerNameEmailMap?: Map<
    string,
    { owner_name: string; owner_email: string }
  >
  ownerIdEmailMap?: Map<
    string,
    { owner_name: string; owner_email: string }
  >
  inqTypeAMap?: Map<string, string>
  inchargeEMap?: Map<string, string>
  rankDMap?: Map<string, string>
  vesselPositionCMap?: Map<string, string>
  getCaseIdMemosMap?: () => Map<number, CaseMemo[]> | undefined
  getCaseIdInquiriesMap?: () => Map<number, CaseInquiry[]> | undefined
  progressRMap?: Map<string, string>
  supplierIdNameMap?: Map<number, string>
  inquiryTypeQKeyToLabel?: Map<string, string>
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
  const getCaseIdInquiriesMap = params?.getCaseIdInquiriesMap
  const supplierIdNameMap = params?.supplierIdNameMap
  const inquiryTypeQKeyToLabel = params?.inquiryTypeQKeyToLabel
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
                collisionPadding={16}
                avoidCollisions
                className='z-[100] flex max-h-[90vh] w-[520px] max-w-[90vw] flex-col overflow-hidden border border-amber-200/80 bg-amber-50/95 p-0 shadow-lg shadow-amber-500/10 backdrop-blur'
              >
                <div className='flex shrink-0 items-center gap-2 border-b border-amber-200/80 bg-amber-100/70 px-3 py-2'>
                  <StickyNote className='size-4 shrink-0 text-amber-700' />
                  <span className='text-sm font-semibold text-amber-900'>
                    案件备忘（共 {memos.length} 条）
                  </span>
                </div>
                <ScrollArea className='min-h-0 flex-1'>
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
                          <div className='flex items-center gap-2 px-1'>
                            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
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
                            <CaseMemoEditButton
                              rowData={row.original}
                              memo={memo as CaseMemo}
                            />
                          </div>
                          {safeMemoStr((memo as any).case_memo_content) +
                            safeMemoStr((memo as any).case_memo_remark) && (
                            <div className='mt-2 space-y-1 px-1 text-[13px] leading-relaxed text-amber-950/90'>
                              {safeMemoStr((memo as any).case_memo_content) && (
                                <div className='rounded-md bg-white/80 p-2 break-words whitespace-pre-wrap ring-1 ring-amber-200/60'>
                                  <div className='mb-0.5 text-[11px] tracking-wide text-amber-700/80 uppercase'>
                                    内容
                                  </div>
                                  <LongText className='max-w-none'>
                                    {safeMemoStr(
                                      (memo as any).case_memo_content
                                    )}
                                  </LongText>
                                </div>
                              )}
                              {safeMemoStr((memo as any).case_memo_remark) && (
                                <div className='rounded-md bg-white/60 p-2 break-words whitespace-pre-wrap ring-1 ring-amber-200/40'>
                                  <div className='mb-0.5 text-[11px] tracking-wide text-amber-700/80 uppercase'>
                                    备注
                                  </div>
                                  <LongText className='max-w-none'>
                                    {safeMemoStr(
                                      (memo as any).case_memo_remark
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
        const rowData = row.original
        const caseId = Number((rowData as any)?.case_id)
        const resolveDict = (
          map: Map<string, string> | undefined,
          raw: unknown
        ): string => {
          if (!raw || raw === '' || raw === null || raw === undefined) return ''
          const key = String(raw).trim().toUpperCase()
          if (!key) return ''
          return map?.get(key) ?? String(raw)
        }
        const resolveOwner = (
          raw: unknown,
          byId: boolean
        ): { owner_name: string; owner_email: string } | null => {
          if (!raw || raw === '' || raw === null || raw === undefined)
            return null
          const k = byId ? String(raw) : String(raw)
          if (!k) return null
          const hit = byId ? ownerIdEmailMap?.get(k) : ownerNameEmailMap?.get(k)
          if (hit) return hit
          return { owner_name: k, owner_email: '' }
        }
        const s = (v: unknown): string => {
          if (v === null || v === undefined) return ''
          const str = String(v).trim()
          if (str === 'null' || str === 'undefined') return ''
          return str
        }
        const resolveSupplierName = (id: unknown): string => {
          const n =
            typeof id === 'number'
              ? id
              : typeof id === 'string' && id.trim() !== ''
                ? Number(id)
                : Number.NaN
          if (!Number.isFinite(n) || n <= 0) return ''
          return (
            supplierIdNameMap?.get(n) ??
            (String(id).trim() ? `供应商ID:${n}` : '')
          )
        }
        const resolveInquiryQLabel = (raw: unknown): string => {
          if (!raw || raw === '' || raw === null || raw === undefined) return ''
          const k = String(raw).trim().toUpperCase()
          if (!k) return ''
          return inquiryTypeQKeyToLabel?.get(k) ?? String(raw)
        }
        const inquiries: CaseInquiry[] = Number.isFinite(caseId)
          ? (getCaseIdInquiriesMap?.()?.get(caseId) ?? [])
          : []
        const groupInquirySuppliers = (
          matcher: (label: string) => boolean
        ): { supplier: string; date: string; typeLabel: string }[] => {
          const out: { supplier: string; date: string; typeLabel: string }[] =
            []
          for (const r of inquiries) {
            const typeLabel = resolveInquiryQLabel(r.case_inquiry_type)
            if (!matcher(typeLabel)) continue
            const supplier = resolveSupplierName(r.case_inquiry_division_id)
            out.push({
              supplier: supplier || '未指定供应商',
              date: s(r.case_inquired_date),
              typeLabel,
            })
          }
          return out
        }
        const inquiryGroups = {
          询价: groupInquirySuppliers((l) =>
            /询价|询盘|inquir|enquir/i.test(l)
          ),
          报价: groupInquirySuppliers((l) => /报价|quot/i.test(l)),
          竞标: groupInquirySuppliers((l) => /竞标|投标|bid/i.test(l)),
          中标: groupInquirySuppliers((l) => /中标|win|award/i.test(l)),
        }
        const ownerInfo = resolveOwner(rowData.owner_following, false)
        const ownerById =
          (rowData as any).owner_following_id != null &&
          (rowData as any).owner_following_id !== ''
            ? resolveOwner((rowData as any).owner_following_id, true)
            : null
        const finalOwner = ownerById ?? ownerInfo
        const displayValue = value ?? '-'
        const trigger = (
          <span
            className='inline-flex max-w-50 cursor-help items-center truncate ps-3 align-middle font-medium'
            title={String(value ?? '')}
          >
            <LongText className='max-w-50 truncate'>{displayValue}</LongText>
          </span>
        )
        const kvRow = (label: string, content: React.ReactNode) => {
          const hasContent =
            typeof content === 'string' ? content.length > 0 : !!content
          return (
            <div className='grid grid-cols-[92px_1fr] items-start gap-2 text-sm'>
              <div className='ps-1 pt-0.5 text-right text-muted-foreground/80'>
                {label}
              </div>
              <div className='min-w-0 text-foreground'>
                {hasContent ? (
                  content
                ) : (
                  <span className='text-muted-foreground/50'>-</span>
                )}
              </div>
            </div>
          )
        }
        const buildInquirySection = (
          title: string,
          rows: { supplier: string; date: string; typeLabel: string }[],
          accent: string
        ) => {
          if (rows.length === 0) return null
          return (
            <div
              className={cn(
                'rounded-md p-2.5 ring-1',
                accent.includes('slate')
                  ? 'bg-slate-50/80 ring-slate-200'
                  : '',
                accent.includes('amber')
                  ? 'bg-amber-50/70 ring-amber-200'
                  : '',
                accent.includes('blue') ? 'bg-blue-50/70 ring-blue-200' : '',
                accent.includes('emerald')
                  ? 'bg-emerald-50/70 ring-emerald-200'
                  : ''
              )}
            >
              <div className='mb-1.5 flex items-center justify-between gap-2'>
                <Badge
                  variant='secondary'
                  className={cn(
                    'font-medium',
                    accent.includes('slate')
                      ? 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                      : '',
                    accent.includes('amber')
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                      : '',
                    accent.includes('blue')
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                      : '',
                    accent.includes('emerald')
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                      : ''
                  )}
                >
                  {title}（{rows.length}）
                </Badge>
              </div>
              <ul className='space-y-0.5'>
                {rows.map((r, idx) => (
                  <li
                    key={idx}
                    className='grid grid-cols-[1fr_auto] items-start gap-2 text-[13px] text-slate-900'
                  >
                    <LongText className='max-w-[420px] truncate font-medium text-slate-900'>
                      {r.supplier}
                    </LongText>
                    <span className='shrink-0 text-xs text-slate-600'>
                      {r.date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        return (
          <Popover>
            <PopoverTrigger asChild tabIndex={-1}>
              <span
                role='button'
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className='inline-flex cursor-pointer select-none'
              >
                {trigger}
              </span>
            </PopoverTrigger>
            <PopoverContent
              side='right'
              align='start'
              sideOffset={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className='z-[100] flex h-[90vh] w-[620px] max-w-[92vw] flex-col overflow-hidden border border-border/80 bg-background/95 p-0 shadow-2xl shadow-black/10 backdrop-blur data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
            >
              <div className='flex shrink-0 items-center gap-2 border-b border-border/80 bg-muted/40 px-3.5 py-2.5'>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm text-muted-foreground/80'>
                    案件详情速览
                  </div>
                  <div className='truncate text-base font-semibold text-foreground'>
                    {displayValue}
                  </div>
                </div>
                <Badge variant='outline' className='shrink-0'>
                  案件 #{s((rowData as any).case_id)}
                </Badge>
              </div>
              <ScrollArea className='min-h-0 flex-1'>
                <div className='flex flex-col gap-3.5 p-3.5'>
                  <div className='grid grid-cols-1 gap-y-2.5'>
                    {kvRow(
                      '发票号',
                      s(rowData.invoice_number) && (
                        <LongText className='max-w-[480px] break-all'>
                          {s(rowData.invoice_number)}
                        </LongText>
                      )
                    )}
                    {kvRow(
                      '订单编号',
                      s(rowData.order_number) && (
                        <LongText className='max-w-[480px] break-all'>
                          {s(rowData.order_number)}
                        </LongText>
                      )
                    )}
                    {kvRow(
                      '需求编号/名称',
                      s(rowData.case_inquiry_keyword) && (
                        <LongText className='max-w-[480px] break-all'>
                          {s(rowData.case_inquiry_keyword)}
                        </LongText>
                      )
                    )}
                    {kvRow(
                      '案件进度',
                      resolveDict(progressRMap, rowData.case_progress) ||
                        s(rowData.case_progress)
                    )}
                    {kvRow(
                      '需求类型',
                      resolveDict(inqTypeAMap, rowData.case_inquiry_type) ||
                        s(rowData.case_inquiry_type)
                    )}
                    {kvRow(
                      '跟进日期',
                      formatDateAsHyphen(rowData.case_follow_date)
                    )}
                    {kvRow(
                      '船东联系人',
                      finalOwner?.owner_name ? (
                        <div className='flex flex-wrap items-center gap-2'>
                          <LongText className='max-w-[360px] truncate'>
                            {finalOwner.owner_name}
                          </LongText>
                          {s(finalOwner.owner_email) && (
                            <span className='text-xs text-muted-foreground/80'>
                              {finalOwner.owner_email}
                            </span>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                  {(inquiryGroups.询价.length > 0 ||
                    inquiryGroups.报价.length > 0 ||
                    inquiryGroups.竞标.length > 0 ||
                    inquiryGroups.中标.length > 0) && (
                    <>
                      <Separator className='my-0.5' />
                      <div className='flex flex-col gap-2.5'>
                        <div className='text-[11px] tracking-wider text-muted-foreground/70 uppercase'>
                          询价记录
                        </div>
                        {buildInquirySection(
                          '询价单位',
                          inquiryGroups.询价,
                          'slate'
                        )}
                        {buildInquirySection(
                          '报价单位',
                          inquiryGroups.报价,
                          'amber'
                        )}
                        {buildInquirySection(
                          '竞标单位',
                          inquiryGroups.竞标,
                          'blue'
                        )}
                        {buildInquirySection(
                          '中标单位',
                          inquiryGroups.中标,
                          'emerald'
                        )}
                      </div>
                    </>
                  )}
                  <Separator className='my-0.5' />
                  <div className='grid grid-cols-1 gap-y-2.5'>
                    {kvRow(
                      '案件机务',
                      (() => {
                        const rawId = (rowData as any)?.case_superintendent_id
                        let name: string | null = null
                        const n =
                          typeof rawId === 'number'
                            ? rawId
                            : typeof rawId === 'string' && rawId.trim() !== ''
                              ? Number(rawId)
                              : Number.NaN
                        if (Number.isFinite(n) && n > 0) {
                          const hit = ownerIdEmailMap?.get(String(n))
                          if (hit?.owner_name) name = hit.owner_name
                        }
                        if (!name) {
                          const t = s(rowData.case_superintendent)
                          if (t) name = t
                        }
                        return name ? (
                          <LongText className='max-w-[480px] truncate'>
                            {name}
                          </LongText>
                        ) : null
                      })()
                    )}
                    {kvRow(
                      '承运人｜服务负责人',
                      (resolveDict(
                        inchargeEMap,
                        rowData.case_delivery_or_service_incharge
                      ) ||
                        s(rowData.case_delivery_or_service_incharge)) && (
                        <LongText className='max-w-[480px] truncate'>
                          {resolveDict(
                            inchargeEMap,
                            rowData.case_delivery_or_service_incharge
                          ) ||
                            s(rowData.case_delivery_or_service_incharge)}
                        </LongText>
                      )
                    )}
                    {kvRow(
                      '运输｜服务截止日',
                      formatDateAsHyphen(
                        rowData.case_delivery_or_service_deadline
                      )
                    )}
                    {kvRow(
                      'ETA',
                      formatDateAsHyphen(rowData.case_eta_cargo_ready_date)
                    )}
                    {kvRow(
                      'ETB',
                      formatDateAsHyphen(
                        rowData.case_etb_cargo_departure_date
                      )
                    )}
                    {kvRow(
                      'ETD',
                      formatDateAsHyphen(rowData.case_etd_cargo_delivery_date)
                    )}
                    {kvRow(
                      '案件负责人',
                      (resolveDict(inchargeEMap, rowData.case_incharge) ||
                        s(rowData.case_incharge)) && (
                        <LongText className='max-w-[480px] truncate'>
                          {resolveDict(inchargeEMap, rowData.case_incharge) ||
                            s(rowData.case_incharge)}
                        </LongText>
                      )
                    )}
                  </div>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
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
                      'max-w-full whitespace-nowrap px-2'
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
        const isService =
          display.trim().toLowerCase() === 'service'
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
        if (!formatted) return <div>-</div>
        const today = getTodayHyphen()
        const isToday = formatted === today
        const isHandleToday = isHandleTodayRow(row.original.case_should_handle_today)
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
        className: 'w-[144px] min-w-[144px]',
        thClassName: 'w-[144px] min-w-[144px]',
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
        if (!value) return <div>-</div>
        const info = ownerNameEmailMap?.get(String(value))
        const name = info?.owner_name ?? String(value)
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
        const superintendentId = (row.original as any).case_superintendent_id
        let displayName: string | null = null
        if (
          superintendentId != null &&
          superintendentId !== '' &&
          ownerIdEmailMap
        ) {
          const found = ownerIdEmailMap.get(String(superintendentId))
          if (found?.owner_name) {
            displayName = found.owner_name
          }
        }
        if (!displayName) {
          const value = row.getValue('case_superintendent') as string | null
          displayName = value
        }
        return <LongText className='max-w-40'>{displayName ?? '-'}</LongText>
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
      cell: DataTableRowActionsToday,
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
