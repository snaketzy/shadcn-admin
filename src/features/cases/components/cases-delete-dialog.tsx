'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Case } from '../data/schema'
import { deleteCase } from '../api/client'

type CasesDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Case
}

export function CasesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: CasesDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
    }
  }, [open])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCase(id),
    onSuccess: (ok) => {
      if (ok) {
        toast.success('案件已删除')
        queryClient.invalidateQueries({ queryKey: ['case-list-paginated'] })
        queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
        queryClient.invalidateQueries({ queryKey: ['case-today-list-paginated'] })
        queryClient.invalidateQueries({ queryKey: ['case-today-list-groups'] })
        queryClient.invalidateQueries({ queryKey: ['case-deal-list-paginated'] })
        queryClient.invalidateQueries({ queryKey: ['case-deal-list-groups'] })
        onOpenChange(false)
      } else {
        toast.error('删除失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message}`)
    },
  })

  const vesselName = currentRow.vessel_name ?? ''

  const handleDelete = () => {
    if (value.trim() !== vesselName) return
    deleteMutation.mutate(currentRow.case_id)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='cases-delete-form'
      disabled={value.trim() !== vesselName || deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除案件
        </span>
      }
      desc={
        <form
          id='cases-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            您确定要删除 <span className='font-bold'>{vesselName || '该案件'}</span> 吗？
            <br />
            此操作不可撤销。
          </p>

          <Label className='my-2'>
            船名：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='请输入船名以确认删除。'
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
