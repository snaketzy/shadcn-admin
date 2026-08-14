import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Dictionaries } from '@/features/dictionaries'

const dictionariesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(50),
  dictGroup: z.array(z.string()).optional().catch([]),
  dictValue: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/dictionaries/')({
  validateSearch: dictionariesSearchSchema,
  component: Dictionaries,
})
