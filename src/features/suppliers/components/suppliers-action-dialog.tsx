import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { CheckIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'
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
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Supplier } from '../data/schema'
import { createSupplier, updateSupplier, fetchSupplierGroups } from '../api/client'

const formSchema = z.object({
  supplier_name: z.string().optional().catch(''),
  supplier_shortname: z.string().min(1, '供应商简称是必填项。'),
  supplier_address: z.string().optional().catch(''),
  supplier_field: z.array(z.string()).optional().catch([]),
  supplier_advantage: z.string().optional().catch(''),
  supplier_contact_id: z.string().optional().catch(''),
  supplier_remark: z.string().optional().catch(''),
})
type SupplierForm = z.infer<typeof formSchema>

type SuppliersActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Supplier
}

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

function splitMulti(raw: unknown): string[] {
  if (raw === null || raw === undefined || raw === '') return []
  const str = String(raw)
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinMulti(arr: string[] | undefined | null): string | null {
  if (!arr || arr.length === 0) return null
  return arr.filter(Boolean).join(',') || null
}

export function SuppliersActionDialog({
  open,
  onOpenChange,
  currentRow,
}: SuppliersActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: groups } = useQuery({
    queryKey: ['supplier-list-groups'],
    queryFn: fetchSupplierGroups,
    enabled: open,
  })

  const invalidateAfter = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier-list'] })
    queryClient.invalidateQueries({ queryKey: ['supplier-list-groups'] })
  }

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      toast.success('创建成功')
      invalidateAfter()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message || String(err)}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: SupplierForm) => {
      if (!currentRow) return Promise.reject(new Error('缺少编辑行未指定'))
      const payload = {
        supplier_name: toOptStr(values.supplier_name),
        supplier_shortname: values.supplier_shortname || null,
        supplier_address: toOptStr(values.supplier_address),
        supplier_field: joinMulti(values.supplier_field),
        supplier_advantage: toOptStr(values.supplier_advantage),
        supplier_contact_id: toOptStr(values.supplier_contact_id),
        supplier_remark: toOptStr(values.supplier_remark),
      } as any
      return updateSupplier(currentRow.supplier_id, payload)
    },
    onSuccess: () => {
      toast.success('更新成功')
      invalidateAfter()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message || String(err)}`)
    },
  })

  const form = useForm<SupplierForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          supplier_name: currentRow.supplier_name,
          supplier_shortname: currentRow.supplier_shortname ?? '',
          supplier_address: currentRow.supplier_address ?? '',
          supplier_field: splitMulti(currentRow.supplier_field),
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_contact_id: currentRow.supplier_contact_id ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        }
      : {
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: [],
          supplier_advantage: '',
          supplier_contact_id: '',
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
          supplier_field: splitMulti(currentRow.supplier_field),
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_contact_id: currentRow.supplier_contact_id ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        })
      } else {
        form.reset({
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: [],
          supplier_advantage: '',
          supplier_contact_id: '',
          supplier_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const onSubmit = (values: SupplierForm) => {
    if (isEdit) {
      updateMutation.mutate(values)
      return
    }
    const payload = {
      supplier_name: toOptStr(values.supplier_name),
      supplier_shortname: values.supplier_shortname || null,
      supplier_address: toOptStr(values.supplier_address),
      supplier_field: joinMulti(values.supplier_field),
      supplier_advantage: toOptStr(values.supplier_advantage),
      supplier_contact_id: toOptStr(values.supplier_contact_id),
      supplier_remark: toOptStr(values.supplier_remark),
    } as any
    createMutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑供应商' : '添加供应商'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改供应商信息后点击保存。' : '填写供应商信息后点击保存。'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => form.handleSubmit(onSubmit)(e)}
            className='space-y-4 py-2'
          >
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='supplier_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      供应商名称
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
                      <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入供应商简称'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='supplier_address'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end pt-2'>
                    供应商地址
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='请输入供应商地址'
                      className='col-span-4 min-h-16 resize-y'
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
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end pt-2'>
                    经营范围
                  </FormLabel>
                  <div className='col-span-4'>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant='outline'
                            size='sm'
                            className='w-full min-h-9 border-dashed justify-start font-normal'
                          >
                            {(field.value ?? []).length > 0 ? (
                              <>
                                <div className='hidden flex-wrap gap-1 lg:flex'>
                                  {(field.value || [])
                                    .map((v) => {
                                      const d = (groups?.fieldDict ?? []).find(
                                        (x) => x.dict_key === v
                                      )
                                      return d
                                        ? { value: v, label: d.dict_value }
                                        : { value: v, label: v }
                                    })
                                    .map((item) => (
                                      <Badge
                                        key={item.value}
                                        variant='secondary'
                                        className='rounded-sm px-1.5 font-normal'
                                      >
                                        {item.label}
                                      </Badge>
                                    ))}
                                </div>
                                <Badge
                                  variant='secondary'
                                  className='rounded-sm px-1 font-normal lg:hidden'
                                >
                                  {(field.value ?? []).length} 已选
                                </Badge>
                              </>
                            ) : (
                              <span className='text-muted-foreground'>
                                请选择经营范围
                              </span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-64 p-0' align='start'>
                        <Command>
                          <CommandInput placeholder='搜索经营范围' />
                          <CommandList>
                            <CommandEmpty>暂无结果</CommandEmpty>
                            <CommandGroup>
                              {(groups?.fieldDict ?? []).map((d) => {
                                const isSelected = (field.value || []).includes(d.dict_key)
                                return (
                                  <CommandItem
                                    key={d.dict_key}
                                    onSelect={() => {
                                      const current = new Set(field.value || [])
                                      if (isSelected) current.delete(d.dict_key)
                                      else current.add(d.dict_key)
                                      field.onChange(Array.from(current))
                                    }}
                                  >
                                    <div
                                      className={cn(
                                        'flex size-4 items-center justify-center rounded-sm border border-primary me-2',
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'opacity-50 [&_svg]:invisible'
                                      )}
                                    >
                                      <CheckIcon className='h-4 w-4 text-background' />
                                    </div>
                                    <span>{d.dict_value}</span>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                            {(field.value || []).length > 0 && (
                              <>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => field.onChange([])}
                                    className='justify-center text-center'
                                  >
                                    清空已选
                                  </CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className='mt-1' />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='supplier_advantage'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end pt-2'>
                    供应商主营
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='请输入供应商主营'
                      className='col-span-4 min-h-16 resize-y'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='supplier_contact_id'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入联系人ID'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='supplier_remark'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end pt-2'>
                    备注
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='请输入备注'
                      className='col-span-4 min-h-16 resize-y'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
