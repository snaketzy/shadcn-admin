import { useEffect } from 'react'
import { fonts } from '@/config/fonts'
import { getCookie } from '@/lib/cookies'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFont } from '@/store/slices/ui/font-slice'

export { useFont } from '@/store/slices/ui/font-slice'

type Font = (typeof fonts)[number]

export function FontProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const font = useAppSelector((s) => s.font.font)

  useEffect(() => {
    const savedFont = getCookie('font') as Font | undefined
    const initialFont = fonts.includes(savedFont as Font) ? (savedFont as Font) : fonts[0]
    dispatch(setFont(initialFont))
  }, [dispatch])

  useEffect(() => {
    const applyFont = (fontName: string) => {
      const root = document.documentElement
      root.classList.forEach((cls) => {
        if (cls.startsWith('font-')) root.classList.remove(cls)
      })
      root.classList.add(`font-${fontName}`)
    }

    applyFont(font)
  }, [font])

  return <>{children}</>
}
