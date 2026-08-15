import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getCookie } from '@/lib/cookies'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = Exclude<Theme, 'system'>

const DEFAULT_THEME = 'system'
const THEME_COOKIE_NAME = 'vite-ui-theme'

type ThemeState = {
  defaultTheme: Theme
  theme: Theme
}

const initialState: ThemeState = {
  defaultTheme: DEFAULT_THEME,
  theme: (getCookie(THEME_COOKIE_NAME) as Theme) || DEFAULT_THEME,
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    resetTheme: (state) => {
      state.theme = DEFAULT_THEME
    },
  },
})

export const { setTheme, resetTheme } = themeSlice.actions
export const themeReducer = themeSlice.reducer
export const THEME_CONSTANTS = { DEFAULT_THEME, THEME_COOKIE_NAME }
