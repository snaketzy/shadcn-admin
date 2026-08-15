import { useEffect } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'
import { getCookie } from '@/lib/cookies'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setDir, type Direction } from '@/store/slices/ui/direction-slice'

export { useDirection, type Direction } from '@/store/slices/ui/direction-slice'

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const dir = useAppSelector((s) => s.direction.dir)

  useEffect(() => {
    const savedDir = getCookie('dir') as Direction | undefined
    dispatch(setDir(savedDir || 'ltr'))
  }, [dispatch])

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
  }, [dir])

  return <RdxDirProvider dir={dir}>{children}</RdxDirProvider>
}
