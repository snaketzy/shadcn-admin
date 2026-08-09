import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Suppliers } from '@/features/suppliers'

const suppliersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  supplierShortname: z.array(z.string()).optional().catch([]),
  supplierField: z.array(z.string()).optional().catch([]),
  supplierAdvantage: z.array(z.string()).optional().catch([]),
  supplierName: z.string().optional().catch(''),
  contactId: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/supplier_list/')({
  validateSearch: suppliersSearchSchema,
  component: Suppliers,
})
