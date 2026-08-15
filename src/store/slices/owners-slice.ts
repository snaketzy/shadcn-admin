import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Owner } from '@/features/owners/data/schema'

export type OwnersDialogType = 'add' | 'edit' | 'delete'

type OwnersState = {
  open: OwnersDialogType | null
  currentRow: Owner | null
}

const initialState: OwnersState = {
  open: null,
  currentRow: null,
}

const ownersSlice = createSlice({
  name: 'owners',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<OwnersDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Owner | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen: setOwnersOpen, setCurrentRow: setOwnersCurrentRow } =
  ownersSlice.actions
export const ownersReducer = ownersSlice.reducer
