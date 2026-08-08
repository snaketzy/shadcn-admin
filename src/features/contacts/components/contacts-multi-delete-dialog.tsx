'use client'

import { useState, useEffect } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Contact } from '../data/schema'
import { deleteContactBulk } from '../api/client'

type ContactsMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function ContactsMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: ContactsMultiDeleteDialogProps<TData>) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
    }
  }, [open])

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedIds = selectedRows.map((row) => (row.original as Contact).contact_id)

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteContactBulk(ids),
    onSuccess: (n) => {
      toast.success(`已删除 ${n} 位联系人`)
      queryClient.invalidateQueries({ queryKey: ['contact-list'] })
      queryClient.invalidateQueries({ queryKey: ['contact-list-groups'] })
      table.resetRowSelection()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`批量删除失败: ${err.message}`)
    },
  })

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`请输入 "${CONFIRM_WORD}" 以确认。`)
      return
    }
    if (selectedIds.length === 0) {
      toast.error('没有选中的联系人')
      return
    }
    deleteMutation.mutate(selectedIds)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='contacts-multi-delete-form'
      disabled={value.trim() !== CONFIRM_WORD || deleteMutation.isPending || selectedIds.length === 0}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除 {selectedRows.length} 位联系人
        </span>
      }
      desc={
        <form
          id='contacts-multi-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            您确定要删除所选联系人吗？ <br />
            此操作无法撤销。
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>请输入 "{CONFIRM_WORD}" 确认：</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`输入 "${CONFIRM_WORD}" 确认。`}
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
