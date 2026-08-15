import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { fonts } from '@/config/fonts'

type Font = (typeof fonts)[number]

interface FontState {
  font: Font
}

const initialState: FontState = {
  font: fonts[0],
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
export default fontSlice.reducer

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCookie, removeCookie } from '@/lib/cookies'

const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const useFont = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.font)
  return {
    font: state.font,
    setFont: (font: (typeof fonts)[number]) => {
      setCookie('font', font, FONT_COOKIE_MAX_AGE)
      dispatch(setFont(font))
    },
    resetFont: () => {
      removeCookie('font')
      dispatch(resetFont())
    },
  }
}
