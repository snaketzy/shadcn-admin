import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCookie, removeCookie } from '@/lib/cookies'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  defaultTheme: Theme
  storageKey: string
}

const initialState: ThemeState = {
  theme: 'system',
  resolvedTheme: 'light',
  defaultTheme: 'system',
  storageKey: 'vite-ui-theme',
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    resetTheme: (state) => {
      state.theme = state.defaultTheme
    },
    setResolvedTheme: (state, action: PayloadAction<ResolvedTheme>) => {
      state.resolvedTheme = action.payload
    },
  },
})

export const { setTheme, resetTheme, setResolvedTheme } = themeSlice.actions
export default themeSlice.reducer

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const useTheme = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.theme)
  return {
    theme: state.theme,
    defaultTheme: state.defaultTheme,
    resolvedTheme: state.resolvedTheme,
    storageKey: state.storageKey,
    setTheme: (theme: Theme) => {
      setCookie(state.storageKey, theme, THEME_COOKIE_MAX_AGE)
      dispatch(setTheme(theme))
    },
    resetTheme: () => {
      removeCookie(state.storageKey)
      dispatch(resetTheme())
    },
  }
}
