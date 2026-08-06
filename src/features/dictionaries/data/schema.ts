import { z } from 'zod'

const _caseDictSchema = z.object({
  dict_id: z.number(),
  dict_group: z.string(),
  dict_value: z.string(),
  dict_key: z.coerce.number(),
})
export type CaseDictType = z.infer<typeof _caseDictSchema>
