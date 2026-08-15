import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Contact } from '@/features/contacts/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type ContactsDialogType =
  | 'add'
  | 'edit'
  | 'delete'
  | 'multiDelete'
  | 'pickAgent'
  | 'pickDivision'
  | 'pickShipyard'
  | 'pickSurveyor'
  | 'pickServiceContact'
  | 'pickAgentContact'
  | 'pickDivisionContact'
  | 'pickShipyardContact'
  | 'pickSurveyorContact'

type ContactsState = {
  open: ContactsDialogType | null
  currentRow: Contact | null
}

const initialState: ContactsState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<ContactsDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Contact | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useContacts = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.contacts)
  return {
    open,
    setOpen: (v: ContactsDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Contact | null | ((prev: Contact | null) => Contact | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Contact | null) => Contact | null)(currentRow) : v))
    },
  }
}
