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
import { type Owner } from '../data/schema'
import { createOwner, updateOwner, fetchOwnerGroups } from '../api/client'

const formSchema = z.object({
  owner_name: z.string().min(1, '船东名称是必填项。'),
  owner_company: z.string().optional().catch(''),
  owner_contact: z.string().optional().catch(''),
  owner_phone: z.string().optional().catch(''),
  owner_email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).catch(''),
  owner_country: z.string().optional().catch(''),
  owner_fax: z.string().optional().catch(''),
  owner_address: z.string().optional().catch(''),
  owner_remark: z.string().optional().catch(''),
})
type OwnerForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type OwnersActionDialogProps = {
  currentRow?: Owner
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OwnersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: OwnersActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: groups } = useQuery({
    queryKey: ['owner-list-groups'],
    queryFn: fetchOwnerGroups,
  })

  const form = useForm<OwnerForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          owner_name: currentRow.owner_name,
          owner_company: currentRow.owner_company ?? '',
          owner_contact: currentRow.owner_contact ?? '',
          owner_phone: currentRow.owner_phone ?? '',
          owner_email: currentRow.owner_email ?? '',
          owner_country: currentRow.owner_country ?? '',
          owner_fax: currentRow.owner_fax ?? '',
          owner_address: currentRow.owner_address ?? '',
          owner_remark: currentRow.owner_remark ?? '',
        }
      : {
          owner_name: '',
          owner_company: '',
          owner_contact: '',
          owner_phone: '',
          owner_email: '',
          owner_country: '',
          owner_fax: '',
          owner_address: '',
          owner_remark: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          owner_name: currentRow.owner_name,
          owner_company: currentRow.owner_company ?? '',
          owner_contact: currentRow.owner_contact ?? '',
          owner_phone: currentRow.owner_phone ?? '',
          owner_email: currentRow.owner_email ?? '',
          owner_country: currentRow.owner_country ?? '',
          owner_fax: currentRow.owner_fax ?? '',
          owner_address: currentRow.owner_address ?? '',
          owner_remark: currentRow.owner_remark ?? '',
        })
      } else {
        form.reset({
          owner_name: '',
          owner_company: '',
          owner_contact: '',
          owner_phone: '',
          owner_email: '',
          owner_country: '',
          owner_fax: '',
          owner_address: '',
          owner_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const createMutation = useMutation({
    mutationFn: createOwner,
    onSuccess: () => {
      toast.success('船东创建成功')
      queryClient.invalidateQueries({ queryKey: ['owner-list'] })
      queryClient.invalidateQueries({ queryKey: ['owner-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateOwner>[1] }) =>
      updateOwner(id, data),
    onSuccess: () => {
      toast.success('船东更新成功')
      queryClient.invalidateQueries({ queryKey: ['owner-list'] })
      queryClient.invalidateQueries({ queryKey: ['owner-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const onSubmit = (values: OwnerForm) => {
    const payload = {
      owner_name: values.owner_name,
      owner_company: toOptStr(values.owner_company),
      owner_contact: toOptStr(values.owner_contact),
      owner_phone: toOptStr(values.owner_phone),
      owner_email: toOptStr(values.owner_email),
      owner_country: toOptStr(values.owner_country),
      owner_fax: toOptStr(values.owner_fax),
      owner_address: toOptStr(values.owner_address),
      owner_remark: toOptStr(values.owner_remark),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.owner_id, data: payload })
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
          <DialogTitle>{isEdit ? '编辑船东' : '添加新船东'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新船东信息。' : '在此创建新船东。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='owner-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='owner_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      船东名称 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船东名称'
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
                name='owner_company'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      公司名称
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入公司名称'
                        className='col-span-4'
                        list='owner-company-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='owner-company-options'>
                      {(groups?.companies ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='owner_contact'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入联系人'
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
                name='owner_phone'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      电话
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入联系电话'
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
                name='owner_email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      邮箱
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
                name='owner_country'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      国家/地区
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入国家/地区'
                        className='col-span-4'
                        list='owner-country-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='owner-country-options'>
                      {(groups?.countries ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='owner_fax'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      传真
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入传真'
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
                name='owner_address'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 pt-2 text-end'>
                      地址
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='请输入地址'
                        rows={2}
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
                name='owner_remark'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 pt-2 text-end'>
                      备注
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='备注信息'
                        rows={2}
                        className='col-span-4'
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
          <Button type='submit' form='owner-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
