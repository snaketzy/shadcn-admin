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
import { type Collaboration } from '../data/schema'
import { createCollaboration, updateCollaboration, fetchCollaborationGroups } from '../api/client'

const formSchema = z.object({
  collaboration_name: z.string().optional().catch(''),
  collaboration_shortname: z.string().min(1, '协作商简称是必填项。'),
  collaboration_address: z.string().optional().catch(''),
  collaboration_contact_name: z.string().optional().catch(''),
  collaboration_contact_phone: z.string().optional().catch(''),
  collaboration_contact_email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).catch(''),
  collaboration_remark: z.string().optional().catch(''),
})
type CollaborationForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type CollaborationsActionDialogProps = {
  currentRow?: Collaboration
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CollaborationsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: CollaborationsActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  useQuery({
    queryKey: ['collaboration-list-groups'],
    queryFn: fetchCollaborationGroups,
    enabled: open,
  })

  const form = useForm<CollaborationForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          collaboration_name: currentRow.collaboration_name,
          collaboration_shortname: currentRow.collaboration_shortname ?? '',
          collaboration_address: currentRow.collaboration_address ?? '',
          collaboration_contact_name: currentRow.collaboration_contact_name ?? '',
          collaboration_contact_phone: currentRow.collaboration_contact_phone ?? '',
          collaboration_contact_email: currentRow.collaboration_contact_email ?? '',
          collaboration_remark: currentRow.collaboration_remark ?? '',
        }
      : {
          collaboration_name: '',
          collaboration_shortname: '',
          collaboration_address: '',
          collaboration_contact_name: '',
          collaboration_contact_phone: '',
          collaboration_contact_email: '',
          collaboration_remark: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          collaboration_name: currentRow.collaboration_name,
          collaboration_shortname: currentRow.collaboration_shortname ?? '',
          collaboration_address: currentRow.collaboration_address ?? '',
          collaboration_contact_name: currentRow.collaboration_contact_name ?? '',
          collaboration_contact_phone: currentRow.collaboration_contact_phone ?? '',
          collaboration_contact_email: currentRow.collaboration_contact_email ?? '',
          collaboration_remark: currentRow.collaboration_remark ?? '',
        })
      } else {
        form.reset({
          collaboration_name: '',
          collaboration_shortname: '',
          collaboration_address: '',
          collaboration_contact_name: '',
          collaboration_contact_phone: '',
          collaboration_contact_email: '',
          collaboration_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const createMutation = useMutation({
    mutationFn: createCollaboration,
    onSuccess: () => {
      toast.success('协作商创建成功')
      queryClient.invalidateQueries({ queryKey: ['collaboration-list'] })
      queryClient.invalidateQueries({ queryKey: ['collaboration-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCollaboration>[1] }) =>
      updateCollaboration(id, data),
    onSuccess: () => {
      toast.success('协作商更新成功')
      queryClient.invalidateQueries({ queryKey: ['collaboration-list'] })
      queryClient.invalidateQueries({ queryKey: ['collaboration-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const onSubmit = (values: CollaborationForm) => {
    const payload = {
      collaboration_name: toOptStr(values.collaboration_name),
      collaboration_shortname: values.collaboration_shortname || null,
      collaboration_address: toOptStr(values.collaboration_address),
      collaboration_contact_name: toOptStr(values.collaboration_contact_name),
      collaboration_contact_phone: toOptStr(values.collaboration_contact_phone),
      collaboration_contact_email: toOptStr(values.collaboration_contact_email),
      collaboration_remark: toOptStr(values.collaboration_remark),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.collaboration_id, data: payload })
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
          <DialogTitle>{isEdit ? '编辑协作商' : '添加新协作商'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新协作商信息。' : '在此创建新协作商。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-140 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='collaboration-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='collaboration_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      协作商名称
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入协作商名称'
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
                name='collaboration_shortname'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      协作商简称 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入简称'
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
                name='collaboration_contact_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入联系人姓名'
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
                name='collaboration_contact_phone'
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
                name='collaboration_address'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end pt-2'>
                      协作商地址
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='请输入地址'
                        rows={2}
                        className='col-span-4 w-full resize-y'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='collaboration_contact_email'
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
                name='collaboration_remark'
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
          <Button type='submit' form='collaboration-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
