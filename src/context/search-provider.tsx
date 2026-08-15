import { useEffect } from 'react'
import { CommandMenu } from '@/components/command-menu'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setSearchOpen,
  toggleSearchOpen,
} from '@/store/slices/search-slice'

type SearchProviderProps = {
  children: React.ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        dispatch(toggleSearchOpen())
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

// eslint-disable-next-line react-refresh/only-export-components
export const useSearch = () => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.search.open)
  const setOpen: React.Dispatch<React.SetStateAction<boolean>> = (v) => {
    if (typeof v === 'function') {
      dispatch(setSearchOpen(v(open)))
    } else {
      dispatch(setSearchOpen(v))
    }
  }
  return { open, setOpen }
}
