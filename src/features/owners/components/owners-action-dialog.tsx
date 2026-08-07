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
import { type Owner } from '../data/schema'
import { createOwner, updateOwner, fetchOwnerGroups } from '../api/client'

const formSchema = z.object({
  owner_name: z.string().min(1, '船东名称是必填项。'),
  owner_email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).catch(''),
  owner_phone: z.string().optional().catch(''),
  owner_team: z.string().optional().catch(''),
  owner_department: z.string().optional().catch(''),
  owner_department_email: z.string().email('部门邮箱格式不正确').optional().or(z.literal('')).catch(''),
  owner_rank: z.string().optional().catch(''),
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
          owner_email: currentRow.owner_email ?? '',
          owner_phone: currentRow.owner_phone ?? '',
          owner_team: currentRow.owner_team ?? '',
          owner_department: currentRow.owner_department ?? '',
          owner_department_email: currentRow.owner_department_email ?? '',
          owner_rank: currentRow.owner_rank ?? '',
        }
      : {
          owner_name: '',
          owner_email: '',
          owner_phone: '',
          owner_team: '',
          owner_department: '',
          owner_department_email: '',
          owner_rank: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          owner_name: currentRow.owner_name,
          owner_email: currentRow.owner_email ?? '',
          owner_phone: currentRow.owner_phone ?? '',
          owner_team: currentRow.owner_team ?? '',
          owner_department: currentRow.owner_department ?? '',
          owner_department_email: currentRow.owner_department_email ?? '',
          owner_rank: currentRow.owner_rank ?? '',
        })
      } else {
        form.reset({
          owner_name: '',
          owner_email: '',
          owner_phone: '',
          owner_team: '',
          owner_department: '',
          owner_department_email: '',
          owner_rank: '',
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
      owner_email: toOptStr(values.owner_email),
      owner_phone: toOptStr(values.owner_phone),
      owner_team: toOptStr(values.owner_team),
      owner_department: toOptStr(values.owner_department),
      owner_department_email: toOptStr(values.owner_department_email),
      owner_rank: toOptStr(values.owner_rank),
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
                name='owner_email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      船东邮箱
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='请输入船东邮箱'
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
                      船东电话
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船东电话'
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
                name='owner_team'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      船东小组
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船东小组'
                        className='col-span-4'
                        list='owner-team-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='owner-team-options'>
                      {(groups?.teams ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='owner_department'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      船东部门
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船东部门'
                        className='col-span-4'
                        list='owner-department-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='owner-department-options'>
                      {(groups?.departments ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='owner_department_email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      船东部门邮箱
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='请输入船东部门邮箱'
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
                name='owner_rank'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      船东职级
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入船东职级'
                        className='col-span-4'
                        list='owner-rank-options'
                        {...field}
                      />
                    </FormControl>
                    <datalist id='owner-rank-options'>
                      {(groups?.ranks ?? []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
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
