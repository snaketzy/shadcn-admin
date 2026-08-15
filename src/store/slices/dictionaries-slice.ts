import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { CaseDictType } from '@/features/dictionaries/data/schema'

export type DictionariesDialogType = 'add' | 'edit' | 'delete'

type DictionariesState = {
  open: DictionariesDialogType | null
  currentRow: CaseDictType | null
}

const initialState: DictionariesState = {
  open: null,
  currentRow: null,
}

const dictionariesSlice = createSlice({
  name: 'dictionaries',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<DictionariesDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<CaseDictType | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const {
  setOpen: setDictionariesOpen,
  setCurrentRow: setDictionariesCurrentRow,
} = dictionariesSlice.actions
export const dictionariesReducer = dictionariesSlice.reducer
