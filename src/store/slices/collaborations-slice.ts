import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Collaboration } from '@/features/collaborations/data/schema'

export type CollaborationsDialogType = 'add' | 'edit' | 'delete'

type CollaborationsState = {
  open: CollaborationsDialogType | null
  currentRow: Collaboration | null
}

const initialState: CollaborationsState = {
  open: null,
  currentRow: null,
}

const collaborationsSlice = createSlice({
  name: 'collaborations',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CollaborationsDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Collaboration | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const {
  setOpen: setCollaborationsOpen,
  setCurrentRow: setCollaborationsCurrentRow,
} = collaborationsSlice.actions
export const collaborationsReducer = collaborationsSlice.reducer
