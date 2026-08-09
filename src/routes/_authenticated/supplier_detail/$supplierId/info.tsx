import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailInfo } from '@/features/supplier-detail/info'

export const Route = createFileRoute('/_authenticated/supplier_detail/$supplierId/info')({
  component: SupplierDetailInfo,
})
