import { Separator } from '@/components/ui/separator'
import { useSupplierDetail } from '../supplier-detail-route'
import { StaffContactsTable } from './staff-contacts-table'

export function SupplierDetailInfo() {
  const { supplier, supplierId } = useSupplierDetail()
  if (!supplier) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>员工信息</h3>
        <p className='text-sm text-muted-foreground'>
          该供应商关联的所有联系人/员工档案列表。
        </p>
      </div>
      <Separator className='my-4 flex-none' />
      <div className='h-full min-h-0 w-full overflow-hidden'>
        <StaffContactsTable supplierId={supplierId} />
      </div>
    </div>
  )
}
