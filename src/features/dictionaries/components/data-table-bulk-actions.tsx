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
import { type Dictionary } from '../data/schema'
import { DictionariesMultiDeleteDialog } from './dictionaries-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedDictionaries = selectedRows.map((row) => row.original as Dictionary)
    toast.promise(sleep(2000), {
      loading: `${status === 'active' ? 'Activating' : 'Deactivating'} dictionaries...`,
      success: () => {
        table.resetRowSelection()
        return `${status === 'active' ? 'Activated' : 'Deactivated'} ${selectedDictionaries.length} dictionary${selectedDictionaries.length > 1 ? 'ies' : ''}`
      },
      error: `Error ${status === 'active' ? 'activating' : 'deactivating'} dictionaries`,
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const selectedDictionaries = selectedRows.map((row) => row.original as Dictionary)
    toast.promise(sleep(2000), {
      loading: 'Inviting dictionaries...',
      success: () => {
        table.resetRowSelection()
        return `Invited ${selectedDictionaries.length} dictionary${selectedDictionaries.length > 1 ? 'ies' : ''}`
      },
      error: 'Error inviting dictionaries',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='dictionary'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label='Invite selected dictionaries'
              title='Invite selected dictionaries'
            >
              <Mail />
              <span className='sr-only'>Invite selected dictionaries</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Invite selected dictionaries</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label='Activate selected dictionaries'
              title='Activate selected dictionaries'
            >
              <UserCheck />
              <span className='sr-only'>Activate selected dictionaries</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Activate selected dictionaries</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label='Deactivate selected dictionaries'
              title='Deactivate selected dictionaries'
            >
              <UserX />
              <span className='sr-only'>Deactivate selected dictionaries</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Deactivate selected dictionaries</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Delete selected dictionaries'
              title='Delete selected dictionaries'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected dictionaries</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected dictionaries</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <DictionariesMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
