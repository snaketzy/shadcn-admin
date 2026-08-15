import { useEffect, useMemo } from 'react'
import { getCookie } from '@/lib/cookies'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setTheme,
  setResolvedTheme,
  type Theme,
  type ResolvedTheme,
} from '@/store/slices/ui/theme-slice'

export { useTheme, type Theme, type ResolvedTheme } from '@/store/slices/ui/theme-slice'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.theme.theme)

  useEffect(() => {
    const savedTheme = getCookie(storageKey) as Theme | undefined
    dispatch(setTheme(savedTheme || defaultTheme))
  }, [dispatch, storageKey, defaultTheme])

  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme as ResolvedTheme
  }, [theme])

  useEffect(() => {
    dispatch(setResolvedTheme(resolvedTheme))
  }, [dispatch, resolvedTheme])

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
        dispatch(setResolvedTheme(systemTheme))
      }
    }

    applyTheme(resolvedTheme)

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, resolvedTheme, dispatch])

  return <>{children}</>
}
