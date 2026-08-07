import { z } from 'zod'

export const ownerSchema = z.object({
  owner_id: z.number(),
  owner_name: z.string(),
  owner_company: z.string().nullable(),
  owner_contact: z.string().nullable(),
  owner_phone: z.string().nullable(),
  owner_email: z.string().nullable(),
  owner_country: z.string().nullable(),
  owner_fax: z.string().nullable(),
  owner_address: z.string().nullable(),
  owner_remark: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})

export type Owner = z.infer<typeof ownerSchema>
