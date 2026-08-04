import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: `${status === 'active' ? '正在启用' : '正在停用'}船只...`,
      success: () => {
        table.resetRowSelection()
        return `已${status === 'active' ? '启用' : '停用'} ${selectedUsers.length} 艘船只`
      },
      error: `${status === 'active' ? '启用' : '停用'}船只时出错`,
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: '正在邀请船只...',
      success: () => {
        table.resetRowSelection()
        return `已邀请 ${selectedUsers.length} 艘船只`
      },
      error: '邀请船只时出错',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='船只'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label='邀请所选船只'
              title='邀请所选船只'
            >
              <Mail />
              <span className='sr-only'>邀请所选船只</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>邀请所选船只</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label='启用所选船只'
              title='启用所选船只'
            >
              <UserCheck />
              <span className='sr-only'>启用所选船只</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>启用所选船只</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label='停用所选船只'
              title='停用所选船只'
            >
              <UserX />
              <span className='sr-only'>停用所选船只</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>停用所选船只</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='删除所选船只'
              title='删除所选船只'
            >
              <Trash2 />
              <span className='sr-only'>删除所选船只</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除所选船只</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
