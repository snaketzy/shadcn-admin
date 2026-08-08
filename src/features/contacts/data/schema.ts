import { z } from 'zod'

export const contactSchema = z.object({
  contact_id: z.number(),
  contact_name: z.string(),
  contact_mobile: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_type: z.string().nullable(),
  contact_rank: z.string().nullable(),
  contact_division_type: z.string().nullable(),
  contact_division_id: z.string().nullable(),
  contact_remark: z.string().nullable(),
})

export type Contact = z.infer<typeof contactSchema>
