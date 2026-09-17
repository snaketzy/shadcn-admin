import { Separator } from '@/components/ui/separator'
import { useSupplierDetail } from '../supplier-detail-route'
import { SupplierCooperationCasesTable } from './supplier-cooperation-cases-table'

export function SupplierDetailCooperation() {
  const { supplier, supplierId } = useSupplierDetail()
  if (!supplier) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>合作记录</h3>
        <p className='text-sm text-muted-foreground'>
          该供应商的员工作为「船厂经营」或「承运人｜服务负责人」参与的全部案件（前端分页）
        </p>
      </div>
      <Separator className='my-3 flex-none' />
      <SupplierCooperationCasesTable supplierId={supplierId} />
    </div>
  )
}
