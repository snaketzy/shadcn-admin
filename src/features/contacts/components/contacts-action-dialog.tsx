'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { type Contact } from '../data/schema'
import { createContact, updateContact, fetchContactGroups, type ContactDictEntry } from '../api/client'

const LINKED_TYPE_KEYS = new Set(['J1', 'J2', 'J3'])

function resolveDictLabel(
  raw: string | null | undefined,
  dict: ContactDictEntry[]
): string {
  if (!raw) return '-'
  const byKey = dict.find((d) => d.dict_key.toUpperCase() === raw.toUpperCase())
  if (byKey) return byKey.dict_value
  const byValue = dict.find((d) => d.dict_value === raw)
  return byValue ? byValue.dict_value : raw
}

function deriveDivisionType(typeValue: string | undefined): string {
  if (!typeValue || typeValue.trim() === '') return ''
  return LINKED_TYPE_KEYS.has(typeValue.toUpperCase()) ? 'K2' : 'K1'
}

const formSchema = z.object({
  contact_name: z.string().min(1, '联系人名称是必填项。'),
  contact_mobile: z.string().optional().catch(''),
  contact_email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).catch(''),
  contact_type: z.string().min(1, '联系人类型是必填项。'),
  contact_rank: z.string().optional().catch(''),
  contact_division_type: z.string().optional().catch(''),
  contact_division_id: z.string().optional().catch(''),
  contact_remark: z.string().optional().catch(''),
})
type ContactForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type ContactsActionDialogProps = {
  currentRow?: Contact
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ContactsActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: groups } = useQuery({
    queryKey: ['contact-list-groups'],
    queryFn: fetchContactGroups,
    enabled: open,
  })

  const form = useForm<ContactForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          contact_name: currentRow.contact_name,
          contact_mobile: currentRow.contact_mobile ?? '',
          contact_email: currentRow.contact_email ?? '',
          contact_type: currentRow.contact_type ?? '',
          contact_rank: currentRow.contact_rank ?? '',
          contact_division_type: deriveDivisionType(currentRow.contact_type ?? ''),
          contact_division_id: currentRow.contact_division_id ?? '',
          contact_remark: currentRow.contact_remark ?? '',
        }
      : {
          contact_name: '',
          contact_mobile: '',
          contact_email: '',
          contact_type: '',
          contact_rank: '',
          contact_division_type: '',
          contact_division_id: '',
          contact_remark: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        const typeValue = currentRow.contact_type ?? ''
        form.reset({
          contact_name: currentRow.contact_name,
          contact_mobile: currentRow.contact_mobile ?? '',
          contact_email: currentRow.contact_email ?? '',
          contact_type: typeValue,
          contact_rank: currentRow.contact_rank ?? '',
          contact_division_type: deriveDivisionType(typeValue),
          contact_division_id: currentRow.contact_division_id ?? '',
          contact_remark: currentRow.contact_remark ?? '',
        })
      } else {
        form.reset({
          contact_name: '',
          contact_mobile: '',
          contact_email: '',
          contact_type: '',
          contact_rank: '',
          contact_division_type: '',
          contact_division_id: '',
          contact_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const currentType = form.watch('contact_type')
  useEffect(() => {
    const derived = deriveDivisionType(currentType)
    form.setValue('contact_division_type', derived, { shouldDirty: true, shouldValidate: false })
  }, [currentType, form])

  const createMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      toast.success('联系人创建成功')
      queryClient.invalidateQueries({ queryKey: ['contact-list'] })
      queryClient.invalidateQueries({ queryKey: ['contact-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateContact>[1] }) =>
      updateContact(id, data),
    onSuccess: () => {
      toast.success('联系人更新成功')
      queryClient.invalidateQueries({ queryKey: ['contact-list'] })
      queryClient.invalidateQueries({ queryKey: ['contact-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const onSubmit = (values: ContactForm) => {
    const derivedDivisionType = deriveDivisionType(values.contact_type) || null
    const payload = {
      contact_name: values.contact_name || null,
      contact_mobile: toOptStr(values.contact_mobile),
      contact_email: toOptStr(values.contact_email),
      contact_type: toOptStr(values.contact_type),
      contact_rank: toOptStr(values.contact_rank),
      contact_division_type: derivedDivisionType,
      contact_division_id: toOptStr(values.contact_division_id),
      contact_remark: toOptStr(values.contact_remark),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.contact_id, data: payload })
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
          <DialogTitle>{isEdit ? '编辑联系人' : '添加新联系人'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新联系人信息。' : '在此创建新联系人。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-140 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='contact-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='contact_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人名称 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入联系人名称'
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
                name='contact_type'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人类型 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl className='col-span-4'>
                        <SelectTrigger className='col-span-4 w-full'>
                          <SelectValue placeholder='请选择联系人类型' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups?.typeDict ?? []).map((d) => (
                          <SelectItem key={d.dict_key} value={d.dict_key}>
                            {d.dict_value}
                          </SelectItem>
                        ))}
                        {(groups?.types ?? []).filter((t) =>
                          !(groups?.typeDict ?? []).some((d) => d.dict_key === t || d.dict_value === t)
                        ).map((t) => (
                          <SelectItem key={`legacy-${t}`} value={t}>
                            {t}
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
                name='contact_rank'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人职级
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入职级'
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
                name='contact_mobile'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人手机
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入手机'
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
                name='contact_email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人邮箱
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='请输入邮箱'
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
                name='contact_division_type'
                render={() => {
                  const value = form.watch('contact_division_type')
                  const label = resolveDictLabel(value, groups?.divisionDict ?? [])
                  return (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end text-muted-foreground'>
                      所属单位类型
                    </FormLabel>
                    <div className='col-span-4 flex flex-col gap-1'>
                      <Badge variant='outline' className='min-h-9 min-w-28 self-start px-3 py-1 text-sm'>
                        {value ? label : '（未选择联系人类型）'}
                      </Badge>
                      <p className='text-xs text-muted-foreground/70'>
                        （按联系人类型联动）
                      </p>
                    </div>
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name='contact_division_id'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      所属单位
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入所属单位'
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
                name='contact_remark'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end pt-2'>
                      备注
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='请输入备注'
                        rows={3}
                        className='col-span-4 w-full resize-y'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='contact-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
