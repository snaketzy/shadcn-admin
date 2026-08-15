import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Supplier } from '@/features/suppliers/data/schema'

export type SuppliersDialogType = 'add' | 'edit' | 'delete'

type SuppliersState = {
  open: SuppliersDialogType | null
  currentRow: Supplier | null
}

const initialState: SuppliersState = {
  open: null,
  currentRow: null,
}

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<SuppliersDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Supplier | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const {
  setOpen: setSuppliersOpen,
  setCurrentRow: setSuppliersCurrentRow,
} = suppliersSlice.actions
export const suppliersReducer = suppliersSlice.reducer
