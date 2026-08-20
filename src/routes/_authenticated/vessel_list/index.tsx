import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Users } from '@/features/users'

const usersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(50),
  vesselTeam: z.string().optional().catch(''),
  vesselFlag: z.string().optional().catch(''),
  vesselClass: z.string().optional().catch(''),
  vesselName: z.string().optional().catch(''),
  vesselIncharge: z.string().optional().catch(''),
  vesselFleetManager: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/vessel_list/')({
  validateSearch: usersSearchSchema,
  component: Users,
})
