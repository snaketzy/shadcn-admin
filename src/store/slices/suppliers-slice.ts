import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Supplier } from '@/features/suppliers/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type SuppliersDialogType = 'add' | 'edit' | 'delete' | 'multiDelete' | 'pickSupplier'

type SuppliersState = {
  open: SuppliersDialogType | null
  currentRow: Supplier | null
}

const initialState: SuppliersState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<SuppliersDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Supplier | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useSuppliers = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.suppliers)
  return {
    open,
    setOpen: (v: SuppliersDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Supplier | null | ((prev: Supplier | null) => Supplier | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Supplier | null) => Supplier | null)(currentRow) : v))
    },
  }
}
