import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type CaseDictType } from '@/features/dictionaries/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type DictionariesDialogType = 'add' | 'edit' | 'delete' | 'multiDelete'

type DictionariesState = {
  open: DictionariesDialogType | null
  currentRow: CaseDictType | null
}

const initialState: DictionariesState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'dictionaries',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<DictionariesDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<CaseDictType | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useDictionaries = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.dictionaries)
  return {
    open,
    setOpen: (v: DictionariesDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: CaseDictType | null | ((prev: CaseDictType | null) => CaseDictType | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: CaseDictType | null) => CaseDictType | null)(currentRow) : v))
    },
  }
}
