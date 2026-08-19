import { type Row } from '@tanstack/react-table'
import { StickyNotePlus, Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Case } from '@/features/cases/data/schema'
import { useCasesToday } from './cases-today-provider'
import { useNavigate } from '@tanstack/react-router'

type DataTableRowActionsTodayProps = {
  row: Row<Case>
}

export function DataTableRowActionsToday({
  row,
}: DataTableRowActionsTodayProps) {
  const { setOpen, setCurrentRow } = useCasesToday()
  const navigate = useNavigate()
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
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600'
        onClick={() => {
          setCurrentRow(row.original)
          setOpen('memo')
        }}
      >
        <StickyNotePlus size={16} />
      </Button>
    </div>
  )
}
