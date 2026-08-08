'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Contact } from '../data/schema'
import { deleteContact } from '../api/client'

type ContactsDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Contact
}

export function ContactsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: ContactsDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
    }
  }, [open])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteContact(id),
    onSuccess: (ok) => {
      if (ok) {
        toast.success('联系人已删除')
        queryClient.invalidateQueries({ queryKey: ['contact-list'] })
        queryClient.invalidateQueries({ queryKey: ['contact-list-groups'] })
        onOpenChange(false)
      } else {
        toast.error('删除失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message}`)
    },
  })

  const handleDelete = () => {
    if (value.trim() !== currentRow.contact_name) return
    deleteMutation.mutate(currentRow.contact_id)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='contacts-delete-form'
      disabled={value.trim() !== currentRow.contact_name || deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除联系人
        </span>
      }
      desc={
        <form
          id='contacts-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            您确定要删除 <span className='font-bold'>{currentRow.contact_name}</span> 吗？
            <br />
            此操作不可撤销。
          </p>

          <Label className='my-2'>
            联系人名称：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='请输入联系人名称以确认删除。'
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
