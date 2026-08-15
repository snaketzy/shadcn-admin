import { useEffect } from 'react'
import { CommandMenu } from '@/components/command-menu'
import { useAppDispatch } from '@/store/hooks'
import { toggleSearch } from '@/store/slices/ui/search-slice'

export { useSearch } from '@/store/slices/ui/search-slice'

type SearchProviderProps = {
  children: React.ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        dispatch(toggleSearch())
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [dispatch])

  return (
    <>
      {children}
      <CommandMenu />
    </>
  )
}
