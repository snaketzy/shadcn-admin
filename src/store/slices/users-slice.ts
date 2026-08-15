import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Vessel } from '@/features/users/data/schema'

export type UsersDialogType = 'add' | 'edit' | 'delete'

type UsersState = {
  open: UsersDialogType | null
  currentRow: Vessel | null
}

const initialState: UsersState = {
  open: null,
  currentRow: null,
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<UsersDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Vessel | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen: setUsersOpen, setCurrentRow: setUsersCurrentRow } =
  usersSlice.actions
export const usersReducer = usersSlice.reducer
