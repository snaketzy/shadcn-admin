import { type Row } from '@tanstack/react-table'
import { Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Supplier } from '../data/schema'
import { useSuppliers } from './suppliers-provider'

type DataTableRowActionsProps = {
  row: Row<Supplier>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useSuppliers()
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
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
