'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Dictionary } from '../data/schema'

type DictionaryDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Dictionary
}

export function DictionariesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: DictionaryDeleteDialogProps) {
  const [value, setValue] = useState('')

  const handleDelete = () => {
    if (value.trim() !== currentRow.key) return

    onOpenChange(false)
    showSubmittedData(currentRow, '以下字典已被删除：')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='dictionaries-delete-form'
      disabled={value.trim() !== currentRow.key}
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
            您确定要删除字典{' '}
            <span className='font-bold'>{currentRow.key}</span>（
            <span className='font-bold'>{currentRow.value}</span>）吗？
            <br />
            所属分组：
            <span className='font-bold'>{currentRow.group}</span>
            。此操作不可撤销。
          </p>

          <Label className='my-2'>
            请输入字典键名以确认删除：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`请输入 "${currentRow.key}" 以确认删除`}
              autoFocus
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
      confirmText='删除'
      destructive
    />
  )
}
