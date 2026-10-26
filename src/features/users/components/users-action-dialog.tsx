'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Vessel } from '../data/schema'
import {
  createVessel,
  updateVessel,
  fetchVesselGroups,
  fetchVesselInchargeHistory,
} from '../api/client'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { GitBranch } from 'lucide-react'

const formSchema = z.object({
  vessel_name: z.string().min(1, '船名是必填项。'),
  building_year: z.string().optional().catch(''),
  vessel_imo: z.string().optional().catch(''),
  vessel_loa: z.string().optional().catch(''),
  vessel_breadth: z.string().optional().catch(''),
  vessel_gross: z.string().optional().catch(''),
  vessel_dwt: z.string().optional().catch(''),
  vessel_class: z.string().optional().catch(''),
  vessel_flag: z.string().optional().catch(''),
  vessel_team: z.string().optional().catch(''),
  vessel_fleet_manager: z.string().optional().catch(''),
  vessel_incharge: z.string().optional().catch(''),
})
type VesselForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}
function toOptNum(s: string | null | undefined): number | null {
  if (s == null || !s || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
function toOptNumFixed2(s: string | null | undefined): number | null {
  if (s == null || !s || s.trim() === '') return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Number(n.toFixed(2))
}
function format2Decimals(s: string | null | undefined): string {
  if (s == null || s.trim() === '') return ''
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  return n.toFixed(2)
}

type UserActionDialogProps = {
  currentRow?: Vessel
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: groups } = useQuery({
    queryKey: ['vessel-list-groups'],
    queryFn: fetchVesselGroups,
  })

  const { data: inchargeHistory = [], isLoading: inchargeHistoryLoading } =
    useQuery({
      queryKey: ['vessel-incharge-history', currentRow?.vessel_id],
      queryFn: () => fetchVesselInchargeHistory(currentRow!.vessel_id),
      enabled: open && isEdit && !!currentRow?.vessel_id,
    })

  const inchargeLabelOf = (v: string | null | undefined): string => {
    if (v === null || v === undefined || v === '') return '未设置'
    const hit = (groups?.inchargeDict ?? []).find(
      (d) => String(d.dict_key).toUpperCase() === String(v).toUpperCase()
    )
    return hit?.dict_value ?? String(v)
  }

  const form = useForm<VesselForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          vessel_name: currentRow.vessel_name,
          building_year: currentRow.building_year ?? '',
          vessel_imo: currentRow.vessel_imo != null ? String(currentRow.vessel_imo) : '',
          vessel_loa: format2Decimals(currentRow.vessel_loa),
          vessel_breadth: format2Decimals(currentRow.vessel_breadth),
          vessel_gross: format2Decimals(
            currentRow.vessel_gross != null ? String(currentRow.vessel_gross) : ''
          ),
          vessel_dwt: format2Decimals(
            currentRow.vessel_dwt != null ? String(currentRow.vessel_dwt) : ''
          ),
          vessel_class: currentRow.vessel_class ?? '',
          vessel_flag: currentRow.vessel_flag ?? '',
          vessel_team: currentRow.vessel_team ?? '',
          vessel_fleet_manager: currentRow.vessel_fleet_manager ?? '',
          vessel_incharge: currentRow.vessel_incharge ?? '',
        }
      : {
          vessel_name: '',
          building_year: '',
          vessel_imo: '',
          vessel_loa: '',
          vessel_breadth: '',
          vessel_gross: '',
          vessel_dwt: '',
          vessel_class: '',
          vessel_flag: '',
          vessel_team: '',
          vessel_fleet_manager: '',
          vessel_incharge: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          vessel_name: currentRow.vessel_name,
          building_year: currentRow.building_year ?? '',
          vessel_imo: currentRow.vessel_imo != null ? String(currentRow.vessel_imo) : '',
          vessel_loa: format2Decimals(currentRow.vessel_loa),
          vessel_breadth: format2Decimals(currentRow.vessel_breadth),
          vessel_gross: format2Decimals(
            currentRow.vessel_gross != null ? String(currentRow.vessel_gross) : ''
          ),
          vessel_dwt: format2Decimals(
            currentRow.vessel_dwt != null ? String(currentRow.vessel_dwt) : ''
          ),
          vessel_class: currentRow.vessel_class ?? '',
          vessel_flag: currentRow.vessel_flag ?? '',
          vessel_team: currentRow.vessel_team ?? '',
          vessel_fleet_manager: currentRow.vessel_fleet_manager ?? '',
          vessel_incharge: currentRow.vessel_incharge ?? '',
        })
      } else {
        form.reset({
          vessel_name: '',
          building_year: '',
          vessel_imo: '',
          vessel_loa: '',
          vessel_breadth: '',
          vessel_gross: '',
          vessel_dwt: '',
          vessel_class: '',
          vessel_flag: '',
          vessel_team: '',
          vessel_fleet_manager: '',
          vessel_incharge: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const createMutation = useMutation({
    mutationFn: createVessel,
    onSuccess: () => {
      toast.success('船只创建成功')
      queryClient.invalidateQueries({ queryKey: ['vessel-list'] })
      queryClient.invalidateQueries({ queryKey: ['vessel-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateVessel>[1] }) =>
      updateVessel(id, data),
    onSuccess: () => {
      toast.success('船只更新成功')
      queryClient.invalidateQueries({ queryKey: ['vessel-list'] })
      queryClient.invalidateQueries({ queryKey: ['vessel-list-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vessel-incharge-history'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const onSubmit = (values: VesselForm) => {
    const payload = {
      vessel_name: values.vessel_name,
      building_year: toOptStr(values.building_year),
      vessel_imo: toOptNum(values.vessel_imo),
      vessel_loa: toOptStr(format2Decimals(values.vessel_loa)),
      vessel_breadth: toOptStr(format2Decimals(values.vessel_breadth)),
      vessel_gross: toOptNumFixed2(values.vessel_gross),
      vessel_dwt: toOptNumFixed2(values.vessel_dwt),
      vessel_class: toOptStr(values.vessel_class),
      vessel_flag: toOptStr(values.vessel_flag),
      vessel_team: toOptStr(values.vessel_team),
      vessel_fleet_manager: toOptStr(values.vessel_fleet_manager),
      vessel_incharge: toOptStr(values.vessel_incharge),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.vessel_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          form.reset()
        }
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑船只' : '添加新船只'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新船只信息。' : '在此创建新船只。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='vessel_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      船名 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船名'
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
                name='building_year'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      建造年份
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='date'
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
                name='vessel_imo'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      IMO
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='请输入IMO编号'
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
                name='vessel_loa'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      LOA
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='总长 (m)'
                        type='number'
                        step='0.01'
                        className='col-span-4'
                        {...field}
                        onBlur={(e) => {
                          const v = format2Decimals(e.target.value)
                          if (v !== e.target.value) field.onChange(v)
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_breadth'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Breadth
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='型宽 (m)'
                        type='number'
                        step='0.01'
                        className='col-span-4'
                        {...field}
                        onBlur={(e) => {
                          const v = format2Decimals(e.target.value)
                          if (v !== e.target.value) field.onChange(v)
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_gross'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Gross
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='总吨'
                        className='col-span-4'
                        {...field}
                        onBlur={(e) => {
                          const v = format2Decimals(e.target.value)
                          if (v !== e.target.value) field.onChange(v)
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_dwt'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Dwt
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='载重吨'
                        className='col-span-4'
                        {...field}
                        onBlur={(e) => {
                          const v = format2Decimals(e.target.value)
                          if (v !== e.target.value) field.onChange(v)
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_class'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Class
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl className='col-span-4'>
                        <SelectTrigger className='col-span-4 w-full'>
                          <SelectValue placeholder='请选择船级社' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups?.classDict ?? []).map((d) => (
                          <SelectItem key={d.dict_key} value={d.dict_key}>
                            {d.dict_value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_flag'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Flag
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl className='col-span-4'>
                        <SelectTrigger className='col-span-4 w-full'>
                          <SelectValue placeholder='请选择船旗国' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups?.flagDict ?? []).map((d) => (
                          <SelectItem key={d.dict_key} value={d.dict_key}>
                            {d.dict_value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_team'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Team
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='所属团队'
                        className='col-span-4'
                        list='vessel-team-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='vessel-team-options'>
                      {(groups?.teams ?? []).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_fleet_manager'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      管理公司
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl className='col-span-4'>
                        <SelectTrigger className='col-span-4 w-full'>
                          <SelectValue placeholder='请选择管理公司' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups?.fleetManagerDict ?? []).map((d) => (
                          <SelectItem key={d.dict_key} value={d.dict_key}>
                            {d.dict_value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='vessel_incharge'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      负责人
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl className='col-span-4'>
                        <SelectTrigger className='col-span-4 w-full'>
                          <SelectValue placeholder='请选择负责人' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups?.inchargeDict ?? []).map((d) => (
                          <SelectItem key={d.dict_key} value={d.dict_key}>
                            {d.dict_value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {isEdit && (
                <div className='col-span-2 mt-1 rounded-md border bg-muted/20 px-3 py-2.5'>
                  <div className='mb-2 flex items-center gap-2'>
                    <GitBranch className='size-3.5 text-muted-foreground' />
                    <span className='text-sm font-medium'>负责人变更过程</span>
                  </div>
                  {inchargeHistoryLoading ? (
                    <div className='py-3 text-center text-xs text-muted-foreground'>
                      加载中...
                    </div>
                  ) : inchargeHistory.length === 0 ? (
                    <div className='py-3 text-center text-xs text-muted-foreground'>
                      暂无负责人变更记录
                    </div>
                  ) : (
                    <div className='overflow-x-auto'>
                      <div className='relative flex min-w-max items-stretch'>
                        <div className='pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border' />
                        {inchargeHistory.map((entry, idx) => {
                          const above = idx % 2 === 0
                          const fromLabel = inchargeLabelOf(
                            entry.log_filed_old_value
                          )
                          const toLabel = inchargeLabelOf(
                            entry.log_field_new_value
                          )
                          return (
                            <div
                              key={entry.log_id}
                              className='flex w-[172px] shrink-0 flex-col items-center'
                            >
                              <div className='flex h-[64px] w-full flex-col items-center justify-end'>
                                {above && (
                                  <>
                                    <div className='w-[150px] rounded border bg-background px-2 py-1 text-center shadow-sm'>
                                      <div className='text-[11px] leading-4 text-muted-foreground'>
                                        {entry.log_date ?? '日期未知'}
                                      </div>
                                      <div
                                        className='truncate text-xs font-medium'
                                        title={`${fromLabel} → ${toLabel}`}
                                      >
                                        {fromLabel} → {toLabel}
                                      </div>
                                    </div>
                                    <span className='h-3 w-px bg-border' />
                                  </>
                                )}
                              </div>
                              <span className='z-10 size-2.5 shrink-0 rounded-full border-2 border-primary bg-background' />
                              <div className='flex h-[64px] w-full flex-col items-center justify-start'>
                                {!above && (
                                  <>
                                    <span className='h-3 w-px bg-border' />
                                    <div className='w-[150px] rounded border bg-background px-2 py-1 text-center shadow-sm'>
                                      <div className='text-[11px] leading-4 text-muted-foreground'>
                                        {entry.log_date ?? '日期未知'}
                                      </div>
                                      <div
                                        className='truncate text-xs font-medium'
                                        title={`${fromLabel} → ${toLabel}`}
                                      >
                                        {fromLabel} → {toLabel}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
