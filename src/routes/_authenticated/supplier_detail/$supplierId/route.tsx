import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailRoute } from '@/features/supplier-detail/supplier-detail-route'

export const Route = createFileRoute('/_authenticated/supplier_detail/$supplierId')({
  component: SupplierDetailRoute,
})
