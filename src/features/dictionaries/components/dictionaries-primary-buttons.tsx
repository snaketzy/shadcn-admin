import { BookPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDictionaries } from './dictionaries-provider'

export function DictionariesPrimaryButtons() {
  const { setOpen } = useDictionaries()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加字典</span> <BookPlus size={18} />
      </Button>
    </div>
  )
}
