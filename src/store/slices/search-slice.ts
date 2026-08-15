import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type SearchState = {
  open: boolean
}

const initialState: SearchState = {
  open: false,
}

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<boolean>) => {
      state.open = action.payload
    },
    toggleOpen: (state) => {
      state.open = !state.open
    },
  },
})

export const { setOpen: setSearchOpen, toggleOpen: toggleSearchOpen } =
  searchSlice.actions
export const searchReducer = searchSlice.reducer
