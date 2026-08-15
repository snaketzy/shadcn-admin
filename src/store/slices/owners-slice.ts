import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Owner } from '@/features/owners/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type OwnersDialogType = 'add' | 'edit' | 'delete' | 'multiDelete' | 'pickOwner' | 'pickSuperintendent'

type OwnersState = {
  open: OwnersDialogType | null
  currentRow: Owner | null
}

const initialState: OwnersState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'owners',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<OwnersDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Owner | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useOwners = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.owners)
  return {
    open,
    setOpen: (v: OwnersDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Owner | null | ((prev: Owner | null) => Owner | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Owner | null) => Owner | null)(currentRow) : v))
    },
  }
}
