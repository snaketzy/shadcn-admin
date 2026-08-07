import { Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOwners } from './owners-provider'

export function OwnersPrimaryButtons() {
  const { setOpen } = useOwners()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加船东</span> <UsersIcon size={18} />
      </Button>
    </div>
  )
}
