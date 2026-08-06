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
import { SelectDropdown } from '@/components/select-dropdown'
import { groupOptions } from '../data/data'
import { type Dictionary } from '../data/schema'

const formSchema = z.object({
  group: z.string().min(1, '字典分组是必填项。'),
  key: z.string().min(1, '字典键名是必填项。'),
  value: z.string().min(1, '字典键值是必填项。'),
})
type DictionaryForm = z.infer<typeof formSchema>

type DictionaryActionDialogProps = {
  currentRow?: Dictionary
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DictionariesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: DictionaryActionDialogProps) {
  const isEdit = !!currentRow
  const form = useForm<DictionaryForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          group: currentRow.group,
          key: currentRow.key,
          value: currentRow.value,
        }
      : {
          group: '',
          key: '',
          value: '',
        },
  })

  const onSubmit = (values: DictionaryForm) => {
    form.reset()
    showSubmittedData(values)
    onOpenChange(false)
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
        <div className='max-h-[70vh] w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='dictionary-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='group'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典分组
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='选择字典分组'
                      className='col-span-4'
                      items={groupOptions.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='key'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典键名
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如：FOB、SHA'
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
                name='value'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      字典键值
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如：离岸价、上海港'
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
          <Button type='submit' form='dictionary-form'>
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
