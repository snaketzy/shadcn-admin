import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SearchState {
  open: boolean
}

const initialState: SearchState = {
  open: false,
}

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.open = action.payload
    },
    toggleSearch: (state) => {
      state.open = !state.open
    },
  },
})

export const { setSearchOpen, toggleSearch } = searchSlice.actions
export default searchSlice.reducer

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { Dispatch, SetStateAction } from 'react'

export const useSearch = () => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.search.open)
  const setOpen: Dispatch<SetStateAction<boolean>> = (v) => {
    if (typeof v === 'function') {
      dispatch(setSearchOpen(v(open)))
    } else {
      dispatch(setSearchOpen(v))
    }
  }
  return { open, setOpen }
}
