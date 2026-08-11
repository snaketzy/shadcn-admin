import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Search, X, Ship } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchVesselAll,
  fetchVesselGroups,
  type Vessel,
} from '@/features/users/api/client'
import {
  VesselPickerDialog,
  type VesselPickerResult,
} from '@/features/users/components/vessel-picker-dialog'
import { createCase, fetchCaseGroups, updateCase } from '../api/client'
import type { Case } from '../data/schema'

const formSchema = z.object({
  vessel_name: z.string().optional().catch(''),
  invoice_number: z.string().optional().catch(''),
  order_number: z.string().optional().catch(''),
  case_inquiry_keyword: z.string().optional().catch(''),
  case_progress: z.string().optional().catch(''),
  case_urgent: z.string().optional().catch(''),
  case_inquiry_type: z.string().optional().catch(''),
  case_inquiry_date: z.string().optional().catch(''),
  case_follow_date: z.string().optional().catch(''),
  case_uptodate_date: z.string().optional().catch(''),
  case_should_handle_today: z.string().optional().catch(''),
  owner_following: z.string().optional().catch(''),
  shipyard_business: z.string().optional().catch(''),
  case_agent: z.string().optional().catch(''),
  case_superintendent: z.string().optional().catch(''),
  case_surveyor: z.string().optional().catch(''),
  case_delivery_or_service_incharge: z.string().optional().catch(''),
  case_delivery_or_service_deadline: z.string().optional().catch(''),
  case_eta_cargo_ready_date: z.string().optional().catch(''),
  case_etb_cargo_departure_date: z.string().optional().catch(''),
  case_etd_cargo_delivery_date: z.string().optional().catch(''),
  vessel_position: z.string().optional().catch(''),
  case_settlement_done: z.string().optional().catch(''),
  case_epd: z.string().optional().catch(''),
  case_spd: z.string().optional().catch(''),
  case_incharge: z.string().optional().catch(''),
  case_memo_name: z.string().optional().catch(''),
  case_memo_address: z.string().optional().catch(''),
  case_rank: z.string().optional().catch(''),
})
type CaseForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type CasesActionDialogProps = {
  currentRow?: Case
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CasesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: CasesActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: vesselRows = [] } = useQuery({
    queryKey: ['vessel-picker-all'],
    queryFn: fetchVesselAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: vesselGroupsData } = useQuery({
    queryKey: ['vessel-picker-groups'],
    queryFn: fetchVesselGroups,
    enabled: open,
    staleTime: 60000,
  })

  const { data: caseGroupsData } = useQuery({
    queryKey: ['case-list-groups'],
    queryFn: fetchCaseGroups,
    enabled: open,
    staleTime: 60000,
  })

  const [vesselPickerOpen, setVesselPickerOpen] = useState(false)

  const vesselNameMap = useMemo(() => {
    const map = new Map<string, Vessel>()
    for (const v of vesselRows as Vessel[]) {
      if (v.vessel_name) map.set(String(v.vessel_name), v)
    }
    return map
  }, [vesselRows])

  const progressOptions = useMemo(() => {
    return (caseGroupsData?.progressDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.progressDict])

  const urgentOptions = useMemo(() => {
    const opts = (caseGroupsData?.urgentDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
    const hasNo = opts.some((o) => o.value.toUpperCase() === 'NO')
    if (!hasNo && opts.length === 0) {
      opts.unshift({ key: 'NO', value: 'NO' })
    }
    return opts
  }, [caseGroupsData?.urgentDict])

  const defaultUrgentKey = useMemo(() => {
    const noOpt = urgentOptions.find((o) => o.value.toUpperCase() === 'NO')
    return noOpt?.key ?? urgentOptions[0]?.key ?? ''
  }, [urgentOptions])

  const inquiryTypeOptions = useMemo(() => {
    return (caseGroupsData?.inquiryTypeDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.inquiryTypeDict])

  const resolveInquiryTypeLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = inquiryTypeOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [inquiryTypeOptions]
  )

  const inchargeOptions = useMemo(() => {
    return (caseGroupsData?.inchargeDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.inchargeDict])

  const splitCsvKeys = useCallback((raw: unknown): string[] => {
    if (raw === null || raw === undefined || raw === '') return []
    return String(raw)
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }, [])

  const joinCsvKeys = useCallback((keys: string[]): string => {
    return keys.filter((k) => k && k.trim()).join(',')
  }, [])

  const rankOptions = useMemo(() => {
    return (caseGroupsData?.rankDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.rankDict])

  const resolveRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = rankOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [rankOptions]
  )

  const handleTodayOptions = useMemo(() => {
    const opts = (caseGroupsData?.handleTodayDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
    if (
      !opts.some((o) => o.value.toUpperCase() === 'NO') &&
      opts.length === 0
    ) {
      opts.unshift({ key: 'NO', value: 'NO' })
    }
    return opts
  }, [caseGroupsData?.handleTodayDict])

  const defaultHandleTodayKey = useMemo(() => {
    const noOpt = handleTodayOptions.find((o) => o.value.toUpperCase() === 'NO')
    return noOpt?.key ?? handleTodayOptions[0]?.key ?? ''
  }, [handleTodayOptions])

  const resolveUrgentLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = urgentOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [urgentOptions]
  )

  const resolveProgressLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = progressOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [progressOptions]
  )

  const inchargeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        vesselGroupsData as
          | { inchargeDict?: { dict_key: string; dict_value: string }[] }
          | undefined
      )?.inchargeDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [vesselGroupsData])

  const resolveInchargeLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = inchargeKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [inchargeKeyMap]
  )

  const resolveVesselDisplay = useCallback(
    (
      vesselName: string | null | undefined
    ): {
      name: string
      flag: string
      vesselClass: string
      team: string
      incharge: string
    } => {
      const name = vesselName ?? ''
      if (!name)
        return { name: '', flag: '', vesselClass: '', team: '', incharge: '' }
      const v = vesselNameMap.get(name)
      if (v) {
        return {
          name: v.vessel_name ?? '',
          flag: v.vessel_flag ?? '',
          vesselClass: v.vessel_class ?? '',
          team: v.vessel_team ?? '',
          incharge: resolveInchargeLabel(v.vessel_incharge),
        }
      }
      return { name, flag: '', vesselClass: '', team: '', incharge: '' }
    },
    [vesselNameMap, resolveInchargeLabel]
  )

  const defaultValues = isEdit
    ? {
        vessel_name: currentRow.vessel_name ?? '',
        invoice_number: currentRow.invoice_number ?? '',
        order_number: currentRow.order_number ?? '',
        case_inquiry_keyword: currentRow.case_inquiry_keyword ?? '',
        case_progress: currentRow.case_progress ?? '',
        case_urgent: currentRow.case_urgent ?? defaultUrgentKey,
        case_inquiry_type: currentRow.case_inquiry_type ?? '',
        case_inquiry_date: currentRow.case_inquiry_date ?? '',
        case_follow_date: currentRow.case_follow_date ?? '',
        case_uptodate_date: currentRow.case_uptodate_date ?? '',
        case_should_handle_today:
          currentRow.case_should_handle_today ?? defaultHandleTodayKey,
        owner_following: currentRow.owner_following ?? '',
        shipyard_business: currentRow.shipyard_business ?? '',
        case_agent: currentRow.case_agent ?? '',
        case_superintendent: currentRow.case_superintendent ?? '',
        case_surveyor: currentRow.case_surveyor ?? '',
        case_delivery_or_service_incharge:
          currentRow.case_delivery_or_service_incharge ?? '',
        case_delivery_or_service_deadline:
          currentRow.case_delivery_or_service_deadline ?? '',
        case_eta_cargo_ready_date: currentRow.case_eta_cargo_ready_date ?? '',
        case_etb_cargo_departure_date:
          currentRow.case_etb_cargo_departure_date ?? '',
        case_etd_cargo_delivery_date:
          currentRow.case_etd_cargo_delivery_date ?? '',
        vessel_position: currentRow.vessel_position ?? '',
        case_settlement_done: currentRow.case_settlement_done ?? '',
        case_epd: currentRow.case_epd ?? '',
        case_spd: currentRow.case_spd ?? '',
        case_incharge: currentRow.case_incharge ?? '',
        case_memo_name: currentRow.case_memo_name ?? '',
        case_memo_address: currentRow.case_memo_address ?? '',
        case_rank: currentRow.case_rank ?? '',
      }
    : {
        vessel_name: '',
        invoice_number: '',
        order_number: '',
        case_inquiry_keyword: '',
        case_progress: '',
        case_urgent: defaultUrgentKey,
        case_inquiry_type: '',
        case_inquiry_date: '',
        case_follow_date: '',
        case_uptodate_date: '',
        case_should_handle_today: defaultHandleTodayKey,
        owner_following: '',
        shipyard_business: '',
        case_agent: '',
        case_superintendent: '',
        case_surveyor: '',
        case_delivery_or_service_incharge: '',
        case_delivery_or_service_deadline: '',
        case_eta_cargo_ready_date: '',
        case_etb_cargo_departure_date: '',
        case_etd_cargo_delivery_date: '',
        vessel_position: '',
        case_settlement_done: '',
        case_epd: '',
        case_spd: '',
        case_incharge: '',
        case_memo_name: '',
        case_memo_address: '',
        case_rank: '',
      }

  const form = useForm<CaseForm>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const formVesselName = form.watch('vessel_name')
  const formInquiryKeyword = form.watch('case_inquiry_keyword')
  const formInquiryDate = form.watch('case_inquiry_date')

  const vesselDisplay = useMemo(() => {
    return resolveVesselDisplay(formVesselName ?? '')
  }, [formVesselName, resolveVesselDisplay])

  useEffect(() => {
    const parts = [
      formVesselName ?? '',
      formInquiryKeyword ?? '',
      formInquiryDate ?? '',
    ].filter((p) => p && p.trim().length > 0)
    const memoName = parts.join(' / ')
    form.setValue('case_memo_name', memoName, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form, formVesselName, formInquiryKeyword, formInquiryDate])

  const didResetRef = useRef(false)
  useEffect(() => {
    if (!open) {
      didResetRef.current = false
      return
    }
    if (didResetRef.current) return
    didResetRef.current = true
    form.reset(defaultValues)
  }, [open, form, defaultValues])

  useEffect(() => {
    if (open || didResetRef.current) return
    didResetRef.current = false
  }, [open])

  useEffect(() => {
    if (!open || isEdit) return
    if (!defaultUrgentKey) return
    const current = form.getValues('case_urgent')
    const validKeys = new Set(urgentOptions.map((o) => o.key))
    if (current && validKeys.has(current)) return
    form.setValue('case_urgent', defaultUrgentKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [defaultUrgentKey, open, isEdit, urgentOptions, form])

  useEffect(() => {
    if (!open || isEdit) return
    if (!defaultHandleTodayKey) return
    const current = form.getValues('case_should_handle_today')
    const validKeys = new Set(handleTodayOptions.map((o) => o.key))
    if (current && validKeys.has(current)) return
    form.setValue('case_should_handle_today', defaultHandleTodayKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [defaultHandleTodayKey, open, isEdit, handleTodayOptions, form])

  const handleVesselPicked = useCallback(
    (r: VesselPickerResult) => {
      form.setValue('vessel_name', r.vessel_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearVessel = useCallback(() => {
    form.setValue('vessel_name', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      toast.success('案件创建成功')
      queryClient.invalidateQueries({ queryKey: ['case-list'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message || String(err)}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Parameters<typeof updateCase>[1]
    }) => updateCase(id, data),
    onSuccess: () => {
      toast.success('案件更新成功')
      queryClient.invalidateQueries({ queryKey: ['case-list'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message || String(err)}`)
    },
  })

  const onSubmit = (values: CaseForm) => {
    const payload = {
      vessel_name: toOptStr(values.vessel_name),
      invoice_number: toOptStr(values.invoice_number),
      order_number: toOptStr(values.order_number),
      case_inquiry_keyword: toOptStr(values.case_inquiry_keyword),
      case_progress: toOptStr(values.case_progress),
      case_urgent: toOptStr(values.case_urgent),
      case_inquiry_type: toOptStr(values.case_inquiry_type),
      case_inquiry_date: toOptStr(values.case_inquiry_date),
      case_follow_date: toOptStr(values.case_follow_date),
      case_uptodate_date: toOptStr(values.case_uptodate_date),
      case_should_handle_today: toOptStr(values.case_should_handle_today),
      owner_following: toOptStr(values.owner_following),
      shipyard_business: toOptStr(values.shipyard_business),
      case_agent: toOptStr(values.case_agent),
      case_superintendent: toOptStr(values.case_superintendent),
      case_surveyor: toOptStr(values.case_surveyor),
      case_delivery_or_service_incharge: toOptStr(
        values.case_delivery_or_service_incharge
      ),
      case_delivery_or_service_deadline: toOptStr(
        values.case_delivery_or_service_deadline
      ),
      case_eta_cargo_ready_date: toOptStr(values.case_eta_cargo_ready_date),
      case_etb_cargo_departure_date: toOptStr(
        values.case_etb_cargo_departure_date
      ),
      case_etd_cargo_delivery_date: toOptStr(
        values.case_etd_cargo_delivery_date
      ),
      vessel_position: toOptStr(values.vessel_position),
      case_settlement_done: toOptStr(values.case_settlement_done),
      case_epd: toOptStr(values.case_epd),
      case_spd: toOptStr(values.case_spd),
      case_incharge: toOptStr(values.case_incharge),
      case_memo_name: toOptStr(values.case_memo_name),
      case_memo_address: toOptStr(values.case_memo_address),
      case_rank: toOptStr(values.case_rank),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.case_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (!state) {
            form.reset()
          }
          onOpenChange(state)
        }}
      >
        <DialogContent className='sm:max-w-5xl'>
          <DialogHeader className='text-start'>
            <DialogTitle>{isEdit ? '编辑案件' : '添加新案件'}</DialogTitle>
            <DialogDescription>
              {isEdit ? '在此更新案件信息。' : '在此创建新案件。'}
              完成后点击保存。
            </DialogDescription>
          </DialogHeader>
          <div className='h-[560px] w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
            <Form {...form}>
              <form
                id='cases-form'
                onSubmit={form.handleSubmit(onSubmit)}
                className='grid grid-cols-2 gap-4 px-0.5'
              >
                <FormField
                  control={form.control}
                  name='vessel_name'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 pt-2 text-end'>
                        船名
                      </FormLabel>
                      <div className='col-span-4'>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              placeholder='点击输入框从船队列表中选择...'
                              className='cursor-pointer pe-20 pr-20'
                              readOnly
                              value={field.value || ''}
                              onClick={() => setVesselPickerOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setVesselPickerOpen(true)
                                }
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                              {field.value ? (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='pointer-events-auto h-7 w-7'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearVessel()
                                  }}
                                  aria-label='清空船名'
                                >
                                  <X className='h-3.5 w-3.5' />
                                </Button>
                              ) : null}
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='pointer-events-auto h-7 w-7'
                                tabIndex={-1}
                                aria-label='选择船只'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <Ship className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(vesselDisplay.flag ||
                          vesselDisplay.vesselClass ||
                          vesselDisplay.team ||
                          vesselDisplay.incharge) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {vesselDisplay.flag && (
                              <div>船旗：{vesselDisplay.flag}</div>
                            )}
                            {vesselDisplay.vesselClass && (
                              <div>船级：{vesselDisplay.vesselClass}</div>
                            )}
                            {vesselDisplay.team && (
                              <div>Team：{vesselDisplay.team}</div>
                            )}
                            {vesselDisplay.incharge && (
                              <div>负责人：{vesselDisplay.incharge}</div>
                            )}
                          </div>
                        )}
                        {field.value && !vesselDisplay.name && (
                          <p className='mt-1 text-xs text-muted-foreground/80'>
                            船名：{field.value}（未找到对应船只详情）
                          </p>
                        )}
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='invoice_number'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        发票号
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入发票号'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='order_number'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        订单编号
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入订单编号'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_inquiry_keyword'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        需求编号/名称
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入需求编号/名称'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_progress'
                  render={({ field }) => {
                    const selectedLabel =
                      progressOptions.find((o) => o.key === field.value)
                        ?.value ?? ''
                    return (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          案件进度
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl className='col-span-4'>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'col-span-4 w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {selectedLabel || '请选择案件进度'}
                                <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-[480px] p-0'
                            align='start'
                          >
                            <Command>
                              <CommandInput placeholder='搜索案件进度...' />
                              <CommandList>
                                <CommandEmpty>暂无结果</CommandEmpty>
                                <CommandGroup>
                                  {progressOptions.map((o) => (
                                    <CommandItem
                                      value={o.value}
                                      key={o.key}
                                      onSelect={() => {
                                        form.setValue('case_progress', o.key, {
                                          shouldDirty: true,
                                          shouldValidate: false,
                                        })
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          'size-4',
                                          o.key === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      {o.value}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  control={form.control}
                  name='case_urgent'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        紧急案件
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {urgentOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-urgent-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-urgent-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_inquiry_type'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        需求類型
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {inquiryTypeOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-inquiry-type-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-inquiry-type-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_incharge'
                  render={({ field }) => {
                    const selectedKeys = splitCsvKeys(field.value).map((k) =>
                      k.toUpperCase()
                    )
                    const keySet = new Set(selectedKeys)
                    const toggleKey = (key: string, checked: boolean) => {
                      const current = splitCsvKeys(field.value)
                      const curSet = new Set(
                        current.map((k) => k.toUpperCase())
                      )
                      const keyUpper = key.toUpperCase()
                      if (checked) curSet.add(keyUpper)
                      else curSet.delete(keyUpper)
                      const orderedKeys = inchargeOptions
                        .map((o) => o.key)
                        .filter((k) => curSet.has(k.toUpperCase()))
                      const merged = Array.from(
                        new Set([
                          ...orderedKeys,
                          ...current.filter((k) => curSet.has(k.toUpperCase())),
                        ])
                      )
                      form.setValue('case_incharge', joinCsvKeys(merged), {
                        shouldDirty: true,
                        shouldValidate: false,
                      })
                    }
                    return (
                      <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 pt-1.5 text-end'>
                          案件负责人
                        </FormLabel>
                        <div className='col-span-4 flex flex-wrap items-start gap-x-5 gap-y-2.5'>
                          {inchargeOptions.map((o) => {
                            const checked = keySet.has(o.key.toUpperCase())
                            return (
                              <FormItem
                                key={o.key}
                                className='flex items-center space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    id={`case-incharge-${o.key}`}
                                    checked={checked}
                                    onCheckedChange={(c) =>
                                      toggleKey(o.key, !!c)
                                    }
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={`case-incharge-${o.key}`}
                                  className='ms-2 cursor-pointer font-normal select-none'
                                >
                                  {o.value}
                                </Label>
                              </FormItem>
                            )
                          })}
                        </div>
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  control={form.control}
                  name='case_rank'
                  render={({ field }) => {
                    const selectedLabel = resolveRankLabel(field.value)
                    return (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          案件评级
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'col-span-4 w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? selectedLabel : '请选择案件评级'}
                                <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-[480px] p-0'
                            align='start'
                          >
                            <Command>
                              <CommandInput
                                placeholder='搜索案件评级...'
                                className='h-9'
                              />
                              <CommandEmpty>暂无结果</CommandEmpty>
                              <CommandGroup>
                                {rankOptions.map((o) => (
                                  <CommandItem
                                    value={o.value}
                                    key={o.key}
                                    onSelect={() => {
                                      form.setValue('case_rank', o.key, {
                                        shouldDirty: true,
                                        shouldValidate: false,
                                      })
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        o.key.toUpperCase() ===
                                          (field.value ?? '').toUpperCase()
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {o.value}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  control={form.control}
                  name='case_should_handle_today'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        当日需处理
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {handleTodayOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-handle-today-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-handle-today-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_inquiry_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        询价日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_follow_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        开始日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_uptodate_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        跟进日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_delivery_or_service_deadline'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        运输｜服务截止日
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_eta_cargo_ready_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船舶到港 | 备货完成
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_etb_cargo_departure_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船舶靠港 ｜ 货物发出
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_etd_cargo_delivery_date'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船舶开航 ｜ 货物签收
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_epd'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船东结账日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_spd'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        供应商结账日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='owner_following'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船東联络人
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入船東联络人'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='shipyard_business'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船厂经营
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入船厂经营'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_agent'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件代理
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入案件代理'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_superintendent'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件机务
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入案件机务'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_surveyor'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件船检
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入案件船检'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_delivery_or_service_incharge'
                  render={({ field }) => (
                    <FormItem className='col-span-1 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 pt-2 text-end'>
                        承运人｜服务负责人
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入承运人｜服务负责人'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='vessel_position'
                  render={({ field }) => (
                    <FormItem className='col-span-1 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 pt-2 text-end'>
                        船舶位置
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入船舶位置'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_settlement_done'
                  render={({ field }) => (
                    <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件结算完成
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入案件结算完成标识'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_memo_address'
                  render={({ field }) => (
                    <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件备忘录地址
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入案件备忘录地址'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_memo_name'
                  render={({ field }) => (
                    <FormItem className='col-span-2 grid grid-cols-12 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件备忘录名称
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='由「船名」// 「需求名称」//「询价日期」生成'
                          className='col-span-10 cursor-not-allowed bg-muted/40'
                          readOnly
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-10 col-start-3' />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                form.reset()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type='submit' form='cases-form' disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VesselPickerDialog
        open={vesselPickerOpen}
        onOpenChange={setVesselPickerOpen}
        initialSelectedName={form.getValues('vessel_name') || undefined}
        onSelect={handleVesselPicked}
      />
    </>
  )
}
