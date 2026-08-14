import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Collaborations } from '@/features/collaborations'

const collaborationsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(50),
  collaborationShortname: z.array(z.string()).optional().catch([]),
  collaborationField: z.array(z.string()).optional().catch([]),
  collaborationName: z.string().optional().catch(''),
  contactId: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/collaboration_list/')({
  validateSearch: collaborationsSearchSchema,
  component: Collaborations,
})
