import { createFileRoute } from '@tanstack/react-router'
import { OwnerDetailRoute } from '@/features/owner-detail/owner-detail-route'

export const Route = createFileRoute('/_authenticated/owner_detail/$ownerId')({
  component: OwnerDetailRoute,
})
