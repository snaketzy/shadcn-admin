import { useState } from 'react'
import { type Row } from '@tanstack/react-table'
import { AlertTriangle, StickyNotePlus, Trash2, UserPen } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { type Case } from '@/features/cases/data/schema'
import { deleteCase } from '@/features/cases/api/client'
import { useNavigate } from '@tanstack/react-router'

type DataTableRowActionsDealProps = {
  row: Row<Case>
}

export function DataTableRowActionsDeal({
  row,
}: DataTableRowActionsDealProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

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
        setDeleteOpen(false)
      } else {
        toast.error('删除失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message}`)
    },
  })

  const vesselName = row.original.vessel_name
  const caseId = row.original.case_id

  return (
    <div className='flex justify-end gap-1 pe-2'>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        onClick={() => {
          navigate({
            to: '/case_edit/$caseId',
            params: { caseId: String(row.original.case_id) },
          })
        }}
      >
        <UserPen size={16} />
      </Button>
      <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10'
          >
            <Trash2 size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-72 p-4'>
          <div className='flex items-start gap-3'>
            <AlertTriangle
              className='mt-0.5 shrink-0 text-destructive'
              size={18}
            />
            <div className='flex-1 space-y-3'>
              <div className='text-sm font-semibold text-destructive'>
                确认删除案件？
              </div>
              <div className='text-xs text-muted-foreground'>
                即将删除
                <span className='font-medium text-foreground'>
                  {vesselName ? ` 「${vesselName}」` : ' 该案件'}
                </span>
                ，此操作不可撤销。
              </div>
              <div className='flex justify-end gap-2 pt-1'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate(caseId)
                  }}
                >
                  {deleteMutation.isPending ? '删除中...' : '确认删除'}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600'
        onClick={() => {
          navigate({
            to: '/case_memo/$caseId',
            params: { caseId: String(row.original.case_id) },
          })
        }}
      >
        <StickyNotePlus size={16} />
      </Button>
    </div>
  )
}
