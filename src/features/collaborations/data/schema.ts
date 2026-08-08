import { z } from 'zod'

export const collaborationSchema = z.object({
  collaboration_id: z.number(),
  collaboration_name: z.string(),
  collaboration_shortname: z.string().nullable(),
  collaboration_address: z.string().nullable(),
  collaboration_contact_name: z.string().nullable(),
  collaboration_contact_phone: z.string().nullable(),
  collaboration_contact_email: z.string().nullable(),
  collaboration_remark: z.string().nullable(),
})

export type Collaboration = z.infer<typeof collaborationSchema>
