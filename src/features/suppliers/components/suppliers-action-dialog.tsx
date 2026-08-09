import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { CheckIcon } from '@radix-ui/react-icons'
import { Search, X, UserRound } from 'lucide-react'
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
import {
  fetchContactAll,
  type Contact,
} from '@/features/contacts/api/client'
import {
  ContactPickerDialog,
  type ContactPickerResult,
} from '@/features/collaborations/components/contact-picker-dialog'

const formSchema = z.object({
  supplier_name: z.string().optional().catch(''),
  supplier_shortname: z.string().min(1, '供应商简称是必填项。'),
  supplier_address: z.string().optional().catch(''),
  supplier_field: z.array(z.string()).optional().catch([]),
  supplier_advantage: z.string().optional().catch(''),
  supplier_contact_id: z.string().nullable().catch(null),
  supplier_remark: z.string().optional().catch(''),
})
type SupplierForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

function toOptNumber(n: number | string | null | undefined): number | null {
  if (n == null || n === '') return null
  const num = Number(n)
  if (isNaN(num)) return null
  return num
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

  const { data: groups } = useQuery({
    queryKey: ['supplier-list-groups'],
    queryFn: fetchSupplierGroups,
    enabled: open,
  })

  const { data: contactRows = [] } = useQuery({
    queryKey: ['contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
  })

  const [contactPickerOpen, setContactPickerOpen] = useState(false)

  const [contactDisplay, setContactDisplay] = useState<{
    id: string
    name: string
    mobile: string
    email: string
  }>({ id: '', name: '', mobile: '', email: '' })

  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>()
    for (const c of contactRows as Contact[]) {
      map.set(String(c.contact_id), c)
    }
    return map
  }, [contactRows])

  const resolveContactDisplay = useCallback(
    (contactIdStr: string | number | null | undefined): {
      id: string
      name: string
      mobile: string
      email: string
    } => {
      const id = contactIdStr == null || contactIdStr === '' ? '' : String(contactIdStr)
      if (!id) return { id: '', name: '', mobile: '', email: '' }
      const c = contactMap.get(id)
      if (c) {
        return {
          id,
          name: c.contact_name ?? '',
          mobile: c.contact_mobile ?? '',
          email: c.contact_email ?? '',
        }
      }
      return { id, name: '', mobile: '', email: '' }
    },
    [contactMap]
  )

  useEffect(() => {
    if (!open) return
    const cid = isEdit && currentRow ? currentRow.supplier_contact_id : null
    setContactDisplay((prev) => {
      const next = resolveContactDisplay(cid)
      if (
        prev.id === next.id &&
        prev.name === next.name &&
        prev.mobile === next.mobile &&
        prev.email === next.email
      ) {
        return prev
      }
      return next
    })
  }, [open, isEdit, currentRow, resolveContactDisplay])

  const form = useForm<SupplierForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          supplier_name: currentRow.supplier_name,
          supplier_shortname: currentRow.supplier_shortname ?? '',
          supplier_address: currentRow.supplier_address ?? '',
          supplier_field: splitMulti(currentRow.supplier_field),
          supplier_contact_id:
            currentRow.supplier_contact_id != null
              ? String(currentRow.supplier_contact_id)
              : null,
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        }
      : {
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: [],
          supplier_contact_id: null,
          supplier_advantage: '',
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
          supplier_contact_id:
            currentRow.supplier_contact_id != null
              ? String(currentRow.supplier_contact_id)
              : null,
          supplier_advantage: currentRow.supplier_advantage ?? '',
          supplier_remark: currentRow.supplier_remark ?? '',
        })
      } else {
        form.reset({
          supplier_name: '',
          supplier_shortname: '',
          supplier_address: '',
          supplier_field: [],
          supplier_contact_id: null,
          supplier_advantage: '',
          supplier_remark: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const handleContactPicked = useCallback(
    (r: ContactPickerResult) => {
      form.setValue('supplier_contact_id', r.contact_id, {
        shouldDirty: true,
        shouldValidate: false,
      })
      setContactDisplay({
        id: r.contact_id,
        name: r.contact_name,
        mobile: r.contact_mobile ?? '',
        email: r.contact_email ?? '',
      })
    },
    [form]
  )

  const handleClearContact = useCallback(() => {
    form.setValue('supplier_contact_id', null, {
      shouldDirty: true,
      shouldValidate: false,
    })
    setContactDisplay({ id: '', name: '', mobile: '', email: '' })
  }, [form])

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
      toast.error(`创建失败: ${err.message || String(err)}`)
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
      toast.error(`更新失败: ${err.message || String(err)}`)
    },
  })

  const onSubmit = (values: SupplierForm) => {
    const payload = {
      supplier_name: toOptStr(values.supplier_name),
      supplier_shortname: values.supplier_shortname || null,
      supplier_address: toOptStr(values.supplier_address),
      supplier_field: joinMulti(values.supplier_field),
      supplier_advantage: toOptStr(values.supplier_advantage),
      supplier_contact_id: toOptNumber(values.supplier_contact_id),
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
              id='suppliers-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='grid grid-cols-2 gap-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='supplier_name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 col-span-2'>
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
                      供应商简称 <span className='text-destructive'>*</span>
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
                name='supplier_contact_id'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end pt-2'>
                      联系人
                    </FormLabel>
                    <div className='col-span-4'>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            placeholder='点击输入框从联系人列表中选择...'
                            className='cursor-pointer pr-20 pe-20'
                            readOnly
                            value={contactDisplay.name || ''}
                            onClick={() => setContactPickerOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setContactPickerOpen(true)
                              }
                            }}
                          />
                          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-2 pe-2'>
                            <>
                              {field.value ? (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='pointer-events-auto h-7 w-7'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearContact()
                                  }}
                                  aria-label='清空联系人'
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
                                aria-label='选择联系人'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <UserRound className='mr-1 me-1 h-3.5 w-3.5 text-muted-foreground' />
                            </>
                          </div>
                        </div>
                      </FormControl>
                      {(contactDisplay.mobile || contactDisplay.email) && (
                        <div className='mt-1 space-y-0.5 text-xs text-muted-foreground/80'>
                          {contactDisplay.mobile && <div>手机：{contactDisplay.mobile}</div>}
                          {contactDisplay.email && <div>邮箱：{contactDisplay.email}</div>}
                        </div>
                      )}
                      {field.value && !contactDisplay.name && (
                        <p className='mt-1 text-xs text-muted-foreground/80'>
                          联系人：{field.value}（未找到对应联系人详情）
                        </p>
                      )}
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='supplier_field'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
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
                name='supplier_address'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
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
                name='supplier_advantage'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 col-span-2'>
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
                        className='col-span-4 min-h-16 resize-y'
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
          <Button
            type='submit'
            form='suppliers-form'
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
        {contactPickerOpen && (
          <ContactPickerDialog
            open={contactPickerOpen}
            onOpenChange={setContactPickerOpen}
            initialSelectedId={form.getValues('supplier_contact_id') || undefined}
            onSelect={handleContactPicked}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
