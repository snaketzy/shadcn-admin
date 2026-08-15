import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Contact } from '@/features/contacts/data/schema'

export type ContactsDialogType = 'add' | 'edit' | 'delete'

type ContactsState = {
  open: ContactsDialogType | null
  currentRow: Contact | null
}

const initialState: ContactsState = {
  open: null,
  currentRow: null,
}

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<ContactsDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Contact | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const {
  setOpen: setContactsOpen,
  setCurrentRow: setContactsCurrentRow,
} = contactsSlice.actions
export const contactsReducer = contactsSlice.reducer
