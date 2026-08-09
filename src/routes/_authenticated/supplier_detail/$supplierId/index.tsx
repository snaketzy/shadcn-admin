import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailBasic } from '@/features/supplier-detail/basic'

export const Route = createFileRoute('/_authenticated/supplier_detail/$supplierId/')({
  component: SupplierDetailBasic,
})
