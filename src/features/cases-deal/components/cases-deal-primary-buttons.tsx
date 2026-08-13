import { FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCasesDeal } from './cases-deal-provider'

export function CasesDealPrimaryButtons() {
  const { setOpen } = useCasesDeal()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加案件</span> <FileTextIcon size={18} />
      </Button>
    </div>
  )
}
