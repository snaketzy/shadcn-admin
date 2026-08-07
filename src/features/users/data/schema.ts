import { z } from 'zod'

export const vesselSchema = z.object({
  vessel_id: z.number(),
  vessel_name: z.string(),
  building_year: z.string().nullable(),
  vessel_imo: z.number().nullable(),
  vessel_loa: z.string().nullable(),
  vessel_breadth: z.string().nullable(),
  vessel_gross: z.number().nullable(),
  vessel_dwt: z.number().nullable(),
  vessel_class: z.string().nullable(),
  vessel_flag: z.string().nullable(),
  vessel_team: z.string().nullable(),
  vessel_incharge: z.string().nullable(),
})

export type Vessel = z.infer<typeof vesselSchema>
