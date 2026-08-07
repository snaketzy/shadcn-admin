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
import { createVessel, updateVessel, fetchVesselGroups } from '../api/client'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

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

  const form = useForm<VesselForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          vessel_name: currentRow.vessel_name,
          building_year: currentRow.building_year ?? '',
          vessel_imo: currentRow.vessel_imo != null ? String(currentRow.vessel_imo) : '',
          vessel_loa: currentRow.vessel_loa ?? '',
          vessel_breadth: currentRow.vessel_breadth ?? '',
          vessel_gross: currentRow.vessel_gross != null ? String(currentRow.vessel_gross) : '',
          vessel_dwt: currentRow.vessel_dwt != null ? String(currentRow.vessel_dwt) : '',
          vessel_class: currentRow.vessel_class ?? '',
          vessel_flag: currentRow.vessel_flag ?? '',
          vessel_team: currentRow.vessel_team ?? '',
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
          vessel_loa: currentRow.vessel_loa ?? '',
          vessel_breadth: currentRow.vessel_breadth ?? '',
          vessel_gross: currentRow.vessel_gross != null ? String(currentRow.vessel_gross) : '',
          vessel_dwt: currentRow.vessel_dwt != null ? String(currentRow.vessel_dwt) : '',
          vessel_class: currentRow.vessel_class ?? '',
          vessel_flag: currentRow.vessel_flag ?? '',
          vessel_team: currentRow.vessel_team ?? '',
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
      vessel_loa: toOptStr(values.vessel_loa),
      vessel_breadth: toOptStr(values.vessel_breadth),
      vessel_gross: toOptNum(values.vessel_gross),
      vessel_dwt: toOptNum(values.vessel_dwt),
      vessel_class: toOptStr(values.vessel_class),
      vessel_flag: toOptStr(values.vessel_flag),
      vessel_team: toOptStr(values.vessel_team),
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
                name='vessel_breadth'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Breadth
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='型宽 (m)'
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
                name='vessel_gross'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Gross
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='总吨'
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
                name='vessel_dwt'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Dwt
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='载重吨'
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
                name='vessel_class'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Class
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='船级社 (如: NK, DNV)'
                        className='col-span-4'
                        list='vessel-class-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='vessel-class-options'>
                      {(groups?.classes ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
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
                    <FormControl>
                      <Input
                        placeholder='船旗 (如: Panama)'
                        className='col-span-4'
                        list='vessel-flag-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='vessel-flag-options'>
                      {(groups?.flags ?? []).map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
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
