import { ContentSection } from '@/features/settings/components/content-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { useOwnerDetail } from '../owner-detail-route'

export function OwnerDetailCooperation() {
  const { owner } = useOwnerDetail()
  if (!owner) return null

  return (
    <ContentSection
      title='合作记录'
      desc='与该船东的历史合作档案、项目案件与交易记录汇总。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>合作档案</CardTitle>
                <CardDescription>
                  与 {owner.owner_name || '该船东'} 的全部合作记录
                </CardDescription>
              </div>
              <Button size='sm' className='h-8 gap-1' disabled>
                <PlusIcon className='size-4' />
                新建记录
              </Button>
            </div>
          </CardHeader>
          <CardContent className='border-t'>
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted'>
                <ClipboardListIcon className='size-7 text-muted-foreground' />
              </div>
              <h4 className='text-sm font-medium'>暂无合作记录</h4>
              <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
                后续可在此处录入与该船东的合作历史，包括案件编号、合作时间、金额与项目说明等信息。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
