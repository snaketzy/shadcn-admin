import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setContactsOpen,
  setContactsCurrentRow,
  type ContactsDialogType,
} from '@/store/slices/contacts-slice'
import { type Contact } from '../data/schema'

type ContactsContextType = {
  open: ContactsDialogType | null
  setOpen: (str: ContactsDialogType | null) => void
  currentRow: Contact | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Contact | null>>
}

export function ContactsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useContacts = (): ContactsContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.contacts.open)
  const currentRow = useAppSelector((s) => s.contacts.currentRow)

  const setOpen = (str: ContactsDialogType | null) => {
    dispatch(setContactsOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Contact | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setContactsCurrentRow(v(currentRow)))
    } else {
      dispatch(setContactsCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
