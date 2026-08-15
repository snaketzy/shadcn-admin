import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  ContactDictEntry,
  DivisionSupplierRow,
  DivisionCollaborationRow,
} from '@/features/contacts/api/client'
import type { Contact } from '@/features/contacts/data/schema'

export type ContactDetailGroups = {
  typeDict: ContactDictEntry[]
  divisionDict: ContactDictEntry[]
  rankDict: ContactDictEntry[]
  supplierFieldDict: ContactDictEntry[]
  collaborationFieldDict: ContactDictEntry[]
}

type ContactDetailState = {
  contactId: string
  contact: Contact | null
  isLoading: boolean
  error: Error | null
  groups: ContactDetailGroups
  supplierRows: DivisionSupplierRow[]
  collaborationRows: DivisionCollaborationRow[]
}

const initialState: ContactDetailState = {
  contactId: '',
  contact: null,
  isLoading: false,
  error: null,
  groups: {
    typeDict: [],
    divisionDict: [],
    rankDict: [],
    supplierFieldDict: [],
    collaborationFieldDict: [],
  },
  supplierRows: [],
  collaborationRows: [],
}

const contactDetailSlice = createSlice({
  name: 'contactDetail',
  initialState,
  reducers: {
    setContactId: (state, action: PayloadAction<string>) => {
      state.contactId = action.payload
    },
    setContact: (state, action: PayloadAction<Contact | null>) => {
      state.contact = action.payload
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<Error | null>) => {
      state.error = action.payload
    },
    setGroups: (state, action: PayloadAction<ContactDetailGroups>) => {
      state.groups = action.payload
    },
    setSupplierRows: (state, action: PayloadAction<DivisionSupplierRow[]>) => {
      state.supplierRows = action.payload
    },
    setCollaborationRows: (
      state,
      action: PayloadAction<DivisionCollaborationRow[]>
    ) => {
      state.collaborationRows = action.payload
    },
    setAll: (
      state,
      action: PayloadAction<{
        contactId: string
        contact: Contact | null
        isLoading: boolean
        error: Error | null
        groups: ContactDetailGroups
        supplierRows: DivisionSupplierRow[]
        collaborationRows: DivisionCollaborationRow[]
      }>
    ) => {
      state.contactId = action.payload.contactId
      state.contact = action.payload.contact
      state.isLoading = action.payload.isLoading
      state.error = action.payload.error
      state.groups = action.payload.groups
      state.supplierRows = action.payload.supplierRows
      state.collaborationRows = action.payload.collaborationRows
    },
    resetContactDetail: () => initialState,
  },
})

export const {
  setContactId,
  setContact,
  setIsLoading,
  setError,
  setGroups,
  setSupplierRows,
  setCollaborationRows,
  setAll: setContactDetailAll,
  resetContactDetail,
} = contactDetailSlice.actions
export const contactDetailReducer = contactDetailSlice.reducer
