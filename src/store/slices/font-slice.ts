import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getCookie } from '@/lib/cookies'
import { fonts } from '@/config/fonts'

export type Font = (typeof fonts)[number]

const FONT_COOKIE_NAME = 'font'

type FontState = {
  font: Font
}

const savedFont = getCookie(FONT_COOKIE_NAME)
const initialFont: Font = fonts.includes(savedFont as Font)
  ? (savedFont as Font)
  : fonts[0]

const initialState: FontState = {
  font: initialFont,
}

const fontSlice = createSlice({
  name: 'font',
  initialState,
  reducers: {
    setFont: (state, action: PayloadAction<Font>) => {
      state.font = action.payload
    },
    resetFont: (state) => {
      state.font = fonts[0]
    },
  },
})

export const { setFont, resetFont } = fontSlice.actions
export const fontReducer = fontSlice.reducer
export const FONT_CONSTANTS = { FONT_COOKIE_NAME }
