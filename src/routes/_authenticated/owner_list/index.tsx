import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Owners } from '@/features/owners'

const ownersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  ownerTeam: z.array(z.string()).optional().catch([]),
  ownerDepartment: z.array(z.string()).optional().catch([]),
  ownerRank: z.array(z.string()).optional().catch([]),
  ownerName: z.string().optional().catch(''),
  contactSearch: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/owner_list/')({
  validateSearch: ownersSearchSchema,
  component: Owners,
})
