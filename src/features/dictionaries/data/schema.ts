import { z } from 'zod'

const dictionaryStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type DictionaryStatus = z.infer<typeof dictionaryStatusSchema>

const dictionaryTypeSchema = z.union([
  z.literal('superadmin'),
  z.literal('admin'),
  z.literal('cashier'),
  z.literal('manager'),
])

const _dictionarySchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  status: dictionaryStatusSchema,
  role: dictionaryTypeSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Dictionary = z.infer<typeof _dictionarySchema>
