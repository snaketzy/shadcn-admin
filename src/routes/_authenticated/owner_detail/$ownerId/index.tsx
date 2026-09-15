import { createFileRoute } from '@tanstack/react-router'
import { OwnerDetailBasic } from '@/features/owner-detail/basic'

export const Route = createFileRoute('/_authenticated/owner_detail/$ownerId/')({
  component: OwnerDetailBasic,
})
