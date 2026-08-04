import { MailPlus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDictionaries } from './dictionaries-provider'

export function DictionariesPrimaryButtons() {
  const { setOpen } = useDictionaries()
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('invite')}
      >
        <span>邀请字典</span> <MailPlus size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加字典</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
