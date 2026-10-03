import { createFileRoute } from '@tanstack/react-router'
import { VesselDetailCooperation } from '@/features/vessel-detail/cooperation'

export const Route = createFileRoute(
  '/_authenticated/vessel_detail/$vesselId/cooperation'
)({
  component: VesselDetailCooperation,
})
