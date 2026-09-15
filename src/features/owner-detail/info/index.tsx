import { ContentSection } from '@/features/settings/components/content-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Anchor, PlusIcon } from 'lucide-react'
import { useOwnerDetail } from '../owner-detail-route'

export function OwnerDetailInfo() {
  const { owner } = useOwnerDetail()
  if (!owner) return null

  return (
    <ContentSection
      title='关联船舶'
      desc='该船东名下关联的所有船舶档案汇总。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>船舶列表</CardTitle>
                <CardDescription>
                  {owner.owner_name} 名下的全部关联船舶
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
                <Anchor className='size-7 text-muted-foreground' />
              </div>
              <h4 className='text-sm font-medium'>暂无关联船舶</h4>
              <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
                后续可在此处录入该船东名下的船舶档案，包括船名、IMO 编号、船型、载重吨等信息。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
