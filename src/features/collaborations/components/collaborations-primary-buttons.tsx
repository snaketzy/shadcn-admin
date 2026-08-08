import { Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCollaborations } from './collaborations-provider'

export function CollaborationsPrimaryButtons() {
  const { setOpen } = useCollaborations()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加协作商</span> <UsersIcon size={18} />
      </Button>
    </div>
  )
}
