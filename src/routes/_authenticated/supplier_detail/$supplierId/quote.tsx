import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailQuote } from '@/features/supplier-detail/quote'

export const Route = createFileRoute(
  '/_authenticated/supplier_detail/$supplierId/quote'
)({
  component: SupplierDetailQuote,
})
