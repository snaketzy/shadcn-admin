import { UserPlus as UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useContacts } from './contacts-provider'

export function ContactsPrimaryButtons() {
  const { setOpen } = useContacts()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加联系人</span> <UserPlusIcon size={18} />
      </Button>
    </div>
  )
}
