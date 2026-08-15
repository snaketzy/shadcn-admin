import type React from 'react'

export { useContacts } from '@/store/slices/contacts-slice'
export type { ContactsDialogType } from '@/store/slices/contacts-slice'

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
