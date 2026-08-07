'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { showSubmittedData } from '@/lib/show-submitted-data'
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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createCaseDict,
  updateCaseDict,
} from '../api/client'
import { type CaseDictType } from '../data/schema'

const formSchema = z.object({
  dict_group: z.string().min(1, '字典分组是必填项。'),
  dict_value: z.string().min(1, '字典键值是必填项。'),
  dict_key: z.string().min(1, '字典键名是必填项。'),
})

type DictionaryForm = z.infer<typeof formSchema>

function toDictKey(v: string): string | number {
  const trimmed = v.trim()
  if (trimmed === '') return ''
  const n = Number(trimmed)
  if (Number.isFinite(n)) return n
  return trimmed
}

type DictionaryActionDialogProps = {
  currentRow?: CaseDictType
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DictionariesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: DictionaryActionDialogProps) {
  const isEdit = !!currentRow
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (p: { dict_group: string; dict_value: string; dict_key: string | number }) =>
      createCaseDict(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-dict'] })
      queryClient.invalidateQueries({ queryKey: ['case-dict-groups'] })
      toast.success('字典添加成功')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; payload: { dict_group: string; dict_value: string; dict_key: string | number } }) =>
      updateCaseDict(vars.id, vars.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-dict'] })
      queryClient.invalidateQueries({ queryKey: ['case-dict-groups'] })
      toast.success('字典更新成功')
    },
  })

  const form = useForm<DictionaryForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          dict_group: currentRow.dict_group,
          dict_value: currentRow.dict_value,
          dict_key: String(currentRow.dict_key),
        }
      : {
          dict_group: '',
          dict_value: '',
          dict_key: '',
        },
  })

  const onSubmit = async (values: DictionaryForm) => {
    try {
      const payload = {
        dict_group: values.dict_group,
        dict_value: values.dict_value,
        dict_key: toDictKey(values.dict_key),
      }
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.dict_id,
          payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      form.reset()
      showSubmittedData(payload)
      onOpenChange(false)
    } catch (err) {
      toast.error(isEdit ? '字典更新失败' : '字典添加失败')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑字典' : '添加新字典'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新字典信息。' : '在此创建新字典。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-auto w-[calc(100%+0.75rem)] py-1 pe-3'>
          <Form {...form}>
            <form
              id='dictionary-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='dict_group'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典分组
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入字典分组'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='dict_key'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典键名
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入字典键名'
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
                name='dict_value'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典键值
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入字典键值'
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
          <Button
            type='submit'
            form='dictionary-form'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending)
              ? '保存中...'
              : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
