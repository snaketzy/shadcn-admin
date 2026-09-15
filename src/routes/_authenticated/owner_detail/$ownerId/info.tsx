import { createFileRoute } from '@tanstack/react-router'
import { OwnerDetailInfo } from '@/features/owner-detail/info'

export const Route = createFileRoute('/_authenticated/owner_detail/$ownerId/info')({
  component: OwnerDetailInfo,
})
