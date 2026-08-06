import { type Row } from '@tanstack/react-table'
import { Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type CaseDictType } from '../data/schema'
import { useDictionaries } from './dictionaries-provider'

type DataTableRowActionsProps = {
  row: Row<CaseDictType>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useDictionaries()
  return (
    <div className='flex justify-end gap-1 pe-2'>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        onClick={() => {
          setCurrentRow(row.original)
          setOpen('edit')
        }}
        aria-label='编辑'
        title='编辑'
      >
        <UserPen size={16} />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10'
        onClick={() => {
          setCurrentRow(row.original)
          setOpen('delete')
        }}
        aria-label='删除'
        title='删除'
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
