import { createFileRoute } from '@tanstack/react-router'
import { VesselDetailRoute } from '@/features/vessel-detail/vessel-detail-route'

export const Route = createFileRoute('/_authenticated/vessel_detail/$vesselId')({
  component: VesselDetailRoute,
})
