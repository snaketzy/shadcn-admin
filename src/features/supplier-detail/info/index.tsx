import { useSupplierDetail } from '../supplier-detail-route'
import { StaffContactsTable } from './staff-contacts-table'

export function SupplierDetailInfo() {
  const { supplier, supplierId } = useSupplierDetail()
  if (!supplier) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 flex-1 w-full overflow-hidden'>
        <div className='-mx-1 flex min-h-0 flex-1 flex-col px-1.5'>
          <StaffContactsTable supplierId={supplierId} />
        </div>
      </div>
    </div>
  )
}
