import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Vessel } from '@/features/users/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type UsersDialogType = 'add' | 'edit' | 'delete' | 'multiDelete' | 'invite' | 'pickVessel'

type UsersState = {
  open: UsersDialogType | null
  currentRow: Vessel | null
}

const initialState: UsersState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<UsersDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Vessel | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useUsers = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.users)
  return {
    open,
    setOpen: (v: UsersDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Vessel | null | ((prev: Vessel | null) => Vessel | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Vessel | null) => Vessel | null)(currentRow) : v))
    },
  }
}
