import { createFileRoute } from '@tanstack/react-router'
import { ContactDetailRoute } from '@/features/contact-detail/contact-detail-route'

export const Route = createFileRoute('/_authenticated/contact_detail/$contactId')({
  component: ContactDetailRoute,
})
