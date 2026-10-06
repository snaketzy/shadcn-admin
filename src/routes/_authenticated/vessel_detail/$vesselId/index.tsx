import { createFileRoute } from '@tanstack/react-router'
import { VesselDetailBasic } from '@/features/vessel-detail/basic'

export const Route = createFileRoute(
  '/_authenticated/vessel_detail/$vesselId/'
)({
  component: VesselDetailBasic,
})
