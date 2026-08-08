import { z } from 'zod'

export const collaborationSchema = z.object({
  collaboration_id: z.number(),
  collaboration_name: z.string(),
  collaboration_shortname: z.string().nullable(),
  collaboration_address: z.string().nullable(),
  collaboration_field: z.string().nullable(),
  collaboration_contact_id: z.number().nullable(),
  collaboration_remark: z.string().nullable(),
})

export type Collaboration = z.infer<typeof collaborationSchema>
