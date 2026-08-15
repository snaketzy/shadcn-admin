import { useEffect } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  DIRECTION_CONSTANTS,
  resetDir,
  setDir as setDirAction,
  type Direction,
} from '@/store/slices/direction-slice'
import { setCookie, removeCookie } from '@/lib/cookies'

const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function DirectionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const dir = useAppSelector((s) => s.direction.dir)

  useEffect(() => {
    const htmlElement = document.documentElement
    htmlElement.setAttribute('dir', dir)
  }, [dir])

  return <RdxDirProvider dir={dir}>{children}</RdxDirProvider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const dispatch = useAppDispatch()
  const dir = useAppSelector((s) => s.direction.dir)
  const defaultDir = useAppSelector((s) => s.direction.defaultDir)

  const setDir = (d: Direction) => {
    dispatch(setDirAction(d))
    setCookie(
      DIRECTION_CONSTANTS.DIRECTION_COOKIE_NAME,
      d,
      DIRECTION_COOKIE_MAX_AGE
    )
  }
  const reset = () => {
    dispatch(resetDir())
    removeCookie(DIRECTION_CONSTANTS.DIRECTION_COOKIE_NAME)
  }

  return { defaultDir, dir, setDir, resetDir: reset }
}
