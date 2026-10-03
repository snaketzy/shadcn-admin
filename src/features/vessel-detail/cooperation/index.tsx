import { Separator } from '@/components/ui/separator'
import { useVesselDetail } from '../vessel-detail-route'
import { VesselCooperationCasesTable } from './vessel-cooperation-cases-table'

export function VesselDetailCooperation() {
  const { vessel, vesselId } = useVesselDetail()
  if (!vessel) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>关联案件</h3>
        <p className='text-sm text-muted-foreground'>
          船名与该船舶匹配的全部历史案件（前端分页，默认跟进日期倒序）
        </p>
      </div>
      <Separator className='my-3 flex-none' />
      <VesselCooperationCasesTable vesselId={vesselId} />
    </div>
  )
}
