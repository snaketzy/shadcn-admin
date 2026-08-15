import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  resetTheme,
  setTheme as setThemeAction,
  THEME_CONSTANTS,
  type Theme,
  type ResolvedTheme,
} from '@/store/slices/theme-slice'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function ThemeProvider({
  children,
  defaultTheme = THEME_CONSTANTS.DEFAULT_THEME,
  storageKey = THEME_CONSTANTS.THEME_COOKIE_NAME,
}: ThemeProviderProps) {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.theme.theme)

  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme as ResolvedTheme
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (currentResolvedTheme: ResolvedTheme) => {
      root.classList.remove('light', 'dark')
      root.classList.add(currentResolvedTheme)
    }

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        applyTheme(systemTheme)
      }
    }

    applyTheme(resolvedTheme)

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, resolvedTheme])

  useEffect(() => {
    const currentCookie = getCookie(storageKey) as Theme
    if (currentCookie !== theme) {
      setCookie(storageKey, theme, THEME_COOKIE_MAX_AGE)
    }
  }, [theme, storageKey])

  void defaultTheme

  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.theme.theme)
  const defaultTheme = useAppSelector((s) => s.theme.defaultTheme)

  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme as ResolvedTheme
  }, [theme])

  const setTheme = (t: Theme) => {
    dispatch(setThemeAction(t))
    setCookie(THEME_CONSTANTS.THEME_COOKIE_NAME, t, THEME_COOKIE_MAX_AGE)
  }
  const reset = () => {
    dispatch(resetTheme())
    removeCookie(THEME_CONSTANTS.THEME_COOKIE_NAME)
  }

  return {
    defaultTheme,
    resolvedTheme,
    theme,
    setTheme,
    resetTheme: reset,
  }
}
