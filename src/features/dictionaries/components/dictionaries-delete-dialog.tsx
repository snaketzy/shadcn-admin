'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type CaseDictType } from '../data/schema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCaseDict } from '../api/client'
import { toast } from 'sonner'

type DictionaryDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: CaseDictType
}

export function DictionariesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: DictionaryDeleteDialogProps) {
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCaseDict(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-dict'] })
    },
  })

  const handleDelete = async () => {
    if (value.trim() !== currentRow.dict_group) return

    const ok = await deleteMutation.mutateAsync(currentRow.dict_id)
    if (ok) {
      toast.success('字典已删除')
      onOpenChange(false)
      showSubmittedData(currentRow, 'The following dictionary has been deleted:')
    } else {
      toast.error('字典删除失败')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(s) => {
        if (!s) setValue('')
        onOpenChange(s)
      }}
      form='dictionaries-delete-form'
      disabled={value.trim() !== currentRow.dict_group || deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除字典
        </span>
      }
      desc={
        <form
          id='dictionaries-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            您确定要删除 字典分组为{' '}
            <span className='font-bold'>{currentRow.dict_group}</span> 的{' '}
            <span className='font-bold'>{currentRow.dict_value}</span> 吗？
            <br />
            此操作不可撤销。
          </p>

          <Label className='my-2'>
            请输入字典分组名称确认删除：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='请输入字典分组名称以确认删除。'
              autoFocus
              disabled={deleteMutation.isPending}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>警告！</AlertTitle>
            <AlertDescription>
              请谨慎操作，此操作无法撤销。
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText={deleteMutation.isPending ? '删除中...' : '删除'}
      destructive
    />
  )
}
