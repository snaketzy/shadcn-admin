import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Case } from '@/features/cases/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type CasesTodayDialogType = 'add' | 'edit' | 'delete' | 'memo'

type CasesTodayState = {
  open: CasesTodayDialogType | null
  currentRow: Case | null
}

const initialState: CasesTodayState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'casesToday',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CasesTodayDialogType | null>) => {
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
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useCasesToday = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.casesToday)
  return {
    open,
    setOpen: (v: CasesTodayDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Case | null | ((prev: Case | null) => Case | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Case | null) => Case | null)(currentRow) : v))
    },
  }
}
