import { z } from 'zod'

export const ownerSchema = z.object({
  owner_id: z.number(),
  owner_name: z.string(),
  owner_email: z.string().nullable(),
  owner_phone: z.string().nullable(),
  owner_team: z.string().nullable(),
  owner_department: z.string().nullable(),
  owner_department_email: z.string().nullable(),
  owner_rank: z.string().nullable(),
})

export type Owner = z.infer<typeof ownerSchema>
