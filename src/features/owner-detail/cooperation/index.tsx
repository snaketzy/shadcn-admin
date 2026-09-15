import { useOwnerDetail } from '../owner-detail-route'
import { OwnerCooperationCasesTable } from './owner-cooperation-cases-table'

export function OwnerDetailCooperation() {
  const { owner } = useOwnerDetail()
  if (!owner) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex flex-none flex-col'>
        <h3 className='text-lg font-medium'>合作记录</h3>
        <p className='text-sm text-muted-foreground'>
          该船东作为「船东联系人」或「案件机务」参与的全部案件（前端分页）
        </p>
      </div>
      <div className='my-4 flex-none h-px bg-border' />
      <OwnerCooperationCasesTable />
    </div>
  )
}
