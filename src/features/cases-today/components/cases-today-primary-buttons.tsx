import { FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from '@tanstack/react-router'

export function CasesTodayPrimaryButtons() {
  const navigate = useNavigate()
  return (
    <div className='flex gap-2'>
      <Button
        className='space-x-1'
        onClick={() => navigate({ to: '/case_new' })}
      >
        <span>添加案件</span> <FileTextIcon size={18} />
      </Button>
    </div>
  )
}
