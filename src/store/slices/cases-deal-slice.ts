import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Case } from '@/features/cases/data/schema'

export type CasesDealDialogType = 'add' | 'edit' | 'delete' | 'remark'

type CasesDealState = {
  open: CasesDealDialogType | null
  currentRow: Case | null
}

const initialState: CasesDealState = {
  open: null,
  currentRow: null,
}

const casesDealSlice = createSlice({
  name: 'casesDeal',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CasesDealDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Case | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen: setCasesDealOpen, setCurrentRow: setCasesDealCurrentRow } =
  casesDealSlice.actions
export const casesDealReducer = casesDealSlice.reducer
