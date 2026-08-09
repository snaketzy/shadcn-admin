import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailCooperation } from '@/features/supplier-detail/cooperation'

export const Route = createFileRoute(
  '/_authenticated/supplier_detail/$supplierId/cooperation'
)({
  component: SupplierDetailCooperation,
})
