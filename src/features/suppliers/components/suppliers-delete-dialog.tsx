'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Supplier } from '../data/schema'
import { deleteSupplier } from '../api/client'

type SuppliersDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Supplier
}

export function SuppliersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: SuppliersDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
    }
  }, [open])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: (ok) => {
      if (ok) {
        toast.success('供应商已删除')
        queryClient.invalidateQueries({ queryKey: ['supplier-list'] })
        queryClient.invalidateQueries({ queryKey: ['supplier-list-groups'] })
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
    if (value.trim() !== currentRow.supplier_name) return
    deleteMutation.mutate(currentRow.supplier_id)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='suppliers-delete-form'
      disabled={value.trim() !== currentRow.supplier_name || deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除供应商
        </span>
      }
      desc={
        <form
          id='suppliers-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            您确定要删除 <span className='font-bold'>{currentRow.supplier_name}</span> 吗？
            <br />
            此操作不可撤销。
          </p>

          <Label className='my-2'>
            供应商名称：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='请输入供应商名称以确认删除。'
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
