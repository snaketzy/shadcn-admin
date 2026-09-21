import { Separator } from '@/components/ui/separator'
import { useSupplierDetail } from '../supplier-detail-route'
import { SupplierQuoteCasesTable } from './supplier-quote-cases-table'

export function SupplierDetailQuote() {
  const { supplier, supplierId } = useSupplierDetail()
  if (!supplier) return null

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>报价记录</h3>
        <p className='text-sm text-muted-foreground'>
          该供应商作为「询价单位」出现在案件询价记录中的全部案件（前端分页）
        </p>
      </div>
      <Separator className='my-3 flex-none' />
      <SupplierQuoteCasesTable supplierId={supplierId} />
    </div>
  )
}
