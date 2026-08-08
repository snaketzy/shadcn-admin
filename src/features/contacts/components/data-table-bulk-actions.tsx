import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { ContactsMultiDeleteDialog } from './contacts-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <BulkActionsToolbar table={table} entityName='联系人'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='删除所选联系人'
              title='删除所选联系人'
            >
              <Trash2 />
              <span className='sr-only'>删除所选联系人</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除所选联系人</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <ContactsMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
