import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Case } from '@/features/cases/data/schema'

export type CasesDialogType = 'add' | 'edit' | 'delete' | 'remark'

type CasesState = {
  open: CasesDialogType | null
  currentRow: Case | null
}

const initialState: CasesState = {
  open: null,
  currentRow: null,
}

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CasesDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Case | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen: setCasesOpen, setCurrentRow: setCasesCurrentRow } =
  casesSlice.actions
export const casesReducer = casesSlice.reducer
