import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Collaboration } from '@/features/collaborations/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type CollaborationsDialogType = 'add' | 'edit' | 'delete' | 'multiDelete' | 'pickContact'

type CollaborationsState = {
  open: CollaborationsDialogType | null
  currentRow: Collaboration | null
}

const initialState: CollaborationsState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'collaborations',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<CollaborationsDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Collaboration | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useCollaborations = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.collaborations)
  return {
    open,
    setOpen: (v: CollaborationsDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Collaboration | null | ((prev: Collaboration | null) => Collaboration | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Collaboration | null) => Collaboration | null)(currentRow) : v))
    },
  }
}
