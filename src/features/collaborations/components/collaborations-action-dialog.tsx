'use client'

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
import { type Collaboration } from '../data/schema'
import {
  createCollaboration,
  updateCollaboration,
  fetchCollaborationGroups,
} from '../api/client'

const formSchema = z.object({
  collaboration_name: z.string().optional().catch(''),
  collaboration_shortname: z.string().min(1, '协作商简称是必填项。'),
  collaboration_field: z.array(z.string()).optional().catch([]),
  collaboration_address: z.string().optional().catch(''),
  collaboration_contact_id: z.string().nullable().catch(null),
  collaboration_remark: z.string().optional().catch(''),
})
type CollaborationForm = z.infer<typeof formSchema>

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

  const { data: groups } = useQuery({
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
          collaboration_field: splitMulti(currentRow.collaboration_field),
          collaboration_contact_id:
            currentRow.collaboration_contact_id != null
              ? String(currentRow.collaboration_contact_id)
              : null,
          collaboration_remark: currentRow.collaboration_remark ?? '',
        }
      : {
          collaboration_name: '',
          collaboration_shortname: '',
          collaboration_address: '',
          collaboration_field: [],
          collaboration_contact_id: null,
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
          collaboration_field: splitMulti(currentRow.collaboration_field),
          collaboration_contact_id:
            currentRow.collaboration_contact_id != null
              ? String(currentRow.collaboration_contact_id)
              : null,
          collaboration_remark: currentRow.collaboration_remark ?? '',
        })
      } else {
        form.reset({
          collaboration_name: '',
          collaboration_shortname: '',
          collaboration_address: '',
          collaboration_field: [],
          collaboration_contact_id: null,
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
      collaboration_field: joinMulti(values.collaboration_field),
      collaboration_address: toOptStr(values.collaboration_address),
      collaboration_contact_id: toOptNumber(values.collaboration_contact_id),
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
                name='collaboration_contact_id'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      联系人ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='请输入联系人ID'
                        className='col-span-4'
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? null : val)
                        }}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='collaboration_field'
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
