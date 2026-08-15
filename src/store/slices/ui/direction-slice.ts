import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type Direction = 'ltr' | 'rtl'

interface DirectionState {
  dir: Direction
  defaultDir: Direction
}

const initialState: DirectionState = {
  dir: 'ltr',
  defaultDir: 'ltr',
}

const directionSlice = createSlice({
  name: 'direction',
  initialState,
  reducers: {
    setDir: (state, action: PayloadAction<Direction>) => {
      state.dir = action.payload
    },
    resetDir: (state) => {
      state.dir = state.defaultDir
    },
  },
})

export const { setDir, resetDir } = directionSlice.actions
export default directionSlice.reducer

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCookie, removeCookie } from '@/lib/cookies'

const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const useDirection = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.direction)
  return {
    dir: state.dir,
    defaultDir: state.defaultDir,
    setDir: (dir: Direction) => {
      setCookie('dir', dir, DIRECTION_COOKIE_MAX_AGE)
      dispatch(setDir(dir))
    },
    resetDir: () => {
      removeCookie('dir')
      dispatch(resetDir())
    },
  }
}
