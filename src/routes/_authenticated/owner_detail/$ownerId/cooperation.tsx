import { createFileRoute } from '@tanstack/react-router'
import { OwnerDetailCooperation } from '@/features/owner-detail/cooperation'

export const Route = createFileRoute(
  '/_authenticated/owner_detail/$ownerId/cooperation'
)({
  component: OwnerDetailCooperation,
})
