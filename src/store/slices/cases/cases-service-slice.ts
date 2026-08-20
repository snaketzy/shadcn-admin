import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Case } from '@/features/cases/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { CaseMemo } from '@/features/cases/api/client'

export type CasesServiceDialogType = 'add' | 'edit' | 'delete' | 'memo'

type CasesServiceState = {
  open: CasesServiceDialogType | null
  currentRow: Case | null
  editingMemo: CaseMemo | null
}

const initialState: CasesServiceState = {
  open: null,
  currentRow: null,
  editingMemo: null,
}

const slice = createSlice({
  name: 'casesService',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CasesServiceDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Case | null>) => {
      state.currentRow = action.payload
    },
    setEditingMemo: (state, action: PayloadAction<CaseMemo | null>) => {
      state.editingMemo = action.payload
    },
  },
})

export const { setOpen, setCurrentRow, setEditingMemo } = slice.actions
export default slice.reducer

export const useCasesService = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow, editingMemo } = useAppSelector((s) => s.casesService)
  return {
    open,
    setOpen: (v: CasesServiceDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Case | null | ((prev: Case | null) => Case | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Case | null) => Case | null)(currentRow) : v))
    },
    editingMemo,
    setEditingMemo: (v: CaseMemo | null) => dispatch(setEditingMemo(v)),
  }
}
