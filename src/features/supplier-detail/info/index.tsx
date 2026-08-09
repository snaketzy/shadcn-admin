import { Separator } from '@/components/ui/separator'
import { useSupplierDetail } from '../supplier-detail-route'
import { StaffContactsTable } from './staff-contacts-table'

export function SupplierDetailInfo() {
  const { supplier, supplierId } = useSupplierDetail()
  if (!supplier) return null

  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>员工信息</h3>
        <p className='text-sm text-muted-foreground'>
          该供应商关联的联系人（员工）档案列表，按联系人名称排序。
        </p>
      </div>
      <Separator className='my-4 flex-none' />
      <div className='faded-bottom h-full w-full overflow-hidden scroll-smooth pe-4 pb-12 flex-1'>
        <div className='-mx-1 px-1.5 h-full'>
          <StaffContactsTable supplierId={supplierId} />
        </div>
      </div>
    </div>
  )
}
