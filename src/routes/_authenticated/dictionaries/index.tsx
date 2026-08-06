import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Dictionaries } from '@/features/dictionaries'
import { dictionaryGroups } from '@/features/dictionaries/data/schema'

const dictionariesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  group: z
    .array(z.enum(dictionaryGroups))
    .optional()
    .catch([]),
  key: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/dictionaries/')({
  validateSearch: dictionariesSearchSchema,
  component: Dictionaries,
})
