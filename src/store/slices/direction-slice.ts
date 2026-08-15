import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getCookie } from '@/lib/cookies'

export type Direction = 'ltr' | 'rtl'

const DEFAULT_DIRECTION = 'ltr'
const DIRECTION_COOKIE_NAME = 'dir'

type DirectionState = {
  defaultDir: Direction
  dir: Direction
}

const initialState: DirectionState = {
  defaultDir: DEFAULT_DIRECTION,
  dir: ((getCookie(DIRECTION_COOKIE_NAME) as Direction) || DEFAULT_DIRECTION),
}

const directionSlice = createSlice({
  name: 'direction',
  initialState,
  reducers: {
    setDir: (state, action: PayloadAction<Direction>) => {
      state.dir = action.payload
    },
    resetDir: (state) => {
      state.dir = DEFAULT_DIRECTION
    },
  },
})

export const { setDir, resetDir } = directionSlice.actions
export const directionReducer = directionSlice.reducer
export const DIRECTION_CONSTANTS = { DEFAULT_DIRECTION, DIRECTION_COOKIE_NAME }
