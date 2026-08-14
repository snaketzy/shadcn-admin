import { StickyNotePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { type Case } from '../data/schema'

type CasesRemarkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Case
}

export function CasesRemarkDialog({
  open,
  onOpenChange,
  currentRow,
}: CasesRemarkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <StickyNotePlus className='opacity-80' size={18} />
            案件备注
          </DialogTitle>
          <DialogDescription>
            {currentRow.case_inquiry_keyword ?? '-'}（船名：
            {currentRow.vessel_name ?? '-'}）
          </DialogDescription>
        </DialogHeader>
        <div className='text-sm text-muted-foreground'>
          备注功能开发中，敬请期待。
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
