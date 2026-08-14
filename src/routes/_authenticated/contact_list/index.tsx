import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Contacts } from '@/features/contacts'

const contactsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(50),
  contactType: z.array(z.string()).optional().catch([]),
  contactName: z.string().optional().catch(''),
  contactSearch: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/contact_list/')({
  validateSearch: contactsSearchSchema,
  component: Contacts,
})
