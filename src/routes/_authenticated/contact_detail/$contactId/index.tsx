import { createFileRoute } from '@tanstack/react-router'
import { ContactDetailBasic } from '@/features/contact-detail/basic'

export const Route = createFileRoute('/_authenticated/contact_detail/$contactId/')({
  component: ContactDetailBasic,
})
