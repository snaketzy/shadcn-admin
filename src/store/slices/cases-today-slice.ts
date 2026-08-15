import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Case } from '@/features/cases/data/schema'

export type CasesTodayDialogType = 'add' | 'edit' | 'delete' | 'remark'

type CasesTodayState = {
  open: CasesTodayDialogType | null
  currentRow: Case | null
}

const initialState: CasesTodayState = {
  open: null,
  currentRow: null,
}

const casesTodaySlice = createSlice({
  name: 'casesToday',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CasesTodayDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Case | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const {
  setOpen: setCasesTodayOpen,
  setCurrentRow: setCasesTodayCurrentRow,
} = casesTodaySlice.actions
export const casesTodayReducer = casesTodaySlice.reducer
