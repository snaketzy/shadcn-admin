import { z } from 'zod'

export const dictionaryGroups = [
  '业务类型',
  '船舶状态',
  '港口列表',
  '货物类型',
  '结算方式',
  '货币单位',
  '运输条款',
  '包装方式',
] as const

const dictionaryGroupSchema = z.enum(dictionaryGroups)
export type DictionaryGroup = z.infer<typeof dictionaryGroupSchema>

const _dictionarySchema = z.object({
  id: z.string(),
  group: dictionaryGroupSchema,
  key: z.string(),
  value: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Dictionary = z.infer<typeof _dictionarySchema>
