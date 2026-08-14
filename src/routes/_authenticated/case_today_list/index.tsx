import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CasesToday } from '@/features/cases-today'

const casesTodaySearchSchema = z
  .object({
    page: z.number().optional().catch(1),
    pageSize: z.number().optional().catch(50),
    vesselName: z.string().optional().catch(''),
    invoiceNumber: z.array(z.string()).optional().catch([]),
    orderNumber: z.array(z.string()).optional().catch([]),
    caseInquiryKeyword: z.string().optional().catch(''),
    caseProgress: z.array(z.string()).optional().catch([]),
    caseInquiryType: z.array(z.string()).optional().catch([]),
    caseIncharge: z.array(z.string()).optional().catch([]),
    caseRank: z.array(z.string()).optional().catch([]),
    caseUrgent: z.array(z.string()).optional().catch([]),
    caseShouldHandleToday: z.array(z.string()).optional().catch([]),
    vesselPosition: z.array(z.string()).optional().catch([]),
  })
  .passthrough()

export const Route = createFileRoute('/_authenticated/case_today_list/')({
  validateSearch: casesTodaySearchSchema,
  component: CasesToday,
})
