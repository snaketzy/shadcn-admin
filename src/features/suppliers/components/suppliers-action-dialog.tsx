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
import { type Supplier } from '../data/schema'
import { createSupplier, updateSupplier, fetchSupplierGroups } from '../api/client'

const formSchema = z.object({
  supplier_name: z.string().min(1, '供应商名称是必填项。'),
  supplier_shortname: z.string().optional().catch(''),
  supplier_address: z.string().optional().catch(''),
  supplier_field: z.string().optional().catch(''),
  supplier_advantage: z.string().optional().catch(''),
  supplier_contact_name: z.string().optional().catch(''),
  supplier_contact_phone: z.string().optional().catch(''),
  supplier_contact_email: z.string().email('邮箱格式不正确').optional().or(z.literal('')).catch(''),
  supplier_remark: z.string().optional().catch(''),
})
type SupplierForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type SuppliersActionDialogProps = {
  currentRow?: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuppliersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: SuppliersActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  useQuery({
    queryKey: ['supplier-list-groups'],
    queryFn: fetchSupplierGroups,
    enabled: open,
  })

  const form = useForm<SupplierForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          supplier_name: currentRow.supplier_name,
          supplier_shortname: currentRow.supplier_shortname ?? '',
          supplier_address: currentRow.supplier_address ?? '',
          supplier_field: currentRow.supplier_field ?? '',
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_contact_name: currentRow.supplier_contact_name ?? '',
          supplier_contact_phone: currentRow.supplier_contact_phone ?? '',
          supplier_contact_email: currentRow.supplier_contact_email ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        }
      : {
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: '',
          supplier_advantage: '',
          supplier_contact_name: '',
          supplier_contact_phone: '',
          supplier_contact_email: '',
          supplier_remark: '',
        },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          supplier_name: currentRow.supplier_name,
          supplier_shortname: currentRow.supplier_shortname ?? '',
          supplier_address: currentRow.supplier_address ?? '',
          supplier_field: currentRow.supplier_field ?? '',
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_contact_name: currentRow.supplier_contact_name ?? '',
          supplier_contact_phone: currentRow.supplier_contact_phone ?? '',
          supplier_contact_email: currentRow.supplier_contact_email ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        })
      } else {
        form.reset({
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: '',
          supplier_advantage: '',
          supplier_contact_name: '',
          supplier_contact_phone: '',
          supplier_contact_email: '',
          supplier_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      toast.success('供应商创建成功')
      queryClient.invalidateQueries({ queryKey: ['supplier-list'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateSupplier>[1] }) =>
      updateSupplier(id, data),
    onSuccess: () => {
      toast.success('供应商更新成功')
      queryClient.invalidateQueries({ queryKey: ['supplier-list'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const onSubmit = (values: SupplierForm) => {
    const payload = {
      supplier_name: values.supplier_name,
      supplier_shortname: toOptStr(values.supplier_shortname),
      supplier_address: toOptStr(values.supplier_address),
      supplier_field: toOptStr(values.supplier_field),
      supplier_advantage: toOptStr(values.supplier_advantage),
      supplier_contact_name: toOptStr(values.supplier_contact_name),
      supplier_contact_phone: toOptStr(values.supplier_contact_phone),
      supplier_contact_email: toOptStr(values.supplier_contact_email),
      supplier_remark: toOptStr(values.supplier_remark),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.supplier_id, data: payload })
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
          <DialogTitle>{isEdit ? '编辑供应商' : '添加新供应商'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新供应商信息。' : '在此创建新供应商。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-140 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='supplier-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='supplier_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end'>
                      供应商名称 <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入供应商名称'
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
                name='supplier_shortname'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      供应商简称
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
                name='supplier_field'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      经营范围
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入经营范围'
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
                name='supplier_address'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end pt-2'>
                      供应商地址
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
                name='supplier_advantage'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
                    <FormLabel className='col-span-2 text-end pt-2'>
                      供应商主营
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='请输入主营范围'
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
                name='supplier_contact_name'
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
                name='supplier_contact_phone'
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
                name='supplier_contact_email'
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
                name='supplier_remark'
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
          <Button type='submit' form='supplier-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
