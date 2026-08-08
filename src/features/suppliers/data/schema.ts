import { z } from 'zod'

export const supplierSchema = z.object({
  supplier_id: z.number(),
  supplier_name: z.string(),
  supplier_shortname: z.string().nullable(),
  supplier_address: z.string().nullable(),
  supplier_field: z.string().nullable(),
  supplier_advantage: z.string().nullable(),
  supplier_contact_name: z.string().nullable(),
  supplier_contact_phone: z.string().nullable(),
  supplier_contact_email: z.string().nullable(),
  supplier_remark: z.string().nullable(),
})

export type Supplier = z.infer<typeof supplierSchema>
