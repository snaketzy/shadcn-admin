import { FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCasesToday } from './cases-today-provider'

export function CasesTodayPrimaryButtons() {
  const { setOpen } = useCasesToday()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加案件</span> <FileTextIcon size={18} />
      </Button>
    </div>
  )
}
