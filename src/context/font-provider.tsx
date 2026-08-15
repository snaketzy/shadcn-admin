import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  FONT_CONSTANTS,
  resetFont,
  setFont as setFontAction,
  type Font,
} from '@/store/slices/font-slice'
import { fonts } from '@/config/fonts'
import { setCookie, removeCookie } from '@/lib/cookies'

const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function FontProvider({ children }: { children: React.ReactNode }) {
  const font = useAppSelector((s) => s.font.font)

  useEffect(() => {
    const applyFont = (f: string) => {
      const root = document.documentElement
      root.classList.forEach((cls) => {
        if (cls.startsWith('font-')) root.classList.remove(cls)
      })
      root.classList.add(`font-${f}`)
    }
    applyFont(font)
  }, [font])

  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFont = () => {
  const dispatch = useAppDispatch()
  const font = useAppSelector((s) => s.font.font)

  const setFont = (f: Font) => {
    dispatch(setFontAction(f))
    setCookie(FONT_CONSTANTS.FONT_COOKIE_NAME, f, FONT_COOKIE_MAX_AGE)
  }
  const reset = () => {
    dispatch(resetFont())
    removeCookie(FONT_CONSTANTS.FONT_COOKIE_NAME)
  }

  return { font, setFont, resetFont: reset }
}

void fonts
