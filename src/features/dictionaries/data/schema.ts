import { z } from 'zod'

const dictKeySchema = z.union([z.string(), z.number()]).transform((v) => {
  if (typeof v === 'number') return v
  const n = Number(v)
  if (v.trim() !== '' && Number.isFinite(n)) return n
  return v
})

const _caseDictSchema = z.object({
  dict_id: z.number(),
  dict_group: z.string(),
  dict_value: z.string(),
  dict_key: dictKeySchema,
})
export type CaseDictType = z.infer<typeof _caseDictSchema>
